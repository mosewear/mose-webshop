'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, MessageCircle } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import ChatWindow from './ChatWindow'
import { trackEvent } from '@/lib/analytics'

const GEOPEND_KEY = 'mose_chat_opened'
const TIP_KEY = 'mose_chat_tip_gezien'
/** Zoveel milliseconden op dezelfde pagina blijven hangen, dan pas de tip. */
const TIP_NA_MS = 22000

export default function ChatButton() {
  const t = useTranslations('chat')
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
      // Plakt hij tegen de onderrand, en staat hij ook echt in beeld? Een balk
      // die met translate-y-full is weggeschoven heeft een top ONDER de vouw.
      if (r.bottom < window.innerHeight - 8) continue
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
  const shouldHideButton = isFilterDrawerOpen || isCartDrawerOpen || isMobileMenuOpen

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
  const onderMarge = `calc(1.5rem + var(--cookie-consent-height, 0px) + ${onderbalk}px)`

  return (
    <>
      {!shouldHideButton && (
        <div
          className="fixed right-4 z-[9999] flex flex-col items-end gap-2 md:right-6"
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
                : 'h-16 w-16 bg-brand-primary text-black md:h-[60px] md:w-auto md:gap-3 md:pl-3 md:pr-6'
            } ${!isOpen && magPulseren ? 'chat-knop-pulse' : ''}`}
            aria-label={isOpen ? t('close') : t('launcher')}
            aria-expanded={isOpen}
            aria-controls="chat-window"
          >
            {isOpen ? (
              <X className="h-6 w-6 md:h-7 md:w-7" strokeWidth={3} />
            ) : (
              <>
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-black text-brand-primary md:h-10 md:w-10">
                  <MessageCircle className="h-6 w-6 md:h-5 md:w-5" strokeWidth={2.4} />
                </span>
                <span className="hidden font-display text-base uppercase leading-none tracking-wide text-black md:inline">
                  {t('launcher')}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && <ChatWindow onClose={handleClose} />}
      </AnimatePresence>

      {/* De witte ring en de zweefschaduw staan altijd, de halo alleen zolang
          de chat nog niet geopend is. De halo loopt via box-shadow en werkt
          daardoor net zo goed om een cirkel als om een pil. */}
      <style jsx global>{`
        .chat-knop {
          box-shadow:
            0 0 0 3px #ffffff,
            0 10px 26px rgba(0, 0, 0, 0.32),
            0 2px 6px rgba(0, 0, 0, 0.2);
        }

        @keyframes chat-halo {
          0% {
            box-shadow:
              0 0 0 3px #ffffff,
              0 0 0 3px rgba(0, 166, 118, 0.55),
              0 10px 26px rgba(0, 0, 0, 0.32);
          }
          70% {
            box-shadow:
              0 0 0 3px #ffffff,
              0 0 0 18px rgba(0, 166, 118, 0),
              0 10px 26px rgba(0, 0, 0, 0.32);
          }
          100% {
            box-shadow:
              0 0 0 3px #ffffff,
              0 0 0 0 rgba(0, 166, 118, 0),
              0 10px 26px rgba(0, 0, 0, 0.32);
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
