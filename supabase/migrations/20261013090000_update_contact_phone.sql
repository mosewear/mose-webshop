-- Nieuw telefoonnummer van MOSE.
--
-- De waarde in site_settings is de bron voor de footer, de contactpagina, de
-- e-mails en het tweede tabblad van de chat. De vaste waarden in de code zijn
-- in dezelfde wijziging meegegaan, zodat een fallback nooit een ander nummer
-- toont dan de instelling.
UPDATE site_settings
SET value = '"+31 50 234 0025"',
    updated_at = NOW()
WHERE key = 'contact_phone';
