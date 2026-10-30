import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../messages/en.json'
import CatalogProductCard from '@/components/shop/CatalogProductCard'
import type { CatalogProduct } from '@/lib/catalog-filters'

const { add, remove } = vi.hoisted(() => ({ add: vi.fn(async (_id, notify) => notify('wishlistLogin')), remove: vi.fn() }))
vi.mock('@/store/wishlist', () => ({ useWishlist: () => ({ isInWishlist: () => false, addToWishlist: add, removeFromWishlist: remove }) }))
vi.mock('@/i18n/routing', () => ({ Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a> }))
vi.mock('next/image', () => ({ default: ({fill,priority,blurDataURL,placeholder,...props}: Record<string,unknown>) => <img {...props} /> }))
const product: CatalogProduct = {
  id: 'hoodie', name: 'MOSE Hoodie', slug: 'hoodie', base_price: 79, sale_price: null, category_id: null,
  display_order: 1, created_at: '2026-10-30',
  images: [
    {url:'/black.webp',color:'Black',is_primary:true},
    {url:'/white.webp',color:'White',is_primary:false},
  ],
  variants: [
    {color:'Black',color_hex:'#000',size:'M',is_available:true,stock_quantity:2},
    {color:'White',color_hex:'#fff',size:'M',is_available:true,stock_quantity:2},
  ],
}
it('shows a freshly verified made-to-order colour as orderable without claiming physical stock', () => {
  const madeToOrder: CatalogProduct = { ...product, variants: [{
    color: 'Black', size: 'L', is_available: true, stock_quantity: 0,
    fulfillment_mode: 'made_to_order', supplier_orderable: true,
    supplier_checked_at: new Date().toISOString(),
  }] }
  const {container} = render(<NextIntlClientProvider locale="en" messages={messages}><CatalogProductCard tile={{tileKey:madeToOrder.id,product:madeToOrder,color:'Black',color_hex:'#000'}} /></NextIntlClientProvider>)
  expect(container).not.toHaveTextContent('OUT OF STOCK')
  expect(container).not.toHaveTextContent('LAST ITEMS')
})
it('changes the image and both product links inline, and reports the selected colour only when navigating', () => {
  const select = vi.fn()
  render(<NextIntlClientProvider locale="en" messages={messages}><CatalogProductCard tile={{tileKey:product.id,product,color:'Black',color_hex:'#000'}} onProductClick={select} /></NextIntlClientProvider>)
  fireEvent.click(screen.getByRole('button',{name:'MOSE Hoodie, WHITE'}))
  expect(select).not.toHaveBeenCalled()
  expect(screen.getByAltText('MOSE Hoodie, WHITE').getAttribute('src')).toBe('/white.webp')
  const links = screen.getAllByRole('link')
  expect(links).toHaveLength(2)
  links.forEach(link => expect(link.getAttribute('href')).toBe('/product/hoodie?color=White'))
  fireEvent.click(links[1])
  expect(select).toHaveBeenCalledWith(expect.objectContaining({color:'White'}))
})
it('renders English wishlist feedback instead of an alert', async () => {
  render(<NextIntlClientProvider locale="en" messages={messages}><CatalogProductCard tile={{tileKey:product.id,product,color:'Black',color_hex:'#000'}} /></NextIntlClientProvider>)
  fireEvent.click(screen.getByRole('button',{name:'Save MOSE Hoodie'}))
  expect(await screen.findByRole('status')).toHaveTextContent('Sign in to save this style.')
})
it('does not allow an inline swatch to bypass active size, colour or availability constraints', () => {
  const tile = {tileKey:product.id,product,color:'Black',color_hex:'#000'}
  const {rerender} = render(<NextIntlClientProvider locale="en" messages={messages}><CatalogProductCard tile={tile} allowedColors={['black','white']} /></NextIntlClientProvider>)
  fireEvent.click(screen.getByRole('button',{name:'MOSE Hoodie, WHITE'}))
  rerender(<NextIntlClientProvider locale="en" messages={messages}><CatalogProductCard tile={tile} allowedColors={['black']} /></NextIntlClientProvider>)
  expect(screen.getByRole('button',{name:'MOSE Hoodie, WHITE'})).toBeDisabled()
  expect(screen.getByAltText('MOSE Hoodie, BLACK').getAttribute('src')).toBe('/black.webp')
})
it('prices and labels only the actual size-price variations that match the current filters', () => {
  const adjusted = { ...product, base_price: 20, variants: [
    { color: 'Black', size: 'M', price_adjustment: 0, is_available: true, stock_quantity: 8 },
    { color: 'Black', size: 'XL', price_adjustment: 30, is_available: true, stock_quantity: 1 },
  ] }
  const filters = { category: 'all', q: '', min: 45, max: 55, sizes: ['XL'], colors: [], stock: true, sort: 'featured' as const }
  const {container} = render(<NextIntlClientProvider locale="en" messages={messages}><CatalogProductCard tile={{tileKey:adjusted.id,product:adjusted,color:'Black',color_hex:'#000'}} filters={filters} /></NextIntlClientProvider>)
  expect(container).toHaveTextContent('€50')
  expect(container).not.toHaveTextContent('€20')
  expect(container).not.toHaveTextContent('From')
  expect(container).toHaveTextContent('LAST ITEMS')
})
it('compares a sale price with the same selected variants original price', () => {
  const adjusted = { ...product, base_price: 60, sale_price: 40, variants: [{ color: 'Black', size: 'XL', price_adjustment: 30, is_available: true, stock_quantity: 1 }] }
  const {container} = render(<NextIntlClientProvider locale="en" messages={messages}><CatalogProductCard tile={{tileKey:adjusted.id,product:adjusted,color:'Black',color_hex:'#000'}} /></NextIntlClientProvider>)
  expect(container).toHaveTextContent('€70')
  expect(container.querySelector('del')).toHaveTextContent('€90')
  expect(container).toHaveTextContent('-22%')
})
it('clears the hover image when keyboard focus leaves the card', () => {
  const withBackImage = { ...product, images: [...product.images!, { url: '/black-back.webp', color: 'Black' }] }
  const {container} = render(<NextIntlClientProvider locale="en" messages={messages}><CatalogProductCard tile={{tileKey:product.id,product:withBackImage,color:'Black',color_hex:'#000'}} /></NextIntlClientProvider>)
  const link = container.querySelector('a')!
  fireEvent.focus(link)
  expect(container.querySelector('img[aria-hidden="true"]')).not.toBeNull()
  fireEvent.blur(link, { relatedTarget: document.body })
  expect(container.querySelector('img[aria-hidden="true"]')).toBeNull()
})
