'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, MessageCircle } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import ChatWindow from './ChatWindow'
import { trackEvent } from '@/lib/analytics'

const GEOPEND_KEY = 'mose_chat_opened'
const TIP_KEY = 'mose_chat_tip_gezien'
/** Zoveel milliseconden op dezelfde pagina blijven hangen, dan pas de tip. */
const TIP_NA_MS = 22000

/**
 * De tip boven de chatknop staat uit.
 *
 * Rick ziet dat vrijwel iedereen hem wegklikt in plaats van opent, en dan is
 * het een onderbreking zonder opbrengst. De knop zelf blijft gewoon staan, dus
 * wie een vraag heeft kan die nog steeds stellen. Op true zetten brengt de tip
 * terug zoals hij was.
 */
const TIP_AAN = false

export default function ChatButton() {
  const t = useTranslations('chat')
  const locale = useLocale()
  const pathname = usePathname()
  const verminderdeBeweging = useReducedMotion()

  const [isOpen, setIsOpen] = useState(false)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [onderbalk, setOnderbalk] = useState(0)
  const [tipZichtbaar, setTipZichtbaar] = useState(false)
  const [magPulseren, setMagPulseren] = useState(false)
  const knopRef = useRef<HTMLButtonElement>(null)

  const opProductpagina = Boolean(pathname?.includes('/product/'))
  const opHomepage = pathname === '/nl' || pathname === '/en' || pathname === '/nl/' || pathname === '/en/' || pathname === '/'
  const [heroPassed, setHeroPassed] = useState(false)

  // Keep the campaign and its actions unobstructed. Re-hide when returning to
  // the top; an already opened conversation remains usable while scrolling.
  useEffect(() => {
    setHeroPassed(false)
    if (!opHomepage) return
    const hero = document.querySelector('[data-home-hero]')
    if (!hero) return
    const observer = new IntersectionObserver(([entry]) => {
      setHeroPassed(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0)
    }, { threshold: 0 })
    observer.observe(hero)
    return () => observer.disconnect()
  }, [opHomepage, pathname])

  // Eén MutationObserver voor alle drawer-detecties: één DOM-traversal
  // per mutatie i.p.v. drie aparte observers. Een gewijzigd attribute
  // (zoals het MobileMenu dat data-mobile-menu="open|closed" toggle't
  // zonder unmount) telt óók als mutation, dus we kijken expliciet
  // naar attribute-changes naast childList.
  useEffect(() => {
    const checkAllDrawers = () => {
      setIsFilterDrawerOpen(!!document.querySelector('[data-filter-drawer]'))
      setIsCartDrawerOpen(!!document.querySelector('[data-cart-drawer]'))
      // Mobile menu staat permanent in de DOM (translate off-canvas),
      // dus we checken op de attribuut-WAARDE i.p.v. enkel presence.
      setIsMobileMenuOpen(!!document.querySelector('[data-mobile-menu="open"]'))
    }

    checkAllDrawers()
    const observer = new MutationObserver(checkAllDrawers)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-mobile-menu'],
    })

    return () => observer.disconnect()
  }, [])

  /**
   * Blijf boven de vaste balk onderaan het scherm.
   *
   * Hiervoor werd de chatknop op de productpagina en in de winkelwagen gewoon
   * WEGGELATEN, omdat hij daar over de koopbalk viel. Dat is precies verkeerd
   * om: de productpagina is waar de maatvraag ontstaat, en "welke maat heb ik"
   * is de eerste vraag die de chat zelf voorstelt. De knop verdween dus op de
   * twee pagina's waar hij het meeste waard is.
   *
   * Elke vaste balk onderaan draagt nu `data-onderbalk`. Hieronder meten we hoe
   * hoog de balk is die daadwerkelijk tegen de onderrand plakt; de knop schuift
   * daarboven. Een balk die weggeschoven is (translate-y-full) staat onder de
   * vouw en telt dus niet mee.
   */
  const meetOnderbalk = useCallback(() => {
    const balken = Array.from(document.querySelectorAll('[data-onderbalk]'))
    let hoogste = 0
    for (const el of balken) {
      const r = el.getBoundingClientRect()
      if (r.height === 0) continue
      // Staat hij onderin beeld? Een balk die met translate-y-full is
      // weggeschoven heeft een top ONDER de vouw en telt niet mee.
      //
      // De marge van 240px is nodig omdat elke vaste balk op
      // `bottom: var(--cookie-consent-height)` staat. Zolang de cookiebalk in
      // beeld is, raakt de koopbalk de onderrand dus niet, en met de oude
      // controle (`bottom < innerHeight - 8`) viel hij volledig buiten de
      // meting. De chatknop ging dan alleen boven de cookiebalk staan en lag
      // precies over de afrekenknop heen.
      if (window.innerHeight - r.bottom > 240) continue
      if (r.top >= window.innerHeight - 8) continue
      hoogste = Math.max(hoogste, window.innerHeight - r.top)
    }
    setOnderbalk(Math.round(hoogste))
  }, [])

  useEffect(() => {
    // Meet niet één keer, maar ook ná de schuifbeweging.
    //
    // De koopbalk komt omhoog met een overgang van 200ms. De klassewijziging die
    // dat in gang zet, is het moment waarop de waarnemer afgaat, en op dát
    // moment staat de balk nog onder de vouw: je meet dan nul. Daarna gebeurde
    // er niets meer, dus de knop bleef onderin staan en viel over de koopbalk.
    // Op desktop viel dat niet op omdat de balk daar bij het laden nog weg is.
    const timers: ReturnType<typeof setTimeout>[] = []
    const planMeting = () => {
      timers.forEach(clearTimeout)
      timers.length = 0
      meetOnderbalk()
      timers.push(setTimeout(meetOnderbalk, 260), setTimeout(meetOnderbalk, 520))
    }

    planMeting()
    const observer = new MutationObserver(planMeting)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    })
    // transitionend bubbelt, dus één luisteraar op het document vangt elke balk.
    document.addEventListener('transitionend', meetOnderbalk, true)
    window.addEventListener('resize', planMeting)
    window.addEventListener('scroll', meetOnderbalk, { passive: true })
    return () => {
      timers.forEach(clearTimeout)
      observer.disconnect()
      document.removeEventListener('transitionend', meetOnderbalk, true)
      window.removeEventListener('resize', planMeting)
      window.removeEventListener('scroll', meetOnderbalk)
    }
  }, [meetOnderbalk])

  /**
   * Eén keer per bezoek een tip, op een moment van twijfel.
   *
   * De knop pulseerde hiervoor onafgebroken. Dat werkt één keer en daarna leert
   * iedereen hem wegkijken, en het is precies wat WCAG 2.2.2 bedoelt met
   * bewegende inhoud die je niet kunt stoppen. Eén zin met een concrete vraag,
   * nadat iemand twintig seconden op dezelfde pagina is blijven hangen, doet
   * wat een pulsering niet doet: een reden geven om te klikken. Daarna nooit
   * meer, en met een kruisje erop.
   */
  useEffect(() => {
    if (!TIP_AAN) return
    if (isOpen) return
    let gezien = false
    try {
      gezien =
        sessionStorage.getItem(TIP_KEY) === '1' || sessionStorage.getItem(GEOPEND_KEY) === '1'
    } catch {
      gezien = false
    }
    if (gezien) return

    const timer = setTimeout(() => setTipZichtbaar(true), TIP_NA_MS)
    return () => clearTimeout(timer)
  }, [isOpen, pathname])

  /**
   * De ring pulseert tot iemand de chat in dit bezoek één keer heeft geopend.
   *
   * Hij stopt dus uit zichzelf, en bij `prefers-reduced-motion` begint hij
   * niet. Dat is het verschil met de vorige pulsering, die op elke pagina
   * oneindig doorging en daardoor precies het tegenovergestelde deed: wat
   * altijd beweegt, kijk je weg.
   */
  useEffect(() => {
    try {
      setMagPulseren(sessionStorage.getItem(GEOPEND_KEY) !== '1')
    } catch {
      setMagPulseren(true)
    }
  }, [])

  const sluitTip = useCallback((reden: 'weggeklikt' | 'gebruikt') => {
    setTipZichtbaar(false)
    try {
      sessionStorage.setItem(TIP_KEY, '1')
    } catch {
      // Opslag geblokkeerd: dan kan de tip volgende sessie opnieuw komen.
    }
    if (reden === 'weggeklikt') {
      trackEvent({
        event_name: 'chat_closed',
        properties: { source: 'tip_dismissed', page_url: window.location.href },
      })
    }
  }, [])

  // Verberg de knop wanneer een schermvullende laag open staat (filterlade,
  // winkelmandlade of mobiel menu). De knop heeft z-[9999] en zou er anders
  // doorheen prikken.
  const shouldHideButton = isFilterDrawerOpen || isCartDrawerOpen || isMobileMenuOpen || (opHomepage && !heroPassed && !isOpen)

  const handleToggle = () => {
    const wasOpen = isOpen
    setIsOpen(!wasOpen)

    if (!wasOpen) {
      setMagPulseren(false)
      sluitTip('gebruikt')
      try {
        sessionStorage.setItem(GEOPEND_KEY, '1')
      } catch {
        // Opslag geblokkeerd: dan mag de tip volgende sessie weer komen.
      }
    }

    trackEvent({
      event_name: wasOpen ? 'chat_closed' : 'chat_opened',
      properties: {
        source: 'chat_button',
        page_url: window.location.href,
      },
    })
  }

  const handleClose = () => {
    setIsOpen(false)
    // Focus terug naar de knop waar hij vandaan kwam. Zonder dit valt de focus
    // bij het sluiten terug naar het begin van de pagina.
    requestAnimationFrame(() => knopRef.current?.focus())
  }

  // Anderhalve rem lucht, plus de cookiebalk, plus de koopbalk als die er staat.
  // `onderbalk` is gemeten vanaf de onderrand van het venster en bevat de
  // cookiebalk dus al zodra er een koopbalk staat. Optellen zou die hoogte twee
  // keer meenemen; daarom het grootste van de twee.
  const onderMarge = `calc(1.5rem + max(var(--cookie-consent-height, 0px), ${onderbalk}px))`

  return (
    <>
      {!shouldHideButton && (
        <div
          className="chat-floating fixed right-4 z-[9999] flex flex-col items-end gap-2 md:right-6"
          style={{ bottom: onderMarge }}
        >
          {/* De tip, boven de knop. */}
          <AnimatePresence>
            {tipZichtbaar && !isOpen && (
              <motion.div
                initial={verminderdeBeweging ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={verminderdeBeweging ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="relative max-w-[17rem] border-2 border-black bg-white p-3 pr-10 shadow-[0_6px_20px_rgba(0,0,0,0.18)]"
                role="status"
              >
                <button
                  type="button"
                  onClick={handleToggle}
                  className="block text-left text-[13px] leading-snug text-black"
                >
                  {opProductpagina ? t('nudge.size') : t('nudge.general')}
                </button>
                <button
                  type="button"
                  onClick={() => sluitTip('weggeklikt')}
                  aria-label={t('nudge.dismiss')}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-black/45 transition-colors hover:text-black"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* De knop zelf. Was een vierkantje met een tekstballon: een icoon dat
              op elke website iets anders betekent. Nu het merkteken met een
              woord ernaast, zodat je ziet wat je krijgt als je klikt. Zwart met
              wit, niet groen: het groen is van de koopknop, en de chat hoort
              daar niet mee te concurreren. */}
          {/* Rond, merkgroen, met een witte ring en een pulserende halo.
              
              Waarom rond: de hele winkel bestaat uit vierkanten met een rand
              van 2px. Een zwart vierkant met een zwarte rand verdwijnt daarin,
              hoe hoog het contrast op papier ook is. De ronde vorm komt nergens
              anders voor en is bovendien wat mensen van een chatknop verwachten.

              Waarom groen en niet zwart: zwart op wit haalt wel 21 op 1, maar
              die combinatie staat al op elke knop en elk kader. Merkgroen in een
              massief vlak staat nergens anders in dit formaat.

              De witte ring is er voor de momenten dat de knop over een donkere
              productfoto schuift; zonder die ring loopt hij daar in weg.

              Tekst alleen op desktop. Op een telefoon van 390 pixels vecht elke
              pixel van een zwevend element met de pagina eronder, en daar lag de
              bredere versie over de knop waar de pagina zelf om vraagt. */}
          <button
            ref={knopRef}
            onClick={handleToggle}
            className={`chat-knop group relative flex items-center justify-center rounded-full transition-transform duration-200 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/70 focus-visible:ring-offset-2 ${
              isOpen
                ? 'hidden h-14 w-14 bg-black text-brand-primary md:flex'
                : 'h-[60px] w-[60px] bg-brand-primary text-white md:h-14 md:w-auto md:gap-2.5 md:px-6'
            } ${!isOpen && magPulseren ? 'chat-knop-pulse' : ''}`}
            aria-label={isOpen ? t('close') : t('launcher')}
            aria-expanded={isOpen}
            aria-controls="chat-window"
          >
            {isOpen ? (
              <X className="h-6 w-6 md:h-7 md:w-7" strokeWidth={3} />
            ) : (
              <>
                {/* Eén vorm, één vulling, één icoon. Hier stond een groene
                    cirkel om een zwarte cirkel om een groen icoon: drie vormen
                    en twee kleuromslagen op 64 pixels. Dat oogt goedkoop en het
                    maakt de knop niet beter zichtbaar, alleen drukker. */}
                <MessageCircle className="h-7 w-7 md:h-6 md:w-6" strokeWidth={2.2} aria-hidden="true" />
                <span className="hidden font-display text-base uppercase leading-none tracking-wide md:inline">
                  {t('launcher')}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && <ChatWindow key={locale} onClose={handleClose} />}
      </AnimatePresence>

      {/* De witte ring en de zweefschaduw staan altijd, de halo alleen zolang
          de chat nog niet geopend is. De halo loopt via box-shadow en werkt
          daardoor net zo goed om een cirkel als om een pil. */}
      <style jsx global>{`
        /* Een dunne witte rand voor de momenten dat de knop over een donkere
           productfoto schuift, en daaronder een diepe zachte schaduw zodat hij
           boven de pagina zweeft in plaats van erin te liggen. */
        .chat-knop {
          box-shadow:
            0 0 0 2px #ffffff,
            0 14px 32px rgba(0, 0, 0, 0.26),
            0 4px 10px rgba(0, 0, 0, 0.14);
        }

        @keyframes chat-halo {
          0% {
            box-shadow:
              0 0 0 2px #ffffff,
              0 0 0 2px rgba(0, 166, 118, 0.5),
              0 14px 32px rgba(0, 0, 0, 0.26);
          }
          70% {
            box-shadow:
              0 0 0 2px #ffffff,
              0 0 0 20px rgba(0, 166, 118, 0),
              0 14px 32px rgba(0, 0, 0, 0.26);
          }
          100% {
            box-shadow:
              0 0 0 2px #ffffff,
              0 0 0 0 rgba(0, 166, 118, 0),
              0 14px 32px rgba(0, 0, 0, 0.26);
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .chat-knop-pulse {
            animation: chat-halo 2.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        }

        .chat-knop-pulse:hover {
          animation: none;
        }
      `}</style>
    </>
  )
}
