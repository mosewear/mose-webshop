'use client'

/**
 * Categoriebediening boven het shopraster.
 *
 * Compacte knoppen, geen fototegels en geen horizontale strook. De vorige
 * versie scrollde zijwaarts, waardoor de laatste categorie op een telefoon
 * buiten beeld begon en makkelijk gemist werd. Deze rij loopt over twee
 * regels door zodra hij niet past, zodat alle categorieën altijd zichtbaar
 * zijn.
 *
 * Het filtert op dezelfde pagina en navigeert niet weg: met drie producten
 * die samen op één scherm passen zou een tussenpagina de weg naar het
 * kledingstuk alleen langer maken.
 */

export interface CategorieItem {
  slug: string
  naam: string
  aantal: number
}

interface CategorieKiezerProps {
  items: CategorieItem[]
  actief: string
  onKies: (slug: string) => void
  allesLabel: string
  totaalAantal: number
  /** Toegankelijke naam van de groep, bijvoorbeeld "Categorie". */
  groepLabel: string
}

export default function CategorieKiezer({
  items,
  actief,
  onKies,
  allesLabel,
  totaalAantal,
  groepLabel,
}: CategorieKiezerProps) {
  if (items.length === 0) return null

  const kaarten: CategorieItem[] = [
    { slug: 'all', naam: allesLabel, aantal: totaalAantal },
    ...items,
  ]

  return (
    <nav aria-label={groepLabel} className="mb-6 md:mb-8">
      {/* flex-wrap in plaats van overflow-x: alles blijft in beeld. */}
      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
        {kaarten.map((kaart) => {
          const isActief = kaart.slug === actief
          return (
            <li key={kaart.slug}>
              <button
                type="button"
                onClick={() => onKies(kaart.slug)}
                aria-current={isActief ? 'true' : undefined}
                className={`inline-flex min-h-[44px] items-center gap-1.5 border-2 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
                  isActief
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 bg-white text-black hover:border-black'
                }`}
              >
                <span>{kaart.naam}</span>
                <span
                  className={isActief ? 'font-medium text-white/60' : 'font-medium text-gray-500'}
                  aria-hidden="true"
                >
                  {kaart.aantal}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
