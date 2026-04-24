interface LookbookDividerProps {
  text: string
  inverted?: boolean
  ariaLabel?: string
}

/**
 * Slim editorial rule shown between lookbook chapters.
 *
 * Intentionally quiet: one centered row, small caps, wide tracking,
 * thin vertical padding, no animation. Think of it as the running
 * header on the inside of a magazine spread — it punctuates the
 * reading rhythm without competing with the chapters themselves.
 *
 * Splits the admin-supplied text on `•` and re-joins the segments
 * with a middle-dot so the source format stays stable even though the
 * visual is now a single line instead of a grid.
 *
 * `inverted` flips the colour scheme so the strip always contrasts
 * with the chapter directly above it.
 */
export default function LookbookDivider({
  text,
  inverted = false,
  ariaLabel,
}: LookbookDividerProps) {
  if (!text || !text.trim()) return null

  const items = text
    .split('•')
    .map((s) => s.trim())
    .filter(Boolean)
  if (items.length === 0) return null

  const theme = inverted
    ? 'bg-white text-black border-y-2 border-black'
    : 'bg-black text-white border-y-2 border-black'

  return (
    <section className={theme} aria-label={ariaLabel}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-3.5 text-center">
        <p className="font-display uppercase tracking-[0.3em] text-[11px] md:text-xs leading-snug">
          {items.join('  ·  ')}
        </p>
      </div>
    </section>
  )
}
