import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-black text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70" />
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="font-display text-6xl md:text-8xl mb-6 tracking-wide">
            GEEN POESPAS.
            <br />
            WEL KARAKTER.
          </h1>
          <p className="text-xl md:text-2xl mb-8 font-medium">
            Lokaal gemaakt. Kwaliteit zonder concessies.
          </p>
          <Link
            href="/shop"
            className="inline-block bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-4 px-8 text-lg uppercase tracking-wider transition-all duration-300 hover:scale-105"
          >
            Shop MOSE
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl text-center mb-16">
            GEMAAKT IN GRONINGEN
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border-2 border-black p-8 text-center hover:bg-brand-primary hover:text-white transition-all duration-300">
              <div className="text-4xl mb-4">🏭</div>
              <h3 className="font-display text-2xl mb-4">LOKAAL GEPRODUCEERD</h3>
              <p className="text-lg">100% gemaakt in Nederland</p>
            </div>
            <div className="border-2 border-black p-8 text-center hover:bg-brand-primary hover:text-white transition-all duration-300">
              <div className="text-4xl mb-4">↩️</div>
              <h3 className="font-display text-2xl mb-4">14 DAGEN RETOUR</h3>
              <p className="text-lg">Niet goed, geld terug</p>
            </div>
            <div className="border-2 border-black p-8 text-center hover:bg-brand-primary hover:text-white transition-all duration-300">
              <div className="text-4xl mb-4">🧵</div>
              <h3 className="font-display text-2xl mb-4">PREMIUM MATERIALEN</h3>
              <p className="text-lg">Gebouwd om lang mee te gaan</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-20 px-4 bg-light-bg">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl text-center mb-16">
            SHOP OP CATEGORIE
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Hoodies', 'T-Shirts', 'Caps', 'Accessoires'].map((category) => (
              <Link
                key={category}
                href={`/shop?category=${category.toLowerCase()}`}
                className="group relative aspect-[3/4] bg-black overflow-hidden border-2 border-black hover:scale-105 transition-transform duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-center">
                  <h3 className="font-display text-2xl text-white">{category}</h3>
                  <p className="text-brand-primary font-bold mt-2 group-hover:underline">
                    SHOP NU →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-black text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-4xl md:text-6xl mb-6">
            JOIN THE PACK
          </h2>
          <p className="text-xl mb-8">
            Nieuws over drops, restocks en het atelier. Geen spam — alleen MOSE.
          </p>
          <form className="flex flex-col md:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Jouw e-mailadres"
              className="flex-1 px-6 py-4 text-black border-2 border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <button
              type="submit"
              className="bg-brand-primary hover:bg-brand-primary-hover font-bold py-4 px-8 uppercase tracking-wider transition-colors duration-300"
            >
              Join nu
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
