/**
 * Sendcloud API Integration voor MOSE
 * 
 * Documentatie: https://docs.sendcloud.sc/api/v2/shipping/
 * 
 * Features:
 * - Label aanmaken
 * - Tracking ophalen
 * - Status updates
 * - Multiple carriers (DHL, PostNL, DPD, etc.)
 */

import 'server-only'

// Sendcloud API configuratie
const SENDCLOUD_API_URL = 'https://panel.sendcloud.sc/api/v2'
const SENDCLOUD_PUBLIC_KEY = process.env.SENDCLOUD_PUBLIC_KEY || ''
const SENDCLOUD_SECRET_KEY = process.env.SENDCLOUD_SECRET_KEY || ''

// Base64 encode credentials voor Basic Auth
function getAuthHeader(): string {
  const credentials = Buffer.from(`${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`).toString('base64')
  return `Basic ${credentials}`
}

// Helper voor API calls
async function sendcloudFetch(endpoint: string, options: RequestInit = {}) {
  // Check if credentials are configured
  if (!SENDCLOUD_PUBLIC_KEY || !SENDCLOUD_SECRET_KEY) {
    throw new Error('Sendcloud credentials niet geconfigureerd. Voeg SENDCLOUD_PUBLIC_KEY en SENDCLOUD_SECRET_KEY toe aan environment variables.')
  }

  const url = `${SENDCLOUD_API_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    let errorMessage = ''
    try {
      const errorData = await response.json()
      errorMessage = JSON.stringify(errorData)
    } catch {
      errorMessage = await response.text()
    }
    
    console.error('Sendcloud API error:', response.status, errorMessage)
    
    // Provide specific error messages for common issues
    if (response.status === 401) {
      throw new Error(`Sendcloud authenticatie mislukt (401). Controleer of SENDCLOUD_PUBLIC_KEY en SENDCLOUD_SECRET_KEY correct zijn ingesteld in je environment variables. Error: ${errorMessage}`)
    }
    
    throw new Error(`Sendcloud API error: ${response.status} - ${errorMessage}`)
  }

  return response.json()
}

// ==========================================
// INTERFACES
// ==========================================

export interface SendcloudAddress {
  name: string
  company_name?: string
  address: string
  address_2?: string
  house_number?: string
  city: string
  postal_code: string
  country: string // ISO 2-letter code (NL, BE, DE, etc.)
  email: string
  telephone?: string
}

export interface SendcloudParcelItem {
  description: string
  quantity: number
  weight: string // in kg, bijv. "0.500"
  value: string // in euros, bijv. "29.95"
  hs_code?: string
  origin_country?: string
}

export interface CreateParcelRequest {
  name: string // To address (where parcel is going)
  company_name?: string
  address: string // To address
  address_2?: string
  house_number?: string
  city: string // To city
  postal_code: string // To postal code
  country: string // To country
  email: string
  telephone?: string
  order_number: string
  
  // From address (required for returns)
  from_name?: string
  from_company_name?: string
  from_address?: string
  from_address_2?: string
  from_house_number?: string
  from_city?: string
  from_postal_code?: string
  from_country?: string
  from_email?: string
  from_telephone?: string
  
  // Parcel details
  weight: string // totaal gewicht in kg
  total_order_value: string
  shipment?: {
    id: number // Shipping method ID from Sendcloud
  }
  
  // Items (optioneel maar aangeraden)
  parcel_items?: SendcloudParcelItem[]
  
  // Extra opties
  request_label?: boolean
  apply_shipping_rules?: boolean
  is_return?: boolean
}

export interface SendcloudParcel {
  id: number
  name: string
  address: string
  city: string
  postal_code: string
  country: {
    iso_2: string
    name: string
  }
  email: string
  order_number: string
  tracking_number: string
  tracking_url: string
  status: {
    id: number
    message: string
  }
  shipment: {
    id: number
    name: string
  }
  carrier: {
    code: string
    name: string
  }
  label: {
    normal_printer: string[]
    label_printer: string
  }
  weight: string
  created_at: string
  updated_at: string
}

export interface SendcloudShippingMethod {
  id: number
  name: string
  carrier: string
  min_weight: number
  max_weight: number
  countries: Array<{
    iso_2: string
    name: string
    price: number
  }>
}

// ==========================================
// CARRIER MAPPING
// ==========================================

export const CARRIER_CODES = {
  DHL: 'dhl',
  POSTNL: 'postnl',
  DPD: 'dpd',
  UPS: 'ups',
  GLS: 'gls',
} as const

// Status mapping van Sendcloud naar onze statuses
const STATUS_MAPPING: Record<number, string> = {
  1: 'processing',      // Announced
  3: 'processing',      // Picked up by carrier
  4: 'shipped',         // Sorting
  5: 'shipped',         // In transit
  6: 'shipped',         // Out for delivery
  7: 'delivered',       // Delivered
  8: 'shipped',         // Ready for pickup
  11: 'delivered',      // Delivered at pickup point
  12: 'cancelled',      // Cancelled
  13: 'cancelled',      // Not delivered
  91: 'shipped',        // Unknown status
}

// ==========================================
// API FUNCTIONS
// ==========================================

/**
 * Haal alle beschikbare shipping methods op
 */
export async function getShippingMethods(): Promise<SendcloudShippingMethod[]> {
  try {
    const data = await sendcloudFetch('/shipping_methods')
    return data.shipping_methods || []
  } catch (error: any) {
    console.error('Error fetching shipping methods:', error)
    // Re-throw with more context
    throw new Error(`Kon shipping methods niet ophalen: ${error.message || 'Onbekende fout'}`)
  }
}

/**
 * Haal shipping methods voor specifiek land + gewicht
 */
export async function getShippingMethodsForOrder(
  countryCode: string,
  weightKg: number
): Promise<SendcloudShippingMethod[]> {
  const methods = await getShippingMethods()
  
  return methods.filter((method) => {
    // Check weight range
    const withinWeightRange = weightKg >= method.min_weight && weightKg <= method.max_weight
    
    // Check if country is supported
    const supportsCountry = method.countries.some((c) => c.iso_2 === countryCode)
    
    return withinWeightRange && supportsCountry
  })
}

/**
 * Haal het standaard DHL shipping method ID op voor Nederland
 */
export async function getDefaultDHLMethodId(): Promise<number | null> {
  try {
    const methods = await getShippingMethodsForOrder('NL', 2.0) // 2kg default
    const dhlMethod = methods.find((m) => m.carrier.toLowerCase().includes('dhl'))
    return dhlMethod?.id || null
  } catch (error: any) {
    console.error('Error getting default DHL method:', error)
    // Re-throw with more context
    throw new Error(`Kon standaard DHL method niet ophalen: ${error.message || 'Onbekende fout'}`)
  }
}

/**
 * Maak een nieuw parcel aan en genereer label
 */
export async function createParcel(
  parcelData: CreateParcelRequest
): Promise<SendcloudParcel> {
  try {
    const data = await sendcloudFetch('/parcels', {
      method: 'POST',
      body: JSON.stringify({
        parcel: {
          ...parcelData,
          request_label: true, // Automatisch label genereren
          apply_shipping_rules: true,
        },
      }),
    })

    return data.parcel
  } catch (error) {
    console.error('Error creating parcel:', error)
    throw error
  }
}

/**
 * Haal parcel informatie op via tracking number of parcel ID
 */
export async function getParcel(parcelId: number): Promise<SendcloudParcel | null> {
  try {
    const data = await sendcloudFetch(`/parcels/${parcelId}`)
    return data.parcel || null
  } catch (error) {
    console.error('Error fetching parcel:', error)
    return null
  }
}

/**
 * Haal parcel status op
 */
export async function getParcelStatus(parcelId: number): Promise<{
  status: string
  statusMessage: string
  trackingNumber: string
  trackingUrl: string
} | null> {
  try {
    const parcel = await getParcel(parcelId)
    
    if (!parcel) {
      return null
    }

    return {
      status: mapSendcloudStatus(parcel.status.id),
      statusMessage: parcel.status.message,
      trackingNumber: parcel.tracking_number,
      trackingUrl: parcel.tracking_url,
    }
  } catch (error) {
    console.error('Error getting parcel status:', error)
    return null
  }
}

/**
 * Download label als PDF
 */
export async function getParcelLabel(parcelId: number): Promise<string | null> {
  try {
    const parcel = await getParcel(parcelId)
    
    if (!parcel || !parcel.label) {
      return null
    }

    // Return eerste label URL (normale printer formaat)
    return parcel.label.normal_printer?.[0] || null
  } catch (error) {
    console.error('Error getting parcel label:', error)
    return null
  }
}

/**
 * Annuleer een parcel (alleen mogelijk als nog niet opgepakt)
 */
export async function cancelParcel(parcelId: number): Promise<boolean> {
  try {
    await sendcloudFetch(`/parcels/${parcelId}/cancel`, {
      method: 'POST',
    })
    return true
  } catch (error) {
    console.error('Error cancelling parcel:', error)
    return false
  }
}

/**
 * Maak een retourlabel aan (is_return: true)
 * Voor retouren van klanten naar MOSE
 */
export async function createReturnLabel(
  returnId: string,
  order: any,
  returnItems: any[]
): Promise<{
  label_url: string
  tracking_code: string
  tracking_url: string
  sendcloud_return_id: number
}> {
  try {
    const shippingAddress = order.shipping_address as any
    
    // Haal MOSE retour adres op uit settings
    const { getSiteSettings } = await import('./settings')
    let settings
    try {
      settings = await getSiteSettings()
    } catch (error) {
      console.error('Error fetching site settings for return label:', error)
      // Use defaults if settings fetch fails
      settings = {
        contact_address: 'Helper Brink 27a, 9722 EG Groningen',
        contact_email: 'info@mosewear.nl',
        contact_phone: '+31 50 211 1931',
      }
    }
    
    // Parse MOSE adres (bijv. "Helper Brink 27a, 9722 EG Groningen")
    const moseAddressParts = settings.contact_address.split(',')
    const moseStreet = moseAddressParts[0]?.trim() || 'Helper Brink 27a'
    const mosePostalCity = moseAddressParts[1]?.trim() || '9722 EG Groningen'
    const mosePostalCode = mosePostalCity.split(' ').slice(0, 2).join(' ') || '9722 EG'
    const moseCity = mosePostalCity.split(' ').slice(2).join(' ') || 'Groningen'
    
    // Bereken totaal gewicht (schatting op basis van return items)
    let totalWeight = 0
    returnItems.forEach((returnItem: any) => {
      const orderItem = order.order_items.find((item: any) => item.id === returnItem.order_item_id)
      if (orderItem) {
        const isHoodie = orderItem.product_name.toLowerCase().includes('hoodie')
        const type = isHoodie ? 'hoodie' : 'tshirt'
        totalWeight += estimateClothingWeight(returnItem.quantity, type)
      }
    })

    // Minimaal 0.5kg, afgerond naar boven
    totalWeight = Math.max(0.5, Math.ceil(totalWeight * 10) / 10)

    // Format klant adres (from address - waar het pakket vandaan komt)
    const customerAddress = formatAddressForSendcloud({
      name: shippingAddress.name,
      address: shippingAddress.address,
      city: shippingAddress.city,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country || 'NL',
      email: order.email,
      phone: shippingAddress.phone,
    })
    
    // Format MOSE adres (to address - waar het pakket naartoe gaat)
    const moseAddress = formatAddressForSendcloud({
      name: 'MOSE Wear',
      address: moseStreet,
      city: moseCity,
      postalCode: mosePostalCode,
      country: 'NL',
      email: settings.contact_email,
      phone: settings.contact_phone,
    })

    // Bepaal shipping method (gebruik standaard DHL)
    const methodId = await getDefaultDHLMethodId()
    if (!methodId) {
      throw new Error('Geen geschikt verzendmethode gevonden voor retour')
    }

    // Bereken totaal waarde van return items
    let totalOrderValue = 0
    returnItems.forEach((returnItem: any) => {
      const orderItem = order.order_items.find((item: any) => item.id === returnItem.order_item_id)
      if (orderItem) {
        totalOrderValue += orderItem.price_at_purchase * returnItem.quantity
      }
    })

    // Maak retour parcel aan
    // Voor returns: from_* = klant adres (waar het pakket vandaan komt)
    //              to_* = MOSE adres (waar het pakket naartoe gaat)
    const parcelData: CreateParcelRequest = {
      // To address (MOSE - waar het pakket naartoe gaat)
      name: moseAddress.name,
      address: moseAddress.address,
      city: moseAddress.city,
      postal_code: moseAddress.postal_code,
      country: moseAddress.country,
      email: moseAddress.email,
      telephone: moseAddress.telephone,
      
      // From address (klant - waar het pakket vandaan komt) - VERPLICHT voor returns
      from_name: customerAddress.name,
      from_address: customerAddress.address,
      from_city: customerAddress.city,
      from_postal_code: customerAddress.postal_code,
      from_country: customerAddress.country,
      from_email: customerAddress.email,
      from_telephone: customerAddress.telephone,
      
      order_number: `RETURN-${returnId.slice(0, 8).toUpperCase()}`,
      weight: totalWeight.toFixed(1),
      total_order_value: totalOrderValue.toFixed(2),
      shipment: {
        id: methodId,
      },
      is_return: true, // ← BELANGRIJK: Dit maakt het een retourlabel
      request_label: true,
      apply_shipping_rules: true,
    }

    const parcel = await createParcel(parcelData)

    if (!parcel || !parcel.label) {
      throw new Error('Label kon niet worden gegenereerd')
    }

    const labelUrl = parcel.label.normal_printer?.[0] || null
    if (!labelUrl) {
      throw new Error('Label URL niet beschikbaar')
    }

    return {
      label_url: labelUrl,
      tracking_code: parcel.tracking_number,
      tracking_url: parcel.tracking_url,
      sendcloud_return_id: parcel.id,
    }
  } catch (error: any) {
    console.error('Error creating return label:', error)
    throw new Error(`Kon retourlabel niet aanmaken: ${error.message || 'Onbekende fout'}`)
  }
}

/**
 * Map Sendcloud status ID naar onze order status
 */
export function mapSendcloudStatus(statusId: number): string {
  return STATUS_MAPPING[statusId] || 'processing'
}

/**
 * Check of Sendcloud correct geconfigureerd is
 */
export function isSendcloudConfigured(): boolean {
  return !!SENDCLOUD_PUBLIC_KEY && !!SENDCLOUD_SECRET_KEY
}

/**
 * Bereken geschat gewicht voor kledingstuk
 */
export function estimateClothingWeight(quantity: number, type: 'tshirt' | 'hoodie' | 'pants' | 'other' = 'other'): number {
  const weights = {
    tshirt: 0.25,  // 250g
    hoodie: 0.65,  // 650g
    pants: 0.45,   // 450g
    other: 0.40,   // 400g default
  }
  
  return weights[type] * quantity
}

/**
 * Format adres naar Sendcloud format
 */
export function formatAddressForSendcloud(address: {
  name: string
  address: string
  city: string
  postalCode: string
  country?: string
  email?: string
  phone?: string
}): SendcloudAddress {
  // Split huisnummer van straat (Nederlandse format)
  const addressMatch = address.address.match(/^(.+?)\s+(\d+.*)$/)
  const street = addressMatch ? addressMatch[1] : address.address
  const houseNumber = addressMatch ? addressMatch[2] : ''

  return {
    name: address.name,
    address: street,
    house_number: houseNumber,
    city: address.city,
    postal_code: address.postalCode.replace(/\s/g, ''), // Remove spaces
    country: address.country || 'NL',
    email: address.email || '',
    telephone: address.phone || '',
  }
}

