import 'server-only'
import { parseMoseEditPilotConfig } from './mose-edit-pilot-config-parser'

// Deliberately not NEXT_PUBLIC_ and never placed in next.config env/define.
// Vercel installs this value privately; it must not be committed to source.
const state = parseMoseEditPilotConfig(process.env.MOSE_EDIT_PILOT_CONFIG_JSON)
export const MOSE_EDIT_PILOT_CONFIG = state.config
export const MOSE_EDIT_PILOT_CONFIG_READY = state.ready
export const MOSE_EDIT_PILOT_CONFIG_STATUS = state.reason
