export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      about_settings: {
        Row: {
          created_at: string
          cta_text_en: string | null
          cta_text_nl: string
          hero_alt_en: string | null
          hero_alt_nl: string | null
          hero_image_url: string | null
          hero_image_url_mobile: string | null
          hero_subtitle_en: string | null
          hero_subtitle_nl: string
          hero_title_en: string | null
          hero_title_nl: string
          id: string
          image_focal_x: number
          image_focal_y: number
          local_text_en: string | null
          local_text_nl: string
          local_title_en: string | null
          local_title_nl: string
          story_paragraph1_en: string | null
          story_paragraph1_nl: string
          story_paragraph2_en: string | null
          story_paragraph2_nl: string
          story_title_en: string | null
          story_title_nl: string
          updated_at: string
          value_fair_pricing_text_en: string | null
          value_fair_pricing_text_nl: string
          value_fair_pricing_title_en: string | null
          value_fair_pricing_title_nl: string
          value_local_made_text_en: string | null
          value_local_made_text_nl: string
          value_local_made_title_en: string | null
          value_local_made_title_nl: string
          value_no_hassle_text_en: string | null
          value_no_hassle_text_nl: string
          value_no_hassle_title_en: string | null
          value_no_hassle_title_nl: string
          value_quality_text_en: string | null
          value_quality_text_nl: string
          value_quality_title_en: string | null
          value_quality_title_nl: string
          values_title_en: string | null
          values_title_nl: string
          why_local_text_en: string | null
          why_local_text_nl: string
          why_local_title_en: string | null
          why_local_title_nl: string
          why_stylish_text_en: string | null
          why_stylish_text_nl: string
          why_stylish_title_en: string | null
          why_stylish_title_nl: string
          why_sustainable_text_en: string | null
          why_sustainable_text_nl: string
          why_sustainable_title_en: string | null
          why_sustainable_title_nl: string
          why_title_en: string | null
          why_title_nl: string
        }
        Insert: {
          created_at?: string
          cta_text_en?: string | null
          cta_text_nl?: string
          hero_alt_en?: string | null
          hero_alt_nl?: string | null
          hero_image_url?: string | null
          hero_image_url_mobile?: string | null
          hero_subtitle_en?: string | null
          hero_subtitle_nl?: string
          hero_title_en?: string | null
          hero_title_nl?: string
          id?: string
          image_focal_x?: number
          image_focal_y?: number
          local_text_en?: string | null
          local_text_nl?: string
          local_title_en?: string | null
          local_title_nl?: string
          story_paragraph1_en?: string | null
          story_paragraph1_nl?: string
          story_paragraph2_en?: string | null
          story_paragraph2_nl?: string
          story_title_en?: string | null
          story_title_nl?: string
          updated_at?: string
          value_fair_pricing_text_en?: string | null
          value_fair_pricing_text_nl?: string
          value_fair_pricing_title_en?: string | null
          value_fair_pricing_title_nl?: string
          value_local_made_text_en?: string | null
          value_local_made_text_nl?: string
          value_local_made_title_en?: string | null
          value_local_made_title_nl?: string
          value_no_hassle_text_en?: string | null
          value_no_hassle_text_nl?: string
          value_no_hassle_title_en?: string | null
          value_no_hassle_title_nl?: string
          value_quality_text_en?: string | null
          value_quality_text_nl?: string
          value_quality_title_en?: string | null
          value_quality_title_nl?: string
          values_title_en?: string | null
          values_title_nl?: string
          why_local_text_en?: string | null
          why_local_text_nl?: string
          why_local_title_en?: string | null
          why_local_title_nl?: string
          why_stylish_text_en?: string | null
          why_stylish_text_nl?: string
          why_stylish_title_en?: string | null
          why_stylish_title_nl?: string
          why_sustainable_text_en?: string | null
          why_sustainable_text_nl?: string
          why_sustainable_title_en?: string | null
          why_sustainable_title_nl?: string
          why_title_en?: string | null
          why_title_nl?: string
        }
        Update: {
          created_at?: string
          cta_text_en?: string | null
          cta_text_nl?: string
          hero_alt_en?: string | null
          hero_alt_nl?: string | null
          hero_image_url?: string | null
          hero_image_url_mobile?: string | null
          hero_subtitle_en?: string | null
          hero_subtitle_nl?: string
          hero_title_en?: string | null
          hero_title_nl?: string
          id?: string
          image_focal_x?: number
          image_focal_y?: number
          local_text_en?: string | null
          local_text_nl?: string
          local_title_en?: string | null
          local_title_nl?: string
          story_paragraph1_en?: string | null
          story_paragraph1_nl?: string
          story_paragraph2_en?: string | null
          story_paragraph2_nl?: string
          story_title_en?: string | null
          story_title_nl?: string
          updated_at?: string
          value_fair_pricing_text_en?: string | null
          value_fair_pricing_text_nl?: string
          value_fair_pricing_title_en?: string | null
          value_fair_pricing_title_nl?: string
          value_local_made_text_en?: string | null
          value_local_made_text_nl?: string
          value_local_made_title_en?: string | null
          value_local_made_title_nl?: string
          value_no_hassle_text_en?: string | null
          value_no_hassle_text_nl?: string
          value_no_hassle_title_en?: string | null
          value_no_hassle_title_nl?: string
          value_quality_text_en?: string | null
          value_quality_text_nl?: string
          value_quality_title_en?: string | null
          value_quality_title_nl?: string
          values_title_en?: string | null
          values_title_nl?: string
          why_local_text_en?: string | null
          why_local_text_nl?: string
          why_local_title_en?: string | null
          why_local_title_nl?: string
          why_stylish_text_en?: string | null
          why_stylish_text_nl?: string
          why_stylish_title_en?: string | null
          why_stylish_title_nl?: string
          why_sustainable_text_en?: string | null
          why_sustainable_text_nl?: string
          why_sustainable_title_en?: string | null
          why_sustainable_title_nl?: string
          why_title_en?: string | null
          why_title_nl?: string
        }
        Relationships: []
      }
      ad_autopilot_actions: {
        Row: {
          action_type: string
          created_at: string
          decision_id: string | null
          error_message: string | null
          executed_at: string | null
          guardrail_outcome: string
          guardrail_reason: string | null
          id: string
          meta_api_request_id: string | null
          meta_api_response: Json | null
          payload: Json
          prior_state: Json | null
          reverted_at: string | null
          reverted_by: string | null
          status: string
          target_label: string | null
          target_level: string
          target_meta_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          decision_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          guardrail_outcome: string
          guardrail_reason?: string | null
          id?: string
          meta_api_request_id?: string | null
          meta_api_response?: Json | null
          payload?: Json
          prior_state?: Json | null
          reverted_at?: string | null
          reverted_by?: string | null
          status: string
          target_label?: string | null
          target_level: string
          target_meta_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          decision_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          guardrail_outcome?: string
          guardrail_reason?: string | null
          id?: string
          meta_api_request_id?: string | null
          meta_api_response?: Json | null
          payload?: Json
          prior_state?: Json | null
          reverted_at?: string | null
          reverted_by?: string | null
          status?: string
          target_label?: string | null
          target_level?: string
          target_meta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_autopilot_actions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "ad_autopilot_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_autopilot_actions_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_autopilot_decisions: {
        Row: {
          cost_input_tokens: number | null
          cost_output_tokens: number | null
          cost_usd: number | null
          created_at: string
          error_message: string | null
          id: string
          input_summary: Json
          llm_raw_response: Json | null
          model: string
          parsed_actions: Json
          prompt_hash: string
          prompt_version: string
          proposal_count: number
          provider: string
          run_completed_at: string | null
          run_started_at: string
          snapshot_date: string | null
          status: string
          trigger: string
        }
        Insert: {
          cost_input_tokens?: number | null
          cost_output_tokens?: number | null
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_summary?: Json
          llm_raw_response?: Json | null
          model: string
          parsed_actions?: Json
          prompt_hash: string
          prompt_version: string
          proposal_count?: number
          provider: string
          run_completed_at?: string | null
          run_started_at?: string
          snapshot_date?: string | null
          status?: string
          trigger?: string
        }
        Update: {
          cost_input_tokens?: number | null
          cost_output_tokens?: number | null
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_summary?: Json
          llm_raw_response?: Json | null
          model?: string
          parsed_actions?: Json
          prompt_hash?: string
          prompt_version?: string
          proposal_count?: number
          provider?: string
          run_completed_at?: string | null
          run_started_at?: string
          snapshot_date?: string | null
          status?: string
          trigger?: string
        }
        Relationships: []
      }
      ad_campaign_snapshots: {
        Row: {
          account_id: string
          ad_id: string | null
          ad_set_id: string | null
          attributed_add_to_cart: number
          attributed_initiate_checkout: number
          attributed_purchases: number
          attributed_revenue: number
          campaign_id: string | null
          clicks: number
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          entity_level: string
          frequency: number | null
          id: string
          impressions: number
          link_clicks: number
          meta_entity_id: string
          name: string | null
          objective: string | null
          raw_payload: Json | null
          snapshot_date: string
          spend: number
          status: string | null
        }
        Insert: {
          account_id: string
          ad_id?: string | null
          ad_set_id?: string | null
          attributed_add_to_cart?: number
          attributed_initiate_checkout?: number
          attributed_purchases?: number
          attributed_revenue?: number
          campaign_id?: string | null
          clicks?: number
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          entity_level: string
          frequency?: number | null
          id?: string
          impressions?: number
          link_clicks?: number
          meta_entity_id: string
          name?: string | null
          objective?: string | null
          raw_payload?: Json | null
          snapshot_date: string
          spend?: number
          status?: string | null
        }
        Update: {
          account_id?: string
          ad_id?: string | null
          ad_set_id?: string | null
          attributed_add_to_cart?: number
          attributed_initiate_checkout?: number
          attributed_purchases?: number
          attributed_revenue?: number
          campaign_id?: string | null
          clicks?: number
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          entity_level?: string
          frequency?: number | null
          id?: string
          impressions?: number
          link_clicks?: number
          meta_entity_id?: string
          name?: string | null
          objective?: string | null
          raw_payload?: Json | null
          snapshot_date?: string
          spend?: number
          status?: string | null
        }
        Relationships: []
      }
      ad_sku_economics: {
        Row: {
          cost_price: number
          created_at: string
          id: string
          notes: string | null
          product_id: string
          shipping_cost_avg: number
          transaction_fee_pct: number
          updated_at: string
          variant_id: string | null
          vat_rate: number
        }
        Insert: {
          cost_price: number
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          shipping_cost_avg?: number
          transaction_fee_pct?: number
          updated_at?: string
          variant_id?: string | null
          vat_rate?: number
        }
        Update: {
          cost_price?: number
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          shipping_cost_avg?: number
          transaction_fee_pct?: number
          updated_at?: string
          variant_id?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_sku_economics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_sku_economics_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_sku_economics_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants_with_total_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_sku_economics_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_ad_optimizer_signals"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_email: string | null
          admin_user_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      admin_push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          subscription: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          subscription: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          subscription?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_creative_runs: {
        Row: {
          completed_at: string | null
          decision_id: string | null
          error_message: string | null
          id: string
          model: string
          params: Json
          provider: string
          requested_by: string | null
          scene_id: string
          source_product_id: string
          source_variant_id: string | null
          started_at: string
          status: string
          total_cost_usd: number
          total_variants: number
        }
        Insert: {
          completed_at?: string | null
          decision_id?: string | null
          error_message?: string | null
          id?: string
          model: string
          params?: Json
          provider?: string
          requested_by?: string | null
          scene_id: string
          source_product_id: string
          source_variant_id?: string | null
          started_at?: string
          status?: string
          total_cost_usd?: number
          total_variants?: number
        }
        Update: {
          completed_at?: string | null
          decision_id?: string | null
          error_message?: string | null
          id?: string
          model?: string
          params?: Json
          provider?: string
          requested_by?: string | null
          scene_id?: string
          source_product_id?: string
          source_variant_id?: string | null
          started_at?: string
          status?: string
          total_cost_usd?: number
          total_variants?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_creative_runs_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "ad_autopilot_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_creative_runs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_creative_runs_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "ai_creative_scene_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_creative_runs_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_creative_runs_source_variant_id_fkey"
            columns: ["source_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_creative_runs_source_variant_id_fkey"
            columns: ["source_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants_with_total_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_creative_runs_source_variant_id_fkey"
            columns: ["source_variant_id"]
            isOneToOne: false
            referencedRelation: "v_ad_optimizer_signals"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      ai_creative_scene_library: {
        Row: {
          bg_removed_url: string | null
          created_at: string
          description: string | null
          focal_x: number
          focal_y: number
          id: string
          is_active: boolean
          label: string
          palette_hex: string[]
          prompt_hint: string | null
          reference_image_url: string
          scene_type: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          bg_removed_url?: string | null
          created_at?: string
          description?: string | null
          focal_x?: number
          focal_y?: number
          id?: string
          is_active?: boolean
          label: string
          palette_hex?: string[]
          prompt_hint?: string | null
          reference_image_url: string
          scene_type: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          bg_removed_url?: string | null
          created_at?: string
          description?: string | null
          focal_x?: number
          focal_y?: number
          id?: string
          is_active?: boolean
          label?: string
          palette_hex?: string[]
          prompt_hint?: string | null
          reference_image_url?: string
          scene_type?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      ai_creative_variants: {
        Row: {
          ad_policy_issues: string[]
          ad_policy_pass: boolean | null
          brand_color_pass: boolean | null
          created_at: string
          id: string
          mask_url: string | null
          meta_creative_id: string | null
          output_url: string
          palette_distance: number | null
          published_to_meta_at: string | null
          qa_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          run_id: string
          ssim_score: number | null
          status: string
          thumbnail_url: string | null
          variant_index: number
        }
        Insert: {
          ad_policy_issues?: string[]
          ad_policy_pass?: boolean | null
          brand_color_pass?: boolean | null
          created_at?: string
          id?: string
          mask_url?: string | null
          meta_creative_id?: string | null
          output_url: string
          palette_distance?: number | null
          published_to_meta_at?: string | null
          qa_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id: string
          ssim_score?: number | null
          status?: string
          thumbnail_url?: string | null
          variant_index: number
        }
        Update: {
          ad_policy_issues?: string[]
          ad_policy_pass?: boolean | null
          brand_color_pass?: boolean | null
          created_at?: string
          id?: string
          mask_url?: string | null
          meta_creative_id?: string | null
          output_url?: string
          palette_distance?: number | null
          published_to_meta_at?: string | null
          qa_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id?: string
          ssim_score?: number | null
          status?: string
          thumbnail_url?: string | null
          variant_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_creative_variants_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_creative_variants_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_creative_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          anonymous_id: string | null
          browser: string | null
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          device_type: string | null
          event_name: string
          event_properties: Json | null
          id: string
          ip_address: unknown
          os: string | null
          page_load_time: number | null
          page_title: string | null
          page_url: string | null
          referrer: string | null
          screen_height: number | null
          screen_width: number | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          anonymous_id?: string | null
          browser?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          device_type?: string | null
          event_name: string
          event_properties?: Json | null
          id?: string
          ip_address?: unknown
          os?: string | null
          page_load_time?: number | null
          page_title?: string | null
          page_url?: string | null
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          anonymous_id?: string | null
          browser?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          device_type?: string | null
          event_name?: string
          event_properties?: Json | null
          id?: string
          ip_address?: unknown
          os?: string | null
          page_load_time?: number | null
          page_title?: string | null
          page_url?: string | null
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      announcement_banner: {
        Row: {
          created_at: string | null
          dismiss_cookie_days: number | null
          dismissable: boolean | null
          enabled: boolean | null
          id: string
          rotation_interval: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dismiss_cookie_days?: number | null
          dismissable?: boolean | null
          enabled?: boolean | null
          id?: string
          rotation_interval?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dismiss_cookie_days?: number | null
          dismissable?: boolean | null
          enabled?: boolean | null
          id?: string
          rotation_interval?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      announcement_messages: {
        Row: {
          banner_id: string | null
          created_at: string | null
          cta_text: string | null
          cta_text_en: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          text: string
          text_en: string | null
          updated_at: string | null
        }
        Insert: {
          banner_id?: string | null
          created_at?: string | null
          cta_text?: string | null
          cta_text_en?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          text: string
          text_en?: string | null
          updated_at?: string | null
        }
        Update: {
          banner_id?: string | null
          created_at?: string | null
          cta_text?: string | null
          cta_text_en?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          text?: string
          text_en?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_messages_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "announcement_banner"
            referencedColumns: ["id"]
          },
        ]
      }
      back_in_stock_notifications: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_notified: boolean | null
          notified_at: string | null
          product_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          product_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          product_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "back_in_stock_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "back_in_stock_notifications_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "back_in_stock_notifications_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants_with_total_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "back_in_stock_notifications_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_ad_optimizer_signals"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content_en: string
          content_nl: string
          created_at: string | null
          excerpt_en: string
          excerpt_nl: string
          featured_image_url: string | null
          id: string
          published_at: string | null
          reading_time: number
          seo_description_en: string | null
          seo_description_nl: string | null
          seo_title_en: string | null
          seo_title_nl: string | null
          slug: string
          status: string
          tags: string[] | null
          title_en: string
          title_nl: string
          updated_at: string | null
        }
        Insert: {
          author?: string
          category?: string
          content_en?: string
          content_nl?: string
          created_at?: string | null
          excerpt_en?: string
          excerpt_nl?: string
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          reading_time?: number
          seo_description_en?: string | null
          seo_description_nl?: string | null
          seo_title_en?: string | null
          seo_title_nl?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title_en?: string
          title_nl: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          category?: string
          content_en?: string
          content_nl?: string
          created_at?: string | null
          excerpt_en?: string
          excerpt_nl?: string
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          reading_time?: number
          seo_description_en?: string | null
          seo_description_nl?: string | null
          seo_title_en?: string | null
          seo_title_nl?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title_en?: string
          title_nl?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      campaign_email_sent: {
        Row: {
          campaign_key: string
          created_at: string
          id: string
          mail_number: number
          resend_id: string | null
          sent_at: string
          subscriber_id: string
        }
        Insert: {
          campaign_key: string
          created_at?: string
          id?: string
          mail_number: number
          resend_id?: string | null
          sent_at?: string
          subscriber_id: string
        }
        Update: {
          campaign_key?: string
          created_at?: string
          id?: string
          mail_number?: number
          resend_id?: string | null
          sent_at?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_email_sent_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          default_materials_care: string | null
          default_materials_care_en: string | null
          default_product_details: string | null
          default_product_details_en: string | null
          description: string | null
          description_en: string | null
          display_order: number | null
          featured: boolean | null
          id: string
          image_url: string | null
          name: string
          name_en: string | null
          parent_id: string | null
          pdp_signature_specs: string | null
          pdp_signature_specs_en: string | null
          size_guide_content: Json | null
          size_guide_content_en: Json | null
          size_guide_type: string | null
          slug: string
          sort_order: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_materials_care?: string | null
          default_materials_care_en?: string | null
          default_product_details?: string | null
          default_product_details_en?: string | null
          description?: string | null
          description_en?: string | null
          display_order?: number | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          name: string
          name_en?: string | null
          parent_id?: string | null
          pdp_signature_specs?: string | null
          pdp_signature_specs_en?: string | null
          size_guide_content?: Json | null
          size_guide_content_en?: Json | null
          size_guide_type?: string | null
          slug: string
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_materials_care?: string | null
          default_materials_care_en?: string | null
          default_product_details?: string | null
          default_product_details_en?: string | null
          description?: string | null
          description_en?: string | null
          display_order?: number | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          name?: string
          name_en?: string | null
          parent_id?: string | null
          pdp_signature_specs?: string | null
          pdp_signature_specs_en?: string | null
          size_guide_content?: Json | null
          size_guide_content_en?: Json | null
          size_guide_type?: string | null
          slug?: string
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          device_type: string | null
          id: string
          last_message_at: string | null
          locale: string | null
          message_count: number | null
          page_url: string | null
          session_id: string
          started_at: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          last_message_at?: string | null
          locale?: string | null
          message_count?: number | null
          page_url?: string | null
          session_id: string
          started_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          last_message_at?: string | null
          locale?: string | null
          message_count?: number | null
          page_url?: string | null
          session_id?: string
          started_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_redemptions: {
        Row: {
          amount: number
          committed_at: string | null
          created_at: string
          gift_card_id: string
          id: string
          order_id: string
          reversed_at: string | null
          status: string
        }
        Insert: {
          amount: number
          committed_at?: string | null
          created_at?: string
          gift_card_id: string
          id?: string
          order_id: string
          reversed_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          committed_at?: string | null
          created_at?: string
          gift_card_id?: string
          id?: string
          order_id?: string
          reversed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_redemptions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_paid_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          admin_notes: string | null
          balance: number
          code_hash: string
          code_last4: string
          created_at: string
          created_by: string | null
          currency: string
          delivered_at: string | null
          delivery_attempts: number
          expires_at: string | null
          id: string
          initial_amount: number
          last_delivery_error: string | null
          pending_delivery_code: string | null
          personal_message: string | null
          purchased_by_email: string | null
          purchased_by_order_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          scheduled_send_at: string | null
          sender_name: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          balance: number
          code_hash: string
          code_last4: string
          created_at?: string
          created_by?: string | null
          currency?: string
          delivered_at?: string | null
          delivery_attempts?: number
          expires_at?: string | null
          id?: string
          initial_amount: number
          last_delivery_error?: string | null
          pending_delivery_code?: string | null
          personal_message?: string | null
          purchased_by_email?: string | null
          purchased_by_order_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          scheduled_send_at?: string | null
          sender_name?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          balance?: number
          code_hash?: string
          code_last4?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          delivered_at?: string | null
          delivery_attempts?: number
          expires_at?: string | null
          id?: string
          initial_amount?: number
          last_delivery_error?: string | null
          pending_delivery_code?: string | null
          personal_message?: string | null
          purchased_by_email?: string | null
          purchased_by_order_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          scheduled_send_at?: string | null
          sender_name?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_purchased_by_order_id_fkey"
            columns: ["purchased_by_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_purchased_by_order_id_fkey"
            columns: ["purchased_by_order_id"]
            isOneToOne: false
            referencedRelation: "v_paid_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_settings: {
        Row: {
          categories_description: string | null
          categories_description_en: string | null
          categories_title: string | null
          categories_title_en: string | null
          category_1_id: string | null
          category_2_id: string | null
          category_3_id: string | null
          category_4_id: string | null
          created_at: string | null
          featured_description: string | null
          featured_description_en: string | null
          featured_label: string | null
          featured_label_en: string | null
          featured_product_1_id: string | null
          featured_product_2_id: string | null
          featured_product_3_id: string | null
          featured_title: string | null
          featured_title_en: string | null
          hero_badge_text: string | null
          hero_badge_text_en: string | null
          hero_cta1_link: string | null
          hero_cta1_text: string | null
          hero_cta1_text_en: string | null
          hero_cta2_link: string | null
          hero_cta2_text: string | null
          hero_cta2_text_en: string | null
          hero_image_url: string | null
          hero_image_url_mobile: string | null
          hero_subtitle: string | null
          hero_subtitle_en: string | null
          hero_title_line1: string | null
          hero_title_line1_en: string | null
          hero_title_line2: string | null
          hero_title_line2_en: string | null
          id: string
          newsletter_button_text: string | null
          newsletter_button_text_en: string | null
          newsletter_description1: string | null
          newsletter_description1_en: string | null
          newsletter_description2: string | null
          newsletter_description2_en: string | null
          newsletter_input_placeholder: string | null
          newsletter_input_placeholder_en: string | null
          newsletter_title: string | null
          newsletter_title_en: string | null
          newsletter_trust_text: string | null
          newsletter_trust_text_en: string | null
          stats_1_number: string | null
          stats_1_text: string | null
          stats_1_text_en: string | null
          stats_2_text: string | null
          stats_2_text_en: string | null
          stats_3_icon: string | null
          stats_3_number: string | null
          stats_3_text: string | null
          stats_3_text_en: string | null
          story_badge: string | null
          story_badge_en: string | null
          story_cta_link: string | null
          story_cta_text: string | null
          story_cta_text_en: string | null
          story_founded_year: string | null
          story_image_url: string | null
          story_paragraph1: string | null
          story_paragraph1_en: string | null
          story_paragraph2: string | null
          story_paragraph2_en: string | null
          story_stat1_label: string | null
          story_stat1_label_en: string | null
          story_stat1_sublabel: string | null
          story_stat1_sublabel_en: string | null
          story_stat2_label: string | null
          story_stat2_label_en: string | null
          story_stat2_sublabel: string | null
          story_stat2_sublabel_en: string | null
          story_stat3_label: string | null
          story_stat3_label_en: string | null
          story_stat3_sublabel: string | null
          story_stat3_sublabel_en: string | null
          story_title_line1: string | null
          story_title_line1_en: string | null
          story_title_line2: string | null
          story_title_line2_en: string | null
          trust_badge_1: string | null
          trust_badge_1_en: string | null
          trust_badge_2_prefix: string | null
          trust_badge_2_prefix_en: string | null
          trust_badge_3_suffix: string | null
          trust_badge_3_suffix_en: string | null
          trust_badge_4: string | null
          trust_badge_4_en: string | null
          updated_at: string | null
        }
        Insert: {
          categories_description?: string | null
          categories_description_en?: string | null
          categories_title?: string | null
          categories_title_en?: string | null
          category_1_id?: string | null
          category_2_id?: string | null
          category_3_id?: string | null
          category_4_id?: string | null
          created_at?: string | null
          featured_description?: string | null
          featured_description_en?: string | null
          featured_label?: string | null
          featured_label_en?: string | null
          featured_product_1_id?: string | null
          featured_product_2_id?: string | null
          featured_product_3_id?: string | null
          featured_title?: string | null
          featured_title_en?: string | null
          hero_badge_text?: string | null
          hero_badge_text_en?: string | null
          hero_cta1_link?: string | null
          hero_cta1_text?: string | null
          hero_cta1_text_en?: string | null
          hero_cta2_link?: string | null
          hero_cta2_text?: string | null
          hero_cta2_text_en?: string | null
          hero_image_url?: string | null
          hero_image_url_mobile?: string | null
          hero_subtitle?: string | null
          hero_subtitle_en?: string | null
          hero_title_line1?: string | null
          hero_title_line1_en?: string | null
          hero_title_line2?: string | null
          hero_title_line2_en?: string | null
          id?: string
          newsletter_button_text?: string | null
          newsletter_button_text_en?: string | null
          newsletter_description1?: string | null
          newsletter_description1_en?: string | null
          newsletter_description2?: string | null
          newsletter_description2_en?: string | null
          newsletter_input_placeholder?: string | null
          newsletter_input_placeholder_en?: string | null
          newsletter_title?: string | null
          newsletter_title_en?: string | null
          newsletter_trust_text?: string | null
          newsletter_trust_text_en?: string | null
          stats_1_number?: string | null
          stats_1_text?: string | null
          stats_1_text_en?: string | null
          stats_2_text?: string | null
          stats_2_text_en?: string | null
          stats_3_icon?: string | null
          stats_3_number?: string | null
          stats_3_text?: string | null
          stats_3_text_en?: string | null
          story_badge?: string | null
          story_badge_en?: string | null
          story_cta_link?: string | null
          story_cta_text?: string | null
          story_cta_text_en?: string | null
          story_founded_year?: string | null
          story_image_url?: string | null
          story_paragraph1?: string | null
          story_paragraph1_en?: string | null
          story_paragraph2?: string | null
          story_paragraph2_en?: string | null
          story_stat1_label?: string | null
          story_stat1_label_en?: string | null
          story_stat1_sublabel?: string | null
          story_stat1_sublabel_en?: string | null
          story_stat2_label?: string | null
          story_stat2_label_en?: string | null
          story_stat2_sublabel?: string | null
          story_stat2_sublabel_en?: string | null
          story_stat3_label?: string | null
          story_stat3_label_en?: string | null
          story_stat3_sublabel?: string | null
          story_stat3_sublabel_en?: string | null
          story_title_line1?: string | null
          story_title_line1_en?: string | null
          story_title_line2?: string | null
          story_title_line2_en?: string | null
          trust_badge_1?: string | null
          trust_badge_1_en?: string | null
          trust_badge_2_prefix?: string | null
          trust_badge_2_prefix_en?: string | null
          trust_badge_3_suffix?: string | null
          trust_badge_3_suffix_en?: string | null
          trust_badge_4?: string | null
          trust_badge_4_en?: string | null
          updated_at?: string | null
        }
        Update: {
          categories_description?: string | null
          categories_description_en?: string | null
          categories_title?: string | null
          categories_title_en?: string | null
          category_1_id?: string | null
          category_2_id?: string | null
          category_3_id?: string | null
          category_4_id?: string | null
          created_at?: string | null
          featured_description?: string | null
          featured_description_en?: string | null
          featured_label?: string | null
          featured_label_en?: string | null
          featured_product_1_id?: string | null
          featured_product_2_id?: string | null
          featured_product_3_id?: string | null
          featured_title?: string | null
          featured_title_en?: string | null
          hero_badge_text?: string | null
          hero_badge_text_en?: string | null
          hero_cta1_link?: string | null
          hero_cta1_text?: string | null
          hero_cta1_text_en?: string | null
          hero_cta2_link?: string | null
          hero_cta2_text?: string | null
          hero_cta2_text_en?: string | null
          hero_image_url?: string | null
          hero_image_url_mobile?: string | null
          hero_subtitle?: string | null
          hero_subtitle_en?: string | null
          hero_title_line1?: string | null
          hero_title_line1_en?: string | null
          hero_title_line2?: string | null
          hero_title_line2_en?: string | null
          id?: string
          newsletter_button_text?: string | null
          newsletter_button_text_en?: string | null
          newsletter_description1?: string | null
          newsletter_description1_en?: string | null
          newsletter_description2?: string | null
          newsletter_description2_en?: string | null
          newsletter_input_placeholder?: string | null
          newsletter_input_placeholder_en?: string | null
          newsletter_title?: string | null
          newsletter_title_en?: string | null
          newsletter_trust_text?: string | null
          newsletter_trust_text_en?: string | null
          stats_1_number?: string | null
          stats_1_text?: string | null
          stats_1_text_en?: string | null
          stats_2_text?: string | null
          stats_2_text_en?: string | null
          stats_3_icon?: string | null
          stats_3_number?: string | null
          stats_3_text?: string | null
          stats_3_text_en?: string | null
          story_badge?: string | null
          story_badge_en?: string | null
          story_cta_link?: string | null
          story_cta_text?: string | null
          story_cta_text_en?: string | null
          story_founded_year?: string | null
          story_image_url?: string | null
          story_paragraph1?: string | null
          story_paragraph1_en?: string | null
          story_paragraph2?: string | null
          story_paragraph2_en?: string | null
          story_stat1_label?: string | null
          story_stat1_label_en?: string | null
          story_stat1_sublabel?: string | null
          story_stat1_sublabel_en?: string | null
          story_stat2_label?: string | null
          story_stat2_label_en?: string | null
          story_stat2_sublabel?: string | null
          story_stat2_sublabel_en?: string | null
          story_stat3_label?: string | null
          story_stat3_label_en?: string | null
          story_stat3_sublabel?: string | null
          story_stat3_sublabel_en?: string | null
          story_title_line1?: string | null
          story_title_line1_en?: string | null
          story_title_line2?: string | null
          story_title_line2_en?: string | null
          trust_badge_1?: string | null
          trust_badge_1_en?: string | null
          trust_badge_2_prefix?: string | null
          trust_badge_2_prefix_en?: string | null
          trust_badge_3_suffix?: string | null
          trust_badge_3_suffix_en?: string | null
          trust_badge_4?: string | null
          trust_badge_4_en?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_settings_category_1_id_fkey"
            columns: ["category_1_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_settings_category_2_id_fkey"
            columns: ["category_2_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_settings_category_3_id_fkey"
            columns: ["category_3_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_settings_category_4_id_fkey"
            columns: ["category_4_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_settings_featured_product_1_id_fkey"
            columns: ["featured_product_1_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_settings_featured_product_2_id_fkey"
            columns: ["featured_product_2_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_settings_featured_product_3_id_fkey"
            columns: ["featured_product_3_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      insider_email_sent: {
        Row: {
          created_at: string | null
          email_type: string
          id: string
          sent_at: string | null
          subscriber_id: string
        }
        Insert: {
          created_at?: string | null
          email_type: string
          id?: string
          sent_at?: string | null
          subscriber_id: string
        }
        Update: {
          created_at?: string | null
          email_type?: string
          id?: string
          sent_at?: string | null
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insider_email_sent_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_credentials: {
        Row: {
          business_account_id: string | null
          created_at: string
          id: string
          ig_username: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          last_synced_at: string | null
          long_lived_token: string | null
          page_id: string | null
          page_name: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          business_account_id?: string | null
          created_at?: string
          id?: string
          ig_username?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          long_lived_token?: string | null
          page_id?: string | null
          page_name?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          business_account_id?: string | null
          created_at?: string
          id?: string
          ig_username?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          long_lived_token?: string | null
          page_id?: string | null
          page_name?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      instagram_posts: {
        Row: {
          caption: string | null
          caption_en: string | null
          created_at: string
          id: string
          instagram_id: string | null
          is_hidden: boolean
          is_pinned: boolean
          like_count: number | null
          media_type: string
          media_url: string
          permalink: string
          pin_order: number | null
          source: string
          taken_at: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          caption_en?: string | null
          created_at?: string
          id?: string
          instagram_id?: string | null
          is_hidden?: boolean
          is_pinned?: boolean
          like_count?: number | null
          media_type?: string
          media_url: string
          permalink: string
          pin_order?: number | null
          source?: string
          taken_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          caption_en?: string | null
          created_at?: string
          id?: string
          instagram_id?: string | null
          is_hidden?: boolean
          is_pinned?: boolean
          like_count?: number | null
          media_type?: string
          media_url?: string
          permalink?: string
          pin_order?: number | null
          source?: string
          taken_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      instagram_settings: {
        Row: {
          created_at: string
          cta_text_en: string | null
          cta_text_nl: string
          cta_url: string
          enabled: boolean
          id: string
          marquee_speed_seconds: number
          max_posts: number
          section_subtitle_en: string | null
          section_subtitle_nl: string
          section_title_en: string | null
          section_title_nl: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          cta_text_en?: string | null
          cta_text_nl?: string
          cta_url?: string
          enabled?: boolean
          id?: string
          marquee_speed_seconds?: number
          max_posts?: number
          section_subtitle_en?: string | null
          section_subtitle_nl?: string
          section_title_en?: string | null
          section_title_nl?: string
          updated_at?: string
          username?: string
        }
        Update: {
          created_at?: string
          cta_text_en?: string | null
          cta_text_nl?: string
          cta_url?: string
          enabled?: boolean
          id?: string
          marquee_speed_seconds?: number
          max_posts?: number
          section_subtitle_en?: string | null
          section_subtitle_nl?: string
          section_title_en?: string | null
          section_title_nl?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          change_amount: number
          created_at: string
          id: string
          inventory_type: string
          new_stock: number
          notes: string | null
          previous_stock: number
          profile_id: string | null
          reason: string
          receipt_id: string | null
          variant_id: string
        }
        Insert: {
          change_amount: number
          created_at?: string
          id?: string
          inventory_type: string
          new_stock: number
          notes?: string | null
          previous_stock: number
          profile_id?: string | null
          reason: string
          receipt_id?: string | null
          variant_id: string
        }
        Update: {
          change_amount?: number
          created_at?: string
          id?: string
          inventory_type?: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          profile_id?: string | null
          reason?: string
          receipt_id?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants_with_total_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_ad_optimizer_signals"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      lookbook_chapter_products: {
        Row: {
          chapter_id: string
          created_at: string
          product_id: string
          sort_order: number
        }
        Insert: {
          chapter_id: string
          created_at?: string
          product_id: string
          sort_order?: number
        }
        Update: {
          chapter_id?: string
          created_at?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "lookbook_chapter_products_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "lookbook_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lookbook_chapter_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      lookbook_chapters: {
        Row: {
          caption_en: string | null
          caption_nl: string | null
          created_at: string
          eyebrow_en: string | null
          eyebrow_nl: string | null
          hero_image_url: string
          id: string
          image_focal_x: number
          image_focal_y: number
          is_active: boolean
          layout_variant: string
          meta: Json
          sort_order: number
          ticker_text_en: string | null
          ticker_text_nl: string | null
          title_en: string | null
          title_nl: string
          updated_at: string
        }
        Insert: {
          caption_en?: string | null
          caption_nl?: string | null
          created_at?: string
          eyebrow_en?: string | null
          eyebrow_nl?: string | null
          hero_image_url: string
          id?: string
          image_focal_x?: number
          image_focal_y?: number
          is_active?: boolean
          layout_variant?: string
          meta?: Json
          sort_order?: number
          ticker_text_en?: string | null
          ticker_text_nl?: string | null
          title_en?: string | null
          title_nl: string
          updated_at?: string
        }
        Update: {
          caption_en?: string | null
          caption_nl?: string | null
          created_at?: string
          eyebrow_en?: string | null
          eyebrow_nl?: string | null
          hero_image_url?: string
          id?: string
          image_focal_x?: number
          image_focal_y?: number
          is_active?: boolean
          layout_variant?: string
          meta?: Json
          sort_order?: number
          ticker_text_en?: string | null
          ticker_text_nl?: string | null
          title_en?: string | null
          title_nl?: string
          updated_at?: string
        }
        Relationships: []
      }
      lookbook_settings: {
        Row: {
          created_at: string | null
          final_cta_button_link: string | null
          final_cta_button_text: string | null
          final_cta_button_text_en: string | null
          final_cta_text: string | null
          final_cta_text_en: string | null
          final_cta_title: string | null
          final_cta_title_en: string | null
          header_subtitle: string | null
          header_subtitle_en: string | null
          header_title: string | null
          header_title_en: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_subtitle_en: string | null
          hero_title: string | null
          hero_title_en: string | null
          id: string
          quote_subtext: string | null
          quote_subtext_en: string | null
          quote_text: string | null
          quote_text_en: string | null
          section1_cta_link: string | null
          section1_cta_text: string | null
          section1_cta_text_en: string | null
          section1_image_url: string | null
          section1_text: string | null
          section1_text_en: string | null
          section1_title: string | null
          section1_title_en: string | null
          section2_cta_link: string | null
          section2_cta_text: string | null
          section2_cta_text_en: string | null
          section2_image_url: string | null
          section2_text: string | null
          section2_text_en: string | null
          section2_title: string | null
          section2_title_en: string | null
          stamp_left_en: string | null
          stamp_left_nl: string | null
          ticker_text_en: string | null
          ticker_text_nl: string | null
          triple1_image_url: string | null
          triple1_title: string | null
          triple1_title_en: string | null
          triple2_image_url: string | null
          triple2_title: string | null
          triple2_title_en: string | null
          triple3_image_url: string | null
          triple3_title: string | null
          triple3_title_en: string | null
          updated_at: string | null
          wide_cta_link: string | null
          wide_cta_text: string | null
          wide_cta_text_en: string | null
          wide_image_url: string | null
          wide_title: string | null
          wide_title_en: string | null
        }
        Insert: {
          created_at?: string | null
          final_cta_button_link?: string | null
          final_cta_button_text?: string | null
          final_cta_button_text_en?: string | null
          final_cta_text?: string | null
          final_cta_text_en?: string | null
          final_cta_title?: string | null
          final_cta_title_en?: string | null
          header_subtitle?: string | null
          header_subtitle_en?: string | null
          header_title?: string | null
          header_title_en?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_subtitle_en?: string | null
          hero_title?: string | null
          hero_title_en?: string | null
          id?: string
          quote_subtext?: string | null
          quote_subtext_en?: string | null
          quote_text?: string | null
          quote_text_en?: string | null
          section1_cta_link?: string | null
          section1_cta_text?: string | null
          section1_cta_text_en?: string | null
          section1_image_url?: string | null
          section1_text?: string | null
          section1_text_en?: string | null
          section1_title?: string | null
          section1_title_en?: string | null
          section2_cta_link?: string | null
          section2_cta_text?: string | null
          section2_cta_text_en?: string | null
          section2_image_url?: string | null
          section2_text?: string | null
          section2_text_en?: string | null
          section2_title?: string | null
          section2_title_en?: string | null
          stamp_left_en?: string | null
          stamp_left_nl?: string | null
          ticker_text_en?: string | null
          ticker_text_nl?: string | null
          triple1_image_url?: string | null
          triple1_title?: string | null
          triple1_title_en?: string | null
          triple2_image_url?: string | null
          triple2_title?: string | null
          triple2_title_en?: string | null
          triple3_image_url?: string | null
          triple3_title?: string | null
          triple3_title_en?: string | null
          updated_at?: string | null
          wide_cta_link?: string | null
          wide_cta_text?: string | null
          wide_cta_text_en?: string | null
          wide_image_url?: string | null
          wide_title?: string | null
          wide_title_en?: string | null
        }
        Update: {
          created_at?: string | null
          final_cta_button_link?: string | null
          final_cta_button_text?: string | null
          final_cta_button_text_en?: string | null
          final_cta_text?: string | null
          final_cta_text_en?: string | null
          final_cta_title?: string | null
          final_cta_title_en?: string | null
          header_subtitle?: string | null
          header_subtitle_en?: string | null
          header_title?: string | null
          header_title_en?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_subtitle_en?: string | null
          hero_title?: string | null
          hero_title_en?: string | null
          id?: string
          quote_subtext?: string | null
          quote_subtext_en?: string | null
          quote_text?: string | null
          quote_text_en?: string | null
          section1_cta_link?: string | null
          section1_cta_text?: string | null
          section1_cta_text_en?: string | null
          section1_image_url?: string | null
          section1_text?: string | null
          section1_text_en?: string | null
          section1_title?: string | null
          section1_title_en?: string | null
          section2_cta_link?: string | null
          section2_cta_text?: string | null
          section2_cta_text_en?: string | null
          section2_image_url?: string | null
          section2_text?: string | null
          section2_text_en?: string | null
          section2_title?: string | null
          section2_title_en?: string | null
          stamp_left_en?: string | null
          stamp_left_nl?: string | null
          ticker_text_en?: string | null
          ticker_text_nl?: string | null
          triple1_image_url?: string | null
          triple1_title?: string | null
          triple1_title_en?: string | null
          triple2_image_url?: string | null
          triple2_title?: string | null
          triple2_title_en?: string | null
          triple3_image_url?: string | null
          triple3_title?: string | null
          triple3_title_en?: string | null
          updated_at?: string | null
          wide_cta_link?: string | null
          wide_cta_text?: string | null
          wide_cta_text_en?: string | null
          wide_image_url?: string | null
          wide_title?: string | null
          wide_title_en?: string | null
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string | null
          email: string
          id: string
          last_tier_mailed: string | null
          lifetime_points: number
          points_balance: number
          status_mail_count: number
          status_mail_sent_at: string | null
          tier: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          last_tier_mailed?: string | null
          lifetime_points?: number
          points_balance?: number
          status_mail_count?: number
          status_mail_sent_at?: string | null
          tier?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_tier_mailed?: string | null
          lifetime_points?: number
          points_balance?: number
          status_mail_count?: number
          status_mail_sent_at?: string | null
          tier?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          description: string
          email: string
          id: string
          order_id: string | null
          points: number
          return_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string
          email: string
          id?: string
          order_id?: string | null
          points: number
          return_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          email?: string
          id?: string
          order_id?: string | null
          points?: number
          return_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          auto_apply_via_url: boolean
          banner_cta_en: string | null
          banner_cta_nl: string | null
          banner_dismissable: boolean
          banner_enabled: boolean
          banner_link_url: string | null
          banner_message_en: string | null
          banner_message_nl: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_enabled: boolean
          name: string
          override_banner_color: boolean
          popup_body_en: string | null
          popup_body_nl: string | null
          popup_cta_en: string | null
          popup_cta_nl: string | null
          popup_delay_seconds: number
          popup_enabled: boolean
          popup_image_alt_en: string | null
          popup_image_alt_nl: string | null
          popup_image_url: string | null
          popup_scroll_pct: number
          popup_show_on_pages: string[]
          popup_title_en: string | null
          popup_title_nl: string | null
          popup_trigger: string
          priority: number
          promo_code_id: string | null
          show_code_in_banner: boolean
          show_code_in_popup: boolean
          slug: string
          starts_at: string | null
          theme_accent_color: string | null
          theme_color: string | null
          theme_text_color: string | null
          updated_at: string
        }
        Insert: {
          auto_apply_via_url?: boolean
          banner_cta_en?: string | null
          banner_cta_nl?: string | null
          banner_dismissable?: boolean
          banner_enabled?: boolean
          banner_link_url?: string | null
          banner_message_en?: string | null
          banner_message_nl?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          override_banner_color?: boolean
          popup_body_en?: string | null
          popup_body_nl?: string | null
          popup_cta_en?: string | null
          popup_cta_nl?: string | null
          popup_delay_seconds?: number
          popup_enabled?: boolean
          popup_image_alt_en?: string | null
          popup_image_alt_nl?: string | null
          popup_image_url?: string | null
          popup_scroll_pct?: number
          popup_show_on_pages?: string[]
          popup_title_en?: string | null
          popup_title_nl?: string | null
          popup_trigger?: string
          priority?: number
          promo_code_id?: string | null
          show_code_in_banner?: boolean
          show_code_in_popup?: boolean
          slug: string
          starts_at?: string | null
          theme_accent_color?: string | null
          theme_color?: string | null
          theme_text_color?: string | null
          updated_at?: string
        }
        Update: {
          auto_apply_via_url?: boolean
          banner_cta_en?: string | null
          banner_cta_nl?: string | null
          banner_dismissable?: boolean
          banner_enabled?: boolean
          banner_link_url?: string | null
          banner_message_en?: string | null
          banner_message_nl?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          override_banner_color?: boolean
          popup_body_en?: string | null
          popup_body_nl?: string | null
          popup_cta_en?: string | null
          popup_cta_nl?: string | null
          popup_delay_seconds?: number
          popup_enabled?: boolean
          popup_image_alt_en?: string | null
          popup_image_alt_nl?: string | null
          popup_image_url?: string | null
          popup_scroll_pct?: number
          popup_show_on_pages?: string[]
          popup_title_en?: string | null
          popup_title_nl?: string | null
          popup_trigger?: string
          priority?: number
          promo_code_id?: string | null
          show_code_in_banner?: boolean
          show_code_in_popup?: boolean
          slug?: string
          starts_at?: string | null
          theme_accent_color?: string | null
          theme_color?: string | null
          theme_text_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          bucket: string
          created_at: string | null
          created_by: string | null
          id: string
          mime_type: string | null
          name: string
          path: string
          size: number
          updated_at: string | null
          url: string
        }
        Insert: {
          bucket: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          mime_type?: string | null
          name: string
          path: string
          size: number
          updated_at?: string | null
          url: string
        }
        Update: {
          bucket?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          path?: string
          size?: number
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      meta_credentials: {
        Row: {
          access_token: string
          ad_account_id: string
          business_id: string
          created_at: string
          default_link_template: string | null
          id: string
          label: string
          page_id: string | null
          pixel_id: string | null
          token_expires_at: string | null
          token_scopes: string[]
          updated_at: string
        }
        Insert: {
          access_token: string
          ad_account_id: string
          business_id: string
          created_at?: string
          default_link_template?: string | null
          id?: string
          label?: string
          page_id?: string | null
          pixel_id?: string | null
          token_expires_at?: string | null
          token_scopes?: string[]
          updated_at?: string
        }
        Update: {
          access_token?: string
          ad_account_id?: string
          business_id?: string
          created_at?: string
          default_link_template?: string | null
          id?: string
          label?: string
          page_id?: string | null
          pixel_id?: string | null
          token_expires_at?: string | null
          token_scopes?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          locale: string | null
          metadata: Json | null
          source: string | null
          status: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          locale?: string | null
          metadata?: Json | null
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          locale?: string | null
          metadata?: Json | null
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_emails: {
        Row: {
          email_type: string
          error_message: string | null
          id: string
          locale: string | null
          metadata: Json | null
          order_id: string | null
          recipient_email: string
          resend_id: string | null
          return_id: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          template_key: string | null
        }
        Insert: {
          email_type: string
          error_message?: string | null
          id?: string
          locale?: string | null
          metadata?: Json | null
          order_id?: string | null
          recipient_email: string
          resend_id?: string | null
          return_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_key?: string | null
        }
        Update: {
          email_type?: string
          error_message?: string | null
          id?: string
          locale?: string | null
          metadata?: Json | null
          order_id?: string | null
          recipient_email?: string
          resend_id?: string | null
          return_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_emails_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_emails_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_paid_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_emails_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          color: string
          created_at: string | null
          gift_card_metadata: Json | null
          id: string
          image_url: string | null
          is_gift_card: boolean
          is_presale: boolean | null
          order_id: string
          original_price: number | null
          presale_expected_date: string | null
          price_at_purchase: number
          product_id: string | null
          product_name: string
          quantity: number
          quantity_discount_amount: number | null
          size: string
          sku: string
          subtotal: number
          variant_id: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          gift_card_metadata?: Json | null
          id?: string
          image_url?: string | null
          is_gift_card?: boolean
          is_presale?: boolean | null
          order_id: string
          original_price?: number | null
          presale_expected_date?: string | null
          price_at_purchase: number
          product_id?: string | null
          product_name: string
          quantity: number
          quantity_discount_amount?: number | null
          size: string
          sku: string
          subtotal: number
          variant_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          gift_card_metadata?: Json | null
          id?: string
          image_url?: string | null
          is_gift_card?: boolean
          is_presale?: boolean | null
          order_id?: string
          original_price?: number | null
          presale_expected_date?: string | null
          price_at_purchase?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          quantity_discount_amount?: number | null
          size?: string
          sku?: string
          subtotal?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_paid_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants_with_total_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_ad_optimizer_signals"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          order_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          order_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_paid_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          abandoned_cart_email_sent: boolean | null
          admin_note: string | null
          admin_notes: string | null
          billing_address: Json
          carrier: string | null
          checkout_abandoned_at: string | null
          checkout_started_at: string | null
          created_at: string | null
          customer_note: string | null
          delivered_at: string | null
          delivery_method: string
          discount_amount: number | null
          email: string
          estimated_delivery_date: string | null
          gift_card_codes: string[] | null
          gift_card_discount: number
          gift_cards_issued_at: string | null
          has_returns: boolean | null
          id: string
          internal_notes: string | null
          ip_address: string | null
          is_digital_only: boolean
          label_url: string | null
          last_email_sent_at: string | null
          last_email_type: string | null
          locale: string | null
          loyalty_tier_discount: number | null
          notes: string | null
          paid_at: string | null
          payment_metadata: Json | null
          payment_method: string | null
          payment_status: string
          pickup_distance_km: number | null
          pickup_eligible: boolean | null
          pickup_location_address: string | null
          pickup_location_name: string | null
          promo_code: string | null
          return_deadline: string | null
          review_invitation_sent_at: string | null
          shipped_at: string | null
          shipping_address: Json
          shipping_cost: number | null
          status: string
          stock_decremented_at: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tax_amount: number | null
          total: number
          tracking_code: string | null
          tracking_url: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          abandoned_cart_email_sent?: boolean | null
          admin_note?: string | null
          admin_notes?: string | null
          billing_address: Json
          carrier?: string | null
          checkout_abandoned_at?: string | null
          checkout_started_at?: string | null
          created_at?: string | null
          customer_note?: string | null
          delivered_at?: string | null
          delivery_method?: string
          discount_amount?: number | null
          email: string
          estimated_delivery_date?: string | null
          gift_card_codes?: string[] | null
          gift_card_discount?: number
          gift_cards_issued_at?: string | null
          has_returns?: boolean | null
          id?: string
          internal_notes?: string | null
          ip_address?: string | null
          is_digital_only?: boolean
          label_url?: string | null
          last_email_sent_at?: string | null
          last_email_type?: string | null
          locale?: string | null
          loyalty_tier_discount?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_metadata?: Json | null
          payment_method?: string | null
          payment_status?: string
          pickup_distance_km?: number | null
          pickup_eligible?: boolean | null
          pickup_location_address?: string | null
          pickup_location_name?: string | null
          promo_code?: string | null
          return_deadline?: string | null
          review_invitation_sent_at?: string | null
          shipped_at?: string | null
          shipping_address: Json
          shipping_cost?: number | null
          status?: string
          stock_decremented_at?: string | null
          stripe_payment_intent_id?: string | null
          subtotal: number
          tax_amount?: number | null
          total: number
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          abandoned_cart_email_sent?: boolean | null
          admin_note?: string | null
          admin_notes?: string | null
          billing_address?: Json
          carrier?: string | null
          checkout_abandoned_at?: string | null
          checkout_started_at?: string | null
          created_at?: string | null
          customer_note?: string | null
          delivered_at?: string | null
          delivery_method?: string
          discount_amount?: number | null
          email?: string
          estimated_delivery_date?: string | null
          gift_card_codes?: string[] | null
          gift_card_discount?: number
          gift_cards_issued_at?: string | null
          has_returns?: boolean | null
          id?: string
          internal_notes?: string | null
          ip_address?: string | null
          is_digital_only?: boolean
          label_url?: string | null
          last_email_sent_at?: string | null
          last_email_type?: string | null
          locale?: string | null
          loyalty_tier_discount?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_metadata?: Json | null
          payment_method?: string | null
          payment_status?: string
          pickup_distance_km?: number | null
          pickup_eligible?: boolean | null
          pickup_location_address?: string | null
          pickup_location_name?: string | null
          promo_code?: string | null
          return_deadline?: string | null
          review_invitation_sent_at?: string | null
          shipped_at?: string | null
          shipping_address?: Json
          shipping_cost?: number | null
          status?: string
          stock_decremented_at?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          total?: number
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_active_views: {
        Row: {
          last_seen_at: string
          product_id: string
          session_id: string
        }
        Insert: {
          last_seen_at?: string
          product_id: string
          session_id: string
        }
        Update: {
          last_seen_at?: string
          product_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_active_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          color: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          media_type: string
          model_build: string | null
          model_build_en: string | null
          model_height: string | null
          model_name: string | null
          model_size_worn: string | null
          position: number | null
          product_id: string
          url: string
          variant_id: string | null
          video_duration: number | null
          video_thumbnail_url: string | null
        }
        Insert: {
          alt_text?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          media_type?: string
          model_build?: string | null
          model_build_en?: string | null
          model_height?: string | null
          model_name?: string | null
          model_size_worn?: string | null
          position?: number | null
          product_id: string
          url: string
          variant_id?: string | null
          video_duration?: number | null
          video_thumbnail_url?: string | null
        }
        Update: {
          alt_text?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          media_type?: string
          model_build?: string | null
          model_build_en?: string | null
          model_height?: string | null
          model_name?: string | null
          model_size_worn?: string | null
          position?: number | null
          product_id?: string
          url?: string
          variant_id?: string | null
          video_duration?: number | null
          video_thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants_with_total_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_ad_optimizer_signals"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      product_quantity_discounts: {
        Row: {
          created_at: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          min_quantity: number
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          min_quantity: number
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          min_quantity?: number
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_quantity_discounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_review_images: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean
          position: number
          review_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean
          position?: number
          review_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean
          position?: number
          review_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          order_id: string | null
          product_id: string
          rating: number
          reviewer_email: string
          reviewer_name: string
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          order_id?: string | null
          product_id: string
          rating: number
          reviewer_email: string
          reviewer_name: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          order_id?: string | null
          product_id?: string
          rating?: number
          reviewer_email?: string
          reviewer_name?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_paid_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string
          color_hex: string | null
          created_at: string | null
          display_order: number
          id: string
          is_available: boolean | null
          presale_enabled: boolean
          presale_expected_date: string | null
          presale_expected_date_en: string | null
          presale_stock_quantity: number
          price_adjustment: number | null
          product_id: string
          size: string
          sku: string
          stock_quantity: number | null
        }
        Insert: {
          color: string
          color_hex?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_available?: boolean | null
          presale_enabled?: boolean
          presale_expected_date?: string | null
          presale_expected_date_en?: string | null
          presale_stock_quantity?: number
          price_adjustment?: number | null
          product_id: string
          size: string
          sku: string
          stock_quantity?: number | null
        }
        Update: {
          color?: string
          color_hex?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_available?: boolean | null
          presale_enabled?: boolean
          presale_expected_date?: string | null
          presale_expected_date_en?: string | null
          presale_stock_quantity?: number
          price_adjustment?: number | null
          product_id?: string
          size?: string
          sku?: string
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allows_custom_amount: boolean
          base_price: number
          category_id: string | null
          created_at: string | null
          description: string | null
          description_en: string | null
          featured: boolean | null
          gift_card_default_validity_months: number | null
          gift_card_max_amount: number | null
          gift_card_min_amount: number | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_gift_card: boolean
          meta_description: string | null
          meta_title: string | null
          model_build: string | null
          model_build_en: string | null
          model_height: string | null
          model_name: string | null
          model_size_worn: string | null
          name: string
          name_en: string | null
          pdp_color_picker_style: string
          sale_price: number | null
          short_description_en: string | null
          size_guide_content: Json | null
          size_guide_content_en: Json | null
          slug: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          allows_custom_amount?: boolean
          base_price: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          description_en?: string | null
          featured?: boolean | null
          gift_card_default_validity_months?: number | null
          gift_card_max_amount?: number | null
          gift_card_min_amount?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_gift_card?: boolean
          meta_description?: string | null
          meta_title?: string | null
          model_build?: string | null
          model_build_en?: string | null
          model_height?: string | null
          model_name?: string | null
          model_size_worn?: string | null
          name: string
          name_en?: string | null
          pdp_color_picker_style?: string
          sale_price?: number | null
          short_description_en?: string | null
          size_guide_content?: Json | null
          size_guide_content_en?: Json | null
          slug: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          allows_custom_amount?: boolean
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          description_en?: string | null
          featured?: boolean | null
          gift_card_default_validity_months?: number | null
          gift_card_max_amount?: number | null
          gift_card_min_amount?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_gift_card?: boolean
          meta_description?: string | null
          meta_title?: string | null
          model_build?: string | null
          model_build_en?: string | null
          model_height?: string | null
          model_name?: string | null
          model_size_worn?: string | null
          name?: string
          name_en?: string | null
          pdp_color_picker_style?: string
          sale_price?: number | null
          short_description_en?: string | null
          size_guide_content?: Json | null
          size_guide_content_en?: Json | null
          slug?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_role: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_admin: boolean | null
          last_name: string | null
          last_order_at: string | null
          phone: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_role?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_admin?: boolean | null
          last_name?: string | null
          last_order_at?: string | null
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_role?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_name?: string | null
          last_order_at?: string | null
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          discount_amount: number
          id: string
          order_id: string | null
          order_total: number
          promo_code_id: string
          used_at: string
          user_id: string | null
        }
        Insert: {
          discount_amount: number
          id?: string
          order_id?: string | null
          order_total: number
          promo_code_id: string
          used_at?: string
          user_id?: string | null
        }
        Update: {
          discount_amount?: number
          id?: string
          order_id?: string | null
          order_total?: number
          promo_code_id?: string
          used_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_paid_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          min_order_value: number | null
          subscriber_id: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_value?: number | null
          subscriber_id?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_value?: number | null
          subscriber_id?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      return_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_status: string | null
          notes: string | null
          old_status: string | null
          return_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          return_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          return_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_status_history_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          admin_created_at: string | null
          admin_notes: string | null
          approved_at: string | null
          created_at: string | null
          created_by_admin_id: string | null
          customer_notes: string | null
          id: string
          label_generated_at: string | null
          label_mode: string | null
          label_paid_at: string | null
          label_payment_pending_at: string | null
          locale: string | null
          order_id: string
          received_at: string | null
          refund_amount: number | null
          refunded_at: string | null
          requested_at: string | null
          return_items: Json
          return_label_cost_excl_btw: number | null
          return_label_cost_incl_btw: number | null
          return_label_paid_at: string | null
          return_label_payment_intent_id: string | null
          return_label_payment_status: string | null
          return_label_url: string | null
          return_reason: string
          return_tracking_code: string | null
          return_tracking_url: string | null
          sendcloud_return_id: number | null
          shipped_at: string | null
          status: string
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          total_refund: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_created_at?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          created_at?: string | null
          created_by_admin_id?: string | null
          customer_notes?: string | null
          id?: string
          label_generated_at?: string | null
          label_mode?: string | null
          label_paid_at?: string | null
          label_payment_pending_at?: string | null
          locale?: string | null
          order_id: string
          received_at?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          requested_at?: string | null
          return_items: Json
          return_label_cost_excl_btw?: number | null
          return_label_cost_incl_btw?: number | null
          return_label_paid_at?: string | null
          return_label_payment_intent_id?: string | null
          return_label_payment_status?: string | null
          return_label_url?: string | null
          return_reason: string
          return_tracking_code?: string | null
          return_tracking_url?: string | null
          sendcloud_return_id?: number | null
          shipped_at?: string | null
          status?: string
          stripe_refund_id?: string | null
          stripe_refund_status?: string | null
          total_refund?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_created_at?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          created_at?: string | null
          created_by_admin_id?: string | null
          customer_notes?: string | null
          id?: string
          label_generated_at?: string | null
          label_mode?: string | null
          label_paid_at?: string | null
          label_payment_pending_at?: string | null
          locale?: string | null
          order_id?: string
          received_at?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          requested_at?: string | null
          return_items?: Json
          return_label_cost_excl_btw?: number | null
          return_label_cost_incl_btw?: number | null
          return_label_paid_at?: string | null
          return_label_payment_intent_id?: string | null
          return_label_payment_status?: string | null
          return_label_url?: string | null
          return_reason?: string
          return_tracking_code?: string | null
          return_tracking_url?: string | null
          sendcloud_return_id?: number | null
          shipped_at?: string | null
          status?: string
          stripe_refund_id?: string | null
          stripe_refund_status?: string | null
          total_refund?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_paid_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      review_votes: {
        Row: {
          created_at: string | null
          id: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_helpful?: boolean
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      stock_receipt_lines: {
        Row: {
          created_at: string
          id: string
          inventory_type: string
          quantity_added: number
          receipt_id: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_type: string
          quantity_added: number
          receipt_id: string
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_type?: string
          quantity_added?: number
          receipt_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipt_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants_with_total_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_ad_optimizer_signals"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      stock_receipts: {
        Row: {
          created_at: string
          created_by: string
          expected_total: number | null
          id: string
          notes: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expected_total?: number | null
          id?: string
          notes?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expected_total?: number | null
          id?: string
          notes?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          created_at: string | null
          device_type: string | null
          first_impression: string | null
          id: string
          locale: string | null
          page_url: string | null
          purchase_likelihood: string
          session_id: string
          user_agent: string | null
          what_needed: Json
          what_needed_other: string | null
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          first_impression?: string | null
          id?: string
          locale?: string | null
          page_url?: string | null
          purchase_likelihood: string
          session_id: string
          user_agent?: string | null
          what_needed?: Json
          what_needed_other?: string | null
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          first_impression?: string | null
          id?: string
          locale?: string | null
          page_url?: string | null
          purchase_likelihood?: string
          session_id?: string
          user_agent?: string | null
          what_needed?: Json
          what_needed_other?: string | null
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address: string
          city: string
          country: string
          created_at: string | null
          id: string
          is_default_billing: boolean | null
          is_default_shipping: boolean | null
          name: string
          phone: string | null
          postal_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          city: string
          country?: string
          created_at?: string | null
          id?: string
          is_default_billing?: boolean | null
          is_default_shipping?: boolean | null
          name: string
          phone?: string | null
          postal_code: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          city?: string
          country?: string
          created_at?: string | null
          id?: string
          is_default_billing?: boolean | null
          is_default_shipping?: boolean | null
          name?: string
          phone?: string | null
          postal_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants_with_total_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_ad_optimizer_signals"
            referencedColumns: ["variant_id"]
          },
        ]
      }
    }
    Views: {
      product_variants_with_total_stock: {
        Row: {
          color: string | null
          color_hex: string | null
          created_at: string | null
          display_order: number | null
          id: string | null
          is_available: boolean | null
          presale_enabled: boolean | null
          presale_expected_date: string | null
          presale_stock_quantity: number | null
          price_adjustment: number | null
          product_id: string | null
          size: string | null
          sku: string | null
          stock_quantity: number | null
          stock_status: string | null
          total_stock: number | null
        }
        Insert: {
          color?: string | null
          color_hex?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_available?: boolean | null
          presale_enabled?: boolean | null
          presale_expected_date?: string | null
          presale_stock_quantity?: number | null
          price_adjustment?: number | null
          product_id?: string | null
          size?: string | null
          sku?: string | null
          stock_quantity?: number | null
          stock_status?: never
          total_stock?: never
        }
        Update: {
          color?: string | null
          color_hex?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_available?: boolean | null
          presale_enabled?: boolean | null
          presale_expected_date?: string | null
          presale_stock_quantity?: number | null
          price_adjustment?: number | null
          product_id?: string | null
          size?: string | null
          sku?: string | null
          stock_quantity?: number | null
          stock_status?: never
          total_stock?: never
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ad_optimizer_signals: {
        Row: {
          base_price: number | null
          category_id: string | null
          category_name: string | null
          color: string | null
          contribution_margin_30d: number | null
          contribution_margin_per_unit: number | null
          cost_price: number | null
          current_stock: number | null
          effective_price: number | null
          gross_revenue_30d: number | null
          gross_revenue_7d: number | null
          gross_revenue_lifetime: number | null
          has_product_econ: boolean | null
          has_variant_econ: boolean | null
          orders_30d: number | null
          orders_7d: number | null
          pending_back_in_stock_signups: number | null
          product_active: boolean | null
          product_id: string | null
          product_name: string | null
          product_slug: string | null
          refund_value_30d: number | null
          refund_value_lifetime: number | null
          return_rate_30d: number | null
          returned_units_30d: number | null
          returned_units_lifetime: number | null
          sale_price: number | null
          shipping_cost_avg: number | null
          size: string | null
          sku: string | null
          total_back_in_stock_signups: number | null
          transaction_fee_pct: number | null
          units_sold_30d: number | null
          units_sold_7d: number | null
          units_sold_lifetime: number | null
          variant_available: boolean | null
          variant_id: string | null
          vat_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      v_paid_orders: {
        Row: {
          abandoned_cart_email_sent: boolean | null
          admin_note: string | null
          admin_notes: string | null
          billing_address: Json | null
          carrier: string | null
          checkout_abandoned_at: string | null
          checkout_duration_minutes: number | null
          checkout_started_at: string | null
          created_at: string | null
          customer_note: string | null
          delivered_at: string | null
          email: string | null
          estimated_delivery_date: string | null
          id: string | null
          internal_notes: string | null
          ip_address: string | null
          items_total: number | null
          label_url: string | null
          last_email_sent_at: string | null
          last_email_type: string | null
          notes: string | null
          paid_at: string | null
          payment_metadata: Json | null
          payment_method: string | null
          payment_status: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_cost: number | null
          status: string | null
          stripe_payment_intent_id: string | null
          subtotal: number | null
          tax_amount: number | null
          total: number | null
          tracking_code: string | null
          tracking_url: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          abandoned_cart_email_sent?: boolean | null
          admin_note?: string | null
          admin_notes?: string | null
          billing_address?: Json | null
          carrier?: string | null
          checkout_abandoned_at?: string | null
          checkout_duration_minutes?: never
          checkout_started_at?: string | null
          created_at?: string | null
          customer_note?: string | null
          delivered_at?: string | null
          email?: string | null
          estimated_delivery_date?: string | null
          id?: string | null
          internal_notes?: string | null
          ip_address?: string | null
          items_total?: never
          label_url?: string | null
          last_email_sent_at?: string | null
          last_email_type?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_metadata?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          abandoned_cart_email_sent?: boolean | null
          admin_note?: string | null
          admin_notes?: string | null
          billing_address?: Json | null
          carrier?: string | null
          checkout_abandoned_at?: string | null
          checkout_duration_minutes?: never
          checkout_started_at?: string | null
          created_at?: string | null
          customer_note?: string | null
          delivered_at?: string | null
          email?: string | null
          estimated_delivery_date?: string | null
          id?: string | null
          internal_notes?: string | null
          ip_address?: string | null
          items_total?: never
          label_url?: string | null
          last_email_sent_at?: string | null
          last_email_type?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_metadata?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _inventory_assert_admin: { Args: never; Returns: string }
      admin_search_orders_for_return: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          abandoned_cart_email_sent: boolean | null
          admin_note: string | null
          admin_notes: string | null
          billing_address: Json
          carrier: string | null
          checkout_abandoned_at: string | null
          checkout_started_at: string | null
          created_at: string | null
          customer_note: string | null
          delivered_at: string | null
          delivery_method: string
          discount_amount: number | null
          email: string
          estimated_delivery_date: string | null
          gift_card_codes: string[] | null
          gift_card_discount: number
          gift_cards_issued_at: string | null
          has_returns: boolean | null
          id: string
          internal_notes: string | null
          ip_address: string | null
          is_digital_only: boolean
          label_url: string | null
          last_email_sent_at: string | null
          last_email_type: string | null
          locale: string | null
          loyalty_tier_discount: number | null
          notes: string | null
          paid_at: string | null
          payment_metadata: Json | null
          payment_method: string | null
          payment_status: string
          pickup_distance_km: number | null
          pickup_eligible: boolean | null
          pickup_location_address: string | null
          pickup_location_name: string | null
          promo_code: string | null
          return_deadline: string | null
          review_invitation_sent_at: string | null
          shipped_at: string | null
          shipping_address: Json
          shipping_cost: number | null
          status: string
          stock_decremented_at: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tax_amount: number | null
          total: number
          tracking_code: string | null
          tracking_url: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      award_loyalty_points: {
        Args: {
          p_email: string
          p_order_id: string
          p_order_total: number
          p_user_id: string
        }
        Returns: Json
      }
      calculate_return_deadline: {
        Args: { order_date: string; return_days: number }
        Returns: string
      }
      check_stock_availability: {
        Args: { p_quantities: number[]; p_variant_ids: string[] }
        Returns: {
          available: boolean
          required_quantity: number
          stock_quantity: number
          variant_id: string
        }[]
      }
      cleanup_old_analytics_events: { Args: never; Returns: undefined }
      commit_gift_card_redemptions_for_order: {
        Args: { p_order_id: string }
        Returns: number
      }
      decrement_stock: {
        Args: { p_quantity: number; p_variant_id: string }
        Returns: undefined
      }
      get_abandoned_carts: {
        Args: { email_not_sent_only?: boolean; hours_threshold?: number }
        Returns: {
          abandoned_cart_email_sent: boolean
          checkout_started_at: string
          customer_email: string
          customer_name: string
          hours_since_abandonment: number
          order_id: string
          order_items: Json
          total: number
        }[]
      }
      get_active_marketing_campaign: {
        Args: never
        Returns: {
          auto_apply_via_url: boolean
          banner_cta_en: string | null
          banner_cta_nl: string | null
          banner_dismissable: boolean
          banner_enabled: boolean
          banner_link_url: string | null
          banner_message_en: string | null
          banner_message_nl: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_enabled: boolean
          name: string
          override_banner_color: boolean
          popup_body_en: string | null
          popup_body_nl: string | null
          popup_cta_en: string | null
          popup_cta_nl: string | null
          popup_delay_seconds: number
          popup_enabled: boolean
          popup_image_alt_en: string | null
          popup_image_alt_nl: string | null
          popup_image_url: string | null
          popup_scroll_pct: number
          popup_show_on_pages: string[]
          popup_title_en: string | null
          popup_title_nl: string | null
          popup_trigger: string
          priority: number
          promo_code_id: string | null
          show_code_in_banner: boolean
          show_code_in_popup: boolean
          slug: string
          starts_at: string | null
          theme_accent_color: string | null
          theme_color: string | null
          theme_text_color: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "marketing_campaigns"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_conversion_funnel: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          count: number
          percentage: number
          step: string
        }[]
      }
      get_instagram_display_data: { Args: never; Returns: Json }
      get_order_timeline: {
        Args: { order_uuid: string }
        Returns: {
          changed_by_email: string
          event_description: string
          event_time: string
          event_type: string
        }[]
      }
      get_product_activity: {
        Args: { p_product_id: string }
        Returns: {
          active_viewers: number
          sold_24h: number
        }[]
      }
      get_product_performance: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          add_to_cart_rate: number
          add_to_carts: number
          product_id: string
          product_name: string
          purchase_rate: number
          purchases: number
          revenue: number
          views: number
        }[]
      }
      get_revenue_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          average_order_value: number
          conversion_rate: number
          failed_payments_count: number
          paid_orders_count: number
          pending_payments_count: number
          total_revenue: number
        }[]
      }
      increment_promo_usage: {
        Args: { promo_code_value: string }
        Returns: undefined
      }
      increment_stock: {
        Args: { p_quantity: number; p_variant_id: string }
        Returns: undefined
      }
      increment_variant_stock: {
        Args: { quantity: number; variant_id: string }
        Returns: undefined
      }
      inventory_apply_presale_delta: {
        Args: {
          p_delta: number
          p_notes?: string
          p_reason: string
          p_receipt_id?: string
          p_variant_id: string
        }
        Returns: Json
      }
      inventory_apply_regular_delta: {
        Args: {
          p_delta: number
          p_notes?: string
          p_reason: string
          p_receipt_id?: string
          p_variant_id: string
        }
        Returns: Json
      }
      inventory_commit_receipt: {
        Args: {
          p_expected_total?: number
          p_lines: Json
          p_notes?: string
          p_title: string
        }
        Returns: Json
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { user_id: string }; Returns: boolean }
      lookup_order_for_tracking: {
        Args: { p_email: string; p_order_ref: string }
        Returns: {
          abandoned_cart_email_sent: boolean | null
          admin_note: string | null
          admin_notes: string | null
          billing_address: Json
          carrier: string | null
          checkout_abandoned_at: string | null
          checkout_started_at: string | null
          created_at: string | null
          customer_note: string | null
          delivered_at: string | null
          delivery_method: string
          discount_amount: number | null
          email: string
          estimated_delivery_date: string | null
          gift_card_codes: string[] | null
          gift_card_discount: number
          gift_cards_issued_at: string | null
          has_returns: boolean | null
          id: string
          internal_notes: string | null
          ip_address: string | null
          is_digital_only: boolean
          label_url: string | null
          last_email_sent_at: string | null
          last_email_type: string | null
          locale: string | null
          loyalty_tier_discount: number | null
          notes: string | null
          paid_at: string | null
          payment_metadata: Json | null
          payment_method: string | null
          payment_status: string
          pickup_distance_km: number | null
          pickup_eligible: boolean | null
          pickup_location_address: string | null
          pickup_location_name: string | null
          promo_code: string | null
          return_deadline: string | null
          review_invitation_sent_at: string | null
          shipped_at: string | null
          shipping_address: Json
          shipping_cost: number | null
          status: string
          stock_decremented_at: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tax_amount: number | null
          total: number
          tracking_code: string | null
          tracking_url: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mark_abandoned_cart_email_sent: {
        Args: { order_uuid: string }
        Returns: undefined
      }
      newsletter_recipients_not_yet_mailed: {
        Args: { p_limit: number; p_template_key: string }
        Returns: {
          email: string
          id: string
          locale: string
        }[]
      }
      reserve_gift_card_balance: {
        Args: { p_amount: number; p_card_id: string; p_order_id: string }
        Returns: string
      }
      reverse_gift_card_redemptions_for_order: {
        Args: { p_order_id: string }
        Returns: number
      }
      track_product_view: {
        Args: { p_product_id: string; p_session_id: string }
        Returns: undefined
      }
      track_promo_usage: {
        Args: {
          discount_amount_value: number
          order_id_value: string
          order_total_value: number
          promo_code_value: string
          user_id_value?: string
        }
        Returns: undefined
      }
      update_customer_stats: {
        Args: { p_email: string; p_order_date: string; p_order_total: number }
        Returns: undefined
      }
      update_order_status: {
        Args: {
          p_admin_user_id?: string
          p_new_status: string
          p_notes?: string
          p_order_id: string
        }
        Returns: undefined
      }
      upsert_customer_profile: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone: string
        }
        Returns: string
      }
    }
    Enums: {
      admin_role: "admin" | "manager" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_role: ["admin", "manager", "viewer"],
    },
  },
} as const
