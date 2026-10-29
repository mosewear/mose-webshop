-- Use the existing portrait of men in MOSE hoodies on mobile.
-- Preserve later CMS edits when replayed.
update public.homepage_settings
set hero_image_url_mobile = '/hero-mobile.webp', updated_at = '2026-10-29T23:44:18.411Z'
where id = '0d99d997-867c-4a65-ac69-b33d54c4b04a'
  and hero_image_url_mobile = 'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/01-city-desktop.webp'
  and updated_at < '2026-10-29T23:44:18.411Z';
