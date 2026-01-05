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
  name: string
  company_name?: string
  address: string
  address_2?: string
  house_number?: string
  city: string
  postal_code: string
  country: string
  email: string
  telephone?: string
  order_number: string
  
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

