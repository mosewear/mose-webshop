-- Additive shared-account writer cutover. No account rebuild/backfill or balance
-- changes on install. Deploy all writer routes before enabling LOYALTY_ATOMIC_ENABLED.
create table public.legacy_loyalty_operations (
  operation_key text primary key,
  account_id uuid references public.loyalty_points(id),
  request jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create table public.legacy_loyalty_refund_claims (
  return_id uuid primary key,
  order_id uuid not null,
  email text not null,
  user_id uuid,
  requested_points integer not null check(requested_points >= 0),
  refund_amount numeric not null check(refund_amount >= 0),
  applied boolean not null default false,
  deducted_points integer,
  created_at timestamptz not null default now()
);
alter table public.legacy_loyalty_operations enable row level security;
alter table public.legacy_loyalty_refund_claims enable row level security;
revoke all on public.legacy_loyalty_operations,public.legacy_loyalty_refund_claims from public,anon,authenticated, service_role;
grant select on public.legacy_loyalty_operations,public.legacy_loyalty_refund_claims to service_role;

-- Caller holds the per-order advisory lock and account row lock. Claims received
-- before a late Mollie payment are retained, then reversed when earning arrives.
create function public.apply_legacy_loyalty_refunds(p_order uuid,p_account uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare a public.loyalty_points%rowtype; r public.legacy_loyalty_refund_claims%rowtype;
  earned integer; reversed integer; deduction integer; total integer:=0; life integer;
begin
  select * into strict a from public.loyalty_points where id=p_account for update;
  select coalesce(sum(points),0) into earned from public.loyalty_transactions where order_id=p_order and type='earned';
  if earned<=0 then return 0; end if;
  for r in select * from public.legacy_loyalty_refund_claims where order_id=p_order and not applied order by created_at,return_id for update loop
    if r.email<>a.email then raise exception 'LOYALTY_ORDER_ACCOUNT_MISMATCH'; end if;
    if exists(select 1 from public.loyalty_transactions where return_id=r.return_id) then
      update public.legacy_loyalty_refund_claims set applied=true,deducted_points=0 where return_id=r.return_id;continue;
    end if;
    select coalesce(-sum(points),0) into reversed from public.loyalty_transactions where order_id=p_order and type='adjusted' and points<0;
    deduction:=least(r.requested_points,greatest(0,earned-reversed));
    if deduction>0 then
      insert into public.loyalty_transactions(email,user_id,type,points,description,order_id,return_id)
        values(a.email,coalesce(r.user_id,a.user_id),'adjusted',-deduction,'Retour: '||deduction||' punten ingetrokken (terugbetaling €'||r.refund_amount::text||')',p_order,r.return_id);
      -- Preserve spent-point debt, matching Shopify refund accounting. Do not
      -- clamp balance to zero: future earnings first settle that debt.
      life:=greatest(0,a.lifetime_points-deduction);
      update public.loyalty_points set points_balance=points_balance-deduction,lifetime_points=life,
        tier=case when life>=1000 then 'gold' when life>=500 then 'silver' else 'bronze' end,
        updated_at=now() where id=a.id returning * into a;
      total:=total+deduction;
    end if;
    update public.legacy_loyalty_refund_claims set applied=true,deducted_points=deduction where return_id=r.return_id;
  end loop;
  return total;
end $$;
revoke all on function public.apply_legacy_loyalty_refunds(uuid,uuid) from public,anon,authenticated,service_role;

create function public.atomic_legacy_loyalty(p_kind text,p_key text,p_email text,p_user uuid,
 p_points integer default null,p_order uuid default null,p_return uuid default null,
 p_amount numeric default null,p_reason text default null,p_account uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.loyalty_points%rowtype; old_tier text; life integer; tx uuid; req jsonb; prior public.legacy_loyalty_operations%rowtype;
 result jsonb; awarded integer; claim public.legacy_loyalty_refund_claims%rowtype;
begin
 if p_kind is null or p_kind not in ('earn','refund','redeem','admin') or p_key is null or length(p_key) not between 8 and 220
   or p_email is null or length(p_email) not between 3 and 320 then raise exception 'INVALID_LOYALTY_OPERATION'; end if;
 if p_kind in ('earn','refund') and p_order is null then raise exception 'LOYALTY_ORDER_REQUIRED'; end if;
 if p_kind in ('earn','refund') then perform pg_advisory_xact_lock(hashtextextended('legacy-loyalty-order:'||p_order::text,0)); end if;
 perform pg_advisory_xact_lock(hashtextextended('loyalty-operation:'||p_key,0));
 req:=jsonb_build_object('kind',p_kind,'email',p_email,'user',p_user,'points',p_points,'order',p_order,'return',p_return,'amount',p_amount,'reason',p_reason,'account',p_account);
 select * into prior from public.legacy_loyalty_operations where operation_key=p_key;
 if found then
   if prior.request<>req then raise exception 'LOYALTY_OPERATION_CONFLICT'; end if;
   if p_kind='refund' then
     select * into claim from public.legacy_loyalty_refund_claims where return_id=p_return;
     return jsonb_build_object('success',true,'points_deducted',coalesce(claim.deducted_points,0),'pending',not claim.applied,'duplicate',true);
   end if;
   return prior.result||jsonb_build_object('duplicate',true);
 end if;
 -- Exact historical email identity is preserved; no case-fold merge or transfer.
 perform pg_advisory_xact_lock(hashtextextended('loyalty-account:'||p_email,0));
 select * into a from public.loyalty_points where email=p_email for update;
 if p_kind='refund' then
   if p_return is null or p_amount is null or p_amount<0 or p_amount>1000000 then raise exception 'INVALID_LOYALTY_REFUND';end if;
   select * into claim from public.legacy_loyalty_refund_claims where return_id=p_return;
   if found and (claim.order_id,claim.email,claim.refund_amount) is distinct from (p_order,p_email,p_amount) then raise exception 'LOYALTY_REFUND_CONFLICT';end if;
   insert into public.legacy_loyalty_refund_claims(return_id,order_id,email,user_id,requested_points,refund_amount)
     values(p_return,p_order,p_email,p_user,floor(p_amount)::integer,p_amount) on conflict(return_id) do nothing;
   if a.id is not null then perform public.apply_legacy_loyalty_refunds(p_order,a.id);end if;
   select * into claim from public.legacy_loyalty_refund_claims where return_id=p_return;
   result:=jsonb_build_object('success',true,'points_deducted',coalesce(claim.deducted_points,0),'pending',not claim.applied);
 else
   if p_kind='earn' then
     if p_amount is null or p_amount<0 or p_amount>1000000 then raise exception 'INVALID_LOYALTY_AMOUNT';end if;
     awarded:=floor(p_amount)::integer;
     if awarded<=0 then return jsonb_build_object('success',false,'message','No points to award');end if;
     if a.id is null then
       insert into public.loyalty_points(email,user_id) values(p_email,p_user) returning * into a;
     end if;
     if exists(select 1 from public.loyalty_transactions where order_id=p_order and type='earned' and email<>p_email) then raise exception 'LOYALTY_ORDER_ACCOUNT_MISMATCH';end if;
     if exists(select 1 from public.loyalty_transactions where order_id=p_order and type='earned') then
       -- Historical earned entries are the dedupe authority, including payments
       -- that started before cutover. Never reconstruct or reset their balance.
       perform public.apply_legacy_loyalty_refunds(p_order,a.id);
       select * into a from public.loyalty_points where id=a.id;
       result:=jsonb_build_object('success',true,'duplicate',true,'points_awarded',0,'new_balance',a.points_balance,'lifetime_points',a.lifetime_points,'old_tier',a.tier,'new_tier',a.tier);
     else
       old_tier:=a.tier;life:=a.lifetime_points+awarded;
       insert into public.loyalty_transactions(email,user_id,type,points,description,order_id)
         values(p_email,coalesce(a.user_id,p_user),'earned',awarded,'Punten verdiend bij bestelling',p_order);
       update public.loyalty_points set points_balance=points_balance+awarded,lifetime_points=life,
         user_id=coalesce(user_id,p_user),tier=case when life>=1000 then 'gold' when life>=500 then 'silver' else 'bronze' end,updated_at=now()
         where id=a.id;
       perform public.apply_legacy_loyalty_refunds(p_order,a.id);
       select * into a from public.loyalty_points where id=a.id;
       result:=jsonb_build_object('success',true,'points_awarded',awarded,'new_balance',a.points_balance,'lifetime_points',a.lifetime_points,'old_tier',old_tier,'new_tier',a.tier);
     end if;
   else
     if a.id is null then raise exception 'LOYALTY_ACCOUNT_NOT_FOUND';end if;
     if p_kind='redeem' then
       if p_user is null or not exists(select 1 from auth.users where id=p_user and email=p_email)
         or (a.user_id is not null and a.user_id<>p_user) then raise exception 'LOYALTY_OWNER_MISMATCH';end if;
       if p_points is null or p_points<100 or p_points>20000000 or p_points%100<>0 then raise exception 'INVALID_LOYALTY_POINTS';end if;
       if a.points_balance<p_points then raise exception 'LOYALTY_INSUFFICIENT_POINTS';end if;
       insert into public.loyalty_transactions(email,user_id,type,points,description) values(p_email,p_user,'redeemed',-p_points,p_points||' punten ingewisseld voor korting');
       update public.loyalty_points set points_balance=points_balance-p_points,updated_at=now() where id=a.id returning * into a;
       result:=jsonb_build_object('success',true,'points_redeemed',p_points,'discount_value',(p_points/100)*5,'remaining_balance',a.points_balance);
     else
       if p_account is distinct from a.id or p_points is null or p_points=0 or abs(p_points::bigint)>20000000 or p_reason is null or length(trim(p_reason)) not between 1 and 500 then raise exception 'INVALID_LOYALTY_ADJUSTMENT';end if;
       if a.points_balance+p_points<0 and p_points<0 then raise exception 'LOYALTY_INSUFFICIENT_POINTS';end if;
       life:=a.lifetime_points+greatest(0,p_points);
       insert into public.loyalty_transactions(email,user_id,type,points,description) values(p_email,a.user_id,'adjusted',p_points,'Handmatige aanpassing: '||p_reason);
       update public.loyalty_points set points_balance=points_balance+p_points,lifetime_points=life,
         tier=case when life>=1000 then 'gold' when life>=500 then 'silver' else 'bronze' end,updated_at=now() where id=a.id returning * into a;
       result:=jsonb_build_object('success',true,'new_balance',a.points_balance,'new_tier',a.tier);
     end if;
   end if;
 end if;
 insert into public.legacy_loyalty_operations(operation_key,account_id,request,result) values(p_key,a.id,req,result);
 return result;
end $$;
revoke all on function public.atomic_legacy_loyalty(text,text,text,uuid,integer,uuid,uuid,numeric,text,uuid) from public,anon,authenticated;
grant execute on function public.atomic_legacy_loyalty(text,text,text,uuid,integer,uuid,uuid,numeric,text,uuid) to service_role;

-- Existing SQL callers use the same canonical legacy-order key as Mollie and
-- old Stripe. Provider retries cannot award twice for the same MOSE order UUID.
create or replace function public.award_loyalty_points(p_email text,p_user_id uuid,p_order_id uuid,p_order_total numeric) returns json
language sql security definer set search_path='' as $$
 select public.atomic_legacy_loyalty('earn','legacy:order:'||p_order_id::text||':earn',p_email,p_user_id,p_order=>p_order_id,p_amount=>p_order_total)::json;
$$;
revoke all on function public.award_loyalty_points(text,uuid,uuid,numeric) from public,anon,authenticated;
grant execute on function public.award_loyalty_points(text,uuid,uuid,numeric) to service_role;
create function public.legacy_loyalty_writer_health() returns table(generation integer) language sql stable security definer set search_path='' as $$
 select 1;
$$;
revoke all on function public.legacy_loyalty_writer_health() from public,anon,authenticated;
grant execute on function public.legacy_loyalty_writer_health() to service_role;

-- Financial writes only through server RPCs; own-data SELECT policies remain.
revoke insert,update,delete on public.loyalty_points,public.loyalty_transactions from anon,authenticated;
