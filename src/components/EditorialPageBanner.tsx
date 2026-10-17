import Image from 'next/image'

/**
 * Full-bleed editorial page banner used on Shop / Blog (and siblings).
 * Image-first: light bottom/left vignette for type, not a muddy full overlay.
 */
export type EditorialPageBannerProps = {
  title: string
  eyebrow?: string
  subtitle?: string
  imageSrc: string
  imageSrcMobile?: string
  imageAlt: string
  /** CSS object-position for desktop (and mobile when no mobile src). */
  objectPosition?: string
  objectPositionMobile?: string
  priority?: boolean
  /**
   * Hoogteklassen van de band. Standaard de ruime variant, zodat de blogpagina
   * blijft zoals hij was. De shoppagina geeft een compacte waarde mee: daar
   * stond de sfeerfoto 290px hoog op een scherm van 664, en samen met de balken
   * eromheen begon het eerste product pas op 611px. Dus geen enkel product in
   * beeld op de pagina die juist producten moet laten zien.
   */
  hoogte?: string
  /**
   * Smalle band: kleinere koptekst en minder onderruimte op telefoon.
   *
   * Nodig zodra de band de verhouding van het beeld volgt in plaats van een
   * vaste hoogte. De shopbanner is op telefoon 160 pixels hoog, en daar vult
   * een titel van 48 pixels plus een ondertitel van twee regels het hele vlak.
   */
  smal?: boolean
}

export default function EditorialPageBanner({
  title,
  eyebrow,
  subtitle,
  imageSrc,
  imageSrcMobile,
  imageAlt,
  objectPosition = 'center 42%',
  objectPositionMobile,
  priority = true,

  hoogte = 'h-72 md:h-[24rem] lg:h-[28rem]',
  smal = false,
}: EditorialPageBannerProps) {
  const mobileSrc = imageSrcMobile || imageSrc
  const mobilePosition = objectPositionMobile || objectPosition

  return (
    <section className={`relative ${hoogte} overflow-hidden border-b-4 border-brand-primary bg-neutral-900`}>
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        sizes="(max-width: 767px) 0px, 100vw"
        quality={95}
        className="hidden md:block object-cover"
        style={{ objectPosition }}
        priority={priority}
      />
      <Image
        src={mobileSrc}
        alt={imageAlt}
        fill
        sizes="(min-width: 768px) 0px, 100vw"
        quality={95}
        className="block md:hidden object-cover"
        style={{ objectPosition: mobilePosition }}
        priority={priority}
      />

      {/* Soft bottom lift only — photo stays vivid across most of the frame */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/55 via-black/20 to-transparent"
      />

      {/* De onderrand schaalt mee met de bandhoogte. Met een vaste pb-8 liep
          de titel bij een compacte band (128px op de shop) aan de bovenkant
          het beeld uit: van "SHOP" zag je alleen de onderste helft. */}
      <div className="relative h-full flex items-end overflow-hidden">
        <div className={`w-full max-w-7xl mx-auto px-4 md:px-6 ${smal ? 'pb-3' : 'pb-4'} md:pb-10 lg:pb-12 animate-fadeInUp`}>
          {/* Local scrim so type reads without muddying the whole banner */}
          <div className="relative max-w-xl md:max-w-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-4 -inset-y-3 md:-inset-x-8 md:-inset-y-5 bg-gradient-to-r from-black/50 via-black/25 to-transparent blur-xl"
            />
            <div className="relative">
              {eyebrow ? (
                <p className={`${smal ? 'text-[10px] mb-1' : 'text-[11px] mb-2'} md:text-xs font-bold uppercase tracking-[0.28em] text-brand-primary md:mb-3`}>
                  {eyebrow}
                </p>
              ) : null}
              <h1 className={`font-display ${smal ? 'text-3xl' : 'text-5xl'} sm:text-6xl md:text-7xl lg:text-8xl tracking-tight uppercase text-white leading-[0.92]`}>
                {title}
              </h1>
              {subtitle ? (
                <p className={`${smal ? 'mt-1 text-xs' : 'mt-3 text-sm'} md:mt-4 max-w-xl md:text-base text-white/90 font-medium leading-relaxed`}>
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Photoshoot-2026 editorial frames sized for wide page banners. */
export const PAGE_BANNER_IMAGES = {
  /**
   * Shop: de stof zelf, met het ingeperste MOSE-logo.
   *
   * De band is 4,5 op 1 op desktop en 2,4 op 1 op mobiel. Daar blijft een
   * derde van de hoogte van de bron over, en dat is de hele afweging. Elke
   * foto waarop mensen de hoogte vullen, wordt in die strook een rij koppen
   * die bovenaan en onderaan is afgesneden. Dat gebeurde met het lookbookframe
   * dat er eerst stond en ook met de groepsfoto die ik er daarna in zette.
   *
   * Een stofopname heeft dat probleem per definitie niet: er is geen onderwerp
   * dat je kunt onthoofden, dus elke uitsnede werkt. Bijkomend voordeel: hij
   * laat zien waar de hele winkel over gaat, joggingfleece van 300 gram met
   * een geperst logo, en hij concurreert niet met de productfoto's eronder.
   * De onderste helft is donker genoeg voor de witte titel.
   */
  /**
   * Shop: de nieuwe shopbanner, aangeleverd op 17 oktober 2026.
   *
   * Twee aparte uitsneden, elk op maat gemaakt voor zijn eigen band: 2103 bij
   * 467 voor desktop (4,5 op 1) en 1170 bij 480 voor mobiel (2,44 op 1). Omdat
   * de beelden al op die verhouding staan, zetten we de band op precies
   * dezelfde verhouding. Dan hoeft er niets te worden bijgesneden en blijven
   * beide mannen en de gracht volledig in beeld.
   *
   * Dat verving een stofopname. Die was gekozen omdat elke foto met mensen in
   * een strook van 4,5 op 1 een rij afgesneden koppen werd. Dat probleem
   * bestaat hier niet meer: de uitsnede is al gemaakt, wij hoeven hem alleen
   * niet opnieuw te maken.
   */
  shop: {
    desktop:
      'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/shopbanners-2026-10-17/shop-desktop.webp',
    mobile:
      'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/shopbanners-2026-10-17/shop-mobiel.webp',
  },

  blog: {
    desktop:
      'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/03-stone-desktop.webp',
    mobile:
      'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/03-stone-desktop.webp',
  },
} as const
