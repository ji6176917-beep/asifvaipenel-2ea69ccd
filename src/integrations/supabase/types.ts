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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_credentials: {
        Row: {
          id: number
          password_hash: string
          updated_at: string
        }
        Insert: {
          id?: number
          password_hash: string
          updated_at?: string
        }
        Update: {
          id?: number
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_log: {
        Row: {
          action: string
          created_at: string
          detail: Json
          id: number
          ip: string | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json
          id?: number
          ip?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json
          id?: number
          ip?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      admin_login_attempts: {
        Row: {
          created_at: string
          id: number
          ip: string | null
          key: string
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: number
          ip?: string | null
          key: string
          success: boolean
        }
        Update: {
          created_at?: string
          id?: number
          ip?: string | null
          key?: string
          success?: boolean
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          ip: string | null
          last_seen: string
          revoked: boolean
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          ip?: string | null
          last_seen?: string
          revoked?: boolean
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          ip?: string | null
          last_seen?: string
          revoked?: boolean
          token_hash?: string
        }
        Relationships: []
      }
      api_requests: {
        Row: {
          action: string
          created_at: string
          id: number
          ip: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          ip?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          ip?: string | null
          user_id?: string
        }
        Relationships: []
      }
      broadcasts: {
        Row: {
          body: string
          button: string | null
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          id: string
          image: string | null
          kind: string
          link: string | null
          show_once: boolean
          target: string
          title: string
        }
        Insert: {
          body?: string
          button?: string | null
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          image?: string | null
          kind?: string
          link?: string | null
          show_once?: boolean
          target?: string
          title: string
        }
        Update: {
          body?: string
          button?: string | null
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          image?: string | null
          kind?: string
          link?: string | null
          show_once?: boolean
          target?: string
          title?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          deleted_at: string | null
          id: string
          manual_control: boolean
          name: string
          platform_id: string
          sort: number
          source_provider: string | null
        }
        Insert: {
          active?: boolean
          deleted_at?: string | null
          id?: string
          manual_control?: boolean
          name: string
          platform_id: string
          sort?: number
          source_provider?: string | null
        }
        Update: {
          active?: boolean
          deleted_at?: string | null
          id?: string
          manual_control?: boolean
          name?: string
          platform_id?: string
          sort?: number
          source_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_source_provider_fkey"
            columns: ["source_provider"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          admin_note: string | null
          amount: number
          bdt_amount: number | null
          bdt_rate: number | null
          code: string
          created_at: string
          deleted_at: string | null
          id: string
          idempotency_key: string
          method_id: string
          method_kind: Database["public"]["Enums"]["pm_kind"]
          method_name: string
          reviewed_at: string | null
          screenshot_path: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          txn_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bdt_amount?: number | null
          bdt_rate?: number | null
          code: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          idempotency_key: string
          method_id: string
          method_kind: Database["public"]["Enums"]["pm_kind"]
          method_name: string
          reviewed_at?: string | null
          screenshot_path?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          txn_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bdt_amount?: number | null
          bdt_rate?: number | null
          code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          idempotency_key?: string
          method_id?: string
          method_kind?: Database["public"]["Enums"]["pm_kind"]
          method_name?: string
          reviewed_at?: string | null
          screenshot_path?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          txn_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          icon_key: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          is_system: boolean
          label: Json
          location: Database["public"]["Enums"]["menu_location"]
          requires_login: boolean
          sort: number
          system_key: string | null
          target_type: Database["public"]["Enums"]["menu_target"]
          target_value: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          icon_key?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          label?: Json
          location: Database["public"]["Enums"]["menu_location"]
          requires_login?: boolean
          sort?: number
          system_key?: string | null
          target_type?: Database["public"]["Enums"]["menu_target"]
          target_value?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          icon_key?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          label?: Json
          location?: Database["public"]["Enums"]["menu_location"]
          requires_login?: boolean
          sort?: number
          system_key?: string | null
          target_type?: Database["public"]["Enums"]["menu_target"]
          target_value?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          broadcast_id: string | null
          button: string | null
          created_at: string
          expires_at: string | null
          id: string
          image: string | null
          kind: string
          link: string | null
          read_at: string | null
          show_once: boolean
          shown_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          broadcast_id?: string | null
          button?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          image?: string | null
          kind?: string
          link?: string | null
          read_at?: string | null
          show_once?: boolean
          shown_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          broadcast_id?: string | null
          button?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          image?: string | null
          kind?: string
          link?: string | null
          read_at?: string | null
          show_once?: boolean
          shown_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          action_by: string
          created_at: string
          delivered_qty: number | null
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          note: string | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
          refund: number
        }
        Insert: {
          action_by?: string
          created_at?: string
          delivered_qty?: number | null
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
          refund?: number
        }
        Update: {
          action_by?: string
          created_at?: string
          delivered_qty?: number | null
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
          refund?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string | null
          category_name: string
          charge: number
          created_at: string
          deleted_at: string | null
          delivered_qty: number | null
          dispatch_state: string
          id: string
          idempotency_key: string
          link: string
          order_code: string
          platform_name: string
          platform_slug: string
          provider_error: string | null
          provider_id: string | null
          provider_order_id: string | null
          provider_service_id: string | null
          quantity: number
          refunded: number
          service_id: string
          service_name: string
          source: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          category_name: string
          charge: number
          created_at?: string
          deleted_at?: string | null
          delivered_qty?: number | null
          dispatch_state?: string
          id?: string
          idempotency_key: string
          link: string
          order_code: string
          platform_name: string
          platform_slug: string
          provider_error?: string | null
          provider_id?: string | null
          provider_order_id?: string | null
          provider_service_id?: string | null
          quantity: number
          refunded?: number
          service_id: string
          service_name: string
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          category_name?: string
          charge?: number
          created_at?: string
          deleted_at?: string | null
          delivered_qty?: number | null
          dispatch_state?: string
          id?: string
          idempotency_key?: string
          link?: string
          order_code?: string
          platform_name?: string
          platform_slug?: string
          provider_error?: string | null
          provider_id?: string | null
          provider_order_id?: string | null
          provider_service_id?: string | null
          quantity?: number
          refunded?: number
          service_id?: string
          service_name?: string
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      page_versions: {
        Row: {
          content: Json
          created_at: string
          id: number
          slug: string
          title: Json
        }
        Insert: {
          content: Json
          created_at?: string
          id?: number
          slug: string
          title: Json
        }
        Update: {
          content?: Json
          created_at?: string
          id?: number
          slug?: string
          title?: Json
        }
        Relationships: []
      }
      pages: {
        Row: {
          active: boolean
          content: Json
          deleted_at: string | null
          is_custom: boolean
          show_in_footer: boolean
          slug: string
          title: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          content?: Json
          deleted_at?: string | null
          is_custom?: boolean
          show_in_footer?: boolean
          slug: string
          title?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: Json
          deleted_at?: string | null
          is_custom?: boolean
          show_in_footer?: boolean
          slug?: string
          title?: Json
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account: string
          account_type: string | null
          active: boolean
          deleted_at: string | null
          id: string
          instructions: string | null
          kind: Database["public"]["Enums"]["pm_kind"]
          logo_url: string | null
          max_amount: number
          min_amount: number
          name: string
          network: string | null
          sort: number
        }
        Insert: {
          account: string
          account_type?: string | null
          active?: boolean
          deleted_at?: string | null
          id?: string
          instructions?: string | null
          kind: Database["public"]["Enums"]["pm_kind"]
          logo_url?: string | null
          max_amount?: number
          min_amount?: number
          name: string
          network?: string | null
          sort?: number
        }
        Update: {
          account?: string
          account_type?: string | null
          active?: boolean
          deleted_at?: string | null
          id?: string
          instructions?: string | null
          kind?: Database["public"]["Enums"]["pm_kind"]
          logo_url?: string | null
          max_amount?: number
          min_amount?: number
          name?: string
          network?: string | null
          sort?: number
        }
        Relationships: []
      }
      platforms: {
        Row: {
          active: boolean
          deleted_at: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          sort: number
        }
        Insert: {
          active?: boolean
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          sort?: number
        }
        Update: {
          active?: boolean
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          api_enabled: boolean
          api_key: string | null
          api_key_created_at: string | null
          api_key_hash: string | null
          avatar_url: string | null
          balance: number
          ban_reason: string | null
          banned: boolean
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          language: string
          last_seen_at: string | null
          last_sign_in_at: string | null
          password_changed_at: string | null
          phone: string | null
          public_id: string
          sessions_revoked_at: string | null
          sign_in_method: string | null
          username: string
        }
        Insert: {
          accepted_terms_at?: string | null
          api_enabled?: boolean
          api_key?: string | null
          api_key_created_at?: string | null
          api_key_hash?: string | null
          avatar_url?: string | null
          balance?: number
          ban_reason?: string | null
          banned?: boolean
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id: string
          language?: string
          last_seen_at?: string | null
          last_sign_in_at?: string | null
          password_changed_at?: string | null
          phone?: string | null
          public_id: string
          sessions_revoked_at?: string | null
          sign_in_method?: string | null
          username: string
        }
        Update: {
          accepted_terms_at?: string | null
          api_enabled?: boolean
          api_key?: string | null
          api_key_created_at?: string | null
          api_key_hash?: string | null
          avatar_url?: string | null
          balance?: number
          ban_reason?: string | null
          banned?: boolean
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          language?: string
          last_seen_at?: string | null
          last_sign_in_at?: string | null
          password_changed_at?: string | null
          phone?: string | null
          public_id?: string
          sessions_revoked_at?: string | null
          sign_in_method?: string | null
          username?: string
        }
        Relationships: []
      }
      provider_sync_settings: {
        Row: {
          callback_secret: string
          callback_url: string
          id: number
        }
        Insert: {
          callback_secret: string
          callback_url: string
          id?: number
        }
        Update: {
          callback_secret?: string
          callback_url?: string
          id?: number
        }
        Relationships: []
      }
      qna: {
        Row: {
          active: boolean
          answer: Json
          created_at: string
          deleted_at: string | null
          home_sort: number
          id: string
          question: Json
          show_on_home: boolean
          sort: number
        }
        Insert: {
          active?: boolean
          answer?: Json
          created_at?: string
          deleted_at?: string | null
          home_sort?: number
          id?: string
          question?: Json
          show_on_home?: boolean
          sort?: number
        }
        Update: {
          active?: boolean
          answer?: Json
          created_at?: string
          deleted_at?: string | null
          home_sort?: number
          id?: string
          question?: Json
          show_on_home?: boolean
          sort?: number
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          active: boolean
          api_key: string
          api_url: string
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          last_synced_at: string | null
          link_parameter: string
          markup: number
          name: string
          usd_rate: number
        }
        Insert: {
          active?: boolean
          api_key: string
          api_url: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          last_synced_at?: string | null
          link_parameter?: string
          markup?: number
          name: string
          usd_rate?: number
        }
        Update: {
          active?: boolean
          api_key?: string
          api_url?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          last_synced_at?: string | null
          link_parameter?: string
          markup?: number
          name?: string
          usd_rate?: number
        }
        Relationships: []
      }
      service_snapshots: {
        Row: {
          created_at: string
          data: Json
          id: number
          label: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: number
          label: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: number
          label?: string
        }
        Relationships: []
      }
      service_source_settings: {
        Row: {
          api_enabled: boolean
          id: number
          own_enabled: boolean
        }
        Insert: {
          api_enabled?: boolean
          id: number
          own_enabled?: boolean
        }
        Update: {
          api_enabled?: boolean
          id?: number
          own_enabled?: boolean
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          avg_time: string
          category_id: string
          custom_name: boolean
          custom_rate: boolean
          deleted_at: string | null
          description: string | null
          id: string
          is_seed: boolean
          max_qty: number
          min_qty: number
          name: string
          price_mode: string | null
          price_value: number
          provider_available: boolean
          provider_id: string | null
          provider_order_supported: boolean
          provider_rate: number | null
          provider_service_id: string | null
          provider_type: string
          rate: number
          rate_per: number
          refill_info: string | null
          service_no: number | null
          sort: number
        }
        Insert: {
          active?: boolean
          avg_time?: string
          category_id: string
          custom_name?: boolean
          custom_rate?: boolean
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_seed?: boolean
          max_qty?: number
          min_qty?: number
          name: string
          price_mode?: string | null
          price_value?: number
          provider_available?: boolean
          provider_id?: string | null
          provider_order_supported?: boolean
          provider_rate?: number | null
          provider_service_id?: string | null
          provider_type?: string
          rate: number
          rate_per?: number
          refill_info?: string | null
          service_no?: number | null
          sort?: number
        }
        Update: {
          active?: boolean
          avg_time?: string
          category_id?: string
          custom_name?: boolean
          custom_rate?: boolean
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_seed?: boolean
          max_qty?: number
          min_qty?: number
          name?: string
          price_mode?: string | null
          price_value?: number
          provider_available?: boolean
          provider_id?: string | null
          provider_order_supported?: boolean
          provider_rate?: number | null
          provider_service_id?: string | null
          provider_type?: string
          rate?: number
          rate_per?: number
          refill_info?: string | null
          service_no?: number | null
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      sign_ins: {
        Row: {
          created_at: string
          device: string | null
          id: number
          ip: string | null
          method: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: number
          ip?: string | null
          method?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: number
          ip?: string | null
          method?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          allow_orders: boolean
          allow_signups: boolean
          announcement_color: string
          announcement_end: string | null
          announcement_link: string
          announcement_on: boolean
          announcement_start: string | null
          announcement_text: string | null
          api_allow_new_keys: boolean
          api_docs: string
          api_examples: string
          api_global_enabled: boolean
          api_instructions: string
          api_min_balance: number
          api_policy: string
          api_rate_per_min: number
          api_url: string
          bdt_rate: number
          blocked_email_domains: string
          content_version: number
          cookie_notice: boolean
          deposit_max: number
          deposit_min: number
          email: string | null
          favicon_url: string | null
          footer_copyright: string
          header_name: string | null
          hero_text: string
          hero_title: string
          home_config: Json
          id: number
          languages_config: Json
          last_backup_at: string | null
          logo_url: string | null
          maintenance_on: boolean
          maintenance_text: string
          music_enabled: boolean
          music_version: number
          popup_image: string | null
          popup_link: string
          popup_mode: string
          popup_on: boolean
          require_screenshot: boolean
          require_verified_email: boolean
          seo_description: string
          seo_title: string
          session_timeout_min: number
          share_image_url: string | null
          site_name: string
          support_hours: string
          tagline: string
          telegram: string | null
          theme_config: Json
          whatsapp: string | null
          whatsapp_float: boolean
        }
        Insert: {
          allow_orders?: boolean
          allow_signups?: boolean
          announcement_color?: string
          announcement_end?: string | null
          announcement_link?: string
          announcement_on?: boolean
          announcement_start?: string | null
          announcement_text?: string | null
          api_allow_new_keys?: boolean
          api_docs?: string
          api_examples?: string
          api_global_enabled?: boolean
          api_instructions?: string
          api_min_balance?: number
          api_policy?: string
          api_rate_per_min?: number
          api_url?: string
          bdt_rate?: number
          blocked_email_domains?: string
          content_version?: number
          cookie_notice?: boolean
          deposit_max?: number
          deposit_min?: number
          email?: string | null
          favicon_url?: string | null
          footer_copyright?: string
          header_name?: string | null
          hero_text?: string
          hero_title?: string
          home_config?: Json
          id?: number
          languages_config?: Json
          last_backup_at?: string | null
          logo_url?: string | null
          maintenance_on?: boolean
          maintenance_text?: string
          music_enabled?: boolean
          music_version?: number
          popup_image?: string | null
          popup_link?: string
          popup_mode?: string
          popup_on?: boolean
          require_screenshot?: boolean
          require_verified_email?: boolean
          seo_description?: string
          seo_title?: string
          session_timeout_min?: number
          share_image_url?: string | null
          site_name?: string
          support_hours?: string
          tagline?: string
          telegram?: string | null
          theme_config?: Json
          whatsapp?: string | null
          whatsapp_float?: boolean
        }
        Update: {
          allow_orders?: boolean
          allow_signups?: boolean
          announcement_color?: string
          announcement_end?: string | null
          announcement_link?: string
          announcement_on?: boolean
          announcement_start?: string | null
          announcement_text?: string | null
          api_allow_new_keys?: boolean
          api_docs?: string
          api_examples?: string
          api_global_enabled?: boolean
          api_instructions?: string
          api_min_balance?: number
          api_policy?: string
          api_rate_per_min?: number
          api_url?: string
          bdt_rate?: number
          blocked_email_domains?: string
          content_version?: number
          cookie_notice?: boolean
          deposit_max?: number
          deposit_min?: number
          email?: string | null
          favicon_url?: string | null
          footer_copyright?: string
          header_name?: string | null
          hero_text?: string
          hero_title?: string
          home_config?: Json
          id?: number
          languages_config?: Json
          last_backup_at?: string | null
          logo_url?: string | null
          maintenance_on?: boolean
          maintenance_text?: string
          music_enabled?: boolean
          music_version?: number
          popup_image?: string | null
          popup_link?: string
          popup_mode?: string
          popup_on?: boolean
          require_screenshot?: boolean
          require_verified_email?: boolean
          seo_description?: string
          seo_title?: string
          session_timeout_min?: number
          share_image_url?: string | null
          site_name?: string
          support_hours?: string
          tagline?: string
          telegram?: string | null
          theme_config?: Json
          whatsapp?: string | null
          whatsapp_float?: boolean
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          created_at: string
          day: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          day?: string
          visitor_id?: string
        }
        Relationships: []
      }
      songs: {
        Row: {
          active: boolean
          artist: string
          autoplay: boolean
          cover_path: string | null
          created_at: string
          deleted_at: string | null
          file_path: string
          id: string
          is_welcome: boolean
          loop: boolean
          show_for: string
          sort: number
          source_url: string | null
          title: string
          volume: number
        }
        Insert: {
          active?: boolean
          artist?: string
          autoplay?: boolean
          cover_path?: string | null
          created_at?: string
          deleted_at?: string | null
          file_path: string
          id?: string
          is_welcome?: boolean
          loop?: boolean
          show_for?: string
          sort?: number
          source_url?: string | null
          title: string
          volume?: number
        }
        Update: {
          active?: boolean
          artist?: string
          autoplay?: boolean
          cover_path?: string | null
          created_at?: string
          deleted_at?: string | null
          file_path?: string
          id?: string
          is_welcome?: boolean
          loop?: boolean
          show_for?: string
          sort?: number
          source_url?: string | null
          title?: string
          volume?: number
        }
        Relationships: []
      }
      telegram_config: {
        Row: {
          bot_token: string | null
          chat_id: string | null
          id: number
          on_deposit: boolean
          on_order: boolean
          on_user: boolean
        }
        Insert: {
          bot_token?: string | null
          chat_id?: string | null
          id?: number
          on_deposit?: boolean
          on_order?: boolean
          on_user?: boolean
        }
        Update: {
          bot_token?: string | null
          chat_id?: string | null
          id?: number
          on_deposit?: boolean
          on_order?: boolean
          on_user?: boolean
        }
        Relationships: []
      }
      telegram_log: {
        Row: {
          created_at: string
          event: string
          id: number
          request_id: number | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: number
          request_id?: number | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: number
          request_id?: number | null
        }
        Relationships: []
      }
      ui_icons: {
        Row: {
          icon_url: string | null
          key: string
          page_group: string
          updated_at: string
        }
        Insert: {
          icon_url?: string | null
          key: string
          page_group: string
          updated_at?: string
        }
        Update: {
          icon_url?: string | null
          key?: string
          page_group?: string
          updated_at?: string
        }
        Relationships: []
      }
      ui_labels: {
        Row: {
          default_text: string
          key: string
          page_group: string
          rich: boolean
          translations: Json
          updated_at: string
        }
        Insert: {
          default_text?: string
          key: string
          page_group: string
          rich?: boolean
          translations?: Json
          updated_at?: string
        }
        Update: {
          default_text?: string
          key?: string
          page_group?: string
          rich?: boolean
          translations?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: number
          kind: string
          ref: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: never
          kind: string
          ref?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: never
          kind?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance: {
        Args: { _amount: number; _note: string; _user: string }
        Returns: number
      }
      admin_reconcile_balances: {
        Args: never
        Returns: {
          balance: number
          diff: number
          ledger_sum: number
          user_id: string
          username: string
        }[]
      }
      admin_review_deposit: {
        Args: { _action: string; _deposit_id: string; _note: string }
        Returns: Json
      }
      admin_storage_usage: {
        Args: never
        Returns: {
          bucket: string
          bytes: number
          files: number
        }[]
      }
      admin_update_order_status: {
        Args: {
          _delivered: number
          _note: string
          _order_id: string
          _status: Database["public"]["Enums"]["order_status"]
        }
        Returns: Json
      }
      api_place_order: {
        Args: {
          _link: string
          _quantity: number
          _service_id: string
          _uid: string
        }
        Returns: Json
      }
      cancel_my_order: { Args: { _order_id: string }; Returns: undefined }
      create_deposit: {
        Args: {
          _amount: number
          _idem: string
          _method_id: string
          _screenshot: string
          _txn: string
        }
        Returns: Json
      }
      ensure_my_api_key: { Args: { _regenerate?: boolean }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_my_notifications: {
        Args: { _ids: string[]; _shown: boolean }
        Returns: undefined
      }
      place_order: {
        Args: {
          _idem: string
          _link: string
          _quantity: number
          _service_id: string
        }
        Returns: Json
      }
      service_source_enabled: { Args: { _provider: string }; Returns: boolean }
      set_my_avatar: { Args: { _path: string }; Returns: undefined }
      set_my_language: { Args: { _lang: string }; Returns: undefined }
      set_provider_markup: {
        Args: { _markup: number; _provider: string }
        Returns: undefined
      }
      sync_provider_catalog: {
        Args: { _provider: string; _rows: Json }
        Returns: number
      }
      tg_recent_results: {
        Args: never
        Returns: {
          created_at: string
          error: string
          event: string
          id: number
          status_code: number
        }[]
      }
      tg_send: {
        Args: { _event: string; _force?: boolean; _text: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      deposit_status: "pending" | "approved" | "rejected" | "cancelled"
      menu_location:
        | "three_dot_menu"
        | "bottom_bar"
        | "footer_links"
        | "footer_info"
        | "home_shortcuts"
      menu_target:
        | "internal_route"
        | "external_url"
        | "telegram"
        | "whatsapp"
        | "email"
        | "action"
      order_status:
        | "pending"
        | "processing"
        | "completed"
        | "partial"
        | "rejected"
        | "canceled"
      pm_kind: "binance" | "usdt" | "p2p"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
      deposit_status: ["pending", "approved", "rejected", "cancelled"],
      menu_location: [
        "three_dot_menu",
        "bottom_bar",
        "footer_links",
        "footer_info",
        "home_shortcuts",
      ],
      menu_target: [
        "internal_route",
        "external_url",
        "telegram",
        "whatsapp",
        "email",
        "action",
      ],
      order_status: [
        "pending",
        "processing",
        "completed",
        "partial",
        "rejected",
        "canceled",
      ],
      pm_kind: ["binance", "usdt", "p2p"],
    },
  },
} as const
