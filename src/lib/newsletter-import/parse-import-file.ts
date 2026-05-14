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

/** User-selected CSV/Excel column → subscriber field (exact header labels from the file). */
export interface ImportColumnMapping {
  email: string
  status?: string
  locale?: string
  source?: string
}

export function stripBom(input: string): string {
  return input.replace(/^\uFEFF/, '')
}

/** Semicolon CSV when the header line has `;` and no `,` (EU Excel export). */
export function detectCsvDelimiterFromText(text: string): ';' | undefined {
  const clean = stripBom(text)
  const headerLine =
    clean.split(/\r?\n/).find((l) => l.trim().length > 0) || ''
  return headerLine.includes(';') && !headerLine.includes(',') ? ';' : undefined
}

/**
 * PostgREST sends `.in('email', [...])` on the query string. Too many or too long
 * values exceed URL limits; Supabase then returns 400 "Bad Request".
 */
export const MAX_EMAIL_IN_QUERY_CHARS = 4500

export function chunkEmailsForInFilter(emails: string[]): string[][] {
  const chunks: string[][] = []
  let cur: string[] = []
  let budget = 0
  for (const email of emails) {
    const part = encodeURIComponent(email).length + 1
    if (cur.length > 0 && budget + part > MAX_EMAIL_IN_QUERY_CHARS) {
      chunks.push(cur)
      cur = []
      budget = 0
    }
    cur.push(email)
    budget += part
  }
  if (cur.length) chunks.push(cur)
  return chunks
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

function cellByHeader(rec: Record<string, unknown>, header: string | undefined): string {
  if (!header || !Object.prototype.hasOwnProperty.call(rec, header)) return ''
  return String(rec[header] ?? '').trim()
}

export function rowToParsedInputWithMapping(
  rec: Record<string, unknown>,
  row: number,
  mapping: ImportColumnMapping
): ParsedSubscriberInput | null {
  const email = cellByHeader(rec, mapping.email).toLowerCase()
  if (!email || !EMAIL_REGEX.test(email)) return null
  const statusRaw = mapping.status ? cellByHeader(rec, mapping.status) : undefined
  const localeRaw = mapping.locale ? cellByHeader(rec, mapping.locale) : undefined
  const sourceRaw = mapping.source ? cellByHeader(rec, mapping.source) : undefined
  return {
    row,
    email,
    status: normalizeStatus(statusRaw),
    locale: normalizeLocale(localeRaw),
    source: normalizeSource(sourceRaw),
  }
}

export function detectImportHeadersFromRows(
  rawRows: Record<string, unknown>[]
): string[] {
  for (const r of rawRows) {
    if (!r || typeof r !== 'object') continue
    const keys = Object.keys(r).filter((k) => stripBom(k).trim() !== '')
    if (keys.length) return keys
  }
  return []
}

/** Union of keys seen in the first rows (handles sparse trailing columns). */
export function collectImportHeaderKeys(
  rawRows: Record<string, unknown>[],
  maxRows = 100
): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (let i = 0; i < Math.min(rawRows.length, maxRows); i++) {
    const r = rawRows[i]
    if (!r || typeof r !== 'object') continue
    for (const k of Object.keys(r)) {
      if (!stripBom(k).trim()) continue
      if (!seen.has(k)) {
        seen.add(k)
        order.push(k)
      }
    }
  }
  return order
}

export function guessImportColumnMapping(
  headers: string[],
  sampleRows: Record<string, unknown>[]
): ImportColumnMapping {
  const pickCanonical = (field: 'email' | 'status' | 'locale' | 'source') => {
    for (const h of headers) {
      if (canonicalHeader(h) === field) return h
    }
    return ''
  }

  let email = pickCanonical('email')
  if (!email) {
    for (const h of headers) {
      const hit = sampleRows.some((r) =>
        EMAIL_REGEX.test(String(r[h] ?? '').trim().toLowerCase())
      )
      if (hit) {
        email = h
        break
      }
    }
  }
  if (!email && headers.length) email = headers[0]

  return {
    email,
    status: pickCanonical('status') || undefined,
    locale: pickCanonical('locale') || undefined,
    source: pickCanonical('source') || undefined,
  }
}

export function validateImportColumnMapping(
  mapping: ImportColumnMapping,
  headers: string[]
): { ok: true } | { ok: false; error: string } {
  const set = new Set(headers)
  if (!mapping.email?.trim()) {
    return { ok: false, error: 'Kies welke kolom het e-mailadres bevat.' }
  }
  if (!set.has(mapping.email)) {
    return {
      ok: false,
      error: `De gekozen e-mailkolom "${mapping.email}" komt niet voor in dit bestand.`,
    }
  }
  const optional: [keyof ImportColumnMapping, string | undefined][] = [
    ['status', mapping.status],
    ['locale', mapping.locale],
    ['source', mapping.source],
  ]
  for (const [key, col] of optional) {
    if (!col?.trim()) continue
    if (!set.has(col)) {
      return {
        ok: false,
        error: `Kolom "${col}" (${String(key)}) bestaat niet in dit bestand.`,
      }
    }
  }
  return { ok: true }
}

function rowToStringRecord(rec: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(rec)) {
    out[k] = String(v ?? '').trim()
  }
  return out
}

