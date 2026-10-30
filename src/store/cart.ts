import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MAX_ORDER_QUANTITY } from '@/lib/variant-availability'

export interface GiftCardRecipient {
  recipientName?: string
  recipientEmail?: string
  senderName?: string
  personalMessage?: string
  /** ISO date when the card should be delivered; empty = immediately */
  scheduledSendAt?: string
}

export interface CartItem {
  productId: string
  variantId: string
  slug: string
  name: string
  size: string
  color: string
  colorHex: string
  quantity: number
  price: number
  image: string
  stock: number
  sku: string
  /** Order quantity cap is independent of physical stock for this supplier-backed item. */
  isMadeToOrder?: boolean
  isPresale?: boolean
  presaleExpectedDate?: string
  presaleStock?: number
  /** TRUE when this line represents a digital gift card (no shipping, no stock). */
  isGiftCard?: boolean
  /** Denomination amount in EUR; for custom-amount lines equals price. */
  giftCardAmount?: number
  /** Optional recipient payload for personalised gift delivery. */
  giftCardRecipient?: GiftCardRecipient | null
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clearCart: () => void
  setItems: (items: CartItem[]) => void
  getTotal: () => number
  getItemCount: () => number
}

// BroadcastChannel for multi-tab sync (only works in browser)
let cartChannel: BroadcastChannel | null = null

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  cartChannel = new BroadcastChannel('mose-cart-sync')
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.variantId === item.variantId
          )
          
          const current = existingItem ? { ...existingItem, ...item } : item
          const limit = cartItemQuantityLimit(current)
          if (limit !== null && limit <= 0) return state
          const requested = (existingItem?.quantity ?? 0) + item.quantity
          const quantity = limit === null ? requested : Math.min(requested, limit)
          if (!Number.isSafeInteger(quantity) || quantity < 1) return state
          const newItems: CartItem[] = existingItem
            ? state.items.map(i => i.variantId === item.variantId ? { ...current, quantity } : i)
            : [...state.items, { ...item, quantity }]
          
          // Broadcast to other tabs
          if (cartChannel) {
            cartChannel.postMessage({ type: 'UPDATE', items: newItems })
          }
          
          return { items: newItems }
        })
      },
      
      removeItem: (variantId) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.variantId !== variantId)
          
          // Broadcast to other tabs
          if (cartChannel) {
            cartChannel.postMessage({ type: 'UPDATE', items: newItems })
          }
          
          return { items: newItems }
        })
      },
      
      updateQuantity: (variantId, quantity) => {
        if (!Number.isSafeInteger(quantity) || quantity < 1) return
        set((state) => {
          const newItems = state.items.map((item) => {
            if (item.variantId === variantId) {
              const maxStock = cartItemQuantityLimit(item) ?? Infinity

              return {
                ...item,
                quantity: Math.max(1, Math.min(quantity, maxStock))
              }
            }
            return item
          })
          
          // Broadcast to other tabs
          if (cartChannel) {
            cartChannel.postMessage({ type: 'UPDATE', items: newItems })
          }
          
          return { items: newItems }
        })
      },
      
      clearCart: () => {
        // Broadcast to other tabs
        if (cartChannel) {
          cartChannel.postMessage({ type: 'CLEAR' })
        }
        
        set({ items: [] })
      },
      
      setItems: (newItems) => {
        newItems = newItems.map(capMadeToOrderQuantity)
        // Broadcast to other tabs
        if (cartChannel) {
          cartChannel.postMessage({ type: 'UPDATE', items: newItems })
        }
        
        set({ items: newItems })
      },
      
      getTotal: () => {
        const { items } = get()
        return items.reduce((total, item) => total + item.price * item.quantity, 0)
      },
      
      getItemCount: () => {
        const { items } = get()
        return items.reduce((count, item) => count + item.quantity, 0)
      },
    }),
    {
      name: 'mose-cart',
      version: 1,
      migrate: (persistedState: any) => {
        // No schema changes between versions yet; just return the state.
        return persistedState
      },
    }
  )
)

