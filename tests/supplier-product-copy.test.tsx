import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../messages/nl.json'
import PdpTrustStrip from '@/components/product/PdpTrustStrip'
import PdpFaq from '@/components/product/PdpFaq'

function render(supplierFulfilled: boolean) {
  return renderToString(<NextIntlClientProvider locale="nl" messages={messages}>
    <PdpTrustStrip supplierFulfilled={supplierFulfilled} freeShippingThreshold={150} shippingCost={6.95} signatureSpecs="regular fit" />
    <PdpFaq supplierFulfilled={supplierFulfilled} freeShippingThreshold={150} shippingCost={6.95} returnDays={30} locale="nl" />
  </NextIntlClientProvider>)
}
describe('supplier fulfilment promises', () => {
  it('does not reuse local manufacturing, shipping cutoff, fit or warranty claims for Tapstitch', () => {
    const html = render(true)
    expect(html).toContain('Tapstitch')
    expect(html).toContain('Bezorgopties en verzendkosten staan bij het afrekenen')
    expect(html).toContain('dit specifieke model')
    expect(html).not.toMatch(/overmorgen|DHL|regular fit|fabrieksgarantie|Made in Groningen|MADE IN GRONINGEN/)
    expect(html).not.toContain('Gratis bezorging vanaf')
  })
  it('retains model specifications without a blanket manufacturing claim', () => {
    const html = render(false)
    expect(html).toContain('regular fit')
    expect(html).not.toMatch(/Made in Groningen|MADE IN GRONINGEN/)
  })
})
