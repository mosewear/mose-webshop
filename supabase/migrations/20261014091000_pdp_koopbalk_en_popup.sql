-- Vaste koopbalk aan, nieuwsbriefpopup van de productpagina af.
--
-- KOOPBALK. Gemeten op een iPhone 14: de knop "In winkelmand" staat op 1148px,
-- oftewel 1,73 scherm, en verdwijnt daarna. De pagina is 5213px lang, dus op
-- ruim zes van de acht schermen is er geen zichtbare manier om te bestellen.
-- Van zeven onderzochte concurrenten hebben er zes een vaste koopbalk, en vier
-- daarvan (Les Deux, Suitsupply, Colorful Standard, Asket) hebben hun eerste
-- koopmoment op nul schermen. MOSE was met 1,73 de slechtste van de acht.
--
-- Deze balk stond eerder bewust uit omdat hij de cookiebanner afdekte. Dat is
-- opgelost: de banner publiceert zijn hoogte als --cookie-consent-height en de
-- balk schuift daarop mee.
UPDATE site_settings
SET value = 'true'::jsonb, updated_at = NOW()
WHERE key = 'pdp_sticky_picker_enabled';

-- POPUP. Stond aan op productpagina's met een timer van 10 seconden en
-- daarnaast bij 35% scrollen, precies waar de productbeschrijving staat. Wie
-- uit een advertentie op een product landt, kreeg dus na tien seconden een
-- kortingsvenster over het product heen. Dat onderbreekt koopintentie uit
-- betaald verkeer om een adres te vangen dat je bij het afrekenen toch krijgt.
-- Homepage en shop blijven staan.
UPDATE site_settings
SET value = '["home","shop"]'::jsonb, updated_at = NOW()
WHERE key = 'popup_show_on_pages';
