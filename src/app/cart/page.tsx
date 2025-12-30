'use client'

export default function CartPage() {
  return (
    <div className="min-h-screen pt-32 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-5xl font-display mb-6">WINKELWAGEN</h1>
        <p className="text-xl text-gray-600 mb-8">Je winkelwagen is leeg</p>
        <a href="/shop" className="inline-block px-8 py-4 bg-[#00A676] text-white font-bold uppercase tracking-wider hover:bg-[#008f66] transition-colors">
          Shop nu
        </a>
      </div>
    </div>
  )
}

