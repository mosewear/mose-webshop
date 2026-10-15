-- Twee dingen die allebei vandaag aan het licht kwamen.
--
-- 1. KLANTEN KONDEN GEEN ACCOUNT AANMAKEN.
--    "Database error saving new user" bij het registreren. De trigger op
--    auth.users zet een rij in public.profiles, en profiles heeft een unieke
--    index op het e-mailadres. Wie eerder als gast bestelde, heeft al zo'n rij.
--    Van de 47 profielen hoorden er 44 bij een gast zonder account, dus
--    vrijwel elke bestaande klant liep hier tegenaan. En juist voor een retour
--    moet je een account hebben.
--
-- 2. ALLE BESTELLINGEN EN KLANTPROFIELEN WAREN PUBLIEK UITLEESBAAR.
--    Op orders stond "Anyone can view orders by ID" met voorwaarde `true`, en
--    op profiles stonden twee leesregels met `true`. Regels worden met OF
--    gecombineerd, dus die ene `true` zette alle andere opzij. Met de publieke
--    sleutel uit de website waren 72 bestellingen en 47 profielen op te halen,
--    inclusief naam, e-mailadres, telefoonnummer en adres. Daarnaast mocht elke
--    ingelogde bezoeker ELKE bestelling wijzigen en verwijderen.
--
-- Nagemeten vóór deze migratie, met alleen de publieke sleutel:
--   GET /rest/v1/orders   -> 200, content-range 0-0/72
--   GET /rest/v1/profiles -> 200, content-range 0-0/47

-- ---------------------------------------------------------------------------
-- Hulpfunctie: is de huidige gebruiker beheerder?
-- ---------------------------------------------------------------------------
-- Als SECURITY DEFINER, zodat de controle zelf niet opnieuw door de regels op
-- profiles heen hoeft en er geen kringverwijzing ontstaat.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Registreren mag nooit meer stuklopen op een profiel
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Bestond er al een klantenkaart op dit e-mailadres, van een gastbestelling?
  -- Die nemen we over, zodat naam, telefoonnummer en bestelhistorie behouden
  -- blijven en er geen tweede rij met hetzelfde e-mailadres ontstaat.
  update public.profiles
     set id = new.id,
         user_id = new.id,
         email = new.email,
         updated_at = now()
   where id <> new.id
     and email is not null
     and new.email is not null
     and lower(email) = lower(new.email);

  if found then
    return new;
  end if;

  insert into public.profiles (id, email, user_id, created_at, updated_at)
  values (new.id, new.email, new.id, now(), now())
  on conflict (id) do update
     set email = excluded.email,
         user_id = excluded.user_id,
         updated_at = now();

  return new;
exception
  when others then
    -- Een profielrij is nuttig, maar nooit zó nuttig dat iemand daardoor geen
    -- account mag aanmaken. Dit is precies wat er vandaag misging. Loggen en
    -- doorgaan; het profiel kan later alsnog worden aangevuld.
    raise warning 'handle_new_user overgeslagen voor % : %', new.id, sqlerrm;
    -- Toch een kale rij proberen, zonder e-mailadres, zodat het account een
    -- profiel heeft om aan te hangen. Lukt ook dat niet, dan nog steeds door.
    begin
      insert into public.profiles (id, user_id, created_at, updated_at)
      values (new.id, new.id, now(), now())
      on conflict (id) do nothing;
    exception
      when others then null;
    end;
    return new;
end;
$$;

-- Verwijzingen naar profiles(id) mogen meeverhuizen als de bovenstaande
-- overname de id van een gastprofiel vervangt. Zonder cascade zou zo'n overname
-- stuklopen zodra de gast ooit een kortingscode gebruikte of een chat opende.
alter table public.promo_code_usage drop constraint if exists promo_code_usage_user_id_fkey;
alter table public.promo_code_usage add constraint promo_code_usage_user_id_fkey
  foreign key (user_id) references public.profiles(id) on update cascade on delete set null;

alter table public.chat_conversations drop constraint if exists chat_conversations_user_id_fkey;
alter table public.chat_conversations add constraint chat_conversations_user_id_fkey
  foreign key (user_id) references public.profiles(id) on update cascade on delete set null;

alter table public.inventory_logs drop constraint if exists inventory_logs_profile_id_fkey;
alter table public.inventory_logs add constraint inventory_logs_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on update cascade on delete set null;

-- ---------------------------------------------------------------------------
-- 2a. Bestellingen
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can view orders by ID" on public.orders;
drop policy if exists "select_orders_policy" on public.orders;
drop policy if exists "update_orders_policy" on public.orders;
drop policy if exists "delete_orders_policy" on public.orders;
drop policy if exists "Users can view own orders" on public.orders;

-- Lezen: je eigen bestellingen, of alles als beheerder.
create policy "orders_select_eigen_of_beheer"
  on public.orders for select
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or (
      nullif(auth.jwt() ->> 'email', '') is not null
      and lower(email) = lower(auth.jwt() ->> 'email')
    )
    or public.is_admin()
  );

-- Wijzigen en verwijderen: alleen beheerders. Alle andere schrijfacties lopen
-- via serverroutes met de servicesleutel, die de regels sowieso omzeilt.
create policy "orders_update_beheer"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "orders_delete_beheer"
  on public.orders for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2b. Orderregels
-- ---------------------------------------------------------------------------
drop policy if exists "Users can view order items" on public.order_items;
drop policy if exists "select_order_items_policy" on public.order_items;
drop policy if exists "update_order_items_policy" on public.order_items;
drop policy if exists "delete_order_items_policy" on public.order_items;

create policy "order_items_select_eigen_of_beheer"
  on public.order_items for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          (auth.uid() is not null and auth.uid() = o.user_id)
          or (
            nullif(auth.jwt() ->> 'email', '') is not null
            and lower(o.email) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

create policy "order_items_update_beheer"
  on public.order_items for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "order_items_delete_beheer"
  on public.order_items for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2c. Klantprofielen
-- ---------------------------------------------------------------------------
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "anyone_read_profiles" on public.profiles;

create policy "profiles_select_eigen_of_beheer"
  on public.profiles for select
  using (
    (auth.uid() is not null and (auth.uid() = id or auth.uid() = user_id))
    or public.is_admin()
  );
