'use client'

export default function ProductPage({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-screen pt-32 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-5xl font-display mb-6">PRODUCT</h1>
        <p className="text-xl text-gray-600 mb-4">Product: {params.slug}</p>
        <p className="text-lg text-gray-500 mb-8">Komt binnenkort...</p>
        <a href="/shop" className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors">
          Terug naar shop
        </a>
      </div>
    </div>
  )
}

