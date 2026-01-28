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
      branches: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          order_prefix: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_prefix?: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_prefix?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cash_drawer_counts: {
        Row: {
          branch_id: string
          counted_at: string
          counted_cash: number
          created_at: string
          denomination_breakdown: Json | null
          expected_cash: number
          id: string
          notes: string | null
          session_id: string
          user_id: string
          variance: number | null
        }
        Insert: {
          branch_id: string
          counted_at?: string
          counted_cash?: number
          created_at?: string
          denomination_breakdown?: Json | null
          expected_cash?: number
          id?: string
          notes?: string | null
          session_id: string
          user_id: string
          variance?: number | null
        }
        Update: {
          branch_id?: string
          counted_at?: string
          counted_cash?: number
          created_at?: string
          denomination_breakdown?: Json | null
          expected_cash?: number
          id?: string
          notes?: string | null
          session_id?: string
          user_id?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_drawer_counts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_drawer_counts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "staff_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          branch_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          branch_id: string
          id: string
          low_stock_threshold: number | null
          menu_item_id: string
          ml_remaining: number | null
          quantity: number
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          id?: string
          low_stock_threshold?: number | null
          menu_item_id: string
          ml_remaining?: number | null
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          id?: string
          low_stock_threshold?: number | null
          menu_item_id?: string
          ml_remaining?: number | null
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_history: {
        Row: {
          branch_id: string
          change_type: string
          changed_by: string | null
          created_at: string
          id: string
          inventory_id: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string | null
        }
        Insert: {
          branch_id: string
          change_type: string
          changed_by?: string | null
          created_at?: string
          id?: string
          inventory_id: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason?: string | null
        }
        Update: {
          branch_id?: string
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          inventory_id?: string
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_history_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          billing_type: string | null
          bottle_size_ml: number | null
          branch_id: string
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_available: boolean | null
          name: string
          price: number
          serving_price: number | null
          serving_size_ml: number | null
          updated_at: string | null
        }
        Insert: {
          billing_type?: string | null
          bottle_size_ml?: number | null
          branch_id: string
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          name: string
          price: number
          serving_price?: number | null
          serving_size_ml?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_type?: string | null
          bottle_size_ml?: number | null
          branch_id?: string
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          name?: string
          price?: number
          serving_price?: number | null
          serving_size_ml?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          is_serving: boolean | null
          menu_item_id: string | null
          notes: string | null
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_serving?: boolean | null
          menu_item_id?: string | null
          notes?: string | null
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_serving?: boolean | null
          menu_item_id?: string | null
          notes?: string | null
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_sequences: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          last_sequence: number
          prefix: string
          updated_at: string | null
          year_month: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          last_sequence?: number
          prefix?: string
          updated_at?: string | null
          year_month: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          last_sequence?: number
          prefix?: string
          updated_at?: string | null
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_sequences_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_log: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          order_id: string
          previous_status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          order_id: string
          previous_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          order_id?: string
          previous_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          discount_amount: number | null
          id: string
          locked_at: string | null
          notes: string | null
          order_number: string | null
          order_status: Database["public"]["Enums"]["order_status"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          subtotal: number | null
          table_id: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          id?: string
          locked_at?: string | null
          notes?: string | null
          order_number?: string | null
          order_status?: Database["public"]["Enums"]["order_status"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number | null
          table_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          id?: string
          locked_at?: string | null
          notes?: string | null
          order_number?: string | null
          order_status?: Database["public"]["Enums"]["order_status"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number | null
          table_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          branch_id: string
          created_at: string | null
          id: string
          idempotency_key: string
          notes: string | null
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          processed_by: string | null
          transaction_reference: string | null
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string | null
          id?: string
          idempotency_key: string
          notes?: string | null
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          processed_by?: string | null
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string | null
          id?: string
          idempotency_key?: string
          notes?: string | null
          order_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          processed_by?: string | null
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          staff_pin: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          staff_pin?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          staff_pin?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_id: string
          processed_by: string | null
          reason: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_id: string
          processed_by?: string | null
          reason: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_id?: string
          processed_by?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          end_time: string
          id: string
          notes: string | null
          party_size: number
          reservation_date: string
          start_time: string
          status: string
          table_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          end_time: string
          id?: string
          notes?: string | null
          party_size?: number
          reservation_date: string
          start_time: string
          status?: string
          table_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          party_size?: number
          reservation_date?: string
          start_time?: string
          status?: string
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          branch_id: string
          capacity: number | null
          created_at: string | null
          height: number | null
          id: string
          is_active: boolean | null
          is_merged: boolean | null
          merged_with: string[] | null
          position_x: number | null
          position_y: number | null
          shape: string | null
          status: string | null
          table_number: string
          table_type: string | null
          updated_at: string | null
          width: number | null
        }
        Insert: {
          branch_id: string
          capacity?: number | null
          created_at?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          is_merged?: boolean | null
          merged_with?: string[] | null
          position_x?: number | null
          position_y?: number | null
          shape?: string | null
          status?: string | null
          table_number: string
          table_type?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          branch_id?: string
          capacity?: number | null
          created_at?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          is_merged?: boolean | null
          merged_with?: string[] | null
          position_x?: number | null
          position_y?: number | null
          shape?: string | null
          status?: string | null
          table_number?: string
          table_type?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_sessions: {
        Row: {
          branch_id: string | null
          card_total: number | null
          cash_total: number | null
          created_at: string | null
          id: string
          login_time: string
          logout_time: string | null
          mobile_total: number | null
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          card_total?: number | null
          cash_total?: number | null
          created_at?: string | null
          id?: string
          login_time?: string
          logout_time?: string | null
          mobile_total?: number | null
          user_id: string
        }
        Update: {
          branch_id?: string | null
          card_total?: number | null
          cash_total?: number | null
          created_at?: string | null
          id?: string
          login_time?: string
          logout_time?: string | null
          mobile_total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_demo_admin: { Args: { p_branch_id: string }; Returns: Json }
      finalize_payment: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_notes?: string
          p_order_id: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_transaction_reference?: string
        }
        Returns: Json
      }
      generate_order_number: { Args: { p_branch_id: string }; Returns: string }
      get_staff_with_roles: {
        Args: never
        Returns: {
          branch_id: string
          branch_name: string
          created_at: string
          email: string
          full_name: string
          roles: string[]
          user_id: string
        }[]
      }
      get_user_branch_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_manager_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_order_editable: { Args: { _order_id: string }; Returns: boolean }
      process_refund: {
        Args: { p_amount: number; p_payment_id: string; p_reason: string }
        Returns: Json
      }
      process_split_payment: {
        Args: { p_order_id: string; p_payments: Json }
        Returns: Json
      }
      update_order_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_order_id: string
        }
        Returns: Json
      }
      validate_staff_pin: {
        Args: { p_pin: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "cashier" | "kitchen"
      order_status:
        | "CREATED"
        | "SENT_TO_KITCHEN"
        | "SERVED"
        | "BILL_REQUESTED"
        | "PAID"
        | "CLOSED"
      payment_method: "cash" | "card" | "mobile" | "split"
      payment_status: "unpaid" | "pending" | "paid" | "refunded"
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
      app_role: ["admin", "manager", "cashier", "kitchen"],
      order_status: [
        "CREATED",
        "SENT_TO_KITCHEN",
        "SERVED",
        "BILL_REQUESTED",
        "PAID",
        "CLOSED",
      ],
      payment_method: ["cash", "card", "mobile", "split"],
      payment_status: ["unpaid", "pending", "paid", "refunded"],
    },
  },
} as const
