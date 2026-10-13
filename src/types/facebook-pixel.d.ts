// Facebook Pixel Type Definitions
declare global {
  interface Window {
    /**
     * `fbq` bestaat pas NA toestemming voor cookies: de basiscode in
     * `src/app/layout.tsx` wordt dan pas uitgevoerd. Daarom optioneel, zodat
     * aanroepers gedwongen worden te controleren of de pixel er is in plaats
     * van er stilzwijgend van uit te gaan.
     */
    fbq?: {
      (
        type: 'track' | 'trackCustom',
        event: string,
        params?: Record<string, unknown>,
        /** Vierde argument van Meta: hier hoort het event-id voor deduplicatie. */
        options?: { eventID?: string }
      ): void
      (type: 'init', pixelId: string): void
      loaded?: boolean
      queue?: unknown[]
      version?: string
    }
    _fbq?: unknown
  }
}

export {}
