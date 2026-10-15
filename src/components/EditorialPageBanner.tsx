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
        className="hidden md:block object-cover"
        style={{ objectPosition }}
        priority={priority}
      />
      <Image
        src={mobileSrc}
        alt={imageAlt}
        fill
        sizes="(min-width: 768px) 0px, 100vw"
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
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 pb-4 md:pb-10 lg:pb-12 animate-fadeInUp">
          {/* Local scrim so type reads without muddying the whole banner */}
          <div className="relative max-w-xl md:max-w-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-4 -inset-y-3 md:-inset-x-8 md:-inset-y-5 bg-gradient-to-r from-black/50 via-black/25 to-transparent blur-xl"
            />
            <div className="relative">
              {eyebrow ? (
                <p className="text-[11px] md:text-xs font-bold uppercase tracking-[0.28em] text-brand-primary mb-2 md:mb-3">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight uppercase text-white leading-[0.92]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-3 md:mt-4 max-w-xl text-sm md:text-base text-white/90 font-medium leading-relaxed">
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
  shop: {
    desktop:
      'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/01-city-desktop.webp',
    /** Portrait trio — stronger on short mobile banners than a landscape crop. */
    mobile:
      'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/homepage/hero-mobile-mobile.webp',
  },
  blog: {
    desktop:
      'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/03-stone-desktop.webp',
    mobile:
      'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/lookbook/03-stone-desktop.webp',
  },
} as const
