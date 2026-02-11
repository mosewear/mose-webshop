// Facebook Pixel Type Definitions
declare global {
  interface Window {
    fbq: (
      type: 'track' | 'trackCustom',
      event: string,
      params?: {
        content_ids?: string[]
        content_name?: string
        content_type?: string
        content_category?: string
        value?: number
        currency?: string
        num_items?: number
        search_string?: string
        transaction_id?: string
      }
    ) => void
    _fbq?: any
  }
}

export {}







