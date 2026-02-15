import { createClient } from '@supabase/supabase-js'

export interface PickupConfig {
  enabled: boolean
  maxDistanceKm: number
  locationName: string
  locationAddress: string
  latitude: number
  longitude: number
}

export interface PickupEligibilityResult {
  eligible: boolean
  distanceKm: number | null
  reason: string | null
  config: PickupConfig
}

interface PdokResponse {
  response?: {
    docs?: Array<{
      centroide_ll?: string
    }>
  }
}

const DEFAULT_PICKUP_CONFIG: PickupConfig = {
  enabled: true,
  maxDistanceKm: 50,
  locationName: 'MOSE Groningen',
  locationAddress: 'Stavangerweg 13, 9723 JC Groningen',
  latitude: 53.2194,
  longitude: 6.5665,
}

function normalizePostcode(postcode: string): string {
  return (postcode || '').replace(/\s+/g, '').toUpperCase()
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return fallback
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return fallback
}

function parsePoint(point?: string): { lat: number; lng: number } | null {
  if (!point) return null
  const match = point.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/)
  if (!match) return null
  const lng = parseFloat(match[1])
  const lat = parseFloat(match[2])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return { lat, lng }
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return 6371 * c
}

async function fetchAddressCoordinates(
  postcode: string,
  houseNumber: string,
  addition?: string
): Promise<{ lat: number; lng: number } | null> {
  const normalizedPostcode = normalizePostcode(postcode)
  if (!/^\d{4}[A-Z]{2}$/.test(normalizedPostcode)) return null
  if (!/^\d+$/.test((houseNumber || '').trim())) return null

  let query = `postcode:${normalizedPostcode} AND huisnummer:${parseInt(houseNumber, 10)}`
  const trimmedAddition = (addition || '').trim()
  if (trimmedAddition) {
    if (/^[A-Za-z]$/.test(trimmedAddition)) {
      query += ` AND huisletter:${trimmedAddition.toUpperCase()}`
    } else {
      query += ` AND huisnummertoevoeging:${trimmedAddition}`
    }
  }

  const url =
    'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free' +
    `?q=${encodeURIComponent(query)}&fl=centroide_ll&rows=1`

  const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (!response.ok) return null

  const data = (await response.json()) as PdokResponse
  const point = data.response?.docs?.[0]?.centroide_ll
  return parsePoint(point)
}

export async function getPickupConfig(): Promise<PickupConfig> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'pickup_enabled',
        'pickup_max_distance_km',
        'pickup_location_name',
        'pickup_location_address',
        'pickup_latitude',
        'pickup_longitude',
      ])

    if (error || !data) return DEFAULT_PICKUP_CONFIG

    const map: Record<string, unknown> = {}
    for (const row of data) map[row.key] = row.value

    return {
      enabled: parseBoolean(map.pickup_enabled, DEFAULT_PICKUP_CONFIG.enabled),
      maxDistanceKm: parseNumber(map.pickup_max_distance_km, DEFAULT_PICKUP_CONFIG.maxDistanceKm),
      locationName:
        typeof map.pickup_location_name === 'string' && map.pickup_location_name.trim()
          ? map.pickup_location_name
          : DEFAULT_PICKUP_CONFIG.locationName,
      locationAddress:
        typeof map.pickup_location_address === 'string' && map.pickup_location_address.trim()
          ? map.pickup_location_address
          : DEFAULT_PICKUP_CONFIG.locationAddress,
      latitude: parseNumber(map.pickup_latitude, DEFAULT_PICKUP_CONFIG.latitude),
      longitude: parseNumber(map.pickup_longitude, DEFAULT_PICKUP_CONFIG.longitude),
    }
  } catch {
    return DEFAULT_PICKUP_CONFIG
  }
}

export async function evaluatePickupEligibility(params: {
  country: string
  postalCode: string
  houseNumber: string
  addition?: string
}): Promise<PickupEligibilityResult> {
  const config = await getPickupConfig()

  if (!config.enabled) {
    return { eligible: false, distanceKm: null, reason: 'pickup_disabled', config }
  }

  if ((params.country || '').toUpperCase() !== 'NL') {
    return { eligible: false, distanceKm: null, reason: 'country_not_supported', config }
  }

  const coordinates = await fetchAddressCoordinates(params.postalCode, params.houseNumber, params.addition)
  if (!coordinates) {
    return { eligible: false, distanceKm: null, reason: 'address_not_found', config }
  }

  const distance = haversineDistanceKm(coordinates.lat, coordinates.lng, config.latitude, config.longitude)
  const roundedDistance = Math.round(distance * 10) / 10

  return {
    eligible: roundedDistance <= config.maxDistanceKm,
    distanceKm: roundedDistance,
    reason: roundedDistance <= config.maxDistanceKm ? null : 'outside_radius',
    config,
  }
}

