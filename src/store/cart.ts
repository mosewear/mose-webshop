import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
          
          let newItems: CartItem[]
          
          if (existingItem) {
            if (existingItem.isGiftCard) {
              // Gift cards have no stock cap; just increment quantity
              newItems = state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              )
            } else {
              // Determine stock limit based on presale status
              const maxStock = existingItem.isPresale
                ? (existingItem.presaleStock || 0)
                : existingItem.stock

              newItems = state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: Math.min(i.quantity + item.quantity, maxStock) }
                  : i
              )
            }
          } else {
            newItems = [...state.items, item]
          }
          
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
        set((state) => {
          const newItems = state.items.map((item) => {
            if (item.variantId === variantId) {
              if (item.isGiftCard) {
                return { ...item, quantity: Math.max(1, quantity) }
              }
              // Determine stock limit based on presale status
              const maxStock = item.isPresale
                ? (item.presaleStock || 0)
                : item.stock

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
      onRehydrateStorage: () => (state) => {
        if (cartChannel && state) {
          cartChannel.onmessage = (event) => {
            const { type, items } = event.data
            
            if (type === 'UPDATE' && items) {
              // Update this tab's cart with items from other tab
              state.items = items
            } else if (type === 'CLEAR') {
              state.items = []
            }
          }
        }
      },
    }
  )
)

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
