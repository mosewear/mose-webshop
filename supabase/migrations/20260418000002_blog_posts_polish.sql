-- Remove redundant indexes (slug already has unique index, separate status index replaced by composite)
DROP INDEX IF EXISTS idx_blog_posts_slug;
DROP INDEX IF EXISTS idx_blog_posts_status;
DROP INDEX IF EXISTS idx_blog_posts_published_at;

-- Composite index for common listing query: published posts ordered by date
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON blog_posts(status, published_at DESC);

-- Auto-update updated_at on row changes
CREATE OR REPLACE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
