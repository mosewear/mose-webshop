import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import CartPage from '@/app/[locale]/cart/page'
import nl from '../messages/nl.json'
const { state } = vi.hoisted(() => ({ state: { items: [] as Record<string, unknown>[] } }))
vi.mock('@/store/cart', () => ({ useCart: () => ({ items: state.items, getTotal: () => state.items.length * 79, getItemCount: () => state.items.length, removeItem: vi.fn(), updateQuantity: vi.fn(), clearCart: vi.fn() }), useCartGehydrateerd: () => true, cartItemQuantityLimit: () => 10 }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@/components/Betaalmethoden', () => ({ default: () => null }))
vi.mock('@/i18n/routing', () => ({ Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a> }))
vi.mock('next-intl', () => ({ useLocale: () => 'nl', useTranslations: () => (key: string, values?: Record<string, unknown>) => { let text: unknown = nl.cart; for (const part of key.split('.')) text = (text as Record<string, unknown>)[part]; return String(text).replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? name)) } }))
vi.mock('@/lib/settings', () => ({ getSiteSettings: async () => ({ shipping_cost: 0, free_shipping_threshold: 0, return_days: 30 }) }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => { const query = { select: () => query, in: () => query, eq: async () => ({ data: [] }), then: (resolve: (value: unknown) => void) => resolve({ data: [] }) }; return { from: () => query } } }))
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_SHOPIFY_CHECKOUT_ENABLED', 'true'); state.items = [{ variantId: 'v', productId: 'p', name: 'Hoodie', color: 'Black', size: 'L', price: 79, quantity: 1, image: '/a.webp', isMadeToOrder: true, stock: 0 }] })
afterEach(() => { cleanup(); vi.unstubAllEnvs() })
it('defers physical delivery costs to Shopify without promising free shipping from legacy zero values', async () => {
  render(<CartPage />)
  await waitFor(() => expect(screen.getByText('Bij het afrekenen')).toBeInTheDocument())
  expect(screen.queryByText('GRATIS')).not.toBeInTheDocument()
  expect(screen.queryByText('Altijd gratis verzending')).not.toBeInTheDocument()
  expect(screen.queryByText('Je krijgt gratis verzending!')).not.toBeInTheDocument()
  expect(screen.getAllByText(/Incl. BTW · excl. verzending/).length).toBeGreaterThan(0)
})
it('keeps digital-only gift delivery free', async () => {
  state.items = [{ ...state.items[0], isGiftCard: true, giftCardAmount: 79 }]
  render(<CartPage />)
  expect(await screen.findByText('GRATIS')).toBeInTheDocument()
  expect(screen.queryByText('Bij het afrekenen')).not.toBeInTheDocument()
})
