/** Carrier scans cannot undo warehouse receipt or a refund decision. */
export function carrierReturnStatus(current: string, carrierStatus: number): 'return_in_transit' | null {
  if (!['return_approved', 'return_label_generated', 'return_in_transit'].includes(current)) return null
  // Delivery still requires an explicit warehouse receipt confirmation.
  return [3, 5, 7, 22, 91, 92, 11, 93].includes(carrierStatus) ? 'return_in_transit' : null
}
