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




