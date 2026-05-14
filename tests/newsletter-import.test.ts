import { describe, expect, it } from 'vitest'
import {
  buildParsedSubscriberRows,
  canonicalHeader,
  parseCsvText,
  stripBom,
} from '@/lib/newsletter-import/parse-import-file'

describe('stripBom', () => {
  it('removes utf-8 BOM', () => {
    expect(stripBom('\uFEFFhello')).toBe('hello')
  })
})

describe('canonicalHeader', () => {
  it('maps common email headers', () => {
    expect(canonicalHeader('Email')).toBe('email')
    expect(canonicalHeader('E-mail')).toBe('email')
    expect(canonicalHeader('  MAIL ')).toBe('email')
  })
})

describe('parseCsvText', () => {
  it('parses comma-separated with header', () => {
    const csv = 'email,status\nfoo@bar.nl,active\n'
    const { rows, issues } = parseCsvText(csv)
    expect(issues.length).toBe(0)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ email: 'foo@bar.nl', status: 'active' })
  })

  it('parses semicolon-separated (EU Excel)', () => {
    const csv = 'email;status\nfoo@bar.nl;active\n'
    const { rows, issues } = parseCsvText(csv)
    expect(issues.length).toBe(0)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ email: 'foo@bar.nl', status: 'active' })
  })

  it('handles quoted fields with comma inside', () => {
    const csv = 'email,note\n"a@b.nl","hello, world"\n'
    const { rows } = parseCsvText(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe('a@b.nl')
  })
})

describe('buildParsedSubscriberRows', () => {
  it('dedupes by email (first wins)', () => {
    const { parsed, duplicateInFile } = buildParsedSubscriberRows([
      { email: 'a@b.nl' },
      { email: 'a@b.nl' },
    ])
    expect(parsed).toHaveLength(1)
    expect(duplicateInFile).toBe(1)
  })

  it('defaults source to admin_import when missing', () => {
    const { parsed } = buildParsedSubscriberRows([{ email: 'x@y.nl' }])
    expect(parsed[0].source).toBe('admin_import')
  })
})
