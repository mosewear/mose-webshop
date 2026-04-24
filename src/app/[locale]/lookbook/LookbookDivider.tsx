interface LookbookDividerProps {
  text: string
  inverted?: boolean
}

/**
 * Static editorial divider shown between lookbook chapters.
 *
 * Replaces the earlier animated marquee. MOSE's visual language is
 * composed and architectural — thick black borders, display type, and
 * measured whitespace — so a scrolling ticker felt out of place. We
 * mirror the `Stats` strip the homepage already uses (outer 2px border,
 * even grid with gap, no micro-dividers) so the lookbook visually
 * inherits the rest of the site's rhythm.
 *
 * Behaviour
 *   - Fully static: no animation, no JS, no motion dependency.
 *   - Splits the admin-supplied text on `•` and renders each segment
 *     as one principle cell, in display type.
 *   - Grid adapts to the number of items (1 on mobile; up to 5 in a
 *     single row on large screens; more than 5 wrap into a second row).
 *   - `inverted` flips to white-on-black so the strip keeps contrast
 *     when it follows a dark-variant chapter.
 */
export default function LookbookDivider({
  text,
  inverted = false,
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

  // Every candidate class string is listed here so Tailwind's JIT picks
  // them up at build. Counts above 5 fall through to a 4-col layout and
  // wrap gracefully — acceptable for the rare case of long manifestos.
  const gridCols =
    items.length === 1
      ? 'grid-cols-1'
      : items.length === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : items.length === 3
          ? 'grid-cols-1 sm:grid-cols-3'
          : items.length === 4
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : items.length === 5
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'

  return (
    <section className={theme} aria-label="MOSE principles">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
        <ul
          className={`grid ${gridCols} gap-x-6 gap-y-8 md:gap-x-10 md:gap-y-10 text-center`}
        >
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center justify-center">
              <p className="font-display uppercase tracking-tight text-xl sm:text-2xl md:text-3xl lg:text-[2rem] leading-[0.95] max-w-[20ch]">
                {item}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
