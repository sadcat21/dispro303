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
      accounting_session_items: {
        Row: {
          actual_amount: number
          created_at: string
          difference: number | null
          expected_amount: number
          id: string
          item_type: string
          notes: string | null
          session_id: string
        }
        Insert: {
          actual_amount?: number
          created_at?: string
          difference?: number | null
          expected_amount?: number
          id?: string
          item_type: string
          notes?: string | null
          session_id: string
        }
        Update: {
          actual_amount?: number
          created_at?: string
          difference?: number | null
          expected_amount?: number
          id?: string
          item_type?: string
          notes?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "accounting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_sessions: {
        Row: {
          branch_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          manager_id: string
          notes: string | null
          period_end: string
          period_start: string
          session_date: string
          status: string
          worker_id: string
        }
        Insert: {
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          manager_id: string
          notes?: string | null
          period_end: string
          period_start: string
          session_date?: string
          status?: string
          worker_id: string
        }
        Update: {
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          manager_id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          session_date?: string
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_sessions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_sessions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_sessions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_sessions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action_type: string
          branch_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          worker_id: string
        }
        Insert: {
          action_type: string
          branch_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          worker_id: string
        }
        Update: {
          action_type?: string
          branch_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          action_type: string
          branch_id: string | null
          created_at: string
          distance_meters: number | null
          id: string
          latitude: number | null
          longitude: number | null
          recorded_at: string
          worker_id: string
        }
        Insert: {
          action_type: string
          branch_id?: string | null
          created_at?: string
          distance_meters?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          recorded_at?: string
          worker_id: string
        }
        Update: {
          action_type?: string
          branch_id?: string | null
          created_at?: string
          distance_meters?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          recorded_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_pallets: {
        Row: {
          branch_id: string
          id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          id?: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_pallets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          admin_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          wilaya: string
        }
        Insert: {
          address?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          wilaya: string
        }
        Update: {
          address?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          wilaya?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_exchange_returns: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          received_by: string
          task_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          received_by: string
          task_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          received_by?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_exchange_returns_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_exchange_returns_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_exchange_returns_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "coin_exchange_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_exchange_tasks: {
        Row: {
          branch_id: string | null
          coin_amount: number
          completed_at: string | null
          created_at: string
          id: string
          manager_id: string
          notes: string | null
          remaining_amount: number | null
          returned_amount: number
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          branch_id?: string | null
          coin_amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          manager_id: string
          notes?: string | null
          remaining_amount?: number | null
          returned_amount?: number
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          branch_id?: string | null
          coin_amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          manager_id?: string
          notes?: string | null
          remaining_amount?: number | null
          returned_amount?: number
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_exchange_tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_exchange_tasks_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_exchange_tasks_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_exchange_tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_exchange_tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean | null
          joined_at: string
          last_read_at: string | null
          worker_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          worker_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string
          id: string
          last_message_at: string | null
          messages: Json
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          last_message_at?: string | null
          messages?: Json
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          last_message_at?: string | null
          messages?: Json
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description_ar: string | null
          id: string
          is_system: boolean | null
          name_ar: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          id?: string
          is_system?: boolean | null
          name_ar: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          id?: string
          is_system?: boolean | null
          name_ar?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_accounts: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          business_type: string | null
          created_at: string
          customer_id: string | null
          full_name: string
          id: string
          password_hash: string
          phone: string
          rejection_reason: string | null
          status: string
          store_name: string
          updated_at: string
          username: string
          wilaya: string | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_type?: string | null
          created_at?: string
          customer_id?: string | null
          full_name: string
          id?: string
          password_hash: string
          phone: string
          rejection_reason?: string | null
          status?: string
          store_name: string
          updated_at?: string
          username: string
          wilaya?: string | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_type?: string | null
          created_at?: string
          customer_id?: string | null
          full_name?: string
          id?: string
          password_hash?: string
          phone?: string
          rejection_reason?: string | null
          status?: string
          store_name?: string
          updated_at?: string
          username?: string
          wilaya?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_accounts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_approval_requests: {
        Row: {
          branch_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          operation_type: string
          payload: Json
          rejection_reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          operation_type: string
          payload: Json
          rejection_reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          operation_type?: string
          payload?: Json
          rejection_reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_approval_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_approval_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_approval_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_approval_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_approval_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_approval_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credits: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          credit_type: string
          customer_id: string
          id: string
          is_used: boolean
          notes: string | null
          order_id: string | null
          product_id: string | null
          product_quantity: number | null
          product_reason: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          used_at: string | null
          used_in_order_id: string | null
          worker_id: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          credit_type?: string
          customer_id: string
          id?: string
          is_used?: boolean
          notes?: string | null
          order_id?: string | null
          product_id?: string | null
          product_quantity?: number | null
          product_reason?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          used_at?: string | null
          used_in_order_id?: string | null
          worker_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          credit_type?: string
          customer_id?: string
          id?: string
          is_used?: boolean
          notes?: string | null
          order_id?: string | null
          product_id?: string | null
          product_quantity?: number | null
          product_reason?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          used_at?: string | null
          used_in_order_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_credits_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_used_in_order_id_fkey"
            columns: ["used_in_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_debts: {
        Row: {
          branch_id: string | null
          collection_amount: number | null
          collection_days: string[] | null
          collection_type: string | null
          created_at: string
          customer_id: string
          due_date: string | null
          id: string
          notes: string | null
          order_id: string | null
          paid_amount: number
          remaining_amount: number | null
          status: string
          total_amount: number
          updated_at: string
          worker_id: string
        }
        Insert: {
          branch_id?: string | null
          collection_amount?: number | null
          collection_days?: string[] | null
          collection_type?: string | null
          created_at?: string
          customer_id: string
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_amount?: number
          remaining_amount?: number | null
          status?: string
          total_amount?: number
          updated_at?: string
          worker_id: string
        }
        Update: {
          branch_id?: string | null
          collection_amount?: number | null
          collection_days?: string[] | null
          collection_type?: string | null
          created_at?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_amount?: number
          remaining_amount?: number | null
          status?: string
          total_amount?: number
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_debts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_debts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_debts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_debts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_debts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_special_prices: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          price_type: string
          product_id: string
          special_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          price_type?: string
          product_id: string
          special_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          price_type?: string
          product_id?: string
          special_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_special_prices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_special_prices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_special_prices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_special_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_type: string | null
          default_delivery_worker_id: string | null
          default_payment_type: string | null
          default_price_subtype: string | null
          id: string
          internal_name: string | null
          is_registered: boolean | null
          is_trusted: boolean | null
          latitude: number | null
          location_type: string | null
          longitude: number | null
          name: string
          name_fr: string | null
          pending_changes: Json | null
          phone: string | null
          sales_rep_name: string | null
          sales_rep_phone: string | null
          sector_id: string | null
          status: string
          store_name: string | null
          store_name_fr: string | null
          trust_notes: string | null
          updated_at: string
          wilaya: string | null
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_type?: string | null
          default_delivery_worker_id?: string | null
          default_payment_type?: string | null
          default_price_subtype?: string | null
          id?: string
          internal_name?: string | null
          is_registered?: boolean | null
          is_trusted?: boolean | null
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          name: string
          name_fr?: string | null
          pending_changes?: Json | null
          phone?: string | null
          sales_rep_name?: string | null
          sales_rep_phone?: string | null
          sector_id?: string | null
          status?: string
          store_name?: string | null
          store_name_fr?: string | null
          trust_notes?: string | null
          updated_at?: string
          wilaya?: string | null
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_type?: string | null
          default_delivery_worker_id?: string | null
          default_payment_type?: string | null
          default_price_subtype?: string | null
          id?: string
          internal_name?: string | null
          is_registered?: boolean | null
          is_trusted?: boolean | null
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          name?: string
          name_fr?: string | null
          pending_changes?: Json | null
          phone?: string | null
          sales_rep_name?: string | null
          sales_rep_phone?: string | null
          sector_id?: string | null
          status?: string
          store_name?: string | null
          store_name_fr?: string | null
          trust_notes?: string | null
          updated_at?: string
          wilaya?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_default_delivery_worker_id_fkey"
            columns: ["default_delivery_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_default_delivery_worker_id_fkey"
            columns: ["default_delivery_worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "sector_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_collections: {
        Row: {
          action: string
          amount_collected: number
          approved_at: string | null
          approved_by: string | null
          collection_date: string
          created_at: string
          debt_id: string
          id: string
          next_due_date: string | null
          notes: string | null
          payment_method: string | null
          rejection_reason: string | null
          status: string
          worker_id: string
        }
        Insert: {
          action?: string
          amount_collected?: number
          approved_at?: string | null
          approved_by?: string | null
          collection_date?: string
          created_at?: string
          debt_id: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          payment_method?: string | null
          rejection_reason?: string | null
          status?: string
          worker_id: string
        }
        Update: {
          action?: string
          amount_collected?: number
          approved_at?: string | null
          approved_by?: string | null
          collection_date?: string
          created_at?: string
          debt_id?: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          payment_method?: string | null
          rejection_reason?: string | null
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_collections_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_collections_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_collections_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "customer_debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_collections_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_collections_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          amount: number
          collected_at: string
          created_at: string
          debt_id: string
          id: string
          notes: string | null
          payment_method: string
          worker_id: string
        }
        Insert: {
          amount: number
          collected_at?: string
          created_at?: string
          debt_id: string
          id?: string
          notes?: string | null
          payment_method?: string
          worker_id: string
        }
        Update: {
          amount?: number
          collected_at?: string
          created_at?: string
          debt_id?: string
          id?: string
          notes?: string | null
          payment_method?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "customer_debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_route_sectors: {
        Row: {
          created_at: string
          id: string
          route_id: string
          sector_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          route_id: string
          sector_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          route_id?: string
          sector_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_route_sectors_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_route_sectors_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_routes: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      document_collections: {
        Row: {
          action: string
          approved_at: string | null
          approved_by: string | null
          collection_date: string
          created_at: string
          id: string
          next_due_date: string | null
          notes: string | null
          order_id: string
          rejection_reason: string | null
          status: string
          worker_id: string
        }
        Insert: {
          action?: string
          approved_at?: string | null
          approved_by?: string | null
          collection_date?: string
          created_at?: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          order_id: string
          rejection_reason?: string | null
          status?: string
          worker_id: string
        }
        Update: {
          action?: string
          approved_at?: string | null
          approved_by?: string | null
          collection_date?: string
          created_at?: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          order_id?: string
          rejection_reason?: string | null
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_collections_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_collections_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_collections_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_collections_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_collections_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_points_log: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          notes: string | null
          penalty_id: string | null
          point_date: string
          point_type: string
          points: number
          source_entity: string | null
          source_entity_id: string | null
          task_id: string | null
          worker_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          penalty_id?: string | null
          point_date?: string
          point_type?: string
          points?: number
          source_entity?: string | null
          source_entity_id?: string | null
          task_id?: string | null
          worker_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          penalty_id?: string | null
          point_date?: string
          point_type?: string
          points?: number
          source_entity?: string | null
          source_entity_id?: string | null
          task_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_points_log_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_points_log_penalty_id_fkey"
            columns: ["penalty_id"]
            isOneToOne: false
            referencedRelation: "reward_penalties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_points_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "reward_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_points_log_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_points_log_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          name_fr: string | null
          visible_to_roles: string[] | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          name_fr?: string | null
          visible_to_roles?: string[] | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          name_fr?: string | null
          visible_to_roles?: string[] | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category_id: string
          created_at: string | null
          description: string | null
          expense_date: string
          id: string
          payment_method: string | null
          receipt_url: string | null
          receipt_urls: string[] | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          worker_id: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category_id: string
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          receipt_urls?: string[] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          worker_id: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category_id?: string
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          receipt_urls?: string[] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_order_items: {
        Row: {
          created_at: string
          factory_order_id: string
          id: string
          notes: string | null
          pallet_quantity: number
          product_id: string
          product_quantity: number
        }
        Insert: {
          created_at?: string
          factory_order_id: string
          id?: string
          notes?: string | null
          pallet_quantity?: number
          product_id: string
          product_quantity?: number
        }
        Update: {
          created_at?: string
          factory_order_id?: string
          id?: string
          notes?: string | null
          pallet_quantity?: number
          product_id?: string
          product_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "factory_order_items_factory_order_id_fkey"
            columns: ["factory_order_id"]
            isOneToOne: false
            referencedRelation: "factory_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_orders: {
        Row: {
          branch_id: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_type: string
          pallet_count: number | null
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_type?: string
          pallet_count?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_type?: string
          pallet_count?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_items: {
        Row: {
          amount: number
          created_at: string
          customer_name: string | null
          handover_id: string
          id: string
          notes: string | null
          order_id: string | null
          payment_method: string
          treasury_entry_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_name?: string | null
          handover_id: string
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method: string
          treasury_entry_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_name?: string | null
          handover_id?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method?: string
          treasury_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handover_items_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "manager_handovers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handover_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handover_items_treasury_entry_id_fkey"
            columns: ["treasury_entry_id"]
            isOneToOne: false
            referencedRelation: "manager_treasury"
            referencedColumns: ["id"]
          },
        ]
      }
      loading_session_items: {
        Row: {
          created_at: string
          custom_load_note: string | null
          gift_quantity: number
          gift_unit: string | null
          id: string
          is_custom_load: boolean
          notes: string | null
          previous_quantity: number
          product_id: string
          quantity: number
          session_id: string
          surplus_quantity: number
        }
        Insert: {
          created_at?: string
          custom_load_note?: string | null
          gift_quantity?: number
          gift_unit?: string | null
          id?: string
          is_custom_load?: boolean
          notes?: string | null
          previous_quantity?: number
          product_id: string
          quantity?: number
          session_id: string
          surplus_quantity?: number
        }
        Update: {
          created_at?: string
          custom_load_note?: string | null
          gift_quantity?: number
          gift_unit?: string | null
          id?: string
          is_custom_load?: boolean
          notes?: string | null
          previous_quantity?: number
          product_id?: string
          quantity?: number
          session_id?: string
          surplus_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "loading_session_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loading_session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "loading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      loading_sessions: {
        Row: {
          branch_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          manager_id: string
          notes: string | null
          status: string
          unloading_details: Json | null
          worker_id: string
        }
        Insert: {
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          manager_id: string
          notes?: string | null
          status?: string
          unloading_details?: Json | null
          worker_id: string
        }
        Update: {
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          manager_id?: string
          notes?: string | null
          status?: string
          unloading_details?: Json | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loading_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loading_sessions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loading_sessions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loading_sessions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loading_sessions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_handovers: {
        Row: {
          amount: number
          bank_account_id: string | null
          bank_transfer_reference: string | null
          branch_id: string | null
          cash_invoice1: number
          cash_invoice2: number
          check_count: number | null
          checks_amount: number
          created_at: string
          delivery_method: string
          handover_date: string
          id: string
          intermediary_name: string | null
          manager_id: string
          notes: string | null
          payment_method: string
          receipt_count: number | null
          receipt_image_url: string | null
          receipts_amount: number
          received_by: string | null
          receiver_name: string | null
          stamp_amount: number
          transfer_count: number | null
          transfers_amount: number
          unified_cash: boolean
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          bank_transfer_reference?: string | null
          branch_id?: string | null
          cash_invoice1?: number
          cash_invoice2?: number
          check_count?: number | null
          checks_amount?: number
          created_at?: string
          delivery_method?: string
          handover_date?: string
          id?: string
          intermediary_name?: string | null
          manager_id: string
          notes?: string | null
          payment_method: string
          receipt_count?: number | null
          receipt_image_url?: string | null
          receipts_amount?: number
          received_by?: string | null
          receiver_name?: string | null
          stamp_amount?: number
          transfer_count?: number | null
          transfers_amount?: number
          unified_cash?: boolean
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          bank_transfer_reference?: string | null
          branch_id?: string | null
          cash_invoice1?: number
          cash_invoice2?: number
          check_count?: number | null
          checks_amount?: number
          created_at?: string
          delivery_method?: string
          handover_date?: string
          id?: string
          intermediary_name?: string | null
          manager_id?: string
          notes?: string | null
          payment_method?: string
          receipt_count?: number | null
          receipt_image_url?: string | null
          receipts_amount?: number
          received_by?: string | null
          receiver_name?: string | null
          stamp_amount?: number
          transfer_count?: number | null
          transfers_amount?: number
          unified_cash?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "manager_handovers_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_handovers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_handovers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_handovers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_handovers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_handovers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_treasury: {
        Row: {
          amount: number
          branch_id: string | null
          check_bank: string | null
          check_date: string | null
          check_number: string | null
          created_at: string
          customer_name: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          manager_id: string
          notes: string | null
          payment_method: string
          receipt_number: string | null
          session_id: string | null
          source_type: string
          transfer_reference: string | null
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          check_bank?: string | null
          check_date?: string | null
          check_number?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          manager_id: string
          notes?: string | null
          payment_method: string
          receipt_number?: string | null
          session_id?: string | null
          source_type?: string
          transfer_reference?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          check_bank?: string | null
          check_date?: string | null
          check_number?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          manager_id?: string
          notes?: string | null
          payment_method?: string
          receipt_number?: string | null
          session_id?: string | null
          source_type?: string
          transfer_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_treasury_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_treasury_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_treasury_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_treasury_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "accounting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_workers: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          manager_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          manager_id: string
          worker_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          manager_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_workers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_workers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_workers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_workers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_workers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_workers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_invoice_requests: {
        Row: {
          branch_id: string | null
          created_at: string
          customer_id: string
          id: string
          invoice_number: string | null
          notes: string | null
          payment_method: string | null
          products: Json
          received_at: string | null
          sent_at: string
          status: string
          whatsapp_contact: string | null
          worker_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_method?: string | null
          products?: Json
          received_at?: string | null
          sent_at?: string
          status?: string
          whatsapp_contact?: string | null
          worker_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_method?: string | null
          products?: Json
          received_at?: string | null
          sent_at?: string
          status?: string
          whatsapp_contact?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_invoice_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_invoice_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_invoice_requests_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_invoice_requests_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_bonus_summary: {
        Row: {
          bonus_amount: number | null
          branch_id: string | null
          capped_amount: number | null
          created_at: string
          id: string
          month: string
          penalty_points: number
          point_value: number | null
          reward_points: number
          status: string
          total_points: number
          updated_at: string
          worker_id: string
        }
        Insert: {
          bonus_amount?: number | null
          branch_id?: string | null
          capped_amount?: number | null
          created_at?: string
          id?: string
          month: string
          penalty_points?: number
          point_value?: number | null
          reward_points?: number
          status?: string
          total_points?: number
          updated_at?: string
          worker_id: string
        }
        Update: {
          bonus_amount?: number | null
          branch_id?: string | null
          capped_amount?: number | null
          created_at?: string
          id?: string
          month?: string
          penalty_points?: number
          point_value?: number | null
          reward_points?: number
          status?: string
          total_points?: number
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_bonus_summary_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_bonus_summary_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_bonus_summary_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      navbar_preferences: {
        Row: {
          created_at: string
          id: string
          tab_paths: string[]
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tab_paths?: string[]
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tab_paths?: string[]
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "navbar_preferences_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navbar_preferences_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          new_value: string | null
          old_value: string | null
          order_id: string
          performed_by: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_id: string
          performed_by?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          gift_offer_id: string | null
          gift_pieces: number
          gift_quantity: number
          id: string
          invoice_payment_method: string | null
          order_id: string
          payment_type: string | null
          pieces_per_box: number | null
          price_subtype: string | null
          pricing_unit: string | null
          product_id: string
          quantity: number
          total_price: number | null
          unit_price: number | null
          weight_per_box: number | null
        }
        Insert: {
          created_at?: string
          gift_offer_id?: string | null
          gift_pieces?: number
          gift_quantity?: number
          id?: string
          invoice_payment_method?: string | null
          order_id: string
          payment_type?: string | null
          pieces_per_box?: number | null
          price_subtype?: string | null
          pricing_unit?: string | null
          product_id: string
          quantity?: number
          total_price?: number | null
          unit_price?: number | null
          weight_per_box?: number | null
        }
        Update: {
          created_at?: string
          gift_offer_id?: string | null
          gift_pieces?: number
          gift_quantity?: number
          id?: string
          invoice_payment_method?: string | null
          order_id?: string
          payment_type?: string | null
          pieces_per_box?: number | null
          price_subtype?: string | null
          pricing_unit?: string | null
          product_id?: string
          quantity?: number
          total_price?: number | null
          unit_price?: number | null
          weight_per_box?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_gift_offer_id_fkey"
            columns: ["gift_offer_id"]
            isOneToOne: false
            referencedRelation: "product_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_worker_id: string | null
          branch_id: string | null
          check_due_date: string | null
          created_at: string
          created_by: string
          created_by_customer: string | null
          customer_id: string
          delivery_date: string | null
          doc_collection_days: string[] | null
          doc_collection_type: string | null
          doc_due_date: string | null
          document_status: string | null
          document_verification: Json | null
          id: string
          invoice_number: string | null
          invoice_payment_method: string | null
          invoice_received_at: string | null
          invoice_sent_at: string | null
          notes: string | null
          partial_amount: number | null
          payment_status: string | null
          payment_type: string | null
          postpone_count: number
          prepaid_amount: number | null
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          assigned_worker_id?: string | null
          branch_id?: string | null
          check_due_date?: string | null
          created_at?: string
          created_by: string
          created_by_customer?: string | null
          customer_id: string
          delivery_date?: string | null
          doc_collection_days?: string[] | null
          doc_collection_type?: string | null
          doc_due_date?: string | null
          document_status?: string | null
          document_verification?: Json | null
          id?: string
          invoice_number?: string | null
          invoice_payment_method?: string | null
          invoice_received_at?: string | null
          invoice_sent_at?: string | null
          notes?: string | null
          partial_amount?: number | null
          payment_status?: string | null
          payment_type?: string | null
          postpone_count?: number
          prepaid_amount?: number | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          assigned_worker_id?: string | null
          branch_id?: string | null
          check_due_date?: string | null
          created_at?: string
          created_by?: string
          created_by_customer?: string | null
          customer_id?: string
          delivery_date?: string | null
          doc_collection_days?: string[] | null
          doc_collection_type?: string | null
          doc_due_date?: string | null
          document_status?: string | null
          document_verification?: Json | null
          id?: string
          invoice_number?: string | null
          invoice_payment_method?: string | null
          invoice_received_at?: string | null
          invoice_sent_at?: string | null
          notes?: string | null
          partial_amount?: number | null
          payment_status?: string | null
          payment_type?: string | null
          postpone_count?: number
          prepaid_amount?: number | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_customer_fkey"
            columns: ["created_by_customer"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pallet_movements: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          quantity: number
          reference_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pallet_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      pallet_settings: {
        Row: {
          boxes_per_layer: number
          boxes_per_pallet: number
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          product_id: string | null
          updated_at: string
        }
        Insert: {
          boxes_per_layer?: number
          boxes_per_pallet?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          product_id?: string | null
          updated_at?: string
        }
        Update: {
          boxes_per_layer?: number
          boxes_per_pallet?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pallet_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          code: string
          created_at: string
          description_ar: string | null
          id: string
          name_ar: string
          resource: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description_ar?: string | null
          id?: string
          name_ar: string
          resource?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description_ar?: string | null
          id?: string
          name_ar?: string
          resource?: string | null
        }
        Relationships: []
      }
      pricing_groups: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      product_offer_tiers: {
        Row: {
          conditions: Json | null
          created_at: string
          discount_amount: number | null
          discount_percentage: number | null
          discount_prices: Json | null
          gift_product_id: string | null
          gift_quantity: number
          gift_quantity_unit: string | null
          gift_type: string
          id: string
          is_stackable: boolean
          max_quantity: number | null
          min_quantity: number
          min_quantity_unit: string | null
          offer_id: string
          tier_order: number
          worker_reward_amount: number | null
          worker_reward_type: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          discount_prices?: Json | null
          gift_product_id?: string | null
          gift_quantity?: number
          gift_quantity_unit?: string | null
          gift_type?: string
          id?: string
          is_stackable?: boolean
          max_quantity?: number | null
          min_quantity?: number
          min_quantity_unit?: string | null
          offer_id: string
          tier_order?: number
          worker_reward_amount?: number | null
          worker_reward_type?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          discount_prices?: Json | null
          gift_product_id?: string | null
          gift_quantity?: number
          gift_quantity_unit?: string | null
          gift_type?: string
          id?: string
          is_stackable?: boolean
          max_quantity?: number | null
          min_quantity?: number
          min_quantity_unit?: string | null
          offer_id?: string
          tier_order?: number
          worker_reward_amount?: number | null
          worker_reward_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_offer_tiers_gift_product_id_fkey"
            columns: ["gift_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_offer_tiers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "product_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_offers: {
        Row: {
          branch_id: string | null
          condition_type: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          discount_prices: Json | null
          end_date: string | null
          gift_product_id: string | null
          gift_quantity: number
          gift_quantity_unit: string | null
          gift_type: string
          id: string
          is_active: boolean
          is_auto_apply: boolean
          is_stackable: boolean
          max_quantity: number | null
          min_quantity: number
          min_quantity_unit: string | null
          name: string
          priority: number
          product_id: string
          start_date: string | null
          updated_at: string
          worker_reward_amount: number | null
          worker_reward_type: string | null
        }
        Insert: {
          branch_id?: string | null
          condition_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          discount_prices?: Json | null
          end_date?: string | null
          gift_product_id?: string | null
          gift_quantity?: number
          gift_quantity_unit?: string | null
          gift_type?: string
          id?: string
          is_active?: boolean
          is_auto_apply?: boolean
          is_stackable?: boolean
          max_quantity?: number | null
          min_quantity?: number
          min_quantity_unit?: string | null
          name: string
          priority?: number
          product_id: string
          start_date?: string | null
          updated_at?: string
          worker_reward_amount?: number | null
          worker_reward_type?: string | null
        }
        Update: {
          branch_id?: string | null
          condition_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          discount_prices?: Json | null
          end_date?: string | null
          gift_product_id?: string | null
          gift_quantity?: number
          gift_quantity_unit?: string | null
          gift_type?: string
          id?: string
          is_active?: boolean
          is_auto_apply?: boolean
          is_stackable?: boolean
          max_quantity?: number | null
          min_quantity?: number
          min_quantity_unit?: string | null
          name?: string
          priority?: number
          product_id?: string
          start_date?: string | null
          updated_at?: string
          worker_reward_amount?: number | null
          worker_reward_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_offers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_offers_gift_product_id_fkey"
            columns: ["gift_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_pricing_groups: {
        Row: {
          created_at: string
          group_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_pricing_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "pricing_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_shortage_tracking: {
        Row: {
          branch_id: string | null
          created_at: string
          customer_id: string
          id: string
          marked_by: string
          notes: string | null
          order_id: string | null
          product_id: string
          quantity_needed: number
          resolved_at: string | null
          status: string
          worker_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          marked_by: string
          notes?: string | null
          order_id?: string | null
          product_id: string
          quantity_needed?: number
          resolved_at?: string | null
          status?: string
          worker_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          marked_by?: string
          notes?: string | null
          order_id?: string | null
          product_id?: string
          quantity_needed?: number
          resolved_at?: string | null
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_shortage_tracking_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_shortage_tracking_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_shortage_tracking_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_shortage_tracking_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_shortage_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_shortage_tracking_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_shortage_tracking_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_shortage_tracking_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_unit_sale: boolean
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          pieces_per_box: number
          product_code: string | null
          price_gros: number | null
          price_invoice: number | null
          price_no_invoice: number | null
          price_retail: number | null
          price_super_gros: number | null
          pricing_unit: string
          sort_order: number | null
          weight_per_box: number | null
        }
        Insert: {
          allow_unit_sale?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          pieces_per_box?: number
          product_code?: string | null
          price_gros?: number | null
          price_invoice?: number | null
          price_no_invoice?: number | null
          price_retail?: number | null
          price_super_gros?: number | null
          pricing_unit?: string
          sort_order?: number | null
          weight_per_box?: number | null
        }
        Update: {
          allow_unit_sale?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          pieces_per_box?: number
          product_code?: string | null
          price_gros?: number | null
          price_invoice?: number | null
          price_no_invoice?: number | null
          price_retail?: number | null
          price_super_gros?: number | null
          pricing_unit?: string
          sort_order?: number | null
          weight_per_box?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_split_customers: {
        Row: {
          allocated_quantity: number
          created_at: string
          customer_id: string
          delivered_quantity: number
          gift_delivered: boolean
          gift_share: number
          id: string
          notes: string | null
          split_id: string
          updated_at: string
        }
        Insert: {
          allocated_quantity?: number
          created_at?: string
          customer_id: string
          delivered_quantity?: number
          gift_delivered?: boolean
          gift_share?: number
          id?: string
          notes?: string | null
          split_id: string
          updated_at?: string
        }
        Update: {
          allocated_quantity?: number
          created_at?: string
          customer_id?: string
          delivered_quantity?: number
          gift_delivered?: boolean
          gift_share?: number
          id?: string
          notes?: string | null
          split_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_split_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_split_customers_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "promo_splits"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_split_installments: {
        Row: {
          actual_quantity: number
          created_at: string
          id: string
          notes: string | null
          planned_quantity: number
          scheduled_date: string
          split_customer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_quantity?: number
          created_at?: string
          id?: string
          notes?: string | null
          planned_quantity?: number
          scheduled_date: string
          split_customer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_quantity?: number
          created_at?: string
          id?: string
          notes?: string | null
          planned_quantity?: number
          scheduled_date?: string
          split_customer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_split_installments_split_customer_id_fkey"
            columns: ["split_customer_id"]
            isOneToOne: false
            referencedRelation: "promo_split_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_splits: {
        Row: {
          adjusted_gift_quantity: number | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          gift_product_id: string | null
          gift_quantity: number
          gift_quantity_unit: string
          id: string
          name: string
          notes: string | null
          offer_id: string | null
          product_id: string
          split_type: string
          status: string
          target_quantity: number
          target_quantity_unit: string
          updated_at: string
        }
        Insert: {
          adjusted_gift_quantity?: number | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          gift_product_id?: string | null
          gift_quantity?: number
          gift_quantity_unit?: string
          id?: string
          name: string
          notes?: string | null
          offer_id?: string | null
          product_id: string
          split_type?: string
          status?: string
          target_quantity?: number
          target_quantity_unit?: string
          updated_at?: string
        }
        Update: {
          adjusted_gift_quantity?: number | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          gift_product_id?: string | null
          gift_quantity?: number
          gift_quantity_unit?: string
          id?: string
          name?: string
          notes?: string | null
          offer_id?: string | null
          product_id?: string
          split_type?: string
          status?: string
          target_quantity?: number
          target_quantity_unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_splits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_splits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_splits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_splits_gift_product_id_fkey"
            columns: ["gift_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_splits_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "product_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_splits_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      promos: {
        Row: {
          bonus_amount: number | null
          created_at: string
          customer_id: string
          gift_quantity_unit: string
          gratuite_quantity: number
          has_bonus: boolean | null
          id: string
          notes: string | null
          offer_detail: string | null
          offer_id: string | null
          offer_tier_id: string | null
          product_id: string
          promo_date: string
          vente_quantity: number
          worker_id: string
        }
        Insert: {
          bonus_amount?: number | null
          created_at?: string
          customer_id: string
          gift_quantity_unit?: string
          gratuite_quantity?: number
          has_bonus?: boolean | null
          id?: string
          notes?: string | null
          offer_detail?: string | null
          offer_id?: string | null
          offer_tier_id?: string | null
          product_id: string
          promo_date?: string
          vente_quantity: number
          worker_id: string
        }
        Update: {
          bonus_amount?: number | null
          created_at?: string
          customer_id?: string
          gift_quantity_unit?: string
          gratuite_quantity?: number
          has_bonus?: boolean | null
          id?: string
          notes?: string | null
          offer_detail?: string | null
          offer_id?: string | null
          offer_tier_id?: string | null
          product_id?: string
          promo_date?: string
          vente_quantity?: number
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promos_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promos_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "product_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promos_offer_tier_id_fkey"
            columns: ["offer_tier_id"]
            isOneToOne: false
            referencedRelation: "product_offer_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promos_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promos_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      quantity_price_tiers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          max_quantity: number | null
          min_quantity: number
          notes: string | null
          price_type: string
          product_id: string
          tier_price: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          max_quantity?: number | null
          min_quantity: number
          notes?: string | null
          price_type?: string
          product_id: string
          tier_price: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          max_quantity?: number | null
          min_quantity?: number
          notes?: string | null
          price_type?: string
          product_id?: string
          tier_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quantity_price_tiers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quantity_price_tiers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quantity_price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_modifications: {
        Row: {
          changes_summary: string | null
          created_at: string
          id: string
          is_reviewed: boolean
          modification_type: string
          modified_by: string
          modified_data: Json
          original_data: Json
          receipt_id: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          changes_summary?: string | null
          created_at?: string
          id?: string
          is_reviewed?: boolean
          modification_type?: string
          modified_by: string
          modified_data: Json
          original_data: Json
          receipt_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          changes_summary?: string | null
          created_at?: string
          id?: string
          is_reviewed?: boolean
          modification_type?: string
          modified_by?: string
          modified_data?: Json
          original_data?: Json
          receipt_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_modifications_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_modifications_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_modifications_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_modifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_modifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          branch_id: string | null
          created_at: string
          customer_id: string
          customer_name: string
          customer_phone: string | null
          debt_id: string | null
          discount_amount: number
          id: string
          is_modified: boolean
          items: Json
          last_printed_at: string | null
          notes: string | null
          order_id: string | null
          original_data: Json | null
          paid_amount: number
          payment_method: string | null
          print_count: number
          receipt_number: number
          receipt_type: string
          remaining_amount: number
          total_amount: number
          updated_at: string
          worker_id: string
          worker_name: string
          worker_phone: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          customer_id: string
          customer_name: string
          customer_phone?: string | null
          debt_id?: string | null
          discount_amount?: number
          id?: string
          is_modified?: boolean
          items?: Json
          last_printed_at?: string | null
          notes?: string | null
          order_id?: string | null
          original_data?: Json | null
          paid_amount?: number
          payment_method?: string | null
          print_count?: number
          receipt_number?: number
          receipt_type?: string
          remaining_amount?: number
          total_amount?: number
          updated_at?: string
          worker_id: string
          worker_name: string
          worker_phone?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string
          customer_phone?: string | null
          debt_id?: string | null
          discount_amount?: number
          id?: string
          is_modified?: boolean
          items?: Json
          last_printed_at?: string | null
          notes?: string | null
          order_id?: string | null
          original_data?: Json | null
          paid_amount?: number
          payment_method?: string | null
          print_count?: number
          receipt_number?: number
          receipt_type?: string
          remaining_amount?: number
          total_amount?: number
          updated_at?: string
          worker_id?: string
          worker_name?: string
          worker_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "customer_debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_config: {
        Row: {
          auto_percentage: number
          branch_id: string | null
          competition_percentage: number
          created_at: string
          id: string
          is_active: boolean
          minimum_threshold: number
          monthly_budget: number
          point_value: number
          reserve_percentage: number
          top1_bonus_pct: number
          top2_bonus_pct: number
          top3_bonus_pct: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_percentage?: number
          branch_id?: string | null
          competition_percentage?: number
          created_at?: string
          id?: string
          is_active?: boolean
          minimum_threshold?: number
          monthly_budget?: number
          point_value?: number
          reserve_percentage?: number
          top1_bonus_pct?: number
          top2_bonus_pct?: number
          top3_bonus_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_percentage?: number
          branch_id?: string | null
          competition_percentage?: number
          created_at?: string
          id?: string
          is_active?: boolean
          minimum_threshold?: number
          monthly_budget?: number
          point_value?: number
          reserve_percentage?: number
          top1_bonus_pct?: number
          top2_bonus_pct?: number
          top3_bonus_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_disputes: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          points_log_id: string
          reason: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          worker_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          points_log_id: string
          reason: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          worker_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          points_log_id?: string
          reason?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_disputes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_disputes_points_log_id_fkey"
            columns: ["points_log_id"]
            isOneToOne: false
            referencedRelation: "employee_points_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_disputes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_disputes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_disputes_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_disputes_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_notifications: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          notification_type: string
          related_entity_id: string | null
          target_worker_id: string
          title: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type: string
          related_entity_id?: string | null
          target_worker_id: string
          title: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type?: string
          related_entity_id?: string | null
          target_worker_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_notifications_target_worker_id_fkey"
            columns: ["target_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_notifications_target_worker_id_fkey"
            columns: ["target_worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_penalties: {
        Row: {
          applicable_roles: string[] | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_automatic: boolean
          name: string
          name_fr: string | null
          penalty_points: number
          trigger_event: string | null
        }
        Insert: {
          applicable_roles?: string[] | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_automatic?: boolean
          name: string
          name_fr?: string | null
          penalty_points?: number
          trigger_event?: string | null
        }
        Update: {
          applicable_roles?: string[] | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_automatic?: boolean
          name?: string
          name_fr?: string | null
          penalty_points?: number
          trigger_event?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_penalties_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_penalties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_penalties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_reserve_fund: {
        Row: {
          branch_id: string | null
          carried_balance: number
          created_at: string
          id: string
          month: string
          notes: string | null
          surplus_added: number
          updated_at: string
          used_amount: number
        }
        Insert: {
          branch_id?: string | null
          carried_balance?: number
          created_at?: string
          id?: string
          month: string
          notes?: string | null
          surplus_added?: number
          updated_at?: string
          used_amount?: number
        }
        Update: {
          branch_id?: string | null
          carried_balance?: number
          created_at?: string
          id?: string
          month?: string
          notes?: string | null
          surplus_added?: number
          updated_at?: string
          used_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "reward_reserve_fund_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_tasks: {
        Row: {
          applicable_roles: string[] | null
          branch_id: string | null
          category: string
          condition_logic: Json
          created_at: string
          created_by: string | null
          data_source: string
          frequency: string
          id: string
          is_active: boolean
          is_cumulative: boolean
          name: string
          name_fr: string | null
          penalty_points: number
          reward_points: number
          updated_at: string
        }
        Insert: {
          applicable_roles?: string[] | null
          branch_id?: string | null
          category?: string
          condition_logic?: Json
          created_at?: string
          created_by?: string | null
          data_source?: string
          frequency?: string
          id?: string
          is_active?: boolean
          is_cumulative?: boolean
          name: string
          name_fr?: string | null
          penalty_points?: number
          reward_points?: number
          updated_at?: string
        }
        Update: {
          applicable_roles?: string[] | null
          branch_id?: string | null
          category?: string
          condition_logic?: Json
          created_at?: string
          created_by?: string | null
          data_source?: string
          frequency?: string
          id?: string
          is_active?: boolean
          is_cumulative?: boolean
          name?: string
          name_fr?: string | null
          penalty_points?: number
          reward_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_coverage: {
        Row: {
          absent_worker_id: string
          branch_id: string | null
          coverage_mode: string
          coverage_type: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          is_active: boolean
          reason: string | null
          schedule_type: string
          sector_id: string
          start_date: string
          substitute_worker_id: string
          updated_at: string
        }
        Insert: {
          absent_worker_id: string
          branch_id?: string | null
          coverage_mode?: string
          coverage_type?: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          reason?: string | null
          schedule_type?: string
          sector_id: string
          start_date: string
          substitute_worker_id: string
          updated_at?: string
        }
        Update: {
          absent_worker_id?: string
          branch_id?: string | null
          coverage_mode?: string
          coverage_type?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          schedule_type?: string
          sector_id?: string
          start_date?: string
          substitute_worker_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_coverage_absent_worker_id_fkey"
            columns: ["absent_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_coverage_absent_worker_id_fkey"
            columns: ["absent_worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_coverage_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_coverage_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_coverage_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_coverage_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_coverage_substitute_worker_id_fkey"
            columns: ["substitute_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_coverage_substitute_worker_id_fkey"
            columns: ["substitute_worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_schedule_overrides: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_permanent: boolean
          new_day: string
          original_day: string
          sector_id: string
          week_start: string
          worker_id: string
          worker_type: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_permanent?: boolean
          new_day: string
          original_day: string
          sector_id: string
          week_start: string
          worker_id: string
          worker_type: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_permanent?: boolean
          new_day?: string
          original_day?: string
          sector_id?: string
          week_start?: string
          worker_id?: string
          worker_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_schedule_overrides_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_schedule_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_schedule_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_schedule_overrides_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_schedule_overrides_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_schedule_overrides_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_schedules: {
        Row: {
          created_at: string
          day: string
          id: string
          schedule_type: string
          sector_id: string
          worker_id: string | null
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          schedule_type: string
          sector_id: string
          worker_id?: string | null
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          schedule_type?: string
          sector_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sector_schedules_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_schedules_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_schedules_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_zones: {
        Row: {
          created_at: string
          id: string
          name: string
          name_fr: string | null
          sector_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_fr?: string | null
          sector_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_fr?: string | null
          sector_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_zones_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          delivery_worker_id: string | null
          id: string
          name: string
          name_fr: string | null
          sales_worker_id: string | null
          sector_type: string
          updated_at: string
          visit_day_delivery: string | null
          visit_day_sales: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_worker_id?: string | null
          id?: string
          name: string
          name_fr?: string | null
          sales_worker_id?: string | null
          sector_type?: string
          updated_at?: string
          visit_day_delivery?: string | null
          visit_day_sales?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_worker_id?: string | null
          id?: string
          name?: string
          name_fr?: string | null
          sales_worker_id?: string | null
          sector_type?: string
          updated_at?: string
          visit_day_delivery?: string | null
          visit_day_sales?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sectors_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_delivery_worker_id_fkey"
            columns: ["delivery_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_delivery_worker_id_fkey"
            columns: ["delivery_worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_sales_worker_id_fkey"
            columns: ["sales_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_sales_worker_id_fkey"
            columns: ["sales_worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      stamp_price_tiers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number
          notes: string | null
          percentage: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount: number
          notes?: string | null
          percentage?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number
          notes?: string | null
          percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "stamp_price_tiers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stamp_price_tiers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          min_quantity: number
          product_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_quantity?: number
          product_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_quantity?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_discrepancies: {
        Row: {
          accounting_session_id: string | null
          branch_id: string | null
          created_at: string
          discrepancy_type: string
          id: string
          notes: string | null
          price_per_unit: number | null
          pricing_method: string | null
          product_id: string
          quantity: number
          remaining_quantity: number
          resolved_at: string | null
          resolved_by: string | null
          source_session_id: string | null
          status: string
          total_value: number | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          accounting_session_id?: string | null
          branch_id?: string | null
          created_at?: string
          discrepancy_type: string
          id?: string
          notes?: string | null
          price_per_unit?: number | null
          pricing_method?: string | null
          product_id: string
          quantity?: number
          remaining_quantity?: number
          resolved_at?: string | null
          resolved_by?: string | null
          source_session_id?: string | null
          status?: string
          total_value?: number | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          accounting_session_id?: string | null
          branch_id?: string | null
          created_at?: string
          discrepancy_type?: string
          id?: string
          notes?: string | null
          price_per_unit?: number | null
          pricing_method?: string | null
          product_id?: string
          quantity?: number
          remaining_quantity?: number
          resolved_at?: string | null
          resolved_by?: string | null
          source_session_id?: string | null
          status?: string
          total_value?: number | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          created_by: string
          id: string
          movement_type: string
          notes: string | null
          order_id: string | null
          product_id: string
          quantity: number
          receipt_id: string | null
          return_reason: string | null
          status: string
          worker_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          movement_type: string
          notes?: string | null
          order_id?: string | null
          product_id: string
          quantity: number
          receipt_id?: string | null
          return_reason?: string | null
          status?: string
          worker_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          movement_type?: string
          notes?: string | null
          order_id?: string | null
          product_id?: string
          quantity?: number
          receipt_id?: string | null
          return_reason?: string | null
          status?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipt_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          pallet_quantity: number
          product_id: string
          quantity: number
          receipt_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          pallet_quantity?: number
          product_id: string
          quantity: number
          receipt_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          pallet_quantity?: number
          product_id?: string
          quantity?: number
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          created_by: string
          id: string
          invoice_number: string | null
          invoice_photo_url: string | null
          notes: string | null
          receipt_date: string
          status: string
          total_items: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          invoice_number?: string | null
          invoice_photo_url?: string | null
          notes?: string | null
          receipt_date?: string
          status?: string
          total_items?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invoice_number?: string | null
          invoice_photo_url?: string | null
          notes?: string | null
          receipt_date?: string
          status?: string
          total_items?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_workers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          supervisor_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          supervisor_id: string
          worker_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          supervisor_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_workers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_workers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_workers_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_workers_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_workers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_workers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          branch_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_bank_accounts: {
        Row: {
          account_holder: string
          account_number: string
          bank_name: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          account_holder: string
          account_number: string
          bank_name: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
        }
        Update: {
          account_holder?: string
          account_number?: string
          bank_name?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "treasury_bank_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_bank_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_bank_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_contacts: {
        Row: {
          branch_id: string | null
          contact_type: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          name_fr: string | null
          phone: string | null
        }
        Insert: {
          branch_id?: string | null
          contact_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_fr?: string | null
          phone?: string | null
        }
        Update: {
          branch_id?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_fr?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treasury_contacts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          worker_id: string | null
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          worker_id?: string | null
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_checklist_items: {
        Row: {
          branch_id: string | null
          company_info_template: string | null
          created_at: string
          created_by: string | null
          document_type: string
          field_type: string
          group_title: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
          uses_company_info: boolean
        }
        Insert: {
          branch_id?: string | null
          company_info_template?: string | null
          created_at?: string
          created_by?: string | null
          document_type: string
          field_type?: string
          group_title: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          uses_company_info?: boolean
        }
        Update: {
          branch_id?: string | null
          company_info_template?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string
          field_type?: string
          group_title?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          uses_company_info?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "verification_checklist_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_checklist_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_checklist_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_tracking: {
        Row: {
          accuracy: number | null
          address: string | null
          branch_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          operation_id: string | null
          operation_type: string
          worker_id: string
        }
        Insert: {
          accuracy?: number | null
          address?: string | null
          branch_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          operation_id?: string | null
          operation_type: string
          worker_id: string
        }
        Update: {
          accuracy?: number | null
          address?: string | null
          branch_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          operation_id?: string | null
          operation_type?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_tracking_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_tracking_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_tracking_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_tracking_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_review_items: {
        Row: {
          actual_quantity: number
          created_at: string
          difference: number | null
          expected_quantity: number
          id: string
          item_type: string
          notes: string | null
          product_id: string | null
          session_id: string
          status: string
        }
        Insert: {
          actual_quantity?: number
          created_at?: string
          difference?: number | null
          expected_quantity?: number
          id?: string
          item_type?: string
          notes?: string | null
          product_id?: string | null
          session_id: string
          status?: string
        }
        Update: {
          actual_quantity?: number
          created_at?: string
          difference?: number | null
          expected_quantity?: number
          id?: string
          item_type?: string
          notes?: string | null
          product_id?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_review_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_review_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "warehouse_review_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_review_sessions: {
        Row: {
          branch_id: string
          completed_at: string | null
          created_at: string
          id: string
          include_damaged: boolean | null
          include_pallets: boolean | null
          notes: string | null
          reviewer_id: string
          status: string
          total_discrepancies: number | null
          total_products: number | null
        }
        Insert: {
          branch_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          include_damaged?: boolean | null
          include_pallets?: boolean | null
          notes?: string | null
          reviewer_id: string
          status?: string
          total_discrepancies?: number | null
          total_products?: number | null
        }
        Update: {
          branch_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          include_damaged?: boolean | null
          include_pallets?: boolean | null
          notes?: string | null
          reviewer_id?: string
          status?: string
          total_discrepancies?: number | null
          total_products?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_review_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_review_sessions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_review_sessions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_stock: {
        Row: {
          branch_id: string
          compensation_quantity: number
          damaged_quantity: number
          factory_return_quantity: number
          id: string
          pallet_quantity: number
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          compensation_quantity?: number
          damaged_quantity?: number
          factory_return_quantity?: number
          id?: string
          pallet_quantity?: number
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          compensation_quantity?: number
          damaged_quantity?: number
          factory_return_quantity?: number
          id?: string
          pallet_quantity?: number
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_attendance: {
        Row: {
          attendance_date: string
          branch_id: string | null
          clock_in_at: string | null
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_out_at: string | null
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          attendance_date?: string
          branch_id?: string | null
          clock_in_at?: string | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_out_at?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          attendance_date?: string
          branch_id?: string | null
          clock_in_at?: string | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_out_at?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_attendance_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_attendance_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_attendance_locations: {
        Row: {
          created_at: string
          id: string
          label: string | null
          latitude: number
          longitude: number
          max_distance_meters: number
          set_by: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          latitude: number
          longitude: number
          max_distance_meters?: number
          set_by?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          latitude?: number
          longitude?: number
          max_distance_meters?: number
          set_by?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_attendance_locations_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_attendance_locations_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_attendance_locations_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_attendance_locations_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_debt_payments: {
        Row: {
          amount: number
          collected_by: string
          created_at: string
          id: string
          notes: string | null
          payment_method: string
          worker_debt_id: string
        }
        Insert: {
          amount: number
          collected_by: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          worker_debt_id: string
        }
        Update: {
          amount?: number
          collected_by?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          worker_debt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_debt_payments_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_debt_payments_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_debt_payments_worker_debt_id_fkey"
            columns: ["worker_debt_id"]
            isOneToOne: false
            referencedRelation: "worker_debts"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_debts: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          created_by: string
          debt_type: string
          description: string | null
          id: string
          paid_amount: number
          remaining_amount: number | null
          session_id: string | null
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          created_by: string
          debt_type?: string
          description?: string | null
          id?: string
          paid_amount?: number
          remaining_amount?: number | null
          session_id?: string | null
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string
          debt_type?: string
          description?: string | null
          id?: string
          paid_amount?: number
          remaining_amount?: number | null
          session_id?: string | null
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_debts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_debts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_debts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_debts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "accounting_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_debts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_debts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_liability_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          branch_id: string | null
          created_at: string
          created_by: string
          id: string
          reason: string | null
          worker_id: string
        }
        Insert: {
          adjustment_type?: string
          amount?: number
          branch_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          reason?: string | null
          worker_id: string
        }
        Update: {
          adjustment_type?: string
          amount?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          reason?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_liability_adjustments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_liability_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_liability_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_liability_adjustments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_liability_adjustments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_load_request_items: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          product_id: string
          quantity: number
          request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          product_id: string
          quantity?: number
          request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string
          quantity?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_load_request_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_load_request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_load_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "worker_load_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_load_requests: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_load_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_load_requests_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_load_requests_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_locations: {
        Row: {
          accuracy: number | null
          branch_id: string | null
          created_at: string
          heading: number | null
          id: string
          idle_since: string | null
          is_tracking: boolean
          latitude: number
          longitude: number
          speed: number | null
          stops: Json | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          accuracy?: number | null
          branch_id?: string | null
          created_at?: string
          heading?: number | null
          id?: string
          idle_since?: string | null
          is_tracking?: boolean
          latitude: number
          longitude: number
          speed?: number | null
          stops?: Json | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          accuracy?: number | null
          branch_id?: string | null
          created_at?: string
          heading?: number | null
          id?: string
          idle_since?: string | null
          is_tracking?: boolean
          latitude?: number
          longitude?: number
          speed?: number | null
          stops?: Json | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_permissions: {
        Row: {
          created_at: string
          granted: boolean
          granted_by: string | null
          id: string
          permission_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission_id: string
          worker_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_permissions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_permissions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_roles: {
        Row: {
          branch_id: string | null
          created_at: string
          custom_role_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          worker_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          custom_role_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          worker_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_roles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_roles_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_roles_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_stock: {
        Row: {
          branch_id: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string
          worker_id: string
        }
        Insert: {
          branch_id?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          worker_id: string
        }
        Update: {
          branch_id?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_stock_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_stock_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_stock_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_ui_overrides: {
        Row: {
          created_at: string
          element_key: string
          element_type: string
          id: string
          is_hidden: boolean
          updated_by: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          element_key: string
          element_type: string
          id?: string
          is_hidden?: boolean
          updated_by?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          element_key?: string
          element_type?: string
          id?: string
          is_hidden?: boolean
          updated_by?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_ui_overrides_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_ui_overrides_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_ui_overrides_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_ui_overrides_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          bonus_cap_percentage: number | null
          branch_id: string | null
          created_at: string
          department: string | null
          device_locked: boolean | null
          full_name: string
          full_name_fr: string | null
          id: string
          is_active: boolean
          is_test: boolean
          last_device_id: string | null
          last_device_info: Json | null
          password_hash: string
          personal_phone: string | null
          print_name: string | null
          role: Database["public"]["Enums"]["app_role"]
          salary: number | null
          updated_at: string
          username: string
          work_phone: string | null
        }
        Insert: {
          bonus_cap_percentage?: number | null
          branch_id?: string | null
          created_at?: string
          department?: string | null
          device_locked?: boolean | null
          full_name: string
          full_name_fr?: string | null
          id?: string
          is_active?: boolean
          is_test?: boolean
          last_device_id?: string | null
          last_device_info?: Json | null
          password_hash: string
          personal_phone?: string | null
          print_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          salary?: number | null
          updated_at?: string
          username: string
          work_phone?: string | null
        }
        Update: {
          bonus_cap_percentage?: number | null
          branch_id?: string | null
          created_at?: string
          department?: string | null
          device_locked?: boolean | null
          full_name?: string
          full_name_fr?: string | null
          id?: string
          is_active?: boolean
          is_test?: boolean
          last_device_id?: string | null
          last_device_info?: Json | null
          password_hash?: string
          personal_phone?: string | null
          print_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          salary?: number | null
          updated_at?: string
          username?: string
          work_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      workers_safe: {
        Row: {
          branch_id: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_manage_product_offers: {
        Args: { p_worker_id: string }
        Returns: boolean
      }
      get_customer_account_id: { Args: never; Returns: string }
      get_customer_sales_rep_statuses: {
        Args: {
          p_customer_ids: string[]
          p_end: string
          p_start: string
          p_worker_ids: string[]
        }
        Returns: {
          customer_id: string
          status: string
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_worker_branch_id: { Args: never; Returns: string }
      get_worker_id: { Args: never; Returns: string }
      get_worker_permissions: {
        Args: { p_worker_id: string }
        Returns: {
          category: string
          permission_code: string
          permission_name: string
          resource: string
        }[]
      }
      get_worker_roles: {
        Args: { p_worker_id: string }
        Returns: {
          branch_id: string
          branch_name: string
          custom_role_code: string
          custom_role_id: string
          custom_role_name: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_custom_role: { Args: { p_role_code: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_of_branch: { Args: { p_branch_id: string }; Returns: boolean }
      is_approved_customer: { Args: never; Returns: boolean }
      is_branch_admin: { Args: never; Returns: boolean }
      is_conversation_participant: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_worker: { Args: never; Returns: boolean }
      search_orders_by_prefix: {
        Args: { p_limit?: number; p_prefix: string }
        Returns: {
          order_id: string
        }[]
      }
      set_worker_session: { Args: { p_worker_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_loading_session_atomic: {
        Args: { p_notes?: string; p_worker_id: string }
        Returns: Json
      }
      verify_customer_password: {
        Args: { p_password_hash: string; p_username: string }
        Returns: {
          created_at: string
          customer_id: string
          full_name: string
          id: string
          phone: string
          status: string
          store_name: string
          username: string
        }[]
      }
      verify_worker_password: {
        Args: { p_password_hash: string; p_username: string }
        Returns: {
          branch_id: string
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          username: string
        }[]
      }
      worker_has_permission: {
        Args: { p_permission_code: string; p_worker_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "worker"
        | "supervisor"
        | "branch_admin"
        | "project_manager"
        | "accountant"
        | "admin_assistant"
        | "warehouse_manager"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "doing" | "done"
      task_type: "task" | "request"
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
      app_role: [
        "admin",
        "worker",
        "supervisor",
        "branch_admin",
        "project_manager",
        "accountant",
        "admin_assistant",
        "warehouse_manager",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "doing", "done"],
      task_type: ["task", "request"],
    },
  },
} as const
