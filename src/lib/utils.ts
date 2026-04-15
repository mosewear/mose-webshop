import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DUTCH_PARTICLES = new Set([
  'van', 'de', 'den', 'der', 'het', 'ter', 'ten', 'te', 'in', "'t",
])

export function capitalizeName(name: string): string {
  if (!name) return name
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word, i) => {
      const lower = word.toLowerCase()
      if (i > 0 && DUTCH_PARTICLES.has(lower)) return lower
      if (word.length === 0) return word
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}




