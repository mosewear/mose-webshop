'use client'

/**
 * Categoriebediening boven het shopraster.
 *
 * Compacte knoppen, geen fototegels en geen horizontale strook. De vorige
 * versie scrollde zijwaarts, waardoor de laatste categorie op een telefoon
 * buiten beeld begon en makkelijk gemist werd. Alle categorieën zijn altijd
 * zichtbaar: twee kolommen op telefoon, één rij vanaf sm.
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
    <nav aria-label={groepLabel}>
      {/* Op telefoon een vast raster van twee kolommen. Met flex-wrap viel
          de rij per schermbreedte anders uit: 2+2 op 390, maar 3+1 op 430,
          met één knop alleen op de tweede regel. Vanaf sm passen ze naast
          elkaar en worden het gewone knoppen op hun eigen breedte.
          Bij een oneven aantal (de blog heeft er vijf) krijgt "Alles" op
          telefoon de volle breedte, zodat de rest netjes in paren staat in
          plaats van één knop alleen onderaan. */}
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:flex sm:flex-wrap">
        {kaarten.map((kaart) => {
          const isActief = kaart.slug === actief
          const volleBreedte = kaart.slug === 'all' && kaarten.length % 2 === 1
          return (
            <li key={kaart.slug} className={volleBreedte ? 'col-span-2' : undefined}>
              <button
                type="button"
                onClick={() => onKies(kaart.slug)}
                aria-current={isActief ? 'true' : undefined}
                className={`inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 sm:w-auto border-2 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
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
