/**
 * Database i18n Helper Functions
 * 
 * Helper functions to get locale-aware content from the database.
 * These functions automatically select the correct language field based on the current locale.
 */

/**
 * Get the correct field name for a given locale
 * 
 * @example
 * getLocalizedField('name', 'en') // returns 'name_en'
 * getLocalizedField('name', 'nl') // returns 'name'
 */
export function getLocalizedField(fieldName: string, locale: string): string {
  // Dutch is the default, so no suffix needed
  if (locale === 'nl') {
    return fieldName
  }
  // For other locales, append the locale code
  return `${fieldName}_${locale}`
}

/**
 * Get localized product fields based on locale
 * 
 * This returns an object with the correct field names that should be used in Supabase queries
 */
export function getProductFields(locale: string) {
  return {
    nameField: getLocalizedField('name', locale),
    descriptionField: getLocalizedField('description', locale),
  }
}

/**
 * Get localized category fields based on locale
 */
export function getCategoryFields(locale: string) {
  return {
    nameField: getLocalizedField('name', locale),
    descriptionField: getLocalizedField('description', locale),
  }
}

/**
 * Map a product from database to include the localized fields as the main fields
 * This ensures backwards compatibility - the rest of the code can still use product.name
 */
export function mapLocalizedProduct(product: any, locale: string) {
  if (!product) return null
  
  const { nameField, descriptionField } = getProductFields(locale)
  
  return {
    ...product,
    // Use localized fields if available, fallback to Dutch
    name: product[nameField] || product.name,
    description: product[descriptionField] || product.description,
  }
}

/**
 * Map a category from database to include the localized fields as the main fields
 */
export function mapLocalizedCategory(category: any, locale: string) {
  if (!category) return null
  
  const { nameField, descriptionField } = getCategoryFields(locale)
  
  return {
    ...category,
    // Use localized fields if available, fallback to Dutch
    name: category[nameField] || category.name,
    description: category[descriptionField] || category.description,
  }
}

/**
 * Map homepage settings from database to include the localized fields as the main fields
 */
export function mapLocalizedHomepage(settings: any, locale: string) {
  if (!settings) return null
  
  const suffix = locale === 'nl' ? '' : `_${locale}`
  
  // Map all text fields
  const localizedFields = [
    'hero_badge', 'hero_title', 'hero_subtitle', 'hero_button_text',
    'story_badge', 'story_title', 'story_title_highlight', 'story_description_1', 'story_description_2',
    'story_stat_1_label', 'story_stat_1_sublabel', 'story_stat_2_label', 'story_stat_2_sublabel',
    'story_stat_3_label', 'story_stat_3_sublabel', 'story_cta_text',
    'newsletter_title', 'newsletter_description', 'newsletter_no_spam', 'newsletter_placeholder',
    'newsletter_submit', 'newsletter_privacy'
  ]
  
  const result = { ...settings }
  
  // Map each field to use localized version if available
  localizedFields.forEach(field => {
    const localizedField = `${field}${suffix}`
    if (settings[localizedField] !== undefined && settings[localizedField] !== null) {
      result[field] = settings[localizedField]
    }
  })
  
  return result
}


/**
 * Build a Supabase select query string that includes both NL and EN fields for products
 * This is useful when you need both languages (e.g., for metadata generation)
 */
export function getProductSelectQuery(locale: string = 'nl'): string {
  const baseFields = `
    id,
    slug,
    name,
    description,
    name_en,
    description_en,
    base_price,
    sale_price,
    meta_title,
    meta_description,
    is_active,
    created_at,
    updated_at
  `
  
  return baseFields.trim()
}

/**
 * Build a Supabase select query string for categories
 */
export function getCategorySelectQuery(locale: string = 'nl'): string {
  const baseFields = `
    id,
    slug,
    name,
    description,
    name_en,
    description_en,
    image_url,
    is_active,
    created_at
  `
  
  return baseFields.trim()
}

