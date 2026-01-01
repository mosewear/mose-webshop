import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'

interface WishlistItem {
  id: string
  product_id: string
  created_at: string
}

interface WishlistStore {
  items: WishlistItem[]
  isLoading: boolean
  addToWishlist: (productId: string) => Promise<void>
  removeFromWishlist: (productId: string) => Promise<void>
  isInWishlist: (productId: string) => boolean
  loadWishlist: () => Promise<void>
}

export const useWishlist = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      loadWishlist: async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          set({ items: [] })
          return
        }

        set({ isLoading: true })

        try {
          const { data, error } = await supabase
            .from('wishlists')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (error) throw error

          set({ items: data || [], isLoading: false })
        } catch (error) {
          console.error('Error loading wishlist:', error)
          set({ isLoading: false })
        }
      },

      addToWishlist: async (productId: string) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          alert('Je moet ingelogd zijn om items aan je wishlist toe te voegen')
          return
        }

        try {
          const { data, error } = await supabase
            .from('wishlists')
            .insert([{ user_id: user.id, product_id: productId }])
            .select()
            .single()

          if (error) throw error

          set((state) => ({
            items: [data, ...state.items],
          }))
        } catch (error: any) {
          console.error('Error adding to wishlist:', error)
          if (error.code === '23505') {
            alert('Dit item staat al in je wishlist')
          } else {
            alert('Er ging iets mis bij het toevoegen aan je wishlist')
          }
        }
      },

      removeFromWishlist: async (productId: string) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        try {
          const { error } = await supabase
            .from('wishlists')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId)

          if (error) throw error

          set((state) => ({
            items: state.items.filter((item) => item.product_id !== productId),
          }))
        } catch (error) {
          console.error('Error removing from wishlist:', error)
          alert('Er ging iets mis bij het verwijderen uit je wishlist')
        }
      },

      isInWishlist: (productId: string) => {
        return get().items.some((item) => item.product_id === productId)
      },
    }),
    {
      name: 'mose-wishlist',
      partialize: (state) => ({ items: state.items }),
    }
  )
)


