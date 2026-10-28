export class ShopifyUnavailable extends Error {
  constructor(public readonly code: string) { super(code); this.name = 'ShopifyUnavailable' }
}
