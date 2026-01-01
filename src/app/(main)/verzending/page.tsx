import { Metadata } from 'next'
import Link from 'next/link'
import { Truck, Package, Clock, MapPin, RefreshCw } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Verzending & Retour | MOSE',
  description: 'Alles over verzending, levering en retourneren bij MOSE. Gratis verzending vanaf €50, 14 dagen bedenktijd.',
}

export default function VerzendingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-dark via-brand-primary to-brand-dark text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-display text-5xl mb-4">Verzending & Retour</h1>
          <p className="text-xl text-gray-200">
            Alles wat je moet weten over levering en retourneren
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        
        {/* Verzending */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Truck className="w-8 h-8 text-brand-primary" />
            <h2 className="text-3xl font-display">Verzending</h2>
          </div>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Gratis verzending vanaf €50
              </h3>
              <p className="text-green-800">
                Bij bestellingen onder €50 betaal je €5,95 verzendkosten.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-primary" />
                  Verzendgebieden
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Nederland</li>
                  <li>• België</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-primary" />
                  Levertijd
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Verwerkingstijd: 1-2 werkdagen</li>
                  <li>• Bezorging: 1-3 werkdagen</li>
                  <li>• Totaal: 2-5 werkdagen</li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">Verzendpartner</h3>
              <p className="mb-3">
                We verzenden alle bestellingen via <strong>PostNL</strong>. Zodra je bestelling is verzonden, ontvang je een e-mail met:
              </p>
              <ul className="space-y-1 text-gray-700">
                <li>• Track & trace code</li>
                <li>• Verwachte levertijd</li>
                <li>• Link om je pakket te volgen</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 mb-2">💡 Bestelling volgen</h3>
              <p className="text-blue-800 mb-3">
                Je kunt je bestelling altijd volgen via je <Link href="/account" className="underline font-semibold">account</Link> of via de track & trace link in je verzendbevestiging.
              </p>
            </div>
          </div>
        </section>

        {/* Retourneren */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <RefreshCw className="w-8 h-8 text-brand-primary" />
            <h2 className="text-3xl font-display">Retourneren</h2>
          </div>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <div className="bg-brand-light border border-brand-primary rounded-lg p-6">
              <h3 className="font-bold text-brand-dark mb-2">
                14 dagen bedenktijd
              </h3>
              <p className="text-gray-800">
                Niet tevreden? Je hebt 14 dagen bedenktijd vanaf ontvangst van je bestelling. Je kunt je artikel(en) zonder opgaaf van reden retourneren.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3">Voorwaarden voor retourneren</h3>
              <ul className="space-y-2 text-gray-700 list-disc list-inside">
                <li>Artikelen zijn ongedragen en ongewassen</li>
                <li>Labels zitten er nog aan</li>
                <li>Artikel is in originele staat en verpakking</li>
                <li>Maximaal 14 dagen na ontvangst</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">Hoe retourneren?</h3>
              <ol className="space-y-3 text-gray-700">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <span><strong>Stuur een e-mail</strong> naar <a href="mailto:info@mosewear.nl" className="text-brand-primary underline">info@mosewear.nl</a> met je ordernummer en de artikelen die je wilt retourneren.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <span><strong>Ontvang retourlabel</strong> - We sturen je binnen 24 uur een retourlabel per e-mail.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <span><strong>Pak je artikel(en) in</strong> - Stop alles veilig in de originele verpakking of een stevige doos.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <span><strong>Plak het retourlabel erop</strong> en breng het pakket naar een PostNL punt.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                  <span><strong>Ontvang je geld terug</strong> - Binnen 5-7 werkdagen na ontvangst storten we het bedrag terug.</span>
                </li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-bold text-yellow-900 mb-2">⚠️ Retourkosten</h3>
              <p className="text-yellow-800 mb-2">
                Retourneren binnen Nederland en België kost <strong>€5,95</strong>. Dit bedrag wordt in mindering gebracht op je terugbetaling.
              </p>
              <p className="text-yellow-800 text-sm">
                <em>Retour bij producten met een fabricagefout of verkeerde levering is altijd gratis.</em>
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3">Terugbetaling</h3>
              <p className="mb-2">
                Na ontvangst en controle van je retourzending krijg je het aankoopbedrag binnen 5-7 werkdagen teruggestort op de rekening waarmee je hebt betaald.
              </p>
              <p className="text-gray-600">
                Je ontvangt een bevestigingsmail zodra je retour is verwerkt en het bedrag is teruggestort.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-16 bg-gradient-to-r from-brand-dark via-brand-primary to-brand-dark text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-display mb-4">Nog vragen?</h2>
          <p className="mb-6 text-gray-200">
            Neem gerust contact met ons op. We helpen je graag verder!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/contact" 
              className="bg-white text-brand-primary px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              Contact opnemen
            </Link>
            <Link 
              href="/shop" 
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors"
            >
              Verder shoppen
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}

