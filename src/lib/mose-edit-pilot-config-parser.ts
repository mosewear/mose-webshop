import { z } from 'zod'
import publicConfig from './mose-edit-pilot-config.json'

const timestamp = z.string().datetime({ offset: true })
const recipient = z.object({
  id: z.string().uuid().transform(value => value.toLowerCase()),
  emailHash: z.string().regex(/^[a-f0-9]{64}$/),
  proofKind: z.enum(['confirmed', 'site-signup']),
  source: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
}).strict()
const schema = z.object({
  campaignId: z.string().uuid(), slug: z.string().min(1).max(100), subject: z.string().min(1).max(200),
  htmlSha256: z.string().regex(/^[a-f0-9]{64}$/), startAt: timestamp, endAt: timestamp,
  momentLabel: z.string().min(1).max(200), roster: z.array(recipient).min(1).max(100),
  batchSize: z.number().int().min(1).max(25), minimumGapDays: z.number().int().min(0).max(365),
  maximumCommercialEmails30d: z.number().int().min(1).max(3),
  immediateSendAuthorizedAt: timestamp.optional(), threeIn30DaysAuthorizedAt: timestamp.optional(),
}).strict().superRefine((config, context) => {
  if (Date.parse(config.endAt) <= Date.parse(config.startAt)) context.addIssue({ code: 'custom', message: 'Invalid campaign window' })
  if (config.minimumGapDays === 0 && !config.immediateSendAuthorizedAt) context.addIssue({ code: 'custom', message: 'Missing immediate-send authorization' })
  if (config.maximumCommercialEmails30d === 3 && !config.threeIn30DaysAuthorizedAt) context.addIssue({ code: 'custom', message: 'Missing frequency authorization' })
  if (new Set(config.roster.map(row => row.id)).size !== config.roster.length || new Set(config.roster.map(row => row.emailHash)).size !== config.roster.length) {
    context.addIssue({ code: 'custom', message: 'Duplicate roster identity' })
  }
})
export type MoseEditPilotConfig = z.infer<typeof schema>
export type PilotConfigResult = { config: MoseEditPilotConfig; ready: boolean; reason: 'ready' | 'missing' | 'invalid' | 'metadata-mismatch' }

/** No process.env access here. The only reader of the secret is server-only.
 * Errors never include JSON input, recipient IDs, email hashes or Zod issues. */
export function parseMoseEditPilotConfig(raw: string | undefined): PilotConfigResult {
  const closed = (reason: PilotConfigResult['reason']): PilotConfigResult => ({
    config: { ...publicConfig, roster: [] }, ready: false, reason,
  })
  if (!raw?.trim()) return closed('missing')
  if (raw.length > 128_000) return closed('invalid')
  let value: unknown
  try { value = JSON.parse(raw) } catch { return closed('invalid') }
  const parsed = schema.safeParse(value)
  if (!parsed.success) return closed('invalid')
  // The secret supplies the reviewed audience, never a different campaign,
  // content checksum, frequency exception or send window than the public code.
  const keys = new Set([...Object.keys(publicConfig), ...Object.keys(parsed.data)].filter(key => key !== 'roster'))
  if ([...keys].some(key => publicConfig[key as keyof typeof publicConfig] !== parsed.data[key as keyof typeof parsed.data])) return closed('metadata-mismatch')
  return { config: parsed.data, ready: true, reason: 'ready' }
}
