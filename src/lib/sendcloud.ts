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

// V2 Parcels API (voor normale verzendingen)
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

// V3 Returns API (voor retourlabels)
export interface SendcloudReturnAddress {
  name: string
  company_name?: string
  address_line_1: string  // Let op: address_line_1 ipv address!
  house_number?: string
  address_line_2?: string
  postal_code: string
  city: string
  country_code: string  // Let op: country_code ipv country!
  email?: string
  phone_number?: string  // Let op: phone_number ipv telephone!
}

export interface CreateReturnRequestV3 {
  from_address: SendcloudReturnAddress  // Klant adres
  to_address: SendcloudReturnAddress    // MOSE adres
  weight: {
    value: number
    unit: 'kg' | 'g' | 'lbs' | 'oz'
  }
  ship_with: {
    type: 'shipping_option_code' | 'shipping_product_code'
    properties?: {
      shipping_option_code?: string
      contract_id?: number
    }
  }
  order_number: string
  total_order_value?: {
    value: number
    currency: string
  }
  parcel_items?: Array<{
    description: string
    quantity: number
    weight: {
      value: number
      unit: string
    }
    price: {
      value: number
      currency: string
    }
    origin_country?: string
    sku?: string
    return_reason_id?: string
    return_message?: string
  }>
}

export interface SendcloudReturnResponse {
  return_id: number
  parcel_id: number
  multi_collo_ids: number[]
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
  let parcelPayload: any = null
  let requestBody: any = null
  
