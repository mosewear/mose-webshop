interface LookbookMarqueeProps {
  text: string
  inverted?: boolean
  /** Bigger = more dramatic. Defaults to 'md'. */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Infinite horizontal marquee used between chapters.
 *
 * The text is duplicated twice inside a track that translates from 0 to
 * -50% so the second copy seamlessly takes over at the loop point. All
 * motion runs off a CSS `@keyframes marquee` defined in tailwind.config.ts
 * so it survives both SSR and users with JS disabled.
 *
 * Respects `prefers-reduced-motion: reduce` by halting the animation,
 * keeping the headline readable and static.
 */
export default function LookbookMarquee({
  text,
  inverted = false,
  size = 'md',
}: LookbookMarqueeProps) {
  if (!text || !text.trim()) return null

  const items = text
    .split('•')
    .map((s) => s.trim())
    .filter(Boolean)
  if (items.length === 0) return null

  const sizeClass =
    size === 'lg'
      ? 'text-3xl md:text-5xl lg:text-6xl py-4 md:py-6'
      : size === 'sm'
        ? 'text-base md:text-lg py-2'
        : 'text-xl md:text-3xl lg:text-4xl py-3 md:py-4'

  const themeClass = inverted
    ? 'bg-white text-black border-y-2 border-black'
    : 'bg-black text-white border-y-2 border-black'

  // Double the list so the track can translate 50% for seamless loop.
  const doubled = [...items, ...items]

  return (
    <div
      className={`relative overflow-hidden select-none ${themeClass}`}
      role="presentation"
      aria-hidden="true"
    >
      <div className="flex items-center animate-marquee motion-reduce:animate-none whitespace-nowrap will-change-transform">
        {doubled.map((item, idx) => (
          <span
            key={idx}
            className={`font-display uppercase tracking-tight flex items-center gap-6 md:gap-10 pr-6 md:pr-10 ${sizeClass}`}
          >
            {item}
            <span aria-hidden="true" className="text-brand-primary font-normal">
              ★
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
