'use client'

import { useEffect } from 'react'

/**
 * Auto-dismiss a banner message after `delayMs` (default 6s). Pass the
 * current message + the setter; reset to null when the timer fires.
 * Intentionally lightweight: no toast library, no portal — the
 * existing Tailwind banners stay in place, they just disappear on a
 * timer so the page doesn't accumulate stale "Opgeslagen." chips.
 */
export function useAutoDismiss(
  value: string | null,
  setValue: (v: string | null) => void,
  delayMs = 6000,
): void {
  useEffect(() => {
    if (!value) return
    const t = setTimeout(() => setValue(null), delayMs)
    return () => clearTimeout(t)
  }, [value, setValue, delayMs])
}
