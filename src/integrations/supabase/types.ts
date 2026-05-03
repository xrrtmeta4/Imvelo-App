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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      budget_limits: {
        Row: {
          alert_threshold: number
          category: string
          created_at: string
          id: string
          monthly_limit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_threshold?: number
          category: string
          created_at?: string
          id?: string
          monthly_limit: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_threshold?: number
          category?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      climate_observations: {
        Row: {
          admin_region: string | null
          country: string | null
          country_code: string | null
          created_at: string
          crop_impact: string | null
          humidity: number | null
          id: string
          latitude: number
          longitude: number
          notes: string | null
          observation_source: string
          observed_at: string
          rainfall_mm: number | null
          region: string | null
          soil_moisture: number | null
          temperature: number | null
          user_id: string | null
          weather_code: number | null
          wind_speed_kmh: number | null
        }
        Insert: {
          admin_region?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          crop_impact?: string | null
          humidity?: number | null
          id?: string
          latitude: number
          longitude: number
          notes?: string | null
          observation_source?: string
          observed_at?: string
          rainfall_mm?: number | null
          region?: string | null
          soil_moisture?: number | null
          temperature?: number | null
          user_id?: string | null
          weather_code?: number | null
          wind_speed_kmh?: number | null
        }
        Update: {
          admin_region?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          crop_impact?: string | null
          humidity?: number | null
          id?: string
          latitude?: number
          longitude?: number
          notes?: string | null
          observation_source?: string
          observed_at?: string
          rainfall_mm?: number | null
          region?: string | null
          soil_moisture?: number | null
          temperature?: number | null
          user_id?: string | null
          weather_code?: number | null
          wind_speed_kmh?: number | null
        }
        Relationships: []
      }
      climate_research_exports: {
        Row: {
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          export_format: string
          id: string
          record_count: number | null
          region_filter: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          export_format?: string
          id?: string
          record_count?: number | null
          region_filter?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          export_format?: string
          id?: string
          record_count?: number | null
          region_filter?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crop_reminders: {
        Row: {
          created_at: string
          crop_name: string
          id: string
          planting_end_month: number
          planting_start_month: number
          reminder_sent_this_season: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_name: string
          id?: string
          planting_end_month: number
          planting_start_month: number
          reminder_sent_this_season?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crop_name?: string
          id?: string
          planting_end_month?: number
          planting_start_month?: number
          reminder_sent_this_season?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crop_rotations: {
        Row: {
          created_at: string
          current_crop: string | null
          current_season: string | null
          id: string
          notes: string | null
          plot_name: string
          plot_size: number | null
          plot_unit: string | null
          rotation_plan: Json | null
          soil_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_crop?: string | null
          current_season?: string | null
          id?: string
          notes?: string | null
          plot_name: string
          plot_size?: number | null
          plot_unit?: string | null
          rotation_plan?: Json | null
          soil_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_crop?: string | null
          current_season?: string | null
          id?: string
          notes?: string | null
          plot_name?: string
          plot_size?: number | null
          plot_unit?: string | null
          rotation_plan?: Json | null
          soil_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      farm_activities: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          description: string | null
          id: string
          notes: string | null
          quantity: number | null
          unit: string | null
          updated_at: string
          user_id: string
          weather_conditions: string | null
        }
        Insert: {
          activity_date?: string
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
          weather_conditions?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          weather_conditions?: string | null
        }
        Relationships: []
      }
      farm_inventory: {
        Row: {
          category: string
          cost_per_unit: number | null
          created_at: string
          expiry_date: string | null
          id: string
          item_name: string
          low_stock_threshold: number | null
          notes: string | null
          purchase_date: string | null
          quantity: number
          supplier: string | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          cost_per_unit?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_name: string
          low_stock_threshold?: number | null
          notes?: string | null
          purchase_date?: string | null
          quantity?: number
          supplier?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          cost_per_unit?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_name?: string
          low_stock_threshold?: number | null
          notes?: string | null
          purchase_date?: string | null
          quantity?: number
          supplier?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      harvests: {
        Row: {
          created_at: string
          crop_name: string
          harvest_date: string
          id: string
          notes: string | null
          plot_name: string | null
          quality_grade: string | null
          quantity: number
          revenue: number | null
          season: string | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_name: string
          harvest_date?: string
          id?: string
          notes?: string | null
          plot_name?: string | null
          quality_grade?: string | null
          quantity: number
          revenue?: number | null
          season?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crop_name?: string
          harvest_date?: string
          id?: string
          notes?: string | null
          plot_name?: string | null
          quality_grade?: string | null
          quantity?: number
          revenue?: number | null
          season?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_contributions: {
        Row: {
          context: Json | null
          contribution_type: string
          created_at: string
          edge_relationship: string | null
          id: string
          source_node_id: string | null
          target_node_id: string | null
          user_id: string
        }
        Insert: {
          context?: Json | null
          contribution_type: string
          created_at?: string
          edge_relationship?: string | null
          id?: string
          source_node_id?: string | null
          target_node_id?: string | null
          user_id: string
        }
        Update: {
          context?: Json | null
          contribution_type?: string
          created_at?: string
          edge_relationship?: string | null
          id?: string
          source_node_id?: string | null
          target_node_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_contributions_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_contributions_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_edges: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          relationship: Database["public"]["Enums"]["knowledge_relationship"]
          reported_by_count: number
          source_node_id: string
          target_node_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          relationship: Database["public"]["Enums"]["knowledge_relationship"]
          reported_by_count?: number
          source_node_id: string
          target_node_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          relationship?: Database["public"]["Enums"]["knowledge_relationship"]
          reported_by_count?: number
          source_node_id?: string
          target_node_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_nodes: {
        Row: {
          aliases: Json | null
          confidence_score: number
          created_at: string
          id: string
          interaction_count: number
          name: string
          node_type: Database["public"]["Enums"]["knowledge_node_type"]
          properties: Json | null
          updated_at: string
        }
        Insert: {
          aliases?: Json | null
          confidence_score?: number
          created_at?: string
          id?: string
          interaction_count?: number
          name: string
          node_type: Database["public"]["Enums"]["knowledge_node_type"]
          properties?: Json | null
          updated_at?: string
        }
        Update: {
          aliases?: Json | null
          confidence_score?: number
          created_at?: string
          id?: string
          interaction_count?: number
          name?: string
          node_type?: Database["public"]["Enums"]["knowledge_node_type"]
          properties?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          entry_date: string
          entry_type: string
          id: string
          notes: string | null
          payment_method: string | null
          reference_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          entry_date?: string
          entry_type: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      livestock: {
        Row: {
          animal_type: string
          birth_date: string | null
          breed: string | null
          breeding_status: string | null
          created_at: string
          feed_schedule: string | null
          gender: string | null
          health_status: string | null
          id: string
          name: string | null
          notes: string | null
          tag_id: string | null
          updated_at: string
          user_id: string
          vaccination_history: Json | null
          weight_kg: number | null
        }
        Insert: {
          animal_type: string
          birth_date?: string | null
          breed?: string | null
          breeding_status?: string | null
          created_at?: string
          feed_schedule?: string | null
          gender?: string | null
          health_status?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          tag_id?: string | null
          updated_at?: string
          user_id: string
          vaccination_history?: Json | null
          weight_kg?: number | null
        }
        Update: {
          animal_type?: string
          birth_date?: string | null
          breed?: string | null
          breeding_status?: string | null
          created_at?: string
          feed_schedule?: string | null
          gender?: string | null
          health_status?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          tag_id?: string | null
          updated_at?: string
          user_id?: string
          vaccination_history?: Json | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          location: string | null
          messages_received: number | null
          price: number
          product_name: string
          quantity: number | null
          seller_id: string
          status: string | null
          unit: string
          updated_at: string
          views: number | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          messages_received?: number | null
          price: number
          product_name: string
          quantity?: number | null
          seller_id: string
          status?: string | null
          unit: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          messages_received?: number | null
          price?: number
          product_name?: string
          quantity?: number | null
          seller_id?: string
          status?: string | null
          unit?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          listing_id: string | null
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          listing_id?: string | null
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      pest_reports: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          image_url: string
          location: string | null
          notes: string | null
          pest_name: string | null
          treatment: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          image_url: string
          location?: string | null
          notes?: string | null
          pest_name?: string | null
          treatment?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          image_url?: string
          location?: string | null
          notes?: string | null
          pest_name?: string | null
          treatment?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pesticide_schedules: {
        Row: {
          application_date: string
          created_at: string
          crop_name: string
          id: string
          notes: string | null
          pesticide_name: string
          reminder_sent: boolean | null
          repeat_interval_days: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_date: string
          created_at?: string
          crop_name: string
          id?: string
          notes?: string | null
          pesticide_name: string
          reminder_sent?: boolean | null
          repeat_interval_days?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_date?: string
          created_at?: string
          crop_name?: string
          id?: string
          notes?: string | null
          pesticide_name?: string
          reminder_sent?: boolean | null
          repeat_interval_days?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      premium_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          payment_reference: string | null
          plan: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          plan?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          plan?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          commodity: string
          created_at: string
          current_price: number | null
          direction: string
          id: string
          is_active: boolean | null
          target_price: number
          triggered_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commodity: string
          created_at?: string
          current_price?: number | null
          direction?: string
          id?: string
          is_active?: boolean | null
          target_price: number
          triggered_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commodity?: string
          created_at?: string
          current_price?: number | null
          direction?: string
          id?: string
          is_active?: boolean | null
          target_price?: number
          triggered_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          country_code: string | null
          created_at: string
          full_name: string
          id: string
          location: string | null
          phone_number: string | null
          preferred_language: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          full_name: string
          id: string
          location?: string | null
          phone_number?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          full_name?: string
          id?: string
          location?: string | null
          phone_number?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ussd_sessions: {
        Row: {
          context: Json | null
          created_at: string
          current_menu: string
          expires_at: string
          id: string
          last_input: string | null
          phone_number: string
          session_id: string
          updated_at: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          current_menu?: string
          expires_at?: string
          id?: string
          last_input?: string | null
          phone_number: string
          session_id: string
          updated_at?: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          current_menu?: string
          expires_at?: string
          id?: string
          last_input?: string | null
          phone_number?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      weather_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          message: string
          read: boolean
          severity: string
          user_id: string
          weather_data: Json | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          message: string
          read?: boolean
          severity: string
          user_id: string
          weather_data?: Json | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          severity?: string
          user_id?: string
          weather_data?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      climate_observations_by_country: {
        Row: {
          admin_region: string | null
          avg_humidity: number | null
          avg_soil_moisture: number | null
          avg_temperature: number | null
          avg_wind_kmh: number | null
          country: string | null
          country_code: string | null
          day: string | null
          sample_count: number | null
          total_rainfall_mm: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      increment_listing_messages: {
        Args: { listing_id: string }
        Returns: undefined
      }
      increment_listing_views: {
        Args: { listing_id: string }
        Returns: undefined
      }
      is_extension_officer: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "farmer" | "trader" | "extension_officer"
      knowledge_node_type:
        | "crop"
        | "pest"
        | "disease"
        | "treatment"
        | "soil_type"
        | "season"
        | "region"
      knowledge_relationship:
        | "affects"
        | "treats"
        | "grows_in"
        | "thrives_in"
        | "companion_to"
        | "incompatible_with"
        | "seasonal_for"
        | "found_in"
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
      app_role: ["farmer", "trader", "extension_officer"],
      knowledge_node_type: [
        "crop",
        "pest",
        "disease",
        "treatment",
        "soil_type",
        "season",
        "region",
      ],
      knowledge_relationship: [
        "affects",
        "treats",
        "grows_in",
        "thrives_in",
        "companion_to",
        "incompatible_with",
        "seasonal_for",
        "found_in",
      ],
    },
  },
} as const
