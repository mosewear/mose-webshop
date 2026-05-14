import { describe, expect, it } from 'vitest'
import {
  buildParsedSubscriberRows,
  canonicalHeader,
  chunkEmailsForInFilter,
  detectCsvDelimiterFromText,
  guessImportColumnMapping,
  MAX_EMAIL_IN_QUERY_CHARS,
  parseCsvText,
  parseNewsletterImportColumnPreview,
  stripBom,
  validateImportColumnMapping,
} from '@/lib/newsletter-import/parse-import-file'

describe('stripBom', () => {
  it('removes utf-8 BOM', () => {
    expect(stripBom('\uFEFFhello')).toBe('hello')
  })
})

describe('chunkEmailsForInFilter', () => {
  it('keeps each chunk under the encoded URL budget', () => {
    const long = 'a'.repeat(120) + '@b.nl'
    const emails = Array.from({ length: 200 }, (_, i) => `${i}-${long}`)
    const chunks = chunkEmailsForInFilter(emails)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      let budget = 0
      for (const email of chunk) {
        budget += encodeURIComponent(email).length + 1
      }
      expect(budget).toBeLessThanOrEqual(MAX_EMAIL_IN_QUERY_CHARS)
    }
  })

  it('returns one chunk for a short list', () => {
    expect(chunkEmailsForInFilter(['x@y.nl', 'z@y.nl'])).toEqual([['x@y.nl', 'z@y.nl']])
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

describe('detectCsvDelimiterFromText', () => {
  it('detects semicolon when header has only semicolons', () => {
    expect(detectCsvDelimiterFromText('a;b;c\n1;2;3')).toBe(';')
  })
  it('returns undefined for comma csv', () => {
    expect(detectCsvDelimiterFromText('a,b,c\n1,2,3')).toBeUndefined()
  })
})

describe('guessImportColumnMapping', () => {
  it('maps known email header', () => {
    const g = guessImportColumnMapping(['Name', 'Email'], [{ Name: 'x', Email: 'a@b.nl' }])
    expect(g.email).toBe('Email')
  })

  it('falls back to first column with email-like value', () => {
    const g = guessImportColumnMapping(['Contact', 'Foo'], [{ Contact: 'z@q.nl', Foo: 'x' }])
    expect(g.email).toBe('Contact')
  })
})

describe('validateImportColumnMapping', () => {
  it('rejects missing email selection', () => {
    const v = validateImportColumnMapping({ email: '' }, ['a', 'b'])
    expect(v.ok).toBe(false)
  })
  it('rejects unknown column', () => {
    const v = validateImportColumnMapping({ email: 'x' }, ['a', 'b'])
    expect(v.ok).toBe(false)
  })
  it('accepts valid mapping', () => {
    const v = validateImportColumnMapping({ email: 'E', status: 'S' }, ['E', 'S'])
    expect(v.ok).toBe(true)
  })
})

describe('parseNewsletterImportColumnPreview', () => {
  it('returns headers and suggested mapping for csv', () => {
    const buf = Buffer.from('weird_email_col,lang\na@b.nl,nl\n', 'utf8')
    const r = parseNewsletterImportColumnPreview(buf, 'list.csv')
    expect(r.issues.filter((i) => i.kind === 'limit')).toHaveLength(0)
    expect(r.headers).toEqual(['weird_email_col', 'lang'])
    expect(r.suggestedMapping.email).toBe('weird_email_col')
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

  it('uses explicit column mapping for non-standard headers', () => {
    const { parsed } = buildParsedSubscriberRows(
      [{ contact_mail: '  A@B.NL  ', taal: 'en' }],
      { email: 'contact_mail', locale: 'taal' }
    )
    expect(parsed).toHaveLength(1)
    expect(parsed[0].email).toBe('a@b.nl')
    expect(parsed[0].locale).toBe('en')
  })

  it('defaults source to admin_import when missing', () => {
    const { parsed } = buildParsedSubscriberRows([{ email: 'x@y.nl' }])
    expect(parsed[0].source).toBe('admin_import')
  })
})
