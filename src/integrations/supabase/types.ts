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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string
          created_date_local: string | null
          date: string | null
          event_created: string
          event_timezone: string | null
          expiry_date: string | null
          expiry_date_local: string | null
          finish_time: string | null
          guest_limit: number | null
          id: string
          name: string
          partner1_name: string | null
          partner2_name: string | null
          start_time: string | null
          user_id: string
          venue: string | null
          venue_address: string | null
          venue_lat: number | null
          venue_lng: number | null
          venue_name: string | null
          venue_place_id: string | null
          who_is_allow_custom_role: boolean | null
          who_is_allow_single_partner: boolean | null
          who_is_disable_first_guest_alert: boolean | null
          who_is_required: boolean | null
        }
        Insert: {
          created_at?: string
          created_date_local?: string | null
          date?: string | null
          event_created?: string
          event_timezone?: string | null
          expiry_date?: string | null
          expiry_date_local?: string | null
          finish_time?: string | null
          guest_limit?: number | null
          id?: string
          name: string
          partner1_name?: string | null
          partner2_name?: string | null
          start_time?: string | null
          user_id: string
          venue?: string | null
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
          venue_place_id?: string | null
          who_is_allow_custom_role?: boolean | null
          who_is_allow_single_partner?: boolean | null
          who_is_disable_first_guest_alert?: boolean | null
          who_is_required?: boolean | null
        }
        Update: {
          created_at?: string
          created_date_local?: string | null
          date?: string | null
          event_created?: string
          event_timezone?: string | null
          expiry_date?: string | null
          expiry_date_local?: string | null
          finish_time?: string | null
          guest_limit?: number | null
          id?: string
          name?: string
          partner1_name?: string | null
          partner2_name?: string | null
          start_time?: string | null
          user_id?: string
          venue?: string | null
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
          venue_place_id?: string | null
          who_is_allow_custom_role?: boolean | null
          who_is_allow_single_partner?: boolean | null
          who_is_disable_first_guest_alert?: boolean | null
          who_is_required?: boolean | null
        }
        Relationships: []
      }
      guests: {
        Row: {
          assigned: boolean | null
          created_at: string
          dietary: string | null
          email: string | null
          event_id: string
          first_name: string
          id: string
          last_name: string | null
          mobile: string | null
          notes: string | null
          relation_person1: string | null
          relation_person2: string | null
          rsvp: string | null
          seat_no: number | null
          table_id: string | null
          table_no: number | null
          user_id: string
          who_is_display: string
          who_is_partner: string
          who_is_role: string
        }
        Insert: {
          assigned?: boolean | null
          created_at?: string
          dietary?: string | null
          email?: string | null
          event_id: string
          first_name: string
          id?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          relation_person1?: string | null
          relation_person2?: string | null
          rsvp?: string | null
          seat_no?: number | null
          table_id?: string | null
          table_no?: number | null
          user_id: string
          who_is_display?: string
          who_is_partner?: string
          who_is_role?: string
        }
        Update: {
          assigned?: boolean | null
          created_at?: string
          dietary?: string | null
          email?: string | null
          event_id?: string
          first_name?: string
          id?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          relation_person1?: string | null
          relation_person2?: string | null
          rsvp?: string | null
          seat_no?: number | null
          table_id?: string | null
          table_no?: number | null
          user_id?: string
          who_is_display?: string
          who_is_partner?: string
          who_is_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_countdown_event_id: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          mobile: string | null
        }
        Insert: {
          created_at?: string | null
          display_countdown_event_id?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          mobile?: string | null
        }
        Update: {
          created_at?: string | null
          display_countdown_event_id?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          mobile?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_display_countdown_event_id_fkey"
            columns: ["display_countdown_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string
          event_id: string
          id: string
          limit_seats: number
          name: string
          notes: string | null
          table_no: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          limit_seats: number
          name: string
          notes?: string | null
          table_no?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          limit_seats?: number
          name?: string
          notes?: string | null
          table_no?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_events_with_guest_count: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          created_date_local: string
          date: string
          event_created: string
          event_timezone: string
          expiry_date: string
          expiry_date_local: string
          finish_time: string
          guest_limit: number
          guests_count: number
          id: string
          name: string
          partner1_name: string
          partner2_name: string
          start_time: string
          user_id: string
          venue: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
