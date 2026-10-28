-- Dormant durable adapter/outbox. No backfill or cutover activation is performed.
create table public.shopify_loyalty_runtime (
  id smallint primary key default 1 check (id=1),
  cutover_at timestamptz,
  review_reference text check (review_reference is null or length(review_reference) between 8 and 500),
  last_worker_at timestamptz,
  check ((cutover_at is null) = (review_reference is null))
);
insert into public.shopify_loyalty_runtime(id) values(1);

-- Created only by the trusted server after a real single-use Shopify discount
-- creation has been verified. A customer attribute is never a binding. Codes
-- themselves are capabilities and are not retained here or in the outbox.
create table public.shopify_loyalty_discount_bindings (
  attempt_id uuid primary key references public.shopify_loyalty_reservations(attempt_id),
  provider_discount_id text not null unique check (provider_discount_id ~ '^gid://shopify/DiscountCodeNode/[1-9][0-9]*$'),
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create table public.shopify_loyalty_outbox (
  order_id text primary key references public.shopify_order_accounts(order_id),
  source_updated_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','processing','processed','dead_letter')),
  attempts integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  next_attempt_at timestamptz not null default now(),
  queued_at timestamptz not null default now(),
  last_error text
);
create index shopify_loyalty_outbox_pending on public.shopify_loyalty_outbox(next_attempt_at) where status in ('pending','processing');
alter table public.shopify_loyalty_runtime enable row level security;
alter table public.shopify_loyalty_discount_bindings enable row level security;
alter table public.shopify_loyalty_outbox enable row level security;
revoke all on public.shopify_loyalty_runtime,public.shopify_loyalty_discount_bindings,public.shopify_loyalty_outbox from public,anon,authenticated;
grant select on public.shopify_loyalty_runtime,public.shopify_loyalty_discount_bindings,public.shopify_loyalty_outbox to service_role;
grant insert on public.shopify_loyalty_discount_bindings to service_role;

create function public.enqueue_shopify_loyalty() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  -- No retrospective earning. A reviewed cutoff selects new verified attempts;
  -- historical/late legacy orders remain on their original provider path.
  if new.financial_status is null or new.financial_status not in ('PAID','PARTIALLY_REFUNDED','REFUNDED') then return new; end if;
  if not exists(select 1 from public.shopify_order_accounts oa
      join public.shopify_checkout_attempts a on a.id=oa.attempt_id
      cross join public.shopify_loyalty_runtime r
      where oa.order_id=new.shopify_order_id and r.id=1 and r.cutover_at<=now()
        and a.created_at>=r.cutover_at) then return new; end if;
  insert into public.shopify_loyalty_outbox(order_id,source_updated_at)
    values(new.shopify_order_id,new.source_updated_at)
    on conflict(order_id) do update set source_updated_at=excluded.source_updated_at,status='pending',
      attempts=0,lease_token=null,lease_until=null,next_attempt_at=now(),queued_at=now(),last_error=null
    where excluded.source_updated_at>shopify_loyalty_outbox.source_updated_at;
  return new;
end $$;
-- AFTER triggers execute by name. Account linkage must run before enqueueing.
create trigger zz_shopify_loyalty_enqueue after insert or update on public.shopify_order_snapshots
for each row execute function public.enqueue_shopify_loyalty();

create function public.claim_shopify_loyalty()
returns setof public.shopify_loyalty_outbox
language plpgsql security definer set search_path='' as $$
declare chosen text;
begin
  if not exists(select 1 from public.shopify_loyalty_runtime where id=1 and cutover_at<=now()) then return; end if;
  select order_id into chosen from public.shopify_loyalty_outbox
    where (status='pending' and next_attempt_at<=now()) or (status='processing' and lease_until<now())
    order by queued_at for update skip locked limit 1;
  if chosen is null then return; end if;
  return query update public.shopify_loyalty_outbox set status='processing',attempts=attempts+1,
    lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes'
    where order_id=chosen returning *;
end $$;

create function public.complete_shopify_loyalty(p_order text,p_lease uuid,p_version timestamptz,
  p_paid integer,p_refunded integer,p_discount integer,p_restored integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare job public.shopify_loyalty_outbox%rowtype; snap_version timestamptz; applied text;
begin
  -- Snapshot first: the snapshot trigger uses the same snapshot -> queue lock
  -- order. An order edit cannot deadlock the queue acknowledgement/settlement.
  select source_updated_at into snap_version from public.shopify_order_snapshots
    where shopify_order_id=p_order for share;
  select * into job from public.shopify_loyalty_outbox where order_id=p_order for update;
  if not found or job.status<>'processing' or job.lease_token is distinct from p_lease or job.lease_until<=now()
    or job.source_updated_at is distinct from p_version or snap_version is distinct from p_version then return false; end if;
  if not exists(select 1 from public.shopify_order_accounts oa join public.shopify_checkout_attempts a on a.id=oa.attempt_id
      cross join public.shopify_loyalty_runtime r where oa.order_id=p_order and r.id=1 and r.cutover_at<=now()
      and a.created_at>=r.cutover_at) then raise exception 'LOYALTY_CUTOVER_NOT_VERIFIED'; end if;
  applied:=public.settle_shopify_loyalty(p_order,p_version,p_paid,p_refunded,p_discount,p_restored);
  if applied not in ('applied','duplicate') then return false; end if;
  update public.shopify_loyalty_outbox set status='processed',lease_token=null,lease_until=null,last_error=null where order_id=p_order;
  return true;
end $$;

create function public.fail_shopify_loyalty(p_order text,p_lease uuid,p_error text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.shopify_loyalty_outbox set status=case when attempts>=8 then 'dead_letter' else 'pending' end,
    lease_token=null,lease_until=null,next_attempt_at=now()+make_interval(secs=>least(3600,power(2,least(attempts,11))::integer)),
    last_error=case when p_error~'^[A-Z][A-Z0-9_]{1,79}$' then p_error else 'LOYALTY_WORKER_FAILED' end
    where order_id=p_order and status='processing' and lease_token=p_lease and lease_until>now();
  return found;
end $$;
create function public.heartbeat_shopify_loyalty() returns void
language sql security definer set search_path='' as $$
  update public.shopify_loyalty_runtime set last_worker_at=now() where id=1 and cutover_at<=now();
$$;
create function public.shopify_loyalty_health()
returns table(cutover_at timestamptz,review_reference text,last_worker_at timestamptz,pending_count bigint,oldest_pending_at timestamptz,dead_letter_count bigint)
language sql security definer set search_path='' as $$
  select r.cutover_at,r.review_reference,r.last_worker_at,
    (select count(*) from public.shopify_loyalty_outbox where status in ('pending','processing')),
    (select min(queued_at) from public.shopify_loyalty_outbox where status in ('pending','processing')),
    (select count(*) from public.shopify_loyalty_outbox where status='dead_letter')
  from public.shopify_loyalty_runtime r where r.id=1;
$$;
revoke all on function public.enqueue_shopify_loyalty() from public,anon,authenticated,service_role;
revoke all on function public.claim_shopify_loyalty(),public.complete_shopify_loyalty(text,uuid,timestamptz,integer,integer,integer,integer),
  public.fail_shopify_loyalty(text,uuid,text),public.heartbeat_shopify_loyalty(),public.shopify_loyalty_health() from public,anon,authenticated;
grant execute on function public.claim_shopify_loyalty(),public.complete_shopify_loyalty(text,uuid,timestamptz,integer,integer,integer,integer),
  public.fail_shopify_loyalty(text,uuid,text),public.heartbeat_shopify_loyalty(),public.shopify_loyalty_health() to service_role;
