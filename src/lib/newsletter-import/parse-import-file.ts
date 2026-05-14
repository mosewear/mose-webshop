import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  DEFAULT_IMPORT_SOURCE,
  EMAIL_REGEX,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  NEWSLETTER_DB_SOURCES,
  type NewsletterDbSource,
} from './constants'

export interface ParsedSubscriberInput {
  /** 1-based spreadsheet row (line 2 = first data row under header). */
  row: number
  email: string
  status: 'active' | 'unsubscribed'
  locale: 'nl' | 'en'
  source: NewsletterDbSource
}

export interface ParseFileIssue {
  kind: 'parse' | 'limit'
  message: string
}

export function stripBom(input: string): string {
  return input.replace(/^\uFEFF/, '')
}

function normalizeHeaderKey(h: string): string {
  return stripBom(h)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
}

/** Map arbitrary CSV/Excel header to canonical field name, or null if unknown. */
export function canonicalHeader(header: string): 'email' | 'status' | 'locale' | 'source' | null {
  const k = normalizeHeaderKey(header)
  if (
    k === 'email' ||
    k === 'e_mail' ||
    k === 'mail' ||
    k === 'email_address' ||
    k === 'emailadres' ||
    k === 'e_mail_adres'
  ) {
    return 'email'
  }
  if (k === 'status') return 'status'
  if (k === 'locale' || k === 'taal' || k === 'language' || k === 'lang') return 'locale'
  if (k === 'source' || k === 'bron') return 'source'
  return null
}

function flattenRow(rec: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {}
  for (const [header, val] of Object.entries(rec)) {
    const canon = canonicalHeader(header)
    if (!canon) continue
    flat[canon] = String(val ?? '').trim()
  }
  return flat
}

function detectEmailFromRow(rec: Record<string, unknown>): string | null {
  const flat = flattenRow(rec)
  const direct = flat.email?.toLowerCase().trim()
  if (direct && EMAIL_REGEX.test(direct)) return direct
  for (const v of Object.values(rec)) {
    const s = String(v ?? '').trim().toLowerCase()
    if (s && EMAIL_REGEX.test(s)) return s
  }
  return null
}

function normalizeStatus(raw: string | undefined): 'active' | 'unsubscribed' {
  const s = (raw || 'active').toLowerCase().trim()
  if (s === 'unsubscribed' || s === 'uitgeschreven' || s === 'inactive') {
    return 'unsubscribed'
  }
  return 'active'
}

function normalizeLocale(raw: string | undefined): 'nl' | 'en' {
  const s = (raw || 'nl').toLowerCase().trim()
  return s === 'en' ? 'en' : 'nl'
}

function normalizeSource(raw: string | undefined): NewsletterDbSource {
  const s = (raw || '').toLowerCase().trim() as NewsletterDbSource
  if ((NEWSLETTER_DB_SOURCES as readonly string[]).includes(s)) {
    return s as NewsletterDbSource
  }
  return DEFAULT_IMPORT_SOURCE
}

export function rowToParsedInput(
  rec: Record<string, unknown>,
  row: number
): ParsedSubscriberInput | null {
  const email = detectEmailFromRow(rec)
  if (!email) return null
  const flat = flattenRow(rec)
  return {
    row,
    email,
    status: normalizeStatus(flat.status),
    locale: normalizeLocale(flat.locale),
    source: normalizeSource(flat.source),
  }
}

