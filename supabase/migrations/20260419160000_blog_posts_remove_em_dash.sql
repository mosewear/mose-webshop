-- Replace em dashes (U+2014) in published blog copy with commas, matching seed-blog-posts.ts.
UPDATE blog_posts
SET
  excerpt_nl = replace(replace(excerpt_nl, ' — ', ', '), '—', ', '),
  excerpt_en = replace(replace(excerpt_en, ' — ', ', '), '—', ', '),
  content_nl = replace(replace(content_nl, ' — ', ', '), '—', ', '),
  content_en = replace(replace(content_en, ' — ', ', '), '—', ', '),
  seo_description_nl = replace(replace(seo_description_nl, ' — ', ', '), '—', ', '),
  seo_description_en = replace(replace(seo_description_en, ' — ', ', '), '—', ', ')
WHERE
  excerpt_nl LIKE '%—%'
  OR excerpt_en LIKE '%—%'
  OR content_nl LIKE '%—%'
  OR content_en LIKE '%—%'
  OR seo_description_nl LIKE '%—%'
  OR seo_description_en LIKE '%—%';
