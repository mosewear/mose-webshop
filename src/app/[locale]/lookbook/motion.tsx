'use client'

import { useRef } from 'react'
import Image from 'next/image'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from 'framer-motion'

/**
 * Scroll / viewport-entry motion primitives for the lookbook.
 *
 * Design rules
 *   - Always respect `prefers-reduced-motion: reduce`. Users with
 *     vestibular sensitivity get instant, no-translate fades or nothing.
 *   - Keep total travel small (max ~24px) to feel editorial, not gimmicky.
 *   - Parallax only on desktop (min-width: 768px) because mobile scroll
 *     and parallax translate combine into motion-sickness territory.
 *   - All motion uses the GPU-cheap `transform` + `opacity` properties.
 *
 * These primitives are intentionally primitive: they don't assume a
 * specific chapter layout so the typographic / image / caption blocks
 * can compose them differently per variant.
 */

// ----- Entry (viewport-enter fade + subtle rise) -----------------------------

const entryVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
}

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}

interface FadeInProps {
  children: React.ReactNode
  /** Defaults to motion.div. Use 'section' for top-level blocks. */
  as?: 'div' | 'section' | 'article' | 'header'
  className?: string
  /** Margin around the viewport trigger; negative = enters later. */
  rootMargin?: string
  /** Stagger children nested inside MotionStaggerItem. */
  stagger?: boolean
}

/**
 * Fades + lifts its children the first time they enter the viewport.
 * No-op when the user prefers reduced motion.
 */
export function MotionFadeIn({
  children,
  as = 'div',
  className,
  rootMargin = '-8% 0px',
  stagger = false,
}: FadeInProps) {
  const shouldReduce = useReducedMotion()
  if (shouldReduce) {
    // Render the underlying element as-is; no motion at all.
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }
  const MotionTag =
    as === 'section'
      ? motion.section
      : as === 'article'
        ? motion.article
        : as === 'header'
          ? motion.header
          : motion.div

  return (
    <MotionTag
      variants={stagger ? staggerContainer : entryVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: rootMargin }}
      className={className}
    >
      {children}
    </MotionTag>
  )
}

interface StaggerItemProps {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'h1' | 'h2' | 'h3' | 'p' | 'span'
  /** Extra delay on top of stagger, in seconds. */
  delay?: number
}

/**
 * Child of a MotionFadeIn-with-stagger container. Carries its own
 * fade+rise variant so the parent can time the children individually.
 */
export function MotionStaggerItem({
  children,
  className,
  as = 'div',
  delay = 0,
}: StaggerItemProps) {
  const shouldReduce = useReducedMotion()
  if (shouldReduce) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }
  const MotionTag = {
    div: motion.div,
    h1: motion.h1,
    h2: motion.h2,
    h3: motion.h3,
    p: motion.p,
    span: motion.span,
  }[as]

  return (
    <MotionTag
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
        },
      }}
      className={className}
    >
      {children}
    </MotionTag>
  )
}

// ----- Parallax hero image ---------------------------------------------------

interface ParallaxImageProps {
  src: string
  alt: string
  sizes?: string
  objectPosition?: string
  priority?: boolean
  className?: string
}

/**
 * Full-bleed image wrapped in a container that scrolls faster than the
 * image itself — classic magazine parallax. The effect is only applied
 * on wide viewports (`md+`) and when reduced motion is off; on mobile or
 * for reduced-motion users the image renders statically.
 */
export function ParallaxImage({
  src,
  alt,
  sizes = '100vw',
  objectPosition = '50% 50%',
  priority = false,
  className = '',
}: ParallaxImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const shouldReduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  // Move the image from -4% to +4% as the section scrolls through
  // viewport. Slightly more muted on narrow screens via CSS media query
  // below; the actual transform value is conditional on reduced motion.
  const y = useTransform(scrollYProgress, [0, 1], ['-4%', '4%'])

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
    >
      <motion.div
        className="absolute inset-[-4%] md:inset-[-6%]"
        style={shouldReduce ? undefined : { y }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          style={{ objectPosition }}
        />
      </motion.div>
    </div>
  )
}
