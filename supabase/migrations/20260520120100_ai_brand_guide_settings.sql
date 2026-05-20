-- Phase 3a: brand guide stored as a single JSON blob in site_settings so
-- the downstream prompt + QA pipeline has one source of truth for the
-- MOSE visual identity. Editable from /admin/ai-campaigns/brand-guide.

INSERT INTO site_settings (key, value, description, updated_at)
VALUES
  (
    'ai_brand_guide',
    '{
      "palette": {
        "primary": "#0E0E0E",
        "secondary": "#F4EFE6",
        "accents": ["#7A5A3A", "#D7C5A8"],
        "max_palette_distance": 35
      },
      "typography": {
        "primary": "Inter",
        "secondary": "Inter",
        "weight_emphasis": "600"
      },
      "voice": {
        "tone": "Streetwear minimal — direct, zelfverzekerd, geen overdrijving.",
        "do": [
          "Houd de focus op de drager en het silhouet van het kledingstuk.",
          "Gebruik natuurlijk licht en straatomgeving (Nederlands stedelijk, niet generiek US).",
          "Lichtstijl: subtiele schaduwen, korrelig film-gevoel.",
          "Garment moet 1:1 herkenbaar zijn (pasvorm, stof, kleur, label/embroidery).",
          "Houd composities rustig — 1 model, geen drukke achtergrond."
        ],
        "dont": [
          "Geen oversaturated kleuren of HDR-look.",
          "Geen herkenbare gezichten van bekende personen.",
          "Geen logos of merken van derden in beeld.",
          "Geen gewijzigde garment-snit (laat de pasvorm exact uit de bronfoto).",
          "Geen tekst- of UI-elementen ingebakken in het beeld (laat dat aan de ad-template)."
        ]
      },
      "tagline": "MOSE — alledaags streetwear voor wie eerlijk wil staan.",
      "guardrails": {
        "ssim_min": 0.78,
        "palette_distance_max": 35,
        "ad_policy_blocked_terms": [
          "free shipping",
          "100% guaranteed",
          "miracle",
          "lose weight",
          "before/after"
        ]
      }
    }'::JSONB,
    'Centrale brand guide voor de AI creative pipeline (paletten, voice, do/dont, QA thresholds).',
    now()
  )
ON CONFLICT (key) DO NOTHING;
