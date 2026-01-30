/**
 * Sendcloud V3 Returns API Implementation
 * 
 * Dit bestand bevat ALLEEN de V3 Returns API functies.
 * Normale verzendingen blijven de V2 Parcels API gebruiken (in sendcloud.ts).
 */

const SENDCLOUD_API_URL_V3 = 'https://panel.sendcloud.sc/api/v3'
const SENDCLOUD_PUBLIC_KEY = process.env.SENDCLOUD_PUBLIC_KEY
const SENDCLOUD_SECRET_KEY = process.env.SENDCLOUD_SECRET_KEY

// V3 Returns API Types
export interface AddressV3 {
  name: string
  company_name?: string
  address_line_1: string
  house_number?: string
  address_line_2?: string
  postal_code: string
  city: string
  country_code: string
  email?: string
  phone_number?: string
}

export interface WeightV3 {
  value: number
  unit: 'kg' | 'g'
}

export interface DimensionsV3 {
  length: number
  width: number
  height: number
  unit: 'cm' | 'mm'
}

export interface PriceV3 {
  value: number
  currency: string
}

export interface ParcelItemV3 {
  description: string
  quantity: number
  weight?: WeightV3
  price?: PriceV3
  hs_code?: string
  origin_country?: string
  sku?: string
  product_id?: string
  return_reason_id?: string | null
  return_message?: string | null
}

export interface ShipWithV3 {
  type: 'shipping_option_code'
  shipping_option_code: string // DIRECT in shipWith!
  weight: WeightV3 // Weight IN shipWith volgens MCP docs!
}

export interface CreateReturnRequestV3 {
  from_address: AddressV3
  to_address: AddressV3
  ship_with: ShipWithV3 // weight zit in shipWith!
  dimensions?: DimensionsV3
  collo_count?: number
  parcel_items?: ParcelItemV3[]
  send_tracking_emails?: boolean
  brand_id?: number
  total_insured_value?: PriceV3
  order_number?: string
  total_order_value?: PriceV3
  external_reference?: string
  apply_rules?: boolean
}

/**
 * Fetch helper voor V3 API
 */