const COLUMN_PREVIEW_MAX_SAMPLE = 15

/**
 * Lightweight read: first rows only (CSV `preview`; Excel `sheetRows`) for header detection + mapping UI.
 */
export function parseNewsletterImportColumnPreview(
  buffer: Buffer,
  filename: string
): {
  headers: string[]
  sampleRows: Record<string, string>[]
  suggestedMapping: ImportColumnMapping
  issues: ParseFileIssue[]
} {
  const empty = (): {
    headers: string[]
    sampleRows: Record<string, string>[]
    suggestedMapping: ImportColumnMapping
    issues: ParseFileIssue[]
  } => ({
    headers: [],
    sampleRows: [],
    suggestedMapping: { email: '' },
    issues: [],
  })

  if (buffer.length > MAX_IMPORT_FILE_BYTES) {
    return {
      ...empty(),
      issues: [
        {
          kind: 'limit',
          message: `Bestand te groot (max ${Math.round(MAX_IMPORT_FILE_BYTES / 1024 / 1024)} MB).`,
        },
      ],
    }
  }

  const lower = filename.toLowerCase()
  const issues: ParseFileIssue[] = []

  if (lower.endsWith('.csv')) {
    const clean = stripBom(buffer.toString('utf8'))
    const delimiter = detectCsvDelimiterFromText(clean)
    const parsed = Papa.parse<Record<string, unknown>>(clean, {
      header: true,
      preview: COLUMN_PREVIEW_MAX_SAMPLE + 50,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => stripBom(h).trim(),
      delimiter: delimiter ?? '',
      dynamicTyping: false,
    })
    if (parsed.errors?.length) {
      for (const e of parsed.errors.slice(0, 3)) {
        issues.push({ kind: 'parse', message: e.message || 'CSV parsefout' })
      }
    }
    const fields = ((parsed.meta.fields || []) as string[]).filter(
      (f) => f != null && String(f).trim() !== ''
    )
    const data = (parsed.data || []).filter(
      (r) => r && Object.values(r).some((v) => String(v ?? '').trim() !== '')
    )
    const sample = data
      .slice(0, COLUMN_PREVIEW_MAX_SAMPLE)
      .map((r) => rowToStringRecord(r as Record<string, unknown>))
    const suggested = guessImportColumnMapping(fields, data as Record<string, unknown>[])
    return { headers: fields, sampleRows: sample, suggestedMapping: suggested, issues }
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    try {
      const ab = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer
      const wb = XLSX.read(ab, {
        type: 'array',
        cellDates: true,
        sheetRows: 120,
      })
      const name = wb.SheetNames[0]
      if (!name) {
        issues.push({
          kind: 'parse',
          message: 'Excel-bestand heeft geen werkbladen.',
        })
        return { ...empty(), issues }
      }
      const sheet = wb.Sheets[name]
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: false,
      })
      const data = raw.filter(
        (r) => r && Object.values(r).some((v) => String(v ?? '').trim() !== '')
      )
      const headers = detectImportHeadersFromRows(data)
      const sample = data
        .slice(0, COLUMN_PREVIEW_MAX_SAMPLE)
        .map((r) => rowToStringRecord(r))
      const suggested = guessImportColumnMapping(headers, data)
      return { headers, sampleRows: sample, suggestedMapping: suggested, issues }
    } catch (e: any) {
      issues.push({
        kind: 'parse',
        message: e?.message || 'Kon Excel-bestand niet lezen.',
      })
      return { ...empty(), issues }
    }
  }

  return {
    ...empty(),
    issues: [{ kind: 'parse', message: 'Alleen .csv, .xlsx of .xls toegestaan.' }],
  }
}

export function parseCsvText(text: string): {
  rows: Record<string, unknown>[]
  issues: ParseFileIssue[]
} {
  const issues: ParseFileIssue[] = []
  const clean = stripBom(text)
  const delimiter = detectCsvDelimiterFromText(clean)

  const run = (del: string | undefined) =>
    Papa.parse<Record<string, unknown>>(clean, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => stripBom(h).trim(),
      delimiter: del ?? '',
      dynamicTyping: false,
    })

  let parsed = run(delimiter)
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
 * With `columnMapping`, only those headers are read (user-defined import).
 * Without mapping, legacy auto-detection via {@link rowToParsedInput}.
 */
export function buildParsedSubscriberRows(
  rawRows: Record<string, unknown>[],
  columnMapping?: ImportColumnMapping | null
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

  const mapRow = columnMapping
    ? (rec: Record<string, unknown>, row: number) =>
        rowToParsedInputWithMapping(rec, row, columnMapping)
    : (rec: Record<string, unknown>, row: number) => rowToParsedInput(rec, row)

  rawRows.forEach((rec, idx) => {
    const row = idx + 2
    const input = mapRow(rec, row)
    if (!input) {
      const hint = columnMapping
        ? cellByHeader(rec, columnMapping.email) || undefined
        : detectEmailFromRow(rec)
      if (Object.values(rec).some((v) => String(v ?? '').trim())) {
        invalid.push({
          row,
          reason: columnMapping
            ? 'Geen geldig e-mailadres in de gekoppelde e-mailkolom.'
            : 'Geen geldig e-mailadres gevonden.',
          value: hint || undefined,
        })
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
