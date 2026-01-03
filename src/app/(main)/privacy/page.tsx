'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-display mb-4">PRIVACYBELEID</h1>
          <p className="text-gray-600">Laatst bijgewerkt: 1 januari 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none space-y-8">
          <div>
            <h2 className="text-3xl font-display mb-4">1. INTRODUCTIE</h2>
            <p className="text-gray-700 leading-relaxed">
              MOSE (mosewear.com) respecteert de privacy van alle bezoekers van de website en 
              draagt er zorg voor dat de persoonlijke informatie die je ons verschaft vertrouwelijk 
              wordt behandeld. Dit privacybeleid legt uit welke gegevens we verzamelen en waarvoor 
              we deze gebruiken.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">2. WELKE GEGEVENS VERZAMELEN WE?</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We verzamelen de volgende persoonsgegevens:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Naam en adresgegevens (voor verzending van bestellingen)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>E-mailadres (voor orderbevestigingen en communicatie)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Telefoonnummer (voor levering en klantenservice)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Betaalgegevens (veilig verwerkt via Stripe, niet opgeslagen bij ons)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Ordergeschiedenis en voorkeuren</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">3. WAARV OOR GEBRUIKEN WE JE GEGEVENS?</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We gebruiken je gegevens voor:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Het verwerken en verzenden van je bestellingen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Communicatie over je bestelling (bevestiging, verzending, tracking)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Klantenservice en ondersteuning</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Verbetering van onze website en diensten</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Marketing (alleen met je toestemming)</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">4. HOE LANG BEWAREN WE JE GEGEVENS?</h2>
            <p className="text-gray-700 leading-relaxed">
              We bewaren je persoonsgegevens niet langer dan noodzakelijk voor de doeleinden waarvoor 
              ze zijn verzameld. Ordergegevens bewaren we 7 jaar conform fiscale wetgeving. Je kunt 
              altijd verzoeken om je gegevens te verwijderen via{' '}
              <a href="mailto:info@mosewear.nl" className="text-brand-primary hover:underline">
                info@mosewear.nl
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">5. DELEN MET DERDEN</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We delen je gegevens alleen met:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Verzendpartners (voor levering van je bestelling)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Stripe (voor veilige betalingsverwerking)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Hosting providers (voor opslag van gegevens)</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              We verkopen je gegevens nooit aan derden en delen ze alleen wanneer dit noodzakelijk 
              is voor de uitvoering van je bestelling.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">6. BEVEILIGING</h2>
            <p className="text-gray-700 leading-relaxed">
              We nemen de bescherming van je gegevens serieus en hebben passende technische en 
              organisatorische maatregelen genomen om je persoonsgegevens te beschermen tegen 
              verlies of onrechtmatige verwerking. We gebruiken SSL-encryptie voor alle data-overdracht 
              en beveiligde servers voor opslag.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">7. COOKIES</h2>
            <p className="text-gray-700 leading-relaxed">
              We gebruiken functionele cookies die noodzakelijk zijn voor het goed functioneren van 
              de website (zoals je winkelwagen). Voor analytische cookies vragen we je toestemming. 
              Je kunt cookies altijd weigeren via je browserinstellingen.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">8. JOUW RECHTEN</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Je hebt het recht om:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Inzage te vragen in je persoonsgegevens</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Je gegevens te laten corrigeren of verwijderen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Bezwaar te maken tegen verwerking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>Je gegevens over te dragen (dataportabiliteit)</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Neem contact op via{' '}
              <a href="mailto:info@mosewear.nl" className="text-brand-primary hover:underline">
                info@mosewear.nl
              </a>
              {' '}om gebruik te maken van deze rechten.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">9. WIJZIGINGEN</h2>
            <p className="text-gray-700 leading-relaxed">
              We kunnen dit privacybeleid van tijd tot tijd aanpassen. De meest recente versie 
              vind je altijd op deze pagina. Belangrijke wijzigingen communiceren we via e-mail.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">10. CONTACT</h2>
            <p className="text-gray-700 leading-relaxed">
              Heb je vragen over dit privacybeleid? Neem contact met ons op:
            </p>
            <div className="bg-gray-50 border-2 border-gray-300 p-6 mt-4">
              <p className="text-gray-800 font-bold">MOSE</p>
              <p className="text-gray-700">Helper Brink 27a</p>
              <p className="text-gray-700">9722 EG Groningen, Nederland</p>
              <p className="text-gray-700">
                E-mail:{' '}
                <a href="mailto:info@mosewear.nl" className="text-brand-primary hover:underline">
                  info@mosewear.nl
                </a>
              </p>
              <p className="text-gray-700">
                Telefoon:{' '}
                <a href="tel:+31502111931" className="text-brand-primary hover:underline">
                  +31 50 211 1931
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
