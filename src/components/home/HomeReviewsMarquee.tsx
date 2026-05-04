'use client'

import { useTranslations } from 'next-intl'
import { Star, ShieldCheck, ArrowRight } from 'lucide-react'
import { Link as LocaleLink } from '@/i18n/routing'
import type { MarqueeReview } from '@/lib/reviews/marquee'

interface HomeReviewsMarqueeProps {
  items: MarqueeReview[]
}

/**
 * MOSE BRUTALIST REVIEWS TAPE-STRIP
 *
 * Doel: vervangt de oude trust-badge bar (lokaal/verzending/retour/
 * veilig betalen) door echte 5★ reviews uit de eigen database. Sterk
 * social-proof signaal direct boven de "uitgelichte producten"-grid.
 *
 * Visueel patroon (matched 100% met de mobile-menu ticker en de PDP
 * review styling):
 *  - Wit canvas + 2px zwarte border-y
 *  - Groene MOSE-sterren (consistent met ProductReviews op de PDP)
 *  - Reviewer in caps + 0.18em tracking
 *  - Verified-badge = groene checkmark + label
 *  - • bullets als separators tussen items (zoals in de menu-ticker)
 *  - Editorial label-tegel links: "ECHTE REVIEWS" — past in de strip
 *    als visueel "label op de tape"
 *
 * Animatie:
 *  - 2 identieke sets achter elkaar, parent doet translateX(-50%)
 *    via `animate-marquee` voor een naadloze loop.
 *  - Custom `--marquee-duration: 45s` — items ~6s in beeld, snel
 *    genoeg voor leven, traag genoeg om door te lezen.
 *  - Hover (desktop): `[animation-play-state:paused]` zodat
 *    bezoekers comfortabel een item kunnen aanklikken.
 *  - prefers-reduced-motion: 2e set verborgen (motion-reduce:hidden)
 *    en animatie automatisch uit.
 *
 * A11y:
 *  - role="region" + aria-label voor screenreaders
 *  - 1e set is canonical; 2e set heeft aria-hidden zodat reviews
 *    niet dubbel-aankondigen
 *  - Items zijn echte links naar de bijbehorende PDP
 */
export default function HomeReviewsMarquee({ items }: HomeReviewsMarqueeProps) {
  const t = useTranslations('homepage.reviewsMarquee')

  if (items.length === 0) return null

  return (
    <section
      role="region"
      aria-label={t('ariaLabel')}
      className="relative bg-white border-b-2 border-black overflow-hidden"
    >
      <div className="flex items-stretch">
        {/* Editorial label-tegel links — sticky-ish "tape on tape" cue.
            Op mobile valt 'ie weg om de marquee meer ademruimte te geven
            (de eyebrow zit dan impliciet in de strip-content). Desktop
            krijgt het volledige merkstatement. */}
        <div
          aria-hidden="true"
          className="hidden md:flex flex-shrink-0 items-center gap-2 bg-black text-white px-5 border-r-2 border-black"
        >
          <Star size={14} fill="currentColor" strokeWidth={0} className="text-brand-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] leading-none">
            {t('eyebrow')}
          </span>
        </div>

        {/* Marquee-track. group/marquee zodat we hover-pause kunnen
            scopen naar dit specifieke blok zonder de parent te storen. */}
        <div
          className="group/marquee relative flex-1 overflow-hidden"
          style={{ ['--marquee-duration' as string]: '45s' }}
        >
          <div className="flex w-max items-stretch motion-safe:animate-marquee will-change-transform group-hover/marquee:[animation-play-state:paused] py-3">
            <ReviewSet items={items} verifiedLabel={t('verified')} />
            <ReviewSet items={items} verifiedLabel={t('verified')} ariaHidden />
          </div>

          {/* Fade-edges — zachte overgang van content naar leeg/border.
              Pointer-events:none zodat ze geen taps op items eten. */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none"
          />
        </div>
      </div>
    </section>
  )
}

interface ReviewSetProps {
  items: MarqueeReview[]
  verifiedLabel: string
  ariaHidden?: boolean
}

/**
 * Eén kopie van de review-tekst-set. Wordt 2× gerenderd door de
 * parent zodat translateX(0) → translateX(-50%) een naadloze loop is.
 * Items zijn `LocaleLink`-elementen → klik op een review opent de
 * bijbehorende PDP in dezelfde locale.
 */
function ReviewSet({ items, verifiedLabel, ariaHidden = false }: ReviewSetProps) {
  return (
    <ol
      // 2e set = pure visual filler voor de loop; verbergen voor AT.
      // Op reduced-motion verbergen we 'm óók visueel zodat we niet
      // twee statische identieke sets achter elkaar tonen.
      aria-hidden={ariaHidden ? 'true' : undefined}
      className={`flex items-stretch shrink-0 ${ariaHidden ? 'motion-reduce:hidden' : ''}`}
      role={ariaHidden ? 'presentation' : 'list'}
    >
      {items.map((review, idx) => (
        <li key={`${ariaHidden ? 'b' : 'a'}-${review.id}-${idx}`} className="flex items-center">
          <LocaleLink
            href={`/product/${review.productSlug}`}
            // Tabbable alleen in de canonical set; in de aria-hidden
            // duplicate slaan we het over zodat keyboard-tabbing niet
            // door dezelfde reviews tweemaal heen gaat.
            tabIndex={ariaHidden ? -1 : 0}
            aria-hidden={ariaHidden ? 'true' : undefined}
            className="group/item flex items-center gap-3 px-5 md:px-6 py-1 whitespace-nowrap focus-visible:outline-none focus-visible:bg-black focus-visible:text-white transition-colors"
          >
            <Stars rating={review.rating} />

            <span className="text-[12px] md:text-sm text-black italic max-w-[18rem] md:max-w-[24rem] truncate">
              &ldquo;{review.text}&rdquo;
            </span>

            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.18em] text-black/70 leading-none">
              — {review.reviewerName}
            </span>

            {review.isVerifiedPurchase && (
              <span
                aria-label={verifiedLabel}
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-primary leading-none"
              >
                <ShieldCheck size={12} strokeWidth={2.5} aria-hidden="true" />
                <span className="hidden md:inline">{verifiedLabel}</span>
              </span>
            )}

            <ArrowRight
              size={12}
              strokeWidth={2.5}
              aria-hidden="true"
              className="text-black/40 transform group-hover/item:translate-x-0.5 group-hover/item:text-brand-primary transition-all"
            />
          </LocaleLink>

          {/* • Bullet separator tussen items. Dezelfde groene punt als
              in de menu-ticker, scoort als visuele rust + ritme. */}
          <span
            aria-hidden="true"
            className="text-brand-primary px-1 text-base leading-none select-none"
          >
            •
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Visuele 5-sterren render. Brand-primary groen voor gevulde sterren
 * (consistent met ProductReviews op de PDP), gray-300 voor lege.
 */
function Stars({ rating }: { rating: number }) {
  const safe = Math.max(0, Math.min(5, rating))
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-0.5 leading-none">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          fill="currentColor"
          strokeWidth={0}
          className={s <= safe ? 'text-brand-primary' : 'text-gray-300'}
        />
      ))}
    </span>
  )
}