  try {
    // Build final parcel object - verwijder undefined/null, maar behoud lege strings voor house_number en telephone (Sendcloud verwacht deze)
    const cleanParcelData: any = {}
    const fieldsThatCanBeEmpty = ['house_number', 'from_house_number', 'telephone', 'from_telephone']
    
    for (const [key, value] of Object.entries(parcelData)) {
      // Voor house_number en telephone velden: behoud lege strings
      if (fieldsThatCanBeEmpty.includes(key) && value === '') {
        cleanParcelData[key] = value
      }
      // Verwijder undefined, null, en lege strings (behalve voor boolean/numbers en specifieke velden hierboven)
      else if (value !== undefined && value !== null && value !== '') {
        cleanParcelData[key] = value
      } else if (typeof value === 'boolean' || typeof value === 'number') {
        // Behoud booleans en numbers, zelfs als ze 0 of false zijn
        cleanParcelData[key] = value
      }
    }
    
    parcelPayload = {
      ...cleanParcelData,
      request_label: cleanParcelData.request_label !== undefined ? cleanParcelData.request_label : true,
      apply_shipping_rules: cleanParcelData.apply_shipping_rules !== undefined ? cleanParcelData.apply_shipping_rules : true,
    }
    
    // Log de volledige payload VOORDAT het wordt verstuurd (verwijder alleen gevoelige data)
    if (parcelPayload.is_return) {
      const logPayload = { ...parcelPayload }
      if (logPayload.email) logPayload.email = '***'
      if (logPayload.telephone) logPayload.telephone = '***'
      if (logPayload.from_email) logPayload.from_email = '***'
      if (logPayload.from_telephone) logPayload.from_telephone = '***'
      
      const payloadString = JSON.stringify(logPayload, null, 2)
      console.log('📦 FULL RETURN parcel payload (wat wordt verstuurd naar Sendcloud):')
      console.log(payloadString)
      
      // Validate that all required fields are present
      const requiredToFields = ['name', 'address', 'city', 'postal_code', 'country', 'email']
      const requiredFromFields = ['from_name', 'from_address', 'from_city', 'from_postal_code', 'from_country', 'from_email']
      const missingToFields = requiredToFields.filter(field => !parcelPayload[field])
      const missingFromFields = requiredFromFields.filter(field => !parcelPayload[field])
      
      if (missingToFields.length > 0) {
        console.error('❌ Missing required TO address fields:', missingToFields)
        throw new Error(`Missing required TO address fields: ${missingToFields.join(', ')}`)
      }
      if (missingFromFields.length > 0) {
        console.error('❌ Missing required FROM address fields:', missingFromFields)
        throw new Error(`Missing required FROM address fields: ${missingFromFields.join(', ')}`)
      }
    }
    
    // Log de exacte JSON die wordt verstuurd (voor debugging)
    requestBody = {
      parcel: parcelPayload,
    }
    
    if (parcelPayload.is_return) {
      const debugPayload = JSON.parse(JSON.stringify(requestBody))
      // Maskeer gevoelige data
      if (debugPayload.parcel.email) debugPayload.parcel.email = '***'
      if (debugPayload.parcel.telephone) debugPayload.parcel.telephone = '***'
      if (debugPayload.parcel.from_email) debugPayload.parcel.from_email = '***'
      if (debugPayload.parcel.from_telephone) debugPayload.parcel.from_telephone = '***'
      const exactPayloadString = JSON.stringify(debugPayload, null, 2)
      console.log('📤 EXACT JSON payload naar Sendcloud API:')
      console.log(exactPayloadString)
    }
    
    const data = await sendcloudFetch('/parcels', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    return data.parcel
  } catch (error: any) {
    console.error('Error creating parcel:', error)
    // Voeg payload toe aan error voor debugging (alleen voor returns)
    if (parcelPayload?.is_return && requestBody) {
      const debugPayload = JSON.parse(JSON.stringify(requestBody))
      // Maskeer gevoelige data
      if (debugPayload.parcel.email) debugPayload.parcel.email = '***'
      if (debugPayload.parcel.telephone) debugPayload.parcel.telephone = '***'
      if (debugPayload.parcel.from_email) debugPayload.parcel.from_email = '***'
      if (debugPayload.parcel.from_telephone) debugPayload.parcel.from_telephone = '***'
      error.debugPayload = debugPayload
    }
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
  let parcelDataForDebug: any = null
  
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
    
    // Parse MOSE adres - gebruik exact adres zoals geconfigureerd in Sendcloud
    // Sendcloud heeft: "Mosewear.com, Stavangerweg 13, 9723 JC, Groningen"
    // Als settings niet beschikbaar zijn, gebruik Sendcloud geconfigureerd adres
    let moseStreet = 'Stavangerweg 13'
    let mosePostalCode = '9723 JC'
    let moseCity = 'Groningen'
    
    if (settings.contact_address) {
      // Parse adres uit settings (bijv. "Helper Brink 27a, 9722 EG Groningen")
      const moseAddressParts = settings.contact_address.split(',')
      moseStreet = moseAddressParts[0]?.trim() || 'Stavangerweg 13'
      const mosePostalCity = moseAddressParts[1]?.trim() || '9723 JC Groningen'
      mosePostalCode = mosePostalCity.split(' ').slice(0, 2).join(' ') || '9723 JC'
      moseCity = mosePostalCity.split(' ').slice(2).join(' ') || 'Groningen'
    }
    
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

    // Validate shipping address
    if (!shippingAddress?.name || !shippingAddress?.address || !shippingAddress?.city || !shippingAddress?.postalCode) {
      console.error('❌ Invalid shipping address:', shippingAddress)
      throw new Error('Shipping address ontbreekt of is incompleet')
    }
    
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
    
    console.log('📋 Customer address formatted:', {
      name: customerAddress.name,
      address: customerAddress.address,
      house_number: customerAddress.house_number,
      city: customerAddress.city,
      postal_code: customerAddress.postal_code,
      country: customerAddress.country,
    })
    
    // Format MOSE adres (to address - waar het pakket naartoe gaat)
    // Gebruik exact zoals geconfigureerd in Sendcloud: "Mosewear.com, Stavangerweg 13, 9723 JC, Groningen"
    const moseAddress = formatAddressForSendcloud({
      name: 'Mosewear.com', // Company name zoals geconfigureerd in Sendcloud
      address: moseStreet, // "Stavangerweg 13" - formatAddressForSendcloud split dit in street + house_number
      city: moseCity,
      postalCode: mosePostalCode, // Behoud spatie in postcode (9723 JC)
      country: 'NL',
      email: settings.contact_email || 'info@mosewear.nl',
      phone: settings.contact_phone,
    })
    
    console.log('📋 MOSE address formatted:', {
      name: moseAddress.name,
      address: moseAddress.address,
      house_number: moseAddress.house_number,
      city: moseAddress.city,
      postal_code: moseAddress.postal_code,
      country: moseAddress.country,
    })
    
    // Validate dat alle vereiste velden aanwezig zijn
    if (!customerAddress.name || !customerAddress.address || !customerAddress.city || !customerAddress.postal_code) {
      throw new Error('Klant adres is incompleet na formatting')
    }
    if (!moseAddress.name || !moseAddress.address || !moseAddress.city || !moseAddress.postal_code) {
      throw new Error('MOSE adres is incompleet na formatting')
    }

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

    // Maak retour parcel aan - V2 API met is_return: true
    // BELANGRIJK: Voor returns zijn from_* velden VERPLICHT!
    const parcelData: CreateParcelRequest = {
      // To address (MOSE - waar het pakket naartoe moet)
      name: 'Mosewear.com',
      company_name: 'Mosewear.com',
      address: moseAddress.address,
      house_number: moseAddress.house_number || '',
      city: moseAddress.city,
      postal_code: moseAddress.postal_code,
      country: moseAddress.country,
      email: moseAddress.email || 'info@mosewear.nl',
      telephone: moseAddress.telephone || '',
      
      // From address (klant - waar het pakket vandaan komt) - VERPLICHT voor is_return!
      from_name: customerAddress.name,
      from_company_name: '',
      from_address: customerAddress.address,
      from_house_number: customerAddress.house_number || '',
      from_city: customerAddress.city,
      from_postal_code: customerAddress.postal_code,
      from_country: customerAddress.country,
      from_email: customerAddress.email || order.email,
      from_telephone: customerAddress.telephone || '',
      
      order_number: `RETURN-${returnId.slice(0, 8).toUpperCase()}`,
      weight: totalWeight.toFixed(1),
      total_order_value: totalOrderValue.toFixed(2),
      shipment: {
        id: methodId,
      },
      // Parcel items toevoegen (aangeraden door Sendcloud)
      parcel_items: returnItems.map((returnItem: any) => {
        const orderItem = order.order_items.find((item: any) => item.id === returnItem.order_item_id)
        const itemWeight = orderItem ? (
          estimateClothingWeight(returnItem.quantity, 
            orderItem.product_name.toLowerCase().includes('hoodie') ? 'hoodie' : 'tshirt'
          )
        ) : 0.5
        
        return {
          description: returnItem.product_name || orderItem?.product_name || 'Product',
          quantity: returnItem.quantity,
          weight: itemWeight.toFixed(3),
          value: orderItem ? (orderItem.price_at_purchase * returnItem.quantity).toFixed(2) : '0.00',
          origin_country: 'NL',
        }
      }),
      is_return: true, // ← BELANGRIJK: Dit maakt het een retourlabel
      request_label: true,
      apply_shipping_rules: true,
    }

    // Sla payload op voor debugging
    parcelDataForDebug = JSON.parse(JSON.stringify({ parcel: parcelData }))
    // Maskeer gevoelige data
    if (parcelDataForDebug.parcel.email) parcelDataForDebug.parcel.email = '***'
    if (parcelDataForDebug.parcel.telephone) parcelDataForDebug.parcel.telephone = '***'
    if (parcelDataForDebug.parcel.from_email) parcelDataForDebug.parcel.from_email = '***'
    if (parcelDataForDebug.parcel.from_telephone) parcelDataForDebug.parcel.from_telephone = '***'

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
    // Behoud debugPayload als die er is, anders gebruik parcelDataForDebug
    const enhancedError = new Error(`Kon retourlabel niet aanmaken: ${error.message || 'Onbekende fout'}`) as any
    if (error.debugPayload) {
      enhancedError.debugPayload = error.debugPayload
    } else if (parcelDataForDebug) {
      enhancedError.debugPayload = parcelDataForDebug
    }
    throw enhancedError
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
  if (!address.name || !address.address || !address.city || !address.postalCode) {
    throw new Error(`Incompleet adres: name=${!!address.name}, address=${!!address.address}, city=${!!address.city}, postalCode=${!!address.postalCode}`)
  }
  
  // Split huisnummer van straat (Nederlandse format)
  // Bijv. "Helper Brink 27a" -> street: "Helper Brink", house_number: "27a"
  // Bijv. "Kalverstraat 123" -> street: "Kalverstraat", house_number: "123"
  const addressMatch = address.address.match(/^(.+?)\s+(\d+[a-zA-Z]?.*)$/)
  const street = addressMatch ? addressMatch[1].trim() : address.address.trim()
  const houseNumber = addressMatch ? addressMatch[2].trim() : ''

  const formatted: SendcloudAddress = {
    name: address.name.trim(),
    address: street,
    house_number: houseNumber,
    city: address.city.trim(),
    postal_code: address.postalCode.toUpperCase(), // Behoud spatie in postcode (bijv. "9723 JC")
    country: (address.country || 'NL').toUpperCase(),
    email: address.email?.trim() || '',
    telephone: address.phone?.trim() || '',
  }
  
  // Validate dat alle vereiste velden gevuld zijn
  if (!formatted.name || !formatted.address || !formatted.city || !formatted.postal_code) {
    throw new Error(`Adres formatting faalt: ${JSON.stringify(formatted)}`)
  }

  return formatted
}

// ==========================================
// V3 RETURNS API FUNCTIES
// ==========================================

// Helper voor V3 API calls (andere base URL)
async function sendcloudFetchV3(endpoint: string, options: RequestInit = {}) {
  if (!SENDCLOUD_PUBLIC_KEY || !SENDCLOUD_SECRET_KEY) {
    throw new Error('Sendcloud credentials niet geconfigureerd')
  }

  const url = `https://panel.sendcloud.sc/api/v3${endpoint}`
  
  console.log(`📡 V3 API Call: ${options.method || 'GET'} ${url}`)
  
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
    let errorData: any = null
    try {
      errorData = await response.json()
      errorMessage = JSON.stringify(errorData, null, 2)
      console.error('❌ V3 API Error Response:', errorData)
    } catch {
      errorMessage = await response.text()
      console.error('❌ V3 API Error Text:', errorMessage)
    }
    
    if (response.status === 401) {
      throw new Error(`Sendcloud authenticatie mislukt (401). Controleer credentials.`)
    }
    
    throw new Error(`Sendcloud V3 API error: ${response.status} - ${errorMessage}`)
  }

  const data = await response.json()
  console.log('✅ V3 API Response received')
  return data
}

/**
 * Haal beschikbare shipping product codes op voor retourlabels
 */
export async function getReturnShippingProductCode(): Promise<string> {
  try {
    console.log('🔍 Fetching return shipping products...')
    
    // Probeer eerst DHL return product op te halen
    try {
      const response = await sendcloudFetchV3(
        '/shipping-products?returns=true&from_country=NL&to_country=NL'
      )
      
      console.log(`   Found ${response.length || 0} shipping products`)
      
      if (response && response.length > 0) {
        // Log alle beschikbare products voor debugging
        console.log('   Available return products:')
        response.forEach((product: any, index: number) => {
          console.log(`   ${index + 1}. ${product.carrier} - ${product.code}`)
        })
        
        // Zoek DHL return product (voorkeur)
        const dhlReturn = response.find((product: any) => 
          product.carrier?.toLowerCase() === 'dhl' && 
          product.code?.includes('return')
        )
        
        if (dhlReturn) {
          console.log(`✅ Using DHL return product: ${dhlReturn.code}`)
          return dhlReturn.code
        }
        
        // Fallback: gebruik eerste beschikbare return product
        const firstProduct = response[0]
        console.log(`⚠️ DHL not found, using first available: ${firstProduct.carrier} - ${firstProduct.code}`)
        return firstProduct.code
      }
    } catch (apiError: any) {
      console.warn('⚠️ API call failed, using fallback shipping product code')
      console.warn('   API Error:', apiError.message)
    }
    
    // Fallback: gebruik DHL shipping option codes (jullie gebruiken alleen DHL)
    // Jullie gebruiken: DHL For You Dropoff (ID 9059 in v2)
    // V3 format mogelijkheden:
    const fallbackCodes = [
      'dhl-for-you:standard',    // DHL For You standard
      'dhl_for_you:dropoff',     // DHL For You dropoff met underscore
      'dhl-for-you:dropoff',     // DHL For You dropoff met streepje
      'dhl:for-you',             // DHL for you kort
      'dhl:dropoff',             // DHL dropoff kort
      'dhl:standard',            // DHL standard (laatste fallback)
    ]
    
    console.log(`⚠️ Using fallback DHL shipping option code (ID 9059 in v2)...`)
    console.log(`   Trying codes: ${fallbackCodes.slice(0, 3).join(', ')}`)
    
    const fallbackCode = fallbackCodes[0]
    console.log(`   Using: ${fallbackCode}`)
    console.log('   Note: DHL For You Dropoff - ID 9059 from v2 API')
    console.log('   Check Sendcloud Settings → Shipping Options for exact v3 code')
    
    return fallbackCode
  } catch (error: any) {
    console.error('❌ Error in getReturnShippingProductCode:', error)
    // Als alles faalt, gebruik standaard DHL return
    return 'dhl:return'
  }
}

/**
 * Maak retourlabel via V2 Parcels API met is_return: true
 * NOTE: We gebruiken V2 omdat V3 Returns API account-specifieke shipping_option_codes vereist
 * die we niet programmatisch kunnen ophalen. V2 werkt met shipping_method ID's die we WEL kennen.
 */
export async function createReturnLabelV2(
  returnId: string,
  order: any,
  returnItems: any[]
): Promise<{
  sendcloud_parcel_id: number
  tracking_code: string | null
  tracking_url: string | null
  label_url: string | null
}> {
  console.log('🏷️ ==========================================')
  console.log('🏷️ Creating return label via V2 Parcels API')
  console.log('🏷️ ==========================================')
  console.log('   Return ID:', returnId)
  console.log('   Order ID:', order.id)
  console.log('   Return items:', returnItems.length)

  // Inline fallback for settings
  const settings = {
    contact_address: process.env.MOSE_CONTACT_ADDRESS || 'Stavangerweg 13, 9723 JC Groningen',
    contact_email: process.env.MOSE_CONTACT_EMAIL || 'info@mosewear.nl',
    contact_phone: process.env.MOSE_CONTACT_PHONE || '+31612345678',
  }

  // Parse MOSE address
  const moseFullAddress = settings.contact_address
  const [moseStreetPart, mosePostalCityPart] = moseFullAddress.split(',').map((s: string) => s.trim())
  const [mosePostalCode, ...moseCityParts] = mosePostalCityPart.split(' ')
  const moseCity = moseCityParts.join(' ')
  const { streetName: moseStreetName, houseNumber: moseHouseNumber } = parseStreetAddress(moseStreetPart)

  console.log('📍 MOSE Address:')
  console.log(`   Full: ${moseFullAddress}`)
  console.log(`   Street: ${moseStreetPart}`)
  console.log(`   Postal + City: ${mosePostalCityPart}`)
  console.log(`   Parsed - Street: "${moseStreetName}", House: "${moseHouseNumber}"`)

  // Parse customer address
  const shippingAddress = order.shipping_address || {}
  const customerAddress = shippingAddress.address || shippingAddress.street_address || ''
  const { streetName: customerStreetName, houseNumber: customerHouseNumber } = parseStreetAddress(customerAddress)

  console.log('📍 Customer Address:')
  console.log(`   Full: ${customerAddress}`)
  console.log(`   Parsed - Street: "${customerStreetName}", House: "${customerHouseNumber}"`)
  console.log(`   City: ${shippingAddress.city}`)
  console.log(`   Postal: ${shippingAddress.postalCode}`)

  // Calculate totals
  const totalWeight = returnItems.reduce((sum: number, item: any) => {
    const orderItem = order.order_items?.find((oi: any) => oi.id === item.order_item_id)
    if (orderItem) {
      const isHoodie = orderItem.product_name?.toLowerCase().includes('hoodie')
      return sum + estimateClothingWeight(item.quantity, isHoodie ? 'hoodie' : 'tshirt')
    }
    return sum + 0.5
  }, 0)

  const totalValue = returnItems.reduce((sum: number, item: any) => {
    const orderItem = order.order_items?.find((oi: any) => oi.id === item.order_item_id)
    return sum + (orderItem ? orderItem.price_at_purchase * item.quantity : 0)
  }, 0)

  console.log(`   Total weight: ${totalWeight} kg`)
  console.log(`   Total value: €${totalValue.toFixed(2)}`)

  // Build V2 Parcel request with is_return: true
  const parcelData: CreateParcelRequest = {
    name: shippingAddress.name,
    company_name: '',
    address: customerStreetName,
    house_number: customerHouseNumber || '',
    city: shippingAddress.city,
    postal_code: shippingAddress.postalCode?.toUpperCase().replace(/\s+/g, ' ') || '',
    country: (shippingAddress.country || 'NL').toUpperCase(),
    email: order.email || '',
    telephone: shippingAddress.phone || '',
    
    // SENDER (MOSE) address for return
    sender_address: 1, // Use default sender address or specify details below
    
    // Return-specific fields
    is_return: true,
    
    // Shipping method: DHL For You Dropoff - S (ID: 9059)
    shipment: {
      id: 9059,  // DHL For You Dropoff - S
    },
    
    weight: totalWeight.toString(),
    order_number: `RETURN-${returnId.slice(0, 8).toUpperCase()}`,
    total_order_value: totalValue.toFixed(2),
    
    parcel_items: returnItems.map((returnItem: any) => {
      const orderItem = order.order_items?.find((item: any) => item.id === returnItem.order_item_id)
      const itemWeight = orderItem ? estimateClothingWeight(returnItem.quantity, orderItem.product_name?.toLowerCase().includes('hoodie') ? 'hoodie' : 'tshirt') : 0.5
      const itemValue = orderItem ? (orderItem.price_at_purchase * returnItem.quantity) : 0.00

      return {
        description: returnItem.product_name || orderItem?.product_name || 'Product',
        quantity: returnItem.quantity,
        weight: itemWeight.toFixed(3),
        value: itemValue.toFixed(2),
        hs_code: '',
        origin_country: 'NL',
        sku: orderItem?.sku || returnItem.sku || '',
        return_reason: returnItem.reason || '',
        return_message: returnItem.message || '',
      }
    }),
    
    request_label: true,
    apply_shipping_rules: true,
  }

  console.log('📤 Creating return parcel with V2 API...')
  console.log(`   From: ${parcelData.name} - ${parcelData.address} ${parcelData.house_number}`)
  console.log(`   Returns to: MOSE - ${moseStreetName} ${moseHouseNumber}`)
  console.log(`   Shipping method ID: 9059 (DHL For You Dropoff - S)`)
  console.log(`   is_return: true`)

  // Create parcel
  const parcel = await createParcel(parcelData)

  if (!parcel || !parcel.id) {
    throw new Error('Parcel creation failed')
  }

  const labelUrl = parcel.label?.normal_printer?.[0] || null

  console.log('✅ Return label created successfully!')
  console.log(`   Parcel ID: ${parcel.id}`)
  console.log(`   Tracking: ${parcel.tracking_number || 'N/A'}`)
  console.log(`   Label URL: ${labelUrl ? 'Available' : 'Not available'}`)

  return {
    sendcloud_parcel_id: parcel.id,
    tracking_code: parcel.tracking_number || null,
    tracking_url: parcel.tracking_url || null,
    label_url: labelUrl,
  }
}
