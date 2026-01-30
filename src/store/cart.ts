import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  variantId: string
  name: string
  size: string
  color: string
  colorHex: string
  quantity: number
  price: number
  image: string
  stock: number
  sku: string
  isPresale?: boolean  // Is this item from presale stock?
  presaleExpectedDate?: string  // Expected delivery date for presale items
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
  console.log('🔄 Cart multi-tab sync enabled')
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
            newItems = state.items.map((i) =>
              i.variantId === item.variantId
                ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
                : i
            )
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
          const newItems = state.items.map((item) =>
            item.variantId === variantId
              ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
              : item
          )
          
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
      // Listen to messages from other tabs
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




