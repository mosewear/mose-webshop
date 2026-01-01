export default function EmailVariantsPage() {
  const variants = [
    { 
      id: 1, 
      name: 'VARIANT A: SIDEBAR', 
      description: 'Totaal in grijze box, BTW breakdown, subtiele kleuren' 
    },
    { 
      id: 2, 
      name: 'VARIANT B: BLACK BOX', 
      description: 'Totaal in zwarte box onderaan, prominente BTW, veel spacing' 
    },
    { 
      id: 3, 
      name: 'VARIANT C: GREEN ACCENT', 
      description: 'Moderne cards, totaal in groene box, uitgebreide BTW info' 
    },
  ]

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display mb-3">BOLD STATEMENT VARIANTEN</h1>
          <p className="text-gray-600 mb-2">3 verbeterde versies met kleinere totaalbedrag + BTW specificatie</p>
          <p className="text-sm text-green-700 font-semibold">✓ BTW (21%) nu toegevoegd aan alle varianten</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {variants.map((variant) => (
            <a
              key={variant.id}
              href={`/api/preview-email-variants?variant=${variant.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border-2 border-black p-6 hover:bg-black hover:text-white transition-colors group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-display">#{variant.id}</span>
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold mb-2">{variant.name}</h2>
              <p className="text-sm text-gray-600 group-hover:text-gray-300">{variant.description}</p>
            </a>
          ))}
        </div>

        <div className="bg-white border-2 border-black p-8">
          <h2 className="text-2xl font-display mb-4 text-center">VERBETERINGEN</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-3 text-green-700">✓ Toegevoegd:</h3>
              <ul className="space-y-2 text-sm">
                <li>• <strong>BTW specificatie (21%)</strong> - verplicht in NL</li>
                <li>• Kleinere totaalbedrag display</li>
                <li>• Subtotaal excl. BTW getoond</li>
                <li>• Betere visuele hiërarchie</li>
                <li>• Meer whitespace</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3">🎨 Design Updates:</h3>
              <ul className="space-y-2 text-sm">
                <li>• Check icon iets kleiner (subtiel)</li>
                <li>• Product cards compacter</li>
                <li>• Betere spacing tussen elementen</li>
                <li>• Modernere typografie</li>
                <li>• Mobile-friendly layouts</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/email-preview" 
            className="inline-block px-6 py-3 bg-black text-white font-bold uppercase hover:bg-gray-800 transition-colors"
          >
            ← Terug naar alle designs
          </a>
        </div>
      </div>
    </div>
  )
}

