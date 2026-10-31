import { createRef } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../messages/nl.json'
import StickyVariantPicker from '@/components/product/StickyVariantPicker'
vi.mock('next/navigation', () => ({ usePathname: () => '/nl/product/boxy' }))
const variant = { size:'M', color:'Black', is_available:true, stock_quantity:0, presale_stock_quantity:0, presale_enabled:false, fulfillment_mode:'made_to_order' as const, supplier_orderable:true, supplier_checked_at:new Date().toISOString() }
function render(override = {}) {
  return new DOMParser().parseFromString(renderToString(<NextIntlClientProvider locale="nl" messages={messages}><StickyVariantPicker productId="pod" availableColors={[{color:'Black',hex:'#000'}]} availableSizes={['M']} selectedColor="Black" selectedSize="M" onSelectColor={()=>{}} onSelectSize={()=>{}} variants={[{...variant,...override}]} finalPrice={79} basePrice={79} hasDiscount={false} hasAnyStock={true} isAdding={false} hasVariantSelected={true} onAddToCart={()=>{}} mainAtcRef={createRef<HTMLButtonElement>()} translateColor={x=>x} /></NextIntlClientProvider>), 'text/html')
}
describe('sticky made-to-order selection', () => {
  it('enables the zero-stock supplier size and identifies production to order on both sticky surfaces', () => {
    const doc = render()
    const sizes = [...doc.querySelectorAll('button')].filter(button=>button.textContent==='M')
    expect(sizes.length).toBeGreaterThan(0)
    expect(sizes.every(button=>!button.hasAttribute('disabled'))).toBe(true)
    expect(doc.body.textContent).not.toContain('Op bestelling gemaakt')
  })
  it('does not enable a disabled or stale supplier size, or disabled presale stock', () => {
    for (const variant of [{is_available:false},{supplier_checked_at:'2026-01-01T00:00:00Z'},{fulfillment_mode:'local_stock',presale_stock_quantity:10,presale_enabled:false}]) {
      const doc = render(variant)
      const sizes = [...doc.querySelectorAll('button')].filter(button=>button.textContent==='M')
      expect(sizes.every(button=>button.hasAttribute('disabled'))).toBe(true)
      expect(doc.body.textContent).not.toContain('Op bestelling gemaakt')
    }
  })
})