// Update through Zustand: mutating the rehydrated object did not notify React
// subscribers or persist incoming changes. Do not call setItems here: that
// would broadcast the same message back to every other tab indefinitely.
if (cartChannel) {
  cartChannel.onmessage = (event: MessageEvent<unknown>) => {
    const data = event.data
    if (!data || typeof data !== 'object') return
    const message = data as { type?: unknown; items?: unknown }
    if (message.type === 'CLEAR') {
      useCart.setState({ items: [] })
    } else if (message.type === 'UPDATE' && Array.isArray(message.items) &&
      message.items.every(isCartSyncItem)) {
      // Older persisted/recovered carts did not always include a slug. Accept
      // those messages and normalize them instead of losing the update after
      // the recovery flow has broadcast CLEAR.
      useCart.setState({ items: message.items.map(item => capMadeToOrderQuantity({ ...item, slug: item.slug ?? '' })) })
    }
  }
}

function capMadeToOrderQuantity(item: CartItem): CartItem {
  return item.isMadeToOrder === true ? { ...item, quantity: Math.max(1, Math.min(MAX_ORDER_QUANTITY, Math.floor(item.quantity) || 1)) } : item
}

export function cartItemQuantityLimit(item: Pick<CartItem, 'stock' | 'isPresale' | 'presaleStock' | 'isGiftCard' | 'isMadeToOrder'>): number | null {
  if (item.isGiftCard) return process.env.NEXT_PUBLIC_SHOPIFY_CHECKOUT_ENABLED === 'true' ? MAX_ORDER_QUANTITY : null
  if (item.isMadeToOrder === true) return MAX_ORDER_QUANTITY
  const stock = item.isPresale ? item.presaleStock ?? 0 : item.stock
  return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0
}

function isCartSyncItem(value: unknown): value is Omit<CartItem, 'slug'> & { slug?: string } {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (item.isMadeToOrder === undefined || typeof item.isMadeToOrder === 'boolean') &&
    (item.slug === undefined || typeof item.slug === 'string') &&
    ['productId', 'variantId', 'name', 'size', 'color', 'colorHex', 'image', 'sku']
    .every(key => typeof item[key] === 'string') &&
    typeof item.quantity === 'number' && Number.isSafeInteger(item.quantity) && item.quantity >= 1 &&
    typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0 &&
    typeof item.stock === 'number' && Number.isFinite(item.stock) && item.stock >= 0
}

/**
 * Is de winkelmand al uit localStorage teruggelezen?
 *
 * Zustand doet dat ná de eerste render. Tot dat moment is `items` leeg, ook als
 * er wel degelijk iets in de mand zit. Het afrekenscherm trok daar meteen een
 * conclusie uit:
 *
 *     if (items.length === 0 && !isRecovering) router.push('/cart')
 *
 * Bij een gewone klik vanaf de winkelwagen valt dat niet op, want dan staat de
 * mand al in het geheugen. Maar bij een volledige paginalading van /checkout
 * (een bladwijzer, een verversing, of terugkomen van een betaalpagina) draaide
 * die regel vóór het terugleren en werd de klant teruggestuurd naar de
 * winkelwagen met een volle mand. Precies op de laatste stap.
 *
 * Met deze hook wacht het scherm tot de mand echt geladen is.
 */
export function useCartGehydrateerd(): boolean {
  // Begint op false, ook op de server. De `persist`-api van zustand bestaat
  // tijdens het prerenderen niet, en een beginwaarde die op server en client
  // verschilt levert sowieso een hydratatieverschil op.
  const [gehydrateerd, setGehydrateerd] = useState(false)

  useEffect(() => {
    const opslag = (useCart as unknown as { persist?: {
      hasHydrated: () => boolean
      onFinishHydration: (cb: () => void) => () => void
    } }).persist

    // Geen persist-api (bijvoorbeeld in een test): dan is er niets om op te
    // wachten en gaan we uit van geladen.
    if (!opslag) {
      setGehydrateerd(true)
      return
    }

    if (opslag.hasHydrated()) {
      setGehydrateerd(true)
      return
    }

    return opslag.onFinishHydration(() => setGehydrateerd(true))
  }, [])

  return gehydrateerd
}
