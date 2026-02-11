# Newsletter Subscription Fix - Database Constraint Update

## Problem
The Early Access page signup fails with:
```
500 Internal Server Error
new row for relation "newsletter_subscribers" violates check constraint "newsletter_subscribers_source_check"
```

## Root Cause
The database constraint on `newsletter_subscribers.source` does NOT allow `'early_access_landing'`.

Current database state:
- ✅ Constraint exists
- ❌ Does NOT include `'early_access_landing'` value
- ✅ Only allows: `homepage`, `product_page`, `checkout`, `footer`, `popup`, `early_access`

## Solution
Run the SQL migration to update the constraint.

## Steps to Fix

### Option 1: Supabase Dashboard (Recommended - Fastest)
1. Go to: https://supabase.com/dashboard/project/bsklcgeyvdsxjxvmghbp/sql
2. Copy and paste this SQL:

```sql
-- Update newsletter_subscribers source check constraint
ALTER TABLE newsletter_subscribers 
DROP CONSTRAINT IF EXISTS newsletter_subscribers_source_check;

ALTER TABLE newsletter_subscribers
ADD CONSTRAINT newsletter_subscribers_source_check 
CHECK (source IN (
  'homepage',
  'product_page', 
  'checkout',
  'footer',
  'popup',
  'early_access',
  'early_access_landing'
));
```

3. Click "Run" (or press Ctrl+Enter)
4. You should see: "Success. No rows returned"

### Option 2: Terminal (if you have Supabase CLI setup)
```bash
cd /Users/rickschlimback/Desktop/mose-webshop
supabase db push
```

## Verification
After running the SQL, test the signup again at:
https://www.mosewear.com/nl/early-access

The error should be gone and newsletter signups should work! ✅

## Files Created
- `supabase/migrations/20260203120000_allow_early_access_landing_source.sql` - The migration file
- `check-newsletter-constraint.js` - Script that confirmed the issue
- `execute-sql-migration.js` - Attempted to run migration (but requires manual execution)

## Note
This is the ONLY blocker preventing Early Access signups from working.
Once this constraint is updated, everything will work perfectly!


