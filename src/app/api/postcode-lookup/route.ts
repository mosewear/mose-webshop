import { NextRequest, NextResponse } from 'next/server'

/**
 * PDOK Locatieserver API v3.1 - Postcode Lookup
 * 
 * Endpoint: https://api.pdok.nl/bzk/locatieserver/search/v3_1/free
 * Documentatie: https://api.pdok.nl/bzk/locatieserver/search/v3_1/ui/
 * 
 * Query format: postcode:${postcode} AND huisnummer:${huisnummer}
 */

interface PDOKResponse {
  response: {
    numFound: number
    docs: Array<{
      straatnaam?: string
      woonplaatsnaam?: string
      huisnummer?: string
      huisnummertoevoeging?: string
      huisletter?: string
    }>
  }
}

export async function POST(req: NextRequest) {
  try {
    const { postcode, huisnummer, toevoeging } = await req.json()

    // Validatie
    if (!postcode || !huisnummer) {
      return NextResponse.json(
        { success: false, error: 'Postcode en huisnummer zijn verplicht' },
        { status: 400 }
      )
    }

    // Normaliseer postcode (verwijder spaties, uppercase)
    const normalizedPostcode = postcode.replace(/\s+/g, '').toUpperCase()
    
    // Valideer postcode format (4 cijfers + 2 letters)
    if (!/^\d{4}[A-Z]{2}$/.test(normalizedPostcode)) {
      return NextResponse.json(
        { success: false, error: 'Ongeldig postcode formaat. Gebruik: 1234AB' },
        { status: 400 }
      )
    }

    // Valideer huisnummer (alleen cijfers, 1-99999)
    const huisnummerNum = parseInt(huisnummer, 10)
    if (isNaN(huisnummerNum) || huisnummerNum < 1 || huisnummerNum > 99999) {
      return NextResponse.json(
        { success: false, error: 'Ongeldig huisnummer. Gebruik cijfers tussen 1 en 99999' },
        { status: 400 }
      )
    }

    // Bouw query string
    let query = `postcode:${normalizedPostcode} AND huisnummer:${huisnummerNum}`
    
    // Voeg toevoeging toe als die er is
    if (toevoeging && toevoeging.trim()) {
      const trimmedToevoeging = toevoeging.trim()
      // Check of het een letter is (huisletter) of cijfer/combinatie (huisnummertoevoeging)
      if (/^[A-Za-z]$/.test(trimmedToevoeging)) {
        query += ` AND huisletter:${trimmedToevoeging.toUpperCase()}`
      } else {
        query += ` AND huisnummertoevoeging:${trimmedToevoeging}`
      }
    }

    // PDOK API call
    const pdokUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(query)}&fl=straatnaam,woonplaatsnaam,huisnummer,huisnummertoevoeging,huisletter&rows=1`
    
    const response = await fetch(pdokUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`PDOK API error: ${response.status}`)
    }

    const data: PDOKResponse = await response.json()

    // Check of er resultaten zijn
    if (!data.response || data.response.numFound === 0 || !data.response.docs || data.response.docs.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Adres niet gevonden. Controleer postcode en huisnummer, of vul handmatig in.' 
        },
        { status: 404 }
      )
    }

    const result = data.response.docs[0]
    const straatnaam = result.straatnaam || ''
    const woonplaats = result.woonplaatsnaam || ''

    if (!straatnaam || !woonplaats) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Onvolledig adres gevonden. Vul handmatig in.' 
        },
        { status: 404 }
      )
    }

    // Bouw volledige adres string
    let fullAddress = `${straatnaam} ${huisnummerNum}`
    
    // Voeg toevoeging toe als die er is
    if (toevoeging && toevoeging.trim()) {
      fullAddress += toevoeging.trim()
    } else if (result.huisletter) {
      fullAddress += result.huisletter
    } else if (result.huisnummertoevoeging) {
      fullAddress += result.huisnummertoevoeging
    }

    return NextResponse.json({
      success: true,
      street: straatnaam,
      city: woonplaats,
      fullAddress: fullAddress.trim(),
    })

  } catch (error: any) {
    console.error('Postcode lookup error:', error)
    
    // Timeout of network error
    if (error.name === 'AbortError' || error.message?.includes('fetch')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Kon geen verbinding maken met de adres service. Probeer het later opnieuw of vul handmatig in.' 
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Er is een fout opgetreden bij het ophalen van het adres.' 
      },
      { status: 500 }
    )
  }
}


