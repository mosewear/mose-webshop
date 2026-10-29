-- Staged barrier only: installation does not freeze sales, move stock, or release Shopify.
create table public.legacy_cutover_control (
  singleton boolean primary key default true check(singleton),
  checkout_frozen boolean not null default false,
  stock_frozen boolean not null default false,
  changed_at timestamptz not null default clock_timestamp(),
  evidence_reference text not null default 'installed; not activated',
  check(not stock_frozen or checkout_frozen)
);
insert into public.legacy_cutover_control(singleton) values(true);
create table public.legacy_cutover_control_history (
  id bigint generated always as identity primary key,
  checkout_frozen boolean not null,
  stock_frozen boolean not null,
  changed_at timestamptz not null default clock_timestamp(),
  evidence_reference text not null
);
alter table public.legacy_cutover_control enable row level security;
alter table public.legacy_cutover_control_history enable row level security;
revoke all on public.legacy_cutover_control,public.legacy_cutover_control_history from public,anon,authenticated,service_role;
grant select on public.legacy_cutover_control,public.legacy_cutover_control_history to service_role;

-- UPDATE waits for every in-flight guarded writer's SHARE lock. No lease or automatic expiry:
-- resuming is an explicit, evidenced operation after reconciliation.
create function public.set_legacy_cutover_freeze(p_checkout boolean,p_stock boolean,p_reference text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result public.legacy_cutover_control%rowtype;
begin
  if p_checkout is null or p_stock is null or (p_stock and not p_checkout) or length(btrim(coalesce(p_reference,'')))<12 then
    raise exception 'INVALID_CUTOVER_FREEZE';
  end if;
  update public.legacy_cutover_control set checkout_frozen=p_checkout,stock_frozen=p_stock,
    changed_at=clock_timestamp(),evidence_reference=p_reference where singleton returning * into result;
  if not found then raise exception 'CUTOVER_CONTROL_MISSING'; end if;
  insert into public.legacy_cutover_control_history(checkout_frozen,stock_frozen,evidence_reference)
    values(p_checkout,p_stock,p_reference);
  return to_jsonb(result);
end $$;
revoke all on function public.set_legacy_cutover_freeze(boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.set_legacy_cutover_freeze(boolean,boolean,text) to service_role;

create function public.guard_legacy_cutover_freeze() returns trigger
language plpgsql security definer set search_path=public as $$
declare control public.legacy_cutover_control%rowtype;
begin
  -- Harmless metadata edits need no stock lock. INSERT/DELETE variants are stock writes too.
  if TG_TABLE_NAME='product_variants' and TG_OP='UPDATE' then
    if new.stock_quantity is not distinct from old.stock_quantity and new.presale_stock_quantity is not distinct from old.presale_stock_quantity then
      return new;
    end if;
  end if;
  select * into control from public.legacy_cutover_control where singleton for share;
  if not found then raise exception 'CUTOVER_CONTROL_MISSING'; end if;
  if TG_TABLE_NAME='product_variants' then
    if control.stock_frozen then raise exception 'LEGACY_STOCK_FROZEN'; end if;
  elsif control.checkout_frozen then raise exception 'LEGACY_CHECKOUT_FROZEN';
  end if;
  if TG_OP='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.guard_legacy_cutover_freeze() from public,anon,authenticated;
create trigger guard_legacy_cutover_orders before insert or delete on public.orders
  for each row execute function public.guard_legacy_cutover_freeze();
create trigger guard_legacy_cutover_lines before insert or update or delete on public.order_items
  for each row execute function public.guard_legacy_cutover_freeze();
create trigger guard_legacy_cutover_stock before insert or update or delete on public.product_variants
  for each row execute function public.guard_legacy_cutover_freeze();
