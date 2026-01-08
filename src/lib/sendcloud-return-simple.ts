/**
 * SIMPELE Return Label Generator
 * 
 * Gebruikt gewoon de normale Parcels API (V2) maar dan met omgekeerde adressen:
 * - TO = MOSE (Stavangerweg 13)
 * - FROM = Klant (via shipping_address)
 * 
 * GEEN is_return flag, GEEN V3 API, gewoon een normaal label!
 */

const SENDCLOUD_API_URL = 'https://panel.sendcloud.sc/api/v2'
const SENDCLOUD_PUBLIC_KEY = process.env.SENDCLOUD_PUBLIC_KEY
const SENDCLOUD_SECRET_KEY = process.env.SENDCLOUD_SECRET_KEY

async function sendcloudFetch(endpoint: string, options: RequestInit = {}) {
  if (!SENDCLOUD_PUBLIC_KEY || !SENDCLOUD_SECRET_KEY) {
    throw new Error('Sendcloud credentials not configured')
  }

  const credentials = Buffer.from(`${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`).toString('base64')

  const response = await fetch(`${SENDCLOUD_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Sendcloud API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

/**
 * Parse Nederlandse adressen (straat + huisnummer)
 */
function parseAddress(fullAddress: string): { street: string; houseNumber: string } {
  const match = fullAddress.match(/^(.+?)\s+(\d+[a-zA-Z]*)$/)
  if (match) {
    return {
      street: match[1].trim(),
      houseNumber: match[2].trim(),
    }
  }
  return {
    street: fullAddress.trim(),
    houseNumber: '',
  }
}

/**
 * Schat gewicht van kledingstuk
 */
function estimateWeight(quantity: number, type: 'tshirt' | 'hoodie' | 'other' = 'other'): number {
  const weights = { tshirt: 0.25, hoodie: 0.65, other: 0.40 }
  return (weights[type] || weights.other) * quantity
}

/**
 * Maak return label (gewoon normaal verzendlabel maar andersom!)
 */
export async function createReturnLabelSimple(
  returnId: string,
  order: any,
  returnItems: any[]
): Promise<{
  parcel_id: number
  tracking_number: string | null
  tracking_url: string | null
  label_url: string | null
}> {
  console.log('🏷️ Creating return label (simple method - normal parcel)')
  console.log(`   Return ID: ${returnId}`)
  console.log(`   Order ID: ${order.id}`)

  // MOSE address (DESTINATION - waar pakket naartoe gaat)
  const moseAddress = process.env.MOSE_CONTACT_ADDRESS || 'Stavangerweg 13, 9723 JC Groningen'
  const [moseStreet, mosePostalCity] = moseAddress.split(',').map(s => s.trim())
  const mosePostalMatch = mosePostalCity.match(/^(\d{4}\s*[A-Z]{2})/)
  const mosePostalCode = mosePostalMatch ? mosePostalMatch[1] : '9723 JC'
  const moseCity = mosePostalCity.replace(mosePostalCode, '').trim() || 'Groningen'
  const { street: moseStreetName, houseNumber: moseHouseNumber } = parseAddress(moseStreet)

  // Customer address (SENDER - waar pakket vandaan komt)
  const shippingAddress = order.shipping_address || {}
  const customerAddress = shippingAddress.address || shippingAddress.street_address || ''
  const { street: customerStreet, houseNumber: customerHouseNumber } = parseAddress(customerAddress)

  // Calculate weight
  let totalWeight = 0
  returnItems.forEach((item: any) => {
    const orderItem = order.order_items?.find((oi: any) => oi.id === item.order_item_id)
    if (orderItem) {
      const isHoodie = orderItem.product_name?.toLowerCase().includes('hoodie')
      totalWeight += estimateWeight(item.quantity, isHoodie ? 'hoodie' : 'tshirt')
    } else {
      totalWeight += 0.5 * item.quantity
    }
  })
  totalWeight = Math.max(0.5, Math.ceil(totalWeight * 10) / 10) // Min 0.5kg, round to 0.1

  // Calculate value
  let totalValue = 0
  returnItems.forEach((item: any) => {
    const orderItem = order.order_items?.find((oi: any) => oi.id === item.order_item_id)
    if (orderItem) {
      totalValue += orderItem.price_at_purchase * item.quantity
    }
  })

  console.log(`📦 Creating parcel:`)
  console.log(`   TO (MOSE): ${moseStreetName} ${moseHouseNumber}, ${mosePostalCode} ${moseCity}`)
  console.log(`   FROM (Customer): ${customerStreet} ${customerHouseNumber}, ${shippingAddress.postalCode} ${shippingAddress.city}`)
  console.log(`   Weight: ${totalWeight} kg, Value: €${totalValue.toFixed(2)}`)

  // Maak NORMAAL parcel (geen is_return!)
  const parcelData = {
    parcel: {
      // TO address = MOSE
      name: 'Mosewear.com',
      company_name: 'Mosewear.com',
      address: moseStreetName,
      house_number: moseHouseNumber,
      city: moseCity,
      postal_code: mosePostalCode,
      country: 'NL',
      email: 'info@mosewear.nl',
      telephone: '+31612345678',

      // Sender address (gebruik configured sender)
      sender_address: 726478, // ID van je sender address

      // Shipping method (DHL For You Dropoff - S voor kleine pakketten)
      shipment: {
        id: 9059, // DHL For You Dropoff - S
      },

      // Parcel details
      weight: totalWeight.toFixed(1),
      order_number: `RETURN-${returnId.slice(0, 8).toUpperCase()}`,
      total_order_value: totalValue.toFixed(2),

      // Request label
      request_label: true,
      apply_shipping_rules: true,

      // Parcel items
      parcel_items: returnItems.map((returnItem: any) => {
        const orderItem = order.order_items?.find((item: any) => item.id === returnItem.order_item_id)
        const itemWeight = orderItem 
          ? estimateWeight(returnItem.quantity, orderItem.product_name?.toLowerCase().includes('hoodie') ? 'hoodie' : 'tshirt')
          : 0.5 * returnItem.quantity
        const itemValue = orderItem ? (orderItem.price_at_purchase * returnItem.quantity) : 0

        return {
          description: returnItem.product_name || orderItem?.product_name || 'Product',
          quantity: returnItem.quantity,
          weight: itemWeight.toFixed(3),
          value: itemValue.toFixed(2),
          origin_country: 'NL',
          sku: orderItem?.sku || returnItem.sku || '',
        }
      }),
    },
  }

  console.log('📤 Sending request to Sendcloud...')

  const response = await sendcloudFetch('/parcels', {
    method: 'POST',
    body: JSON.stringify(parcelData),
  })

  const parcel = response.parcel
  if (!parcel || !parcel.id) {
    throw new Error('Failed to create parcel')
  }

  const labelUrl = parcel.label?.normal_printer?.[0] || null

  console.log('✅ Return label created!')
  console.log(`   Parcel ID: ${parcel.id}`)
  console.log(`   Tracking: ${parcel.tracking_number || 'N/A'}`)
  console.log(`   Label: ${labelUrl ? 'Available' : 'Not yet'}`)

  return {
    parcel_id: parcel.id,
    tracking_number: parcel.tracking_number || null,
    tracking_url: parcel.tracking_url || null,
    label_url: labelUrl,
  }
}

