/**
 * Maakt een lokale admin-sessie voor visuele controles.
 *
 * Gebruikt de Supabase admin-API om een eenmalige magic-link-token te maken,
 * wisselt die in voor een sessie, en schrijft die als Playwright storageState.
 * Er wordt geen wachtwoord gewijzigd en er gaat geen e-mail uit.
 *
 * Vereist SUPABASE_ACCESS_TOKEN niet; de service-role-sleutel uit .env.local
 * volstaat. Alleen voor lokaal gebruik tegen http://localhost:3000.
 */
import fs from 'node:fs'
import path from 'node:path'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)

const URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const EMAIL = process.env.ADMIN_EMAIL || 'info@mosewear.com'
const OUT = process.env.OUT || './admin-session.json'

const ref = URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1]

const linkRes = await fetch(`${URL}/auth/v1/admin/generate_link`, {
  method: 'POST',
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'magiclink', email: EMAIL }),
})
const link = await linkRes.json()
if (!link.hashed_token) throw new Error('generate_link mislukt: ' + JSON.stringify(link).slice(0, 200))

const verifyRes = await fetch(`${URL}/auth/v1/verify`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'magiclink', token_hash: link.hashed_token }),
})
const session = await verifyRes.json()
if (!session.access_token) throw new Error('verify mislukt: ' + JSON.stringify(session).slice(0, 200))

// @supabase/ssr bewaart de sessie als base64url-JSON in een cookie met het
// voorvoegsel `base64-`, onder de naam sb-<project-ref>-auth-token.
const payload = {
  access_token: session.access_token,
  token_type: session.token_type || 'bearer',
  expires_in: session.expires_in || 3600,
  expires_at: session.expires_at,
  refresh_token: session.refresh_token,
  user: session.user,
}
const value = 'base64-' + Buffer.from(JSON.stringify(payload)).toString('base64url')

fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify({
  cookies: [{
    name: `sb-${ref}-auth-token`,
    value,
    domain: 'localhost',
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }],
  origins: [],
}, null, 2))

console.log(`Sessie voor ${session.user?.email} geschreven naar ${OUT}`)
