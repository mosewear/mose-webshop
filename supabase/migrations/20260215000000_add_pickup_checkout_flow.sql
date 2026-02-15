-- Add pickup support for checkout flow (within configurable radius from Groningen)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'shipping'
    CHECK (delivery_method IN ('shipping', 'pickup')),
  ADD COLUMN IF NOT EXISTS pickup_eligible BOOLEAN,
  ADD COLUMN IF NOT EXISTS pickup_distance_km NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS pickup_location_name TEXT,
  ADD COLUMN IF NOT EXISTS pickup_location_address TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_method ON public.orders(delivery_method);

INSERT INTO public.site_settings (key, value, description, updated_at)
VALUES ('pickup_enabled', 'true', 'Enable pickup option in checkout', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value, description, updated_at)
VALUES ('pickup_max_distance_km', '50', 'Maximum distance in kilometers for pickup eligibility', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value, description, updated_at)
VALUES ('pickup_location_name', '"MOSE Groningen"', 'Pickup location display name', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value, description, updated_at)
VALUES ('pickup_location_address', '"Stavangerweg 13, 9723 JC Groningen"', 'Pickup location address', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value, description, updated_at)
VALUES ('pickup_latitude', '53.2194', 'Pickup location latitude', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value, description, updated_at)
VALUES ('pickup_longitude', '6.5665', 'Pickup location longitude', NOW())
ON CONFLICT (key) DO NOTHING;

