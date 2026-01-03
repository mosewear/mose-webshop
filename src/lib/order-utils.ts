// Supported carriers and their tracking URL patterns
export const CARRIERS = {
  POSTNL: {
    name: 'PostNL',
    urlPattern: 'https://jouw.postnl.nl/track-and-trace/{CODE}',
  },
  DHL: {
    name: 'DHL',
    urlPattern: 'https://www.dhl.com/nl-nl/home/tracking.html?tracking-id={CODE}',
  },
  DPD: {
    name: 'DPD',
    urlPattern: 'https://tracking.dpd.de/status/nl_NL/parcel/{CODE}',
  },
  UPS: {
    name: 'UPS',
    urlPattern: 'https://www.ups.com/track?loc=nl_NL&tracknum={CODE}',
  },
  FEDEX: {
    name: 'FedEx',
    urlPattern: 'https://www.fedex.com/fedextrack/?trknbr={CODE}',
  },
  GLS: {
    name: 'GLS',
    urlPattern: 'https://gls-group.eu/NL/nl/pakket-volgen?match={CODE}',
  },
} as const

export type CarrierCode = keyof typeof CARRIERS

/**
 * Generate tracking URL based on carrier and tracking code
 */
export function generateTrackingUrl(carrier: string, trackingCode: string): string {
  const carrierUpper = carrier.toUpperCase() as CarrierCode
  const carrierInfo = CARRIERS[carrierUpper]
  
  if (!carrierInfo) {
    // Return generic search if carrier not found
    return `https://www.google.com/search?q=track+${trackingCode}`
  }
  
  return carrierInfo.urlPattern.replace('{CODE}', trackingCode)
}

/**
 * Get formatted status label in Dutch
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'In afwachting',
    paid: 'Betaald',
    processing: 'In behandeling',
    shipped: 'Verzonden',
    delivered: 'Afgeleverd',
    cancelled: 'Geannuleerd',
    return_requested: 'Retour aangevraagd',
    returned: 'Geretourneerd',
    refunded: 'Terugbetaald',
  }
  return labels[status] || status
}

/**
 * Determine which email to send based on status transition
 */
export function getEmailTypeForStatusChange(oldStatus: string, newStatus: string): string | null {
  // From any status to processing
  if (newStatus === 'processing' && oldStatus !== 'processing') {
    return 'processing'
  }
  
  // From any status to shipped
  if (newStatus === 'shipped' && oldStatus !== 'shipped') {
    return 'shipped'
  }
  
  // From any status to delivered
  if (newStatus === 'delivered' && oldStatus !== 'delivered') {
    return 'delivered'
  }
  
  // From any status to cancelled
  if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
    return 'cancelled'
  }
  
  return null
}

/**
 * Calculate estimated delivery date based on carrier
 */
export function calculateEstimatedDelivery(carrier?: string): string {
  const today = new Date()
  let daysToAdd = 2 // Default 2 days
  
  // Adjust based on carrier
  if (carrier?.toUpperCase() === 'DHL') {
    daysToAdd = 1 // DHL is usually faster
  } else if (carrier?.toUpperCase() === 'POSTNL') {
    daysToAdd = 2
  }
  
  // Skip weekends
  let deliveryDate = new Date(today)
  deliveryDate.setDate(deliveryDate.getDate() + daysToAdd)
  
  // If delivery falls on weekend, move to Monday
  if (deliveryDate.getDay() === 0) { // Sunday
    deliveryDate.setDate(deliveryDate.getDate() + 1)
  } else if (deliveryDate.getDay() === 6) { // Saturday
    deliveryDate.setDate(deliveryDate.getDate() + 2)
  }
  
  return deliveryDate.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/**
 * Get carrier list for dropdown
 */
export function getCarrierOptions() {
  return Object.entries(CARRIERS).map(([code, info]) => ({
    value: code,
    label: info.name,
  }))
}

