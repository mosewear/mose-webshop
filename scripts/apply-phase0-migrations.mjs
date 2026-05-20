#!/usr/bin/env node
/**
 * One-off helper to apply the Phase 0 AI Campaign Autopilot migrations
 * to the linked Supabase project via the Management API.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-phase0-migrations.mjs
 *
 * Why this instead of `supabase db push`?
 *   - `db push` requires the project's DB password which is not
 *     available in this session.
 *   - The Management API endpoint `POST /v1/projects/{ref}/database/query`
 *     authenticates with a PAT and runs arbitrary SQL, so we can apply
 *     each migration file and then register it in the
 *     `supabase_migrations.schema_migrations` ledger.
 *
 * This script is idempotent: rows in `schema_migrations` are checked
 * before re-applying; new tables use `CREATE TABLE IF NOT EXISTS`.
 *
 * Kept under scripts/ for traceability; do not import from runtime code.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const MIGRATIONS_DIR = resolve(REPO_ROOT, 'supabase/migrations')
const PROJECT_REF = 'bsklcgeyvdsxjxvmghbp'

const PHASE0_VERSIONS = [
  '20260520110000',
  '20260520110100',
  '20260520110200',
  '20260520110300',
  '20260520110400',
  '20260520110500',
  '20260520110600',
]

const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN env var required')
  process.exit(1)
}

async function runQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`)
  }
  return body
}

async function alreadyApplied(version) {
  const rows = await runQuery(
    `SELECT version FROM supabase_migrations.schema_migrations WHERE version = '${version}' LIMIT 1`
  )
  return Array.isArray(rows) && rows.length > 0
}

function escapeSqlString(input) {
  return input.replace(/'/g, "''")
}

async function registerMigration(version, name, statements) {
  // schema_migrations.statements is a TEXT[] of executed statements.
  // We store one entry per file for simplicity.
  const arrayLiteral = `ARRAY['${escapeSqlString(statements)}']`
  await runQuery(
    `INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES ('${version}', '${escapeSqlString(name)}', ${arrayLiteral}) ON CONFLICT (version) DO NOTHING`
  )
}

function readMigrationFile(version) {
  const files = readdirSync(MIGRATIONS_DIR)
  const match = files.find((f) => f.startsWith(`${version}_`) && f.endsWith('.sql'))
  if (!match) throw new Error(`No migration file found for version ${version}`)
  const name = match.replace(`${version}_`, '').replace(/\.sql$/, '')
  const sql = readFileSync(resolve(MIGRATIONS_DIR, match), 'utf8')
  return { file: match, name, sql }
}

async function main() {
  console.log(`[phase0-migrations] target project: ${PROJECT_REF}`)
  for (const version of PHASE0_VERSIONS) {
    const { file, name, sql } = readMigrationFile(version)
    process.stdout.write(`[${version}] ${file} … `)
    if (await alreadyApplied(version)) {
      console.log('already applied (ledger)')
      continue
    }
    try {
      await runQuery(sql)
      await registerMigration(version, name, sql)
      console.log('OK')
    } catch (err) {
      console.log('FAILED')
      console.error(err?.message || err)
      process.exit(1)
    }
  }
  console.log('[phase0-migrations] done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