async function sendcloudFetchV3(endpoint: string, options: RequestInit = {}) {
  if (!SENDCLOUD_PUBLIC_KEY || !SENDCLOUD_SECRET_KEY) {
    throw new Error('Sendcloud credentials niet geconfigureerd')
  }

  const credentials = Buffer.from(`${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`).toString('base64')

  const response = await fetch(`${SENDCLOUD_API_URL_V3}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { message: errorText }
    }

    console.error('❌ V3 API Error Response:', errorData)
    throw new Error(`Sendcloud V3 API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

/**
 * Parse adres in straatnaam en huisnummer
 */
function parseStreetAddress(fullAddress: string): { streetName: string; houseNumber: string } {
  // Match: "Helper Brink 27a" → street: "Helper Brink", house: "27a"
  const match = fullAddress.match(/^(.+?)\s+(\d+[a-zA-Z]*)$/)
  
  if (match) {
    return {
      streetName: match[1].trim(),
      houseNumber: match[2].trim(),
    }
  }
  
  // Geen huisnummer gevonden
  return {
    streetName: fullAddress.trim(),
    houseNumber: '',
  }
}

/**
 * Schat gewicht van kledingstuk
 */
function estimateClothingWeight(quantity: number, type: 'tshirt' | 'hoodie' | 'other' = 'other'): number {
  const weights = {
    tshirt: 0.25,  // 250g
    hoodie: 0.65,  // 650g
    other: 0.40,   // 400g
  }
  
  return (weights[type] || weights.other) * quantity
}

/**
 * Haal beschikbare DHL shipping options op
 * 
 * Returns de shipping_option_code voor DHL For You Dropoff
 */
async function getDHLShippingOptionCode(
  fromPostalCode: string,
  toPostalCode: string,
  weight: number
): Promise<string> {
  console.log('🔍 Fetching DHL shipping options from V3 API...')
  console.log(`   From: ${fromPostalCode} → To: ${toPostalCode}, Weight: ${weight}kg`)
  
  try {
    const requestBody = {
      from_country_code: 'NL',
      to_country_code: 'NL',
      from_postal_code: fromPostalCode.replace(/\s+/g, ''),
      to_postal_code: toPostalCode.replace(/\s+/g, ''),
      parcels: [{
        weight: {
          value: weight.toString(),
          unit: 'kg'
        },
        dimensions: {
          length: '30',
          width: '20',
          height: '15',
          unit: 'cm'
        }
      }],
      carrier_code: 'dhl',
      calculate_quotes: false,
    }

    const response = await sendcloudFetchV3('/shipping-options', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const options = response.data || []
    console.log(`✅ Found ${options.length} DHL shipping options`)

    // Zoek "DHL For You Dropoff - S" (klein formaat, standaard voor returns)
    const dhlDropoffS = options.find((opt: any) => 
      opt.code && opt.code.includes('foryou') && opt.code.includes('size=s')
    )

    if (dhlDropoffS) {
      console.log(`✅ Using: ${dhlDropoffS.name} (${dhlDropoffS.code})`)
      return dhlDropoffS.code
    }

    // Fallback: eerste DHL optie
    if (options.length > 0) {
      const fallback = options[0]
      console.log(`⚠️  Using fallback: ${fallback.name} (${fallback.code})`)
      return fallback.code
    }

    throw new Error('Geen DHL shipping options gevonden')
  } catch (error: any) {
    console.error('❌ Failed to fetch shipping options:', error.message)
    // Hardcoded fallback: DHL For You Dropoff - S
    console.log('⚠️  Using hardcoded fallback: dhl:foryou2/dropoff,size=s')
    return 'dhl:foryou2/dropoff,size=s'
  }
}

/**
 * Maak retourlabel via V3 Returns API
 */
export async function createReturnLabelV3(
  returnId: string,
  order: any,
  returnItems: any[]
): Promise<{
  sendcloud_return_id: number
  sendcloud_parcel_id: number
  tracking_code: string | null
  tracking_url: string | null
  label_url: string | null
}> {
  console.log('🏷️  ==========================================')
  console.log('🏷️  Creating return label via V3 Returns API')
  console.log('🏷️  ==========================================')
  console.log(`   Return ID: ${returnId}`)
  console.log(`   Order ID: ${order.id}`)
  console.log(`   Return items: ${returnItems.length}`)

  // MOSE address (return destination)
  const moseAddress = process.env.MOSE_CONTACT_ADDRESS || 'Stavangerweg 13, 9723 JC Groningen'
  const moseEmail = process.env.MOSE_CONTACT_EMAIL || 'info@mosewear.nl'
  const mosePhone = process.env.MOSE_CONTACT_PHONE || '+31502111931'

  const [moseStreetPart, mosePostalCityPart] = moseAddress.split(',').map(s => s.trim())
  const mosePostalCodeMatch = mosePostalCityPart.match(/^(\d{4}\s*[A-Z]{2})/)
  const mosePostalCode = mosePostalCodeMatch ? mosePostalCodeMatch[1] : '9723JC'
  const moseCity = mosePostalCityPart.replace(mosePostalCode, '').trim() || 'Groningen'
  const { streetName: moseStreetName, houseNumber: moseHouseNumber } = parseStreetAddress(moseStreetPart)

  console.log('📍 MOSE Address (destination):')
  console.log(`   ${moseStreetName} ${moseHouseNumber}, ${mosePostalCode} ${moseCity}`)

  // Customer address (return sender)
  const shippingAddress = order.shipping_address || {}
  const customerFullAddress = shippingAddress.address || shippingAddress.street_address || ''
  const { streetName: customerStreetName, houseNumber: customerHouseNumber } = parseStreetAddress(customerFullAddress)
  const customerPostalCode = (shippingAddress.postalCode || shippingAddress.postal_code || '').replace(/\s+/g, '')

  console.log('📍 Customer Address (sender):')
  console.log(`   ${customerStreetName} ${customerHouseNumber}, ${customerPostalCode} ${shippingAddress.city}`)

  // Calculate totals
  let totalWeight = 0
  let totalValue = 0

  returnItems.forEach((returnItem: any) => {
    const orderItem = order.order_items?.find((oi: any) => oi.id === returnItem.order_item_id)
    if (orderItem) {
      const isHoodie = orderItem.product_name?.toLowerCase().includes('hoodie')
      totalWeight += estimateClothingWeight(returnItem.quantity, isHoodie ? 'hoodie' : 'tshirt')
      totalValue += orderItem.price_at_purchase * returnItem.quantity
    } else {
      totalWeight += 0.5 * returnItem.quantity
    }
  })

  console.log(`   Total weight: ${totalWeight.toFixed(2)} kg`)
  console.log(`   Total value: €${totalValue.toFixed(2)}`)

  // Get shipping option code
  console.log('🚀 About to call getDHLShippingOptionCode...')
  const shippingOptionCode = await getDHLShippingOptionCode(
    customerPostalCode,
    mosePostalCode.replace(/\s+/g, ''),
    totalWeight
  )
  console.log(`✅ Got shipping option code: "${shippingOptionCode}"`)

  // Build V3 request - GEBRUIK INTEGER WEIGHT IN shipWith!
  const weightInGrams = Math.ceil(totalWeight * 1000) // Convert to grams and round up
  
  const returnRequest: CreateReturnRequestV3 = {
    from_address: {
      name: shippingAddress.name || 'Klant',
      address_line_1: `${customerStreetName} ${customerHouseNumber}`.trim(), // Combine street + house number!
      postal_code: customerPostalCode,
      city: shippingAddress.city || '',
      country_code: (shippingAddress.country || 'NL').toUpperCase(),
      email: order.email || undefined,
      phone_number: shippingAddress.phone || undefined,
    },
    to_address: {
      name: 'Mosewear.com',
      company_name: 'Mosewear.com',
      address_line_1: `${moseStreetName} ${moseHouseNumber}`.trim(), // Combine street + house number!
      postal_code: mosePostalCode.replace(/\s+/g, ''),
      city: moseCity,
      country_code: 'NL',
      email: moseEmail,
      phone_number: mosePhone || undefined,
    },
    ship_with: {
      type: 'shipping_option_code',
      shipping_option_code: shippingOptionCode, // Direct in ship_with!
      weight: {
        value: weightInGrams, // INTEGER in grams!
        unit: 'g', // Use grams
      },
    },
    order_number: `RETURN-${returnId.slice(0, 8).toUpperCase()}`,
    total_order_value: {
      value: parseFloat(totalValue.toFixed(2)),
      currency: 'EUR',
    },
    parcel_items: returnItems.map((returnItem: any) => {
      const orderItem = order.order_items?.find((item: any) => item.id === returnItem.order_item_id)
      const itemWeight = orderItem 
        ? estimateClothingWeight(returnItem.quantity, orderItem.product_name?.toLowerCase().includes('hoodie') ? 'hoodie' : 'tshirt')
        : 0.5 * returnItem.quantity
      const itemValue = orderItem ? (orderItem.price_at_purchase * returnItem.quantity) : 0

      return {
        description: returnItem.product_name || orderItem?.product_name || 'Product',
        quantity: returnItem.quantity,
        weight: { value: parseFloat(itemWeight.toFixed(3)), unit: 'kg' as const },
        price: { value: parseFloat(itemValue.toFixed(2)), currency: 'EUR' },
        origin_country: 'NL',
        sku: orderItem?.sku || returnItem.sku || undefined,
        // return_reason_id en return_message alleen toevoegen als ze een waarde hebben
        ...(returnItem.reason ? { return_reason_id: returnItem.reason } : {}),
        ...(returnItem.message ? { return_message: returnItem.message } : {}),
      }
    }),
    send_tracking_emails: true,
    apply_rules: true,
  }

  console.log('📤 Sending V3 Returns API request...')
  console.log(`   Shipping option: ${shippingOptionCode}`)
  console.log(`   Ship with object:`, JSON.stringify(returnRequest.ship_with, null, 2))
  console.log(`   FULL REQUEST BODY:`, JSON.stringify(returnRequest, null, 2))

  // Send request
  const response = await sendcloudFetchV3('/returns', {
    method: 'POST',
    body: JSON.stringify(returnRequest),
  })

  const returnData = response.data || response
  const labelUrl = returnData.label?.normal_printer?.[0] || null

  console.log('✅ Return label created successfully!')
  console.log(`   Return ID: ${returnData.id || returnData.return_id}`)
  console.log(`   Parcel ID: ${returnData.parcel_id}`)
  console.log(`   Tracking: ${returnData.tracking_number || 'N/A'}`)
  console.log(`   Label URL: ${labelUrl ? 'Available' : 'Not yet'}`)

  return {
    sendcloud_return_id: returnData.id || returnData.return_id,
    sendcloud_parcel_id: returnData.parcel_id,
    tracking_code: returnData.tracking_number || null,
    tracking_url: returnData.tracking_url || null,
    label_url: labelUrl,
  }
}

