'use client'

import { useEffect } from 'react'

export default function MainContentWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Hier stond een MutationObserver op document.documentElement met
    // subtree + attributes. Die vuurde bij ELKE DOM-mutatie op de pagina (elke
    // toast, elk filter, elke carousel-stap), las dan header.offsetHeight (een
    // forced synchronous layout) en schreef daarna zelf weer een style op
    // documentElement, wat de observer opnieuw kon triggeren. Op mobiel was dat
    // de zwaarste bron van scroll- en interactiejank.
    //
    // Een ResizeObserver op de header zelf meet precies wat we willen weten en
    // vuurt alleen als die hoogte echt verandert.
    let frame = 0
    let lastHeight = -1

    const writeHeaderHeight = (height: number) => {
      if (height === lastHeight) return
      lastHeight = height
      document.documentElement.style.setProperty('--header-total-height', `${height}px`)
    }

    const measure = () => {
      const header = document.querySelector('header')
      if (!header) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => writeHeaderHeight(header.offsetHeight))
    }

    measure()

    const header = document.querySelector('header')
    const resizeObserver = new ResizeObserver(measure)
    if (header) resizeObserver.observe(header)

    // De header kan door de aankondigingsbalk opnieuw gemount worden. Eén
    // smalle observer op de directe ouder (alleen childList, geen subtree)
    // koppelt de ResizeObserver dan opnieuw, zonder de hele boom te bewaken.
    const parent = header?.parentElement
    const remountObserver = parent
      ? new MutationObserver(() => {
          const next = document.querySelector('header')
          if (next && next !== header) {
            resizeObserver.disconnect()
            resizeObserver.observe(next)
            measure()
          }
        })
      : null
    if (parent && remountObserver) remountObserver.observe(parent, { childList: true })

    window.addEventListener('resize', measure, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      resizeObserver.disconnect()
      remountObserver?.disconnect()
    }
  }, [])

  // `data-site-chrome` marks this <main> as sitting under the public-site
  // fixed banner + header stack. The global #main-content padding rule in
  // globals.css is scoped to this attribute so the admin's own <main> (at
  // /admin/*) — which has no announcement banner and no public header —
  // is not affected by the offset calculation.
  return <main id="main-content" data-site-chrome>{children}</main>
}
