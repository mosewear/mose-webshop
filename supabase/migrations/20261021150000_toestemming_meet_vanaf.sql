-- Bouncegrens meten vanaf een moment in plaats van over de hele ronde.
--
-- Op 21-10-2026 is de wachtrij door Bouncer gecontroleerd (1.537 adressen
-- eruit). De bounces van daarvoor (8 op 149, 5,4 %) zeggen niets meer over de
-- lijst die nu verstuurd wordt, maar hielden de totale stand boven de grens.
-- De bouncegrens telt daarom vanaf meet_vanaf; klachten blijven over de hele
-- ronde tellen, omdat die zeldzaam en zwaarwegend zijn.
ALTER TABLE public.toestemming_instellingen ADD COLUMN IF NOT EXISTS meet_vanaf timestamptz;
UPDATE public.toestemming_instellingen
   SET meet_vanaf = now(), max_bounce_pct = 3, max_bounces_pluk = 3, updated_at = now()
 WHERE id = 1;
