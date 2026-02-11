-- Update existing banner config to 8 seconds interval
UPDATE announcement_banner 
SET rotation_interval = 8, updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Remove emoji icons from existing messages
UPDATE announcement_messages
SET icon = null, updated_at = NOW()
WHERE banner_id = '00000000-0000-0000-0000-000000000001';

-- Update links to include /nl/ locale
UPDATE announcement_messages
SET link_url = '/nl/verzending', updated_at = NOW()
WHERE banner_id = '00000000-0000-0000-0000-000000000001' 
AND text = 'GRATIS VERZENDING BOVEN €150';

UPDATE announcement_messages
SET link_url = '/nl/shop', updated_at = NOW()
WHERE banner_id = '00000000-0000-0000-0000-000000000001' 
AND text = 'NIEUWE COLLECTIE LIVE';

UPDATE announcement_messages
SET link_url = '/nl/returns', updated_at = NOW()
WHERE banner_id = '00000000-0000-0000-0000-000000000001' 
AND text = '30 DAGEN RETOURRECHT';




