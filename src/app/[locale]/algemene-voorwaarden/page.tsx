'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSiteSettings } from '@/lib/settings'

export default function TermsPage() {
  const [settings, setSettings] = useState({
    free_shipping_threshold: 100,
    return_days: 14,
    contact_email: 'info@mosewear.nl',
    contact_phone: '+31 50 211 1931',
    contact_address: 'Helper Brink 27a, 9722 EG Groningen',
  })

  useEffect(() => {
    getSiteSettings().then((s) => {
      setSettings({
        free_shipping_threshold: s.free_shipping_threshold,
        return_days: s.return_days,
        contact_email: s.contact_email,
        contact_phone: s.contact_phone,
        contact_address: s.contact_address,
      })
    })
  }, [])

  const addressLines = settings.contact_address.split(',').map(line => line.trim())

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-display mb-4">ALGEMENE VOORWAARDEN</h1>
          <p className="text-gray-600">Laatst bijgewerkt: 1 januari 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none space-y-8">
          <div>
            <h2 className="text-3xl font-display mb-4">1. ALGEMEEN</h2>
            <p className="text-gray-700 leading-relaxed">
              Deze algemene voorwaarden zijn van toepassing op alle aanbiedingen en overeenkomsten 
              van MOSE (mosewear.com), gevestigd in Groningen, Nederland. Door een bestelling te 
              plaatsen ga je akkoord met deze voorwaarden.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">2. AANBIEDINGEN EN PRIJZEN</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Alle prijzen zijn in euro's en inclusief BTW</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Verzendkosten worden apart vermeld bij het afrekenen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Gratis verzending vanaf €{settings.free_shipping_threshold} binnen Nederland en België</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Prijzen en voorraad kunnen wijzigen zonder voorafgaande kennisgeving</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">3. BESTELLEN</h2>
            <p className="text-gray-700 leading-relaxed">
              Je bestelling is pas definitief nadat we een orderbevestiging per e-mail hebben 
              verstuurd. We behouden het recht om bestellingen te weigeren of te annuleren, 
              bijvoorbeeld bij onjuiste prijzen of bij vermoeden van misbruik.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">4. BETALING</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Betaling verloopt veilig via Stripe</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>We accepteren iDEAL, creditcard en Bancontact</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Je betaling moet voltooid zijn voordat we je bestelling verzenden</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Bij mislukte betalingen wordt je bestelling automatisch geannuleerd</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">5. VERZENDING EN LEVERING</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>We verzenden binnen 1-2 werkdagen na ontvangst van je betaling</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Levertijd is 2-3 werkdagen binnen Nederland en België</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Je ontvangt een track & trace code zodra je pakket onderweg is</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Zorg dat iemand aanwezig is om het pakket in ontvangst te nemen</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">6. RETOURRECHT ({settings.return_days} DAGEN BEDENKTIJD)</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Je hebt het recht om binnen {settings.return_days} dagen na ontvangst je bestelling te retourneren, 
              zonder opgave van reden. Voorwaarden:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Producten moeten ongedragen en in originele staat zijn</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Labels en tags moeten nog aan het product zitten</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Hygiëne-producten (zoals ondergoed) kunnen niet geretourneerd worden</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Neem contact op via {settings.contact_email} voor retourinstructies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Je ontvangt je geld terug binnen {settings.return_days} dagen na goedkeuring retour</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">7. RUILEN</h2>
            <p className="text-gray-700 leading-relaxed">
              Wil je ruilen voor een andere maat of kleur? Geen probleem! Neem contact met ons op 
              via{' '}
              <a href={`mailto:${settings.contact_email}`} className="text-brand-primary hover:underline">
                {settings.contact_email}
              </a>
              {' '}en we regelen het voor je. Ruilen is gratis binnen Nederland en België (eenmalig per bestelling).
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">8. GARANTIE EN KLACHTEN</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We staan achter de kwaliteit van onze producten. Mocht er toch iets niet kloppen:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Meld defecten of beschadigingen binnen 2 dagen na ontvangst</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Stuur foto's mee van het probleem</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>We bieden altijd een passende oplossing (reparatie, vervanging of terugbetaling)</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">9. AANSPRAKELIJKHEID</h2>
            <p className="text-gray-700 leading-relaxed">
              MOSE is niet aansprakelijk voor indirecte schade die voortvloeit uit het gebruik 
              van onze producten of website. Onze aansprakelijkheid is in alle gevallen beperkt 
              tot het bedrag van je bestelling.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">10. INTELLECTUEEL EIGENDOM</h2>
            <p className="text-gray-700 leading-relaxed">
              Alle rechten op afbeeldingen, teksten, logo's en andere content op mosewear.com 
              berusten bij MOSE. Het is niet toegestaan om content te kopiëren of te gebruiken 
              zonder schriftelijke toestemming.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">11. TOEPASSELIJK RECHT</h2>
            <p className="text-gray-700 leading-relaxed">
              Op alle overeenkomsten is Nederlands recht van toepassing. Eventuele geschillen 
              worden voorgelegd aan de bevoegde rechter in Groningen, tenzij de wet anders bepaalt.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">12. VRAGEN?</h2>
            <p className="text-gray-700 leading-relaxed">
              Heb je vragen over deze voorwaarden? Neem contact met ons op:
            </p>
            <div className="bg-gray-50 border-2 border-gray-300 p-6 mt-4">
              <p className="text-gray-800 font-bold">MOSE</p>
              {addressLines.map((line, idx) => (
                <p key={idx} className="text-gray-700">{line}</p>
              ))}
              {!settings.contact_address.toLowerCase().includes('nederland') && (
                <p className="text-gray-700">Nederland</p>
              )}
              <p className="text-gray-700">
                E-mail:{' '}
                <a href={`mailto:${settings.contact_email}`} className="text-brand-primary hover:underline">
                  {settings.contact_email}
                </a>
              </p>
              <p className="text-gray-700">
                Telefoon:{' '}
                <a href={`tel:${settings.contact_phone.replace(/\s/g, '')}`} className="text-brand-primary hover:underline">
                  {settings.contact_phone}
                </a>
              </p>
              <p className="text-gray-700">
                Website:{' '}
                <a href="https://mosewear.com" className="text-brand-primary hover:underline">
                  mosewear.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-12 pt-8 border-t-2 border-gray-200">
          <Link
            href="/"
            className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
          >
            Terug naar home
          </Link>
        </div>
      </div>
    </div>
  )
}
