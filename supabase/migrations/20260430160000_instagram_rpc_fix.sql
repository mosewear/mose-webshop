-- =====================================================
-- Fix get_instagram_display_data: ORDER BY in jsonb_agg
-- =====================================================
-- De originele RPC verwees in de outer aggregate ORDER BY naar
-- created_at, maar de inner SELECT selecteerde die kolom niet,
-- waardoor Postgres faalde met "column 'created_at' does not exist"
-- en de hele functie NULL teruggaf. Daardoor bleef de marquee
-- onzichtbaar op de homepage ondanks dat 'enabled' aan stond.
--
-- Fix: include created_at in de inner SELECT zodat de outer
-- ORDER BY hem kan resolven. We laten 'm uit de uitgaande JSON
-- niet expliciet weg - de storefront-types negeren hem gewoon.

CREATE OR REPLACE FUNCTION get_instagram_display_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_row instagram_settings%ROWTYPE;
  posts_json   jsonb;
BEGIN
  SELECT * INTO settings_row FROM instagram_settings ORDER BY created_at LIMIT 1;

  IF settings_row.id IS NULL OR settings_row.enabled = false THEN
    RETURN jsonb_build_object(
      'enabled', false,
      'settings', NULL,
      'posts', '[]'::jsonb
    );
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',            p.id,
        'instagram_id',  p.instagram_id,
        'permalink',     p.permalink,
        'media_type',    p.media_type,
        'media_url',     p.media_url,
        'thumbnail_url', p.thumbnail_url,
        'caption',       p.caption,
        'caption_en',    p.caption_en,
        'like_count',    p.like_count,
        'taken_at',      p.taken_at,
        'is_pinned',     p.is_pinned,
        'pin_order',     p.pin_order,
        'source',        p.source
      )
      ORDER BY
        p.is_pinned DESC,
        p.pin_order ASC NULLS LAST,
        p.taken_at  DESC NULLS LAST,
        p.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO posts_json
  FROM (
    SELECT
      id,
      instagram_id,
      permalink,
      media_type,
      media_url,
      thumbnail_url,
      caption,
      caption_en,
      like_count,
      taken_at,
      is_pinned,
      pin_order,
      source,
      created_at
    FROM instagram_posts
    WHERE is_hidden = false
    ORDER BY is_pinned DESC, pin_order ASC NULLS LAST, taken_at DESC NULLS LAST, created_at DESC
    LIMIT settings_row.max_posts
  ) p;

  RETURN jsonb_build_object(
    'enabled',  true,
    'settings', to_jsonb(settings_row) - 'created_at' - 'updated_at',
    'posts',    posts_json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_instagram_display_data() TO anon, authenticated;
