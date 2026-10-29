# Reporting view access

Migration `20261029000300_private_reporting_views.sql` makes reporting views use their callers' RLS policies. Paid-order and advertising reports are server-only; stock view grants remain unchanged.

Run `tests/lib/private-reporting-views-check.mjs` with `MOSE_PGLITE_MODULE` pointing to a local PGlite installation. Synthetic fixtures verify anonymous and authenticated access denial for private reports, continued service-role reads, stock visibility through RLS, and safe migration replay.
