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
          custom_roles: Json | null
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
          qr_apply_to_live_view: boolean | null
          relation_allow_custom_role: boolean | null
          relation_allow_single_partner: boolean | null
          relation_disable_first_guest_alert: boolean | null
          relation_required: boolean | null
          rsvp_deadline: string | null
          slug: string | null
          start_time: string | null
          user_id: string
          venue: string | null
          venue_address: string | null
          venue_lat: number | null
          venue_lng: number | null
          venue_name: string | null
          venue_place_id: string | null
        }
        Insert: {
          created_at?: string
          created_date_local?: string | null
          custom_roles?: Json | null
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
          qr_apply_to_live_view?: boolean | null
          relation_allow_custom_role?: boolean | null
          relation_allow_single_partner?: boolean | null
          relation_disable_first_guest_alert?: boolean | null
          relation_required?: boolean | null
          rsvp_deadline?: string | null
          slug?: string | null
          start_time?: string | null
          user_id: string
          venue?: string | null
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
          venue_place_id?: string | null
        }
        Update: {
          created_at?: string
          created_date_local?: string | null
          custom_roles?: Json | null
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
          qr_apply_to_live_view?: boolean | null
          relation_allow_custom_role?: boolean | null
          relation_allow_single_partner?: boolean | null
          relation_disable_first_guest_alert?: boolean | null
          relation_required?: boolean | null
          rsvp_deadline?: string | null
          slug?: string | null
          start_time?: string | null
          user_id?: string
          venue?: string | null
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
          venue_place_id?: string | null
        }
        Relationships: []
      }
      family_group_members: {
        Row: {
          created_at: string
          group_id: string
          guest_id: string
          id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          guest_id: string
          id?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          guest_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      family_groups: {
        Row: {
          created_at: string
          event_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      floor_plan_templates: {
        Row: {
          canvas_data: Json
          category: string
          created_at: string
          description: string | null
          guest_capacity_max: number | null
          guest_capacity_min: number | null
          id: string
          is_public: boolean | null
          name: string
          preview_image_url: string | null
        }
        Insert: {
          canvas_data?: Json
          category: string
          created_at?: string
          description?: string | null
          guest_capacity_max?: number | null
          guest_capacity_min?: number | null
          id?: string
          is_public?: boolean | null
          name: string
          preview_image_url?: string | null
        }
        Update: {
          canvas_data?: Json
          category?: string
          created_at?: string
          description?: string | null
          guest_capacity_max?: number | null
          guest_capacity_min?: number | null
          id?: string
          is_public?: boolean | null
          name?: string
          preview_image_url?: string | null
        }
        Relationships: []
      }
      floor_plans: {
        Row: {
          canvas_data: Json
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          is_template: boolean | null
          name: string
          room_dimensions: Json | null
          settings: Json | null
          template_category: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_data?: Json
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          room_dimensions?: Json | null
          settings?: Json | null
          template_category?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_data?: Json
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          room_dimensions?: Json | null
          settings?: Json | null
          template_category?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      guest_access_attempts: {
        Row: {
          access_token: string
          attempted_at: string
          id: string
          ip_address: unknown | null
          success: boolean
        }
        Insert: {
          access_token: string
          attempted_at?: string
          id?: string
          ip_address?: unknown | null
          success?: boolean
        }
        Update: {
          access_token?: string
          attempted_at?: string
          id?: string
          ip_address?: unknown | null
          success?: boolean
        }
        Relationships: []
      }
      guest_access_tokens: {
        Row: {
          access_token: string
          created_at: string
          event_id: string
          expires_at: string
          guest_id: string
          id: string
          last_used_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          event_id: string
          expires_at: string
          guest_id: string
          id?: string
          last_used_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          event_id?: string
          expires_at?: string
          guest_id?: string
          id?: string
          last_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_access_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_access_tokens_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_update_logs: {
        Row: {
          changed_by: string
          created_at: string
          event_id: string
          guest_id: string
          id: string
          payload: Json
        }
        Insert: {
          changed_by?: string
          created_at?: string
          event_id: string
          guest_id: string
          id?: string
          payload?: Json
        }
        Update: {
          changed_by?: string
          created_at?: string
          event_id?: string
          guest_id?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "guest_update_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_update_logs_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          assigned: boolean | null
          created_at: string
          dietary: string | null
          display_order: number | null
          email: string | null
          event_id: string
          family_group: string | null
          first_name: string
          id: string
          last_name: string | null
          mobile: string | null
          notes: string | null
          relation_display: string
          relation_partner: string
          relation_person1: string | null
          relation_person2: string | null
          relation_role: string
          rsvp: string | null
          rsvp_date: string | null
          seat_no: number | null
          table_id: string | null
          table_no: number | null
          user_id: string
        }
        Insert: {
          assigned?: boolean | null
          created_at?: string
          dietary?: string | null
          display_order?: number | null
          email?: string | null
          event_id: string
          family_group?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          relation_display?: string
          relation_partner?: string
          relation_person1?: string | null
          relation_person2?: string | null
          relation_role?: string
          rsvp?: string | null
          rsvp_date?: string | null
          seat_no?: number | null
          table_id?: string | null
          table_no?: number | null
          user_id: string
        }
        Update: {
          assigned?: boolean | null
          created_at?: string
          dietary?: string | null
          display_order?: number | null
          email?: string | null
          event_id?: string
          family_group?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          relation_display?: string
          relation_partner?: string
          relation_person1?: string | null
          relation_person2?: string | null
          relation_role?: string
          rsvp?: string | null
          rsvp_date?: string | null
          seat_no?: number | null
          table_id?: string | null
          table_no?: number | null
          user_id?: string
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
      live_view_module_settings: {
        Row: {
          ceremony_config: Json | null
          event_id: string
          id: string
          invite_video_config: Json | null
          reception_config: Json | null
          rsvp_invite_config: Json | null
          search_config: Json | null
          update_details_config: Json | null
          updated_at: string
          welcome_video_config: Json | null
        }
        Insert: {
          ceremony_config?: Json | null
          event_id: string
          id?: string
          invite_video_config?: Json | null
          reception_config?: Json | null
          rsvp_invite_config?: Json | null
          search_config?: Json | null
          update_details_config?: Json | null
          updated_at?: string
          welcome_video_config?: Json | null
        }
        Update: {
          ceremony_config?: Json | null
          event_id?: string
          id?: string
          invite_video_config?: Json | null
          reception_config?: Json | null
          rsvp_invite_config?: Json | null
          search_config?: Json | null
          update_details_config?: Json | null
          updated_at?: string
          welcome_video_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "live_view_module_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      live_view_settings: {
        Row: {
          event_id: string
          id: string
          show_ceremony: boolean
          show_invite_video: boolean
          show_reception: boolean
          show_rsvp_invite: boolean
          show_search: boolean
          show_update_details: boolean
          show_welcome_video: boolean
          updated_at: string
        }
        Insert: {
          event_id: string
          id?: string
          show_ceremony?: boolean
          show_invite_video?: boolean
          show_reception?: boolean
          show_rsvp_invite?: boolean
          show_search?: boolean
          show_update_details?: boolean
          show_welcome_video?: boolean
          updated_at?: string
        }
        Update: {
          event_id?: string
          id?: string
          show_ceremony?: boolean
          show_invite_video?: boolean
          show_reception?: boolean
          show_rsvp_invite?: boolean
          show_search?: boolean
          show_update_details?: boolean
          show_welcome_video?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_event"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      place_card_settings: {
        Row: {
          background_color: string
          background_image_type: string
          background_image_url: string | null
          created_at: string
          event_id: string
          font_color: string
          font_family: string
          guest_font_family: string | null
          guest_name_bold: boolean | null
          guest_name_font_size: number | null
          guest_name_italic: boolean | null
          guest_name_underline: boolean | null
          id: string
          individual_messages: Json | null
          info_font_family: string | null
          info_font_size: number | null
          mass_message: string | null
          name_spacing: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          background_color?: string
          background_image_type?: string
          background_image_url?: string | null
          created_at?: string
          event_id: string
          font_color?: string
          font_family?: string
          guest_font_family?: string | null
          guest_name_bold?: boolean | null
          guest_name_font_size?: number | null
          guest_name_italic?: boolean | null
          guest_name_underline?: boolean | null
          id?: string
          individual_messages?: Json | null
          info_font_family?: string | null
          info_font_size?: number | null
          mass_message?: string | null
          name_spacing?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          background_color?: string
          background_image_type?: string
          background_image_url?: string | null
          created_at?: string
          event_id?: string
          font_color?: string
          font_family?: string
          guest_font_family?: string | null
          guest_name_bold?: boolean | null
          guest_name_font_size?: number | null
          guest_name_italic?: boolean | null
          guest_name_underline?: boolean | null
          id?: string
          individual_messages?: Json | null
          info_font_family?: string | null
          info_font_size?: number | null
          mass_message?: string | null
          name_spacing?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      qr_code_settings: {
        Row: {
          advanced_settings: Json | null
          background_color: string | null
          background_image_url: string | null
          background_opacity: number | null
          border_color: string | null
          border_style: string | null
          border_width: number | null
          center_image_size: number | null
          center_image_url: string | null
          color_palette: string | null
          corner_style: string | null
          created_at: string
          event_id: string
          foreground_color: string | null
          gradient_colors: Json | null
          gradient_type: string | null
          has_scan_text: boolean | null
          id: string
          marker_border_color: string | null
          marker_center_color: string | null
          output_format: string | null
          output_size: number | null
          pattern: string | null
          pattern_style: string | null
          scan_text: string | null
          shadow_blur: number | null
          shadow_color: string | null
          shadow_enabled: boolean | null
          shape: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          advanced_settings?: Json | null
          background_color?: string | null
          background_image_url?: string | null
          background_opacity?: number | null
          border_color?: string | null
          border_style?: string | null
          border_width?: number | null
          center_image_size?: number | null
          center_image_url?: string | null
          color_palette?: string | null
          corner_style?: string | null
          created_at?: string
          event_id: string
          foreground_color?: string | null
          gradient_colors?: Json | null
          gradient_type?: string | null
          has_scan_text?: boolean | null
          id?: string
          marker_border_color?: string | null
          marker_center_color?: string | null
          output_format?: string | null
          output_size?: number | null
          pattern?: string | null
          pattern_style?: string | null
          scan_text?: string | null
          shadow_blur?: number | null
          shadow_color?: string | null
          shadow_enabled?: boolean | null
          shape?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          advanced_settings?: Json | null
          background_color?: string | null
          background_image_url?: string | null
          background_opacity?: number | null
          border_color?: string | null
          border_style?: string | null
          border_width?: number | null
          center_image_size?: number | null
          center_image_url?: string | null
          color_palette?: string | null
          corner_style?: string | null
          created_at?: string
          event_id?: string
          foreground_color?: string | null
          gradient_colors?: Json | null
          gradient_type?: string | null
          has_scan_text?: boolean | null
          id?: string
          marker_border_color?: string | null
          marker_center_color?: string | null
          output_format?: string | null
          output_size?: number | null
          pattern?: string | null
          pattern_style?: string | null
          scan_text?: string | null
          shadow_blur?: number | null
          shadow_color?: string | null
          shadow_enabled?: boolean | null
          shape?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_code_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_design_presets: {
        Row: {
          created_at: string
          design_data: Json
          event_id: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          design_data: Json
          event_id: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          design_data?: Json
          event_id?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      cleanup_old_access_attempts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_guest_access_token: {
        Args: { _event_id: string; _guest_id: string; _validity_days?: number }
        Returns: string
      }
      generate_slug: {
        Args: { input_text: string }
        Returns: string
      }
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
          rsvp_deadline: string
          slug: string
          start_time: string
          user_id: string
          venue: string
        }[]
      }
      get_guest_by_token: {
        Args: { _access_token: string }
        Returns: {
          dietary: string
          event_date: string
          event_name: string
          event_venue: string
          first_name: string
          guest_id: string
          last_name: string
          rsvp: string
          seat_no: number
          table_no: number
        }[]
      }
      get_public_event_with_data_secure: {
        Args: { access_token?: string; event_slug: string }
        Returns: {
          event_date: string
          event_finish_time: string
          event_id: string
          event_name: string
          event_start_time: string
          event_venue: string
          guest_dietary: string
          guest_first_name: string
          guest_id: string
          guest_last_name: string
          guest_rsvp: string
          guest_seat_no: number
          guest_table_no: number
          partner1_name: string
          partner2_name: string
        }[]
      }
      get_public_live_view_settings: {
        Args: { _event_slug: string }
        Returns: {
          show_ceremony: boolean
          show_invite_video: boolean
          show_reception: boolean
          show_rsvp_invite: boolean
          show_search: boolean
          show_update_details: boolean
          show_welcome_video: boolean
        }[]
      }
      update_guest_with_token: {
        Args: {
          _access_token: string
          _dietary?: string
          _email?: string
          _mobile?: string
          _rsvp?: string
        }
        Returns: boolean
      }
      validate_guest_access: {
        Args: { _access_token: string; _guest_id: string }
        Returns: boolean
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
