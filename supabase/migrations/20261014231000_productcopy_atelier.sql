-- Dezelfde correctie in de productteksten.
--
-- Vijf regels over drie producten zeiden dat wij de kleding zelf maken, of
-- spraken over "ons lokale atelier". Alleen de werkwoordsvorm en het bezittelijk
-- voornaamwoord gaan eruit; de rest van de zin blijft zoals Rick hem schreef.

update products set description = replace(description,
  'We maken de sweater in Groningen, bij ons lokale atelier.',
  'De sweater wordt gemaakt in het atelier in Groningen.'),
  description_en = replace(description_en,
  'We produce the sweater at our atelier in Groningen, where the finishing is done by hand.',
  'The sweater is made at the atelier in Groningen, where the finishing is done by hand.'),
  updated_at = now()
where slug = 'mose-classic-sweater';

update products set description = replace(description,
  'In Groningen maken we de hoodie bij ons lokale atelier, waar de afwerking met de hand gebeurt.',
  'De hoodie wordt gemaakt in het atelier in Groningen, waar de afwerking met de hand gebeurt.'),
  description_en = replace(description_en,
  'The hoodie comes from our workshop in Groningen, where each one is finished by hand.',
  'The hoodie comes from the atelier in Groningen, where each one is finished by hand.'),
  updated_at = now()
where slug = 'mose-essential-hoodie';

update products set description = replace(description,
  'De Tee wordt gemaakt in Groningen; ons lokale atelier werkt ieder exemplaar met de hand af.',
  'De Tee wordt gemaakt in Groningen; het atelier daar werkt ieder exemplaar met de hand af.'),
  description_en = replace(coalesce(description_en,''),
  'Production takes place in Groningen, with the final finishing done by hand at our local atelier.',
  'Production takes place at the atelier in Groningen, with the final finishing done by hand.'),
  updated_at = now()
where slug = 'mose-tee';
