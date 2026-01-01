export default function EmailPreviewPage() {
  const designs = [
    { id: 1, name: 'MINIMALIST BLACK', description: 'Premium streetwear, Apple-esque' },
    { id: 2, name: 'BOLD STATEMENT', description: 'Hypebeast, energiek, maximum impact' },
    { id: 3, name: 'RECEIPT STYLE', description: 'Urban streetwear, kasbon aesthetic' },
    { id: 4, name: 'SPLIT HERO', description: 'Fashion editorial, magazine layout' },
    { id: 5, name: 'GRADIENT WAVE', description: 'Contemporary, premium casual' },
  ]

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display mb-4">MOSE EMAIL DESIGNS</h1>
          <p className="text-gray-600">Klik op een design om de volledige preview te zien</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map((design) => (
            <a
              key={design.id}
              href={`/api/preview-email?design=${design.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border-2 border-black p-6 hover:bg-black hover:text-white transition-colors group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl font-display">#{design.id}</span>
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">{design.name}</h2>
              <p className="text-sm text-gray-600 group-hover:text-gray-300">{design.description}</p>
            </a>
          ))}
        </div>

        <div className="mt-12 bg-white border-2 border-black p-8 text-center">
          <h2 className="text-2xl font-display mb-4">MOBILE + DESKTOP OPTIMIZED</h2>
          <p className="text-gray-600 mb-6">
            Alle designs zijn getest voor Gmail, Apple Mail, Outlook en andere email clients
          </p>
          <div className="flex gap-4 justify-center text-sm">
            <span className="px-4 py-2 bg-green-100 text-green-800 font-semibold">✓ Mobile Ready</span>
            <span className="px-4 py-2 bg-green-100 text-green-800 font-semibold">✓ Dark Mode Compatible</span>
            <span className="px-4 py-2 bg-green-100 text-green-800 font-semibold">✓ MOSE Logo Included</span>
          </div>
        </div>
      </div>
    </div>
  )
}

