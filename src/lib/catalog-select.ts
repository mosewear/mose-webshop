export const SHOP_PRODUCT_SELECT = `
          *,
          name_en,
          description_en,
          category:categories(name, name_en, slug),
          images:product_images(url, alt_text, is_primary, media_type, color, position),
          variants:product_variants(id, fulfillment_mode, supplier_orderable, supplier_checked_at, price_adjustment, size, color, color_hex, stock_quantity, presale_stock_quantity, presale_enabled, presale_expected_date, is_available)
        ` as const

export const PDP_PRODUCT_SELECT = `
        *,
        name_en,
        description_en,
        size_guide_content_en,
        product_images(*),
        product_variants(
          id,
          product_id,
          fulfillment_mode,
          supplier_orderable,
          supplier_checked_at,
          size,
          color,
          color_hex,
          sku,
          stock_quantity,
          presale_stock_quantity,
          presale_enabled,
          presale_expected_date,
          presale_expected_date_en,
          price_adjustment,
          is_available,
          display_order,
          created_at
        ),
        categories(name, name_en, slug, size_guide_type, size_guide_content, size_guide_content_en, default_product_details, default_product_details_en, default_materials_care, default_materials_care_en, pdp_signature_specs, pdp_signature_specs_en),
        product_quantity_discounts(id, min_quantity, discount_type, discount_value, is_active)
      ` as const
