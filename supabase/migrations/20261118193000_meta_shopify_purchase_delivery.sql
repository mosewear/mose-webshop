begin;
-- Private attribution is captured only after explicit storefront marketing consent.
create table public.meta_checkout_attribution (
  attempt_id uuid primary key references public.shopify_checkout_attempts(id) on delete cascade,
  consent_at timestamptz not null default now(),
  fbc text, fbp text, client_ip_address text, client_user_agent text,
  source_url text not null, test_event_code text,
  constraint meta_attribution_source check (source_url like 'https://www.mosewear.com/%')
);
create table public.meta_purchase_jobs (
  order_id text primary key references public.shopify_order_snapshots(shopify_order_id) on delete cascade,
  event_time timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','sending','sent','skipped','failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid, lease_until timestamptz,
  last_error text, fbtrace_id text, sent_at timestamptz
);
alter table public.meta_checkout_attribution enable row level security;
alter table public.meta_purchase_jobs enable row level security;
revoke all on public.meta_checkout_attribution, public.meta_purchase_jobs from public, anon, authenticated;
grant all on public.meta_checkout_attribution, public.meta_purchase_jobs to service_role;
create or replace function public.queue_meta_shopify_purchase() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.financial_status = 'PAID' and (tg_op = 'INSERT' or old.financial_status is distinct from 'PAID') then
    insert into public.meta_purchase_jobs(order_id) values(new.shopify_order_id) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger meta_shopify_paid after insert or update on public.shopify_order_snapshots
for each row execute function public.queue_meta_shopify_purchase();
create function public.claim_meta_purchase() returns setof public.meta_purchase_jobs
language sql security definer set search_path = public, pg_temp as $$
  update public.meta_purchase_jobs set status='sending', attempts=attempts+1,
    lease_token=gen_random_uuid(), lease_until=now()+interval '2 minutes'
  where order_id = (select order_id from public.meta_purchase_jobs
    where attempts < 12 and next_attempt_at<=now() and (status='pending' or (status='sending' and lease_until<now()))
    order by event_time for update skip locked limit 1)
  returning *;
$$;
create function public.finish_meta_purchase(p_order text,p_lease uuid,p_status text,p_trace text default null,p_error text default null)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_status not in ('sent','skipped','pending') then raise exception 'INVALID_META_STATUS'; end if;
  update public.meta_purchase_jobs set status=case when p_status='pending' and attempts>=12 then 'failed' else p_status end,
    next_attempt_at=now()+least(interval '6 hours', interval '1 minute'*power(2,least(attempts,8))),
    lease_token=null,lease_until=null,last_error=p_error,fbtrace_id=p_trace,
    sent_at=case when p_status='sent' then now() else null end
  where order_id=p_order and lease_token=p_lease and status='sending';
  return found;
end $$;
revoke all on function public.queue_meta_shopify_purchase(), public.claim_meta_purchase(), public.finish_meta_purchase(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_meta_purchase(), public.finish_meta_purchase(text,uuid,text,text,text) to service_role;
commit;
