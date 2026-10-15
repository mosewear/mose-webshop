-- De regel heette "Service role can manage all profiles", maar stond op de rol
-- `public` met voorwaarde `true`. Daardoor mocht iedereen met de publieke
-- sleutel alle 47 klantprofielen lezen en wijzigen: naam, e-mailadres,
-- telefoonnummer en besteed bedrag. De naam suggereerde het tegenovergestelde
-- van wat de regel deed.
--
-- De servicesleutel heeft deze regel niet nodig: die omzeilt alle regels al.
-- Dus de regel kan gewoon weg.
drop policy if exists "Service role can manage all profiles" on public.profiles;

-- Beheerders moeten profielen wel kunnen bijwerken (klantkaart in de admin).
drop policy if exists "profiles_update_beheer" on public.profiles;
create policy "profiles_update_beheer"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());