export function parseCsvText(text: string): {
  rows: Record<string, unknown>[]
  issues: ParseFileIssue[]
} {
  const issues: ParseFileIssue[] = []
  const clean = stripBom(text)

  const headerLine =
    clean.split(/\r?\n/).find((l) => l.trim().length > 0) || ''
  const useSemicolon =
    headerLine.includes(';') && !headerLine.includes(',')

  const run = (delimiter: string | undefined) =>
    Papa.parse<Record<string, unknown>>(clean, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => stripBom(h).trim(),
      delimiter: delimiter ?? '',
      dynamicTyping: false,
    })

  let parsed = run(useSemicolon ? ';' : undefined)
  if (parsed.errors?.length) {
    for (const e of parsed.errors.slice(0, 5)) {
      issues.push({
        kind: 'parse',
        message: e.message || 'CSV parsefout',
      })
    }
  }

  const rows = (parsed.data || []).filter(
    (r) => r && Object.values(r).some((v) => String(v ?? '').trim() !== '')
  )

  return { rows, issues }
}

export function parseXlsxBuffer(buf: ArrayBuffer): {
  rows: Record<string, unknown>[]
  issues: ParseFileIssue[]
} {
  const issues: ParseFileIssue[] = []
  try {
    const wb = XLSX.read(buf, { type: 'array', cellDates: true })
    const name = wb.SheetNames[0]
    if (!name) {
      issues.push({ kind: 'parse', message: 'Excel-bestand heeft geen werkbladen.' })
      return { rows: [], issues }
    }
    const sheet = wb.Sheets[name]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    })
    return { rows, issues }
  } catch (e: any) {
    issues.push({
      kind: 'parse',
      message: e?.message || 'Kon Excel-bestand niet lezen.',
    })
    return { rows: [], issues }
  }
}

export function parseNewsletterImportBuffer(
  buffer: Buffer,
  filename: string
): { rows: Record<string, unknown>[]; issues: ParseFileIssue[] } {
  if (buffer.length > MAX_IMPORT_FILE_BYTES) {
    return {
      rows: [],
      issues: [
        {
          kind: 'limit',
          message: `Bestand te groot (max ${Math.round(MAX_IMPORT_FILE_BYTES / 1024 / 1024)} MB).`,
        },
      ],
    }
  }

  const lower = filename.toLowerCase()
  if (lower.endsWith('.csv')) {
    return parseCsvText(buffer.toString('utf8'))
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const ab = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer
    return parseXlsxBuffer(ab)
  }

  return {
    rows: [],
    issues: [{ kind: 'parse', message: 'Alleen .csv, .xlsx of .xls toegestaan.' }],
  }
}

export interface BuildParsedRowsResult {
  parsed: ParsedSubscriberInput[]
  invalid: { row: number; reason: string; value?: string }[]
  duplicateInFile: number
  issues: ParseFileIssue[]
}

/**
 * Turn raw table rows into validated subscriber inputs (dedupe by email, first wins).
 */
export function buildParsedSubscriberRows(
  rawRows: Record<string, unknown>[]
): BuildParsedRowsResult {
  const issues: ParseFileIssue[] = []
  if (rawRows.length > MAX_IMPORT_ROWS) {
    issues.push({
      kind: 'limit',
      message: `Te veel rijen (max ${MAX_IMPORT_ROWS}). Knip het bestand in stukken.`,
    })
    return { parsed: [], invalid: [], duplicateInFile: 0, issues }
  }

  const seen = new Set<string>()
  const parsed: ParsedSubscriberInput[] = []
  const invalid: { row: number; reason: string; value?: string }[] = []
  let duplicateInFile = 0

  rawRows.forEach((rec, idx) => {
    const row = idx + 2
    const input = rowToParsedInput(rec, row)
    if (!input) {
      const hint = detectEmailFromRow(rec)
      if (Object.values(rec).some((v) => String(v ?? '').trim())) {
        invalid.push({ row, reason: 'Geen geldig e-mailadres gevonden.', value: hint || undefined })
      }
      return
    }
    if (!EMAIL_REGEX.test(input.email)) {
      invalid.push({ row, reason: 'Ongeldig e-mailformaat.', value: input.email })
      return
    }
    if (seen.has(input.email)) {
      duplicateInFile++
      return
    }
    seen.add(input.email)
    parsed.push(input)
  })

  return { parsed, invalid, duplicateInFile, issues }
}
