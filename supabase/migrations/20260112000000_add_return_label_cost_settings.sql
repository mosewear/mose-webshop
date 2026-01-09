-- Add return label cost settings to site_settings table
-- These settings allow admins to configure return label costs via the admin panel

INSERT INTO site_settings (key, value, description, updated_at)
VALUES 
  ('return_label_cost_excl_btw', '6.50', 'Kosten voor retourlabel excl. BTW (wordt gebruikt voor nieuwe retouren)', NOW()),
  ('return_label_cost_incl_btw', '7.87', 'Kosten voor retourlabel incl. BTW (wordt automatisch berekend op basis van BTW percentage)', NOW())
ON CONFLICT (key) DO NOTHING;


