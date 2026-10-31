import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import OrderConfirmation from '@/app/[locale]/order-confirmation/page'
const mocks = vi.hoisted(() => ({ clearCart: vi.fn(), remove: vi.fn() }))
vi.mock('@/store/cart', () => ({ useCart: () => ({ clearCart: mocks.clearCart }) }))
vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'nl' }) }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@/i18n/routing', () => ({ Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a> }))
vi.mock('@/lib/analytics', () => ({ trackPurchase: vi.fn() }))
vi.mock('@/lib/facebook-pixel', () => ({ trackPixelEvent: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSiteSettings: async () => ({ contact_phone: '+31502340025' }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('an incomplete confirmation link preserves the current basket and promotion', async () => {
  vi.stubGlobal('localStorage', { removeItem: mocks.remove })
  const params = Object.assign(Promise.resolve({}), { status: 'fulfilled', value: {} })
  render(<OrderConfirmation searchParams={params} />)
  expect(await screen.findByText('notFound.title')).toBeInTheDocument()
  expect(mocks.clearCart).not.toHaveBeenCalled()
  expect(mocks.remove).not.toHaveBeenCalled()
})
