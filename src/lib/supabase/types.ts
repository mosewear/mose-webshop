export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          created_at: string
          name: string
          slug: string
          description: string | null
          base_price: number
          category_id: string | null
          is_featured: boolean
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          slug: string
          description?: string | null
          base_price: number
          category_id?: string | null
          is_featured?: boolean
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          slug?: string
          description?: string | null
          base_price?: number
          category_id?: string | null
          is_featured?: boolean
          is_active?: boolean
        }
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          sku: string
          size: string
          color: string
          color_hex: string | null
          stock_quantity: number
          price_adjustment: number
          is_available: boolean
        }
        Insert: {
          id?: string
          product_id: string
          sku: string
          size: string
          color: string
          color_hex?: string | null
          stock_quantity?: number
          price_adjustment?: number
          is_available?: boolean
        }
        Update: {
          id?: string
          product_id?: string
          sku?: string
          size?: string
          color?: string
          color_hex?: string | null
          stock_quantity?: number
          price_adjustment?: number
          is_available?: boolean
        }
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          variant_id: string | null
          url: string
          position: number
          is_primary: boolean
        }
        Insert: {
          id?: string
          product_id: string
          variant_id?: string | null
          url: string
          position?: number
          is_primary?: boolean
        }
        Update: {
          id?: string
          product_id?: string
          variant_id?: string | null
          url?: string
          position?: number
          is_primary?: boolean
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          image_url: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          image_url?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          image_url?: string | null
        }
      }
      orders: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          email: string
          status: string
          total: number
          shipping_address: Json
          billing_address: Json
          stripe_payment_id: string | null
          tracking_code: string | null
          payment_status: string | null
          payment_method: string | null
          payment_intent_id: string | null
          subtotal: number | null
          shipping_cost: number | null
          discount_amount: number | null
          promo_code: string | null
          delivery_method: string | null
          tracking_url: string | null
          carrier: string | null
          label_url: string | null
          estimated_delivery_date: string | null
          updated_at: string
          paid_at: string | null
          stock_decremented_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          email: string
          status?: string
          total: number
          shipping_address: Json
          billing_address: Json
          stripe_payment_id?: string | null
          tracking_code?: string | null
          payment_status?: string | null
          payment_method?: string | null
          payment_intent_id?: string | null
          subtotal?: number | null
          shipping_cost?: number | null
          discount_amount?: number | null
          promo_code?: string | null
          delivery_method?: string | null
          tracking_url?: string | null
          carrier?: string | null
          label_url?: string | null
          estimated_delivery_date?: string | null
          updated_at?: string
          paid_at?: string | null
          stock_decremented_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          email?: string
          status?: string
          total?: number
          shipping_address?: Json
          billing_address?: Json
          stripe_payment_id?: string | null
          tracking_code?: string | null
          payment_status?: string | null
          payment_method?: string | null
          payment_intent_id?: string | null
          subtotal?: number | null
          shipping_cost?: number | null
          discount_amount?: number | null
          promo_code?: string | null
          delivery_method?: string | null
          tracking_url?: string | null
          carrier?: string | null
          label_url?: string | null
          estimated_delivery_date?: string | null
          updated_at?: string
          paid_at?: string | null
          stock_decremented_at?: string | null
        }
      }
      inventory_logs: {
        Row: {
          id: string
          variant_id: string
          profile_id: string | null
          change_amount: number
          previous_stock: number
          new_stock: number
          inventory_type: string
          reason: string
          notes: string | null
          receipt_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          variant_id: string
          profile_id?: string | null
          change_amount: number
          previous_stock: number
          new_stock: number
          inventory_type: string
          reason: string
          notes?: string | null
          receipt_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          variant_id?: string
          profile_id?: string | null
          change_amount?: number
          previous_stock?: number
          new_stock?: number
          inventory_type?: string
          reason?: string
          notes?: string | null
          receipt_id?: string | null
          created_at?: string | null
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          variant_id: string
          size: string
          color: string
          quantity: number
          price_at_purchase: number
          sku: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          variant_id: string
          size: string
          color: string
          quantity: number
          price_at_purchase: number
          sku: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          variant_id?: string
          size?: string
          color?: string
          quantity?: number
          price_at_purchase?: number
          sku?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      inventory_apply_regular_delta: {
        Args: {
          p_variant_id: string
          p_delta: number
          p_reason: string
          p_notes: string | null
          p_receipt_id: string | null
        }
        Returns: Json
      }
      inventory_apply_presale_delta: {
        Args: {
          p_variant_id: string
          p_delta: number
          p_reason: string
          p_notes: string | null
          p_receipt_id: string | null
        }
        Returns: Json
      }
      inventory_commit_receipt: {
        Args: {
          p_title: string
          p_lines: Json
          p_notes: string | null
          p_expected_total: number | null
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}




