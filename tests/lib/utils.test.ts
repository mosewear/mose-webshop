import { describe, it, expect } from 'vitest'
import { capitalizeName } from '@/lib/utils'

describe('capitalizeName', () => {
  it('capitalizes a simple name', () => {
    expect(capitalizeName('jan de vries')).toBe('Jan de Vries')
  })

  it('lowercases Dutch particles in non-first position', () => {
    expect(capitalizeName('PIETER VAN DER BERG')).toBe('Pieter van der Berg')
  })

  it('capitalizes particle when it is the first word', () => {
    expect(capitalizeName('van den berg')).toBe('Van den Berg')
  })

  it('returns empty/falsy input as-is', () => {
    expect(capitalizeName('')).toBe('')
  })

  it('trims and collapses whitespace', () => {
    expect(capitalizeName('  jan   jansen  ')).toBe('Jan Jansen')
  })

  it('handles single word', () => {
    expect(capitalizeName('MOSE')).toBe('Mose')
  })

  it('handles names with het and ter', () => {
    expect(capitalizeName('henk ter borch')).toBe('Henk ter Borch')
    expect(capitalizeName('anna het zand')).toBe('Anna het Zand')
  })
})
