#!/usr/bin/env node
/**
 * Phase 3 migration applier (mirror of apply-phase0-migrations.mjs).
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-phase3-migrations.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const MIGRATIONS_DIR = resolve(REPO_ROOT, 'supabase/migrations')
const PROJECT_REF = 'bsklcgeyvdsxjxvmghbp'

const PHASE3_VERSIONS = ['20260520120000', '20260520120100', '20260520120200', '20260520120300']

const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN env var required')
  process.exit(1)
}

async function runQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    `SELECT version FROM supabase_migrations.schema_migrations WHERE version = '${version}' LIMIT 1`,
  )
  return Array.isArray(rows) && rows.length > 0
}

function escape(input) {
  return input.replace(/'/g, "''")
}

async function registerMigration(version, name, statements) {
  await runQuery(
    `INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES ('${version}', '${escape(name)}', ARRAY['${escape(statements)}']) ON CONFLICT (version) DO NOTHING`,
  )
}

function readMigration(version) {
  const files = readdirSync(MIGRATIONS_DIR)
  const match = files.find((f) => f.startsWith(`${version}_`) && f.endsWith('.sql'))
  if (!match) throw new Error(`No migration file for ${version}`)
  const name = match.replace(`${version}_`, '').replace(/\.sql$/, '')
  const sql = readFileSync(resolve(MIGRATIONS_DIR, match), 'utf8')
  return { file: match, name, sql }
}

async function main() {
  for (const v of PHASE3_VERSIONS) {
    const { file, name, sql } = readMigration(v)
    process.stdout.write(`[${v}] ${file} … `)
    if (await alreadyApplied(v)) {
      console.log('already applied')
      continue
    }
    await runQuery(sql)
    await registerMigration(v, name, sql)
    console.log('OK')
  }
  console.log('[phase3-migrations] done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
