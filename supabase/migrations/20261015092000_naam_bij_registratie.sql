-- De naam die iemand bij het registreren invult, werd weggegooid.
--
-- Het formulier vraagt "Naam" en stuurt die mee als gebruikersgegeven, maar de
-- trigger keek er niet naar. Een nieuwe klant had daarna een profiel zonder
-- naam, en in de admin stond een lege regel. Nu vullen we voornaam en
-- achternaam, maar alleen als ze nog leeg zijn: bij een gastprofiel dat wordt
-- overgenomen staat de naam uit de bestelling er al, en die is betrouwbaarder.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  volledige_naam text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
  voornaam text := nullif(split_part(volledige_naam, ' ', 1), '');
  achternaam text := nullif(btrim(substr(volledige_naam, coalesce(nullif(position(' ' in volledige_naam), 0), length(volledige_naam) + 1))), '');
begin
  -- Bestond er al een klantenkaart op dit e-mailadres, van een gastbestelling?
  -- Die nemen we over, zodat naam, telefoonnummer en bestelhistorie behouden
  -- blijven en er geen tweede rij met hetzelfde e-mailadres ontstaat.
  update public.profiles
     set id = new.id,
         user_id = new.id,
         email = new.email,
         first_name = coalesce(nullif(btrim(first_name), ''), voornaam),
         last_name = coalesce(nullif(btrim(last_name), ''), achternaam),
         updated_at = now()
   where id <> new.id
     and email is not null
     and new.email is not null
     and lower(email) = lower(new.email);

  if found then
    return new;
  end if;

  insert into public.profiles (id, email, user_id, first_name, last_name, created_at, updated_at)
  values (new.id, new.email, new.id, voornaam, achternaam, now(), now())
  on conflict (id) do update
     set email = excluded.email,
         user_id = excluded.user_id,
         first_name = coalesce(nullif(btrim(public.profiles.first_name), ''), excluded.first_name),
         last_name = coalesce(nullif(btrim(public.profiles.last_name), ''), excluded.last_name),
         updated_at = now();

  return new;
exception
  when others then
    -- Een profielrij is nuttig, maar nooit zó nuttig dat iemand daardoor geen
    -- account mag aanmaken. Loggen en doorgaan.
    raise warning 'handle_new_user overgeslagen voor % : %', new.id, sqlerrm;
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
