import { describe, expect, it } from 'vitest'
import { carrierReturnStatus } from '../../src/lib/sendcloud-return-status'

describe('Sendcloud return scan transitions', () => {
  it.each(['return_received', 'refund_processing', 'refunded', 'return_completed', 'return_rejected', 'return_requested', 'unknown'])('preserves %s after delayed or repeated scans', status => {
    for (const scan of [3, 5, 7, 22, 91, 92, 11, 93]) expect(carrierReturnStatus(status, scan)).toBeNull()
  })
  it.each(['return_approved', 'return_label_generated', 'return_in_transit'])('records transit for %s but leaves delivered receipt to the warehouse', status => {
    expect(carrierReturnStatus(status, 3)).toBe('return_in_transit')
    expect(carrierReturnStatus(status, 11)).toBe('return_in_transit')
    expect(carrierReturnStatus(status, 93)).toBe('return_in_transit')
    expect(carrierReturnStatus(status, 0)).toBeNull()
  })
})
