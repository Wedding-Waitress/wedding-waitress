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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_seating_suggestions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          event_id: string
          guest_id: string
          id: string
          reasoning: string | null
          status: string | null
          suggested_table_id: string
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          event_id: string
          guest_id: string
          id?: string
          reasoning?: string | null
          status?: string | null
          suggested_table_id: string
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          event_id?: string
          guest_id?: string
          id?: string
          reasoning?: string | null
          status?: string | null
          suggested_table_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_seating_suggestions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_seating_suggestions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_seating_suggestions_suggested_table_id_fkey"
            columns: ["suggested_table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      ceremony_floor_plans: {
        Row: {
          altar_label: string
          assigned_rows: number
          bridal_party_count_left: number | null
          bridal_party_count_right: number | null
          bridal_party_left: Json | null
          bridal_party_right: Json | null
          bridal_party_roles_left: Json | null
          bridal_party_roles_right: Json | null
          chairs_per_row: number
          couple_side_arrangement: string | null
          created_at: string
          event_id: string
          id: string
          left_side_label: string
          person_left_name: string | null
          person_right_name: string | null
          right_side_label: string
          seat_assignments: Json
          show_row_numbers: boolean
          show_seat_numbers: boolean
          total_rows: number
          updated_at: string
          user_id: string
        }
        Insert: {
          altar_label?: string
          assigned_rows?: number
          bridal_party_count_left?: number | null
          bridal_party_count_right?: number | null
          bridal_party_left?: Json | null
          bridal_party_right?: Json | null
          bridal_party_roles_left?: Json | null
          bridal_party_roles_right?: Json | null
          chairs_per_row?: number
          couple_side_arrangement?: string | null
          created_at?: string
          event_id: string
          id?: string
          left_side_label?: string
          person_left_name?: string | null
          person_right_name?: string | null
          right_side_label?: string
          seat_assignments?: Json
          show_row_numbers?: boolean
          show_seat_numbers?: boolean
          total_rows?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          altar_label?: string
          assigned_rows?: number
          bridal_party_count_left?: number | null
          bridal_party_count_right?: number | null
          bridal_party_left?: Json | null
          bridal_party_right?: Json | null
          bridal_party_roles_left?: Json | null
          bridal_party_roles_right?: Json | null
          chairs_per_row?: number
          couple_side_arrangement?: string | null
          created_at?: string
          event_id?: string
          id?: string
          left_side_label?: string
          person_left_name?: string | null
          person_right_name?: string | null
          right_side_label?: string
          seat_assignments?: Json
          show_row_numbers?: boolean
          show_seat_numbers?: boolean
          total_rows?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ceremony_floor_plans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_credits: {
        Row: {
          channel: string
          credits_purchased: number
          credits_remaining: number
          credits_used: number
          id: string
          last_purchase_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          credits_purchased?: number
          credits_remaining?: number
          credits_used?: number
          id?: string
          last_purchase_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          credits_purchased?: number
          credits_remaining?: number
          credits_used?: number
          id?: string
          last_purchase_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      communication_usage: {
        Row: {
          channel: string
          cost_aud: number
          edge_function_name: string | null
          event_id: string | null
          guest_id: string | null
          id: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          cost_aud: number
          edge_function_name?: string | null
          event_id?: string | null
          guest_id?: string | null
          id?: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          cost_aud?: number
          edge_function_name?: string | null
          event_id?: string | null
          guest_id?: string | null
          id?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_usage_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_usage_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      dietary_chart_settings: {
        Row: {
          created_at: string
          event_id: string
          font_size: string
          id: string
          is_bold: boolean
          is_italic: boolean
          is_underline: boolean
          paper_size: string
          show_logo: boolean
          show_mobile: boolean
          show_relation: boolean
          show_seat_no: boolean
          sort_by: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          font_size?: string
          id?: string
          is_bold?: boolean
          is_italic?: boolean
          is_underline?: boolean
          paper_size?: string
          show_logo?: boolean
          show_mobile?: boolean
          show_relation?: boolean
          show_seat_no?: boolean
          sort_by?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          font_size?: string
          id?: string
          is_bold?: boolean
          is_italic?: boolean
          is_underline?: boolean
          paper_size?: string
          show_logo?: boolean
          show_mobile?: boolean
          show_relation?: boolean
          show_seat_no?: boolean
          sort_by?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dj_mc_items: {
        Row: {
          created_at: string
          duration: string | null
          id: string
          is_bold: boolean
          is_default: boolean
          is_italic: boolean
          is_section_header: boolean
          is_underline: boolean
          music_url: string | null
          order_index: number
          pronunciation_audio_url: string | null
          row_label: string
          section_id: string
          song_title_artist: string | null
          updated_at: string
          value_text: string | null
        }
        Insert: {
          created_at?: string
          duration?: string | null
          id?: string
          is_bold?: boolean
          is_default?: boolean
          is_italic?: boolean
          is_section_header?: boolean
          is_underline?: boolean
          music_url?: string | null
          order_index?: number
          pronunciation_audio_url?: string | null
          row_label: string
          section_id: string
          song_title_artist?: string | null
          updated_at?: string
          value_text?: string | null
        }
        Update: {
          created_at?: string
          duration?: string | null
          id?: string
          is_bold?: boolean
          is_default?: boolean
          is_italic?: boolean
          is_section_header?: boolean
          is_underline?: boolean
          music_url?: string | null
          order_index?: number
          pronunciation_audio_url?: string | null
          row_label?: string
          section_id?: string
          song_title_artist?: string | null
          updated_at?: string
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dj_mc_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "dj_mc_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_mc_questionnaires: {
        Row: {
          created_at: string
          event_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dj_mc_questionnaires_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_mc_sections: {
        Row: {
          created_at: string
          id: string
          is_collapsed: boolean
          notes: string | null
          order_index: number
          questionnaire_id: string
          section_label: string
          section_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_collapsed?: boolean
          notes?: string | null
          order_index?: number
          questionnaire_id: string
          section_label: string
          section_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_collapsed?: boolean
          notes?: string | null
          order_index?: number
          questionnaire_id?: string
          section_label?: string
          section_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dj_mc_sections_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "dj_mc_questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_mc_share_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          permission: string
          questionnaire_id: string
          recipient_name: string | null
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          permission?: string
          questionnaire_id: string
          recipient_name?: string | null
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          permission?: string
          questionnaire_id?: string
          recipient_name?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "dj_mc_share_tokens_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "dj_mc_questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_qr_codes: {
        Row: {
          code: string
          created_at: string
          current_event_id: string | null
          destination_type: string
          id: string
          is_active: boolean
          label: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          current_event_id?: string | null
          destination_type?: string
          id?: string
          is_active?: boolean
          label?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          current_event_id?: string | null
          destination_type?: string
          id?: string
          is_active?: boolean
          label?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_qr_codes_current_event_id_fkey"
            columns: ["current_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_collaborators: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          invited_by: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          invited_by?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          invited_by?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_collaborators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_purchases: {
        Row: {
          amount_paid: number
          event_id: string
          id: string
          payment_method: string | null
          plan_id: string
          purchased_at: string
          stripe_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          event_id: string
          id?: string
          payment_method?: string | null
          plan_id: string
          purchased_at?: string
          stripe_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          event_id?: string
          id?: string
          payment_method?: string | null
          plan_id?: string
          purchased_at?: string
          stripe_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_purchases_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      event_shortlinks: {
        Row: {
          click_count: number | null
          created_at: string
          event_id: string
          id: string
          last_clicked_at: string | null
          slug: string
          target_url: string
          updated_at: string
        }
        Insert: {
          click_count?: number | null
          created_at?: string
          event_id: string
          id?: string
          last_clicked_at?: string | null
          slug: string
          target_url: string
          updated_at?: string
        }
        Update: {
          click_count?: number | null
          created_at?: string
          event_id?: string
          id?: string
          last_clicked_at?: string | null
          slug?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_shortlinks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          ceremony_date: string | null
          ceremony_enabled: boolean | null
          ceremony_finish_time: string | null
          ceremony_guest_limit: number | null
          ceremony_name: string | null
          ceremony_rsvp_deadline: string | null
          ceremony_start_time: string | null
          ceremony_venue: string | null
          ceremony_venue_address: string | null
          ceremony_venue_contact: string | null
          ceremony_venue_phone: string | null
          created_at: string
          created_date_local: string | null
          custom_roles: Json | null
          date: string | null
          event_created: string
          event_date_override: string | null
          event_display_name: string | null
          event_planner_email: string | null
          event_timezone: string | null
          event_type: string
          expiry_date: string | null
          expiry_date_local: string | null
          finish_time: string | null
          guest_limit: number | null
          id: string
          media_photos_count: number | null
          media_total_size_mb: number | null
          media_videos_count: number | null
          name: string
          partner1_name: string | null
          partner2_name: string | null
          qr_apply_to_live_view: boolean | null
          reception_enabled: boolean | null
          relation_allow_custom_role: boolean | null
          relation_allow_single_partner: boolean | null
          relation_disable_first_guest_alert: boolean | null
          relation_mode: string | null
          relation_required: boolean | null
          rsvp_deadline: string | null
          setup_completed: boolean | null
          slug: string | null
          start_time: string | null
          user_id: string
          venue: string | null
          venue_address: string | null
          venue_contact: string | null
          venue_lat: number | null
          venue_lng: number | null
          venue_name: string | null
          venue_phone: string | null
          venue_place_id: string | null
        }
        Insert: {
          ceremony_date?: string | null
          ceremony_enabled?: boolean | null
          ceremony_finish_time?: string | null
          ceremony_guest_limit?: number | null
          ceremony_name?: string | null
          ceremony_rsvp_deadline?: string | null
          ceremony_start_time?: string | null
          ceremony_venue?: string | null
          ceremony_venue_address?: string | null
          ceremony_venue_contact?: string | null
          ceremony_venue_phone?: string | null
          created_at?: string
          created_date_local?: string | null
          custom_roles?: Json | null
          date?: string | null
          event_created?: string
          event_date_override?: string | null
          event_display_name?: string | null
          event_planner_email?: string | null
          event_timezone?: string | null
          event_type?: string
          expiry_date?: string | null
          expiry_date_local?: string | null
          finish_time?: string | null
          guest_limit?: number | null
          id?: string
          media_photos_count?: number | null
          media_total_size_mb?: number | null
          media_videos_count?: number | null
          name: string
          partner1_name?: string | null
          partner2_name?: string | null
          qr_apply_to_live_view?: boolean | null
          reception_enabled?: boolean | null
          relation_allow_custom_role?: boolean | null
          relation_allow_single_partner?: boolean | null
          relation_disable_first_guest_alert?: boolean | null
          relation_mode?: string | null
          relation_required?: boolean | null
          rsvp_deadline?: string | null
          setup_completed?: boolean | null
          slug?: string | null
          start_time?: string | null
          user_id: string
          venue?: string | null
          venue_address?: string | null
          venue_contact?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
          venue_phone?: string | null
          venue_place_id?: string | null
        }
        Update: {
          ceremony_date?: string | null
          ceremony_enabled?: boolean | null
          ceremony_finish_time?: string | null
          ceremony_guest_limit?: number | null
          ceremony_name?: string | null
          ceremony_rsvp_deadline?: string | null
          ceremony_start_time?: string | null
          ceremony_venue?: string | null
          ceremony_venue_address?: string | null
          ceremony_venue_contact?: string | null
          ceremony_venue_phone?: string | null
          created_at?: string
          created_date_local?: string | null
          custom_roles?: Json | null
          date?: string | null
          event_created?: string
          event_date_override?: string | null
          event_display_name?: string | null
          event_planner_email?: string | null
          event_timezone?: string | null
          event_type?: string
          expiry_date?: string | null
          expiry_date_local?: string | null
          finish_time?: string | null
          guest_limit?: number | null
          id?: string
          media_photos_count?: number | null
          media_total_size_mb?: number | null
          media_videos_count?: number | null
          name?: string
          partner1_name?: string | null
          partner2_name?: string | null
          qr_apply_to_live_view?: boolean | null
          reception_enabled?: boolean | null
          relation_allow_custom_role?: boolean | null
          relation_allow_single_partner?: boolean | null
          relation_disable_first_guest_alert?: boolean | null
          relation_mode?: string | null
          relation_required?: boolean | null
          rsvp_deadline?: string | null
          setup_completed?: boolean | null
          slug?: string | null
          start_time?: string | null
          user_id?: string
          venue?: string | null
          venue_address?: string | null
          venue_contact?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
          venue_phone?: string | null
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
      full_seating_chart_settings: {
        Row: {
          created_at: string
          event_id: string
          font_size: string
          id: string
          is_bold: boolean
          is_italic: boolean
          is_underline: boolean
          paper_size: string
          show_dietary: boolean
          show_logo: boolean | null
          show_relation: boolean
          show_rsvp: boolean
          sort_by: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          font_size?: string
          id?: string
          is_bold?: boolean
          is_italic?: boolean
          is_underline?: boolean
          paper_size?: string
          show_dietary?: boolean
          show_logo?: boolean | null
          show_relation?: boolean
          show_rsvp?: boolean
          sort_by?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          font_size?: string
          id?: string
          is_bold?: boolean
          is_italic?: boolean
          is_underline?: boolean
          paper_size?: string
          show_dietary?: boolean
          show_logo?: boolean | null
          show_relation?: boolean
          show_rsvp?: boolean
          sort_by?: string
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
          ip_address: unknown
          success: boolean
        }
        Insert: {
          access_token: string
          attempted_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean
        }
        Update: {
          access_token?: string
          attempted_at?: string
          id?: string
          ip_address?: unknown
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
      guest_communication_preferences: {
        Row: {
          created_at: string | null
          guest_id: string
          has_whatsapp: boolean | null
          id: string
          prefers_email: boolean | null
          prefers_sms: boolean | null
          prefers_whatsapp: boolean | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          guest_id: string
          has_whatsapp?: boolean | null
          id?: string
          prefers_email?: boolean | null
          prefers_sms?: boolean | null
          prefers_whatsapp?: boolean | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          guest_id?: string
          has_whatsapp?: boolean | null
          id?: string
          prefers_email?: boolean | null
          prefers_sms?: boolean | null
          prefers_whatsapp?: boolean | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_communication_preferences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: true
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
          added_by_guest_id: string | null
          allow_plus_one: boolean
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
          rsvp_invite_sent_at: string | null
          rsvp_invite_status: string
          seat_no: number | null
          table_id: string | null
          table_no: number | null
          user_id: string
        }
        Insert: {
          added_by_guest_id?: string | null
          allow_plus_one?: boolean
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
          rsvp_invite_sent_at?: string | null
          rsvp_invite_status?: string
          seat_no?: number | null
          table_id?: string | null
          table_no?: number | null
          user_id: string
        }
        Update: {
          added_by_guest_id?: string | null
          allow_plus_one?: boolean
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
          rsvp_invite_sent_at?: string | null
          rsvp_invite_status?: string
          seat_no?: number | null
          table_id?: string | null
          table_no?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_added_by_guest_id_fkey"
            columns: ["added_by_guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
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
      invitation_card_settings: {
        Row: {
          background_color: string
          background_image_opacity: number | null
          background_image_type: string
          background_image_url: string | null
          background_image_x_position: number | null
          background_image_y_position: number | null
          canva_template_url: string | null
          card_size: string
          card_type: string
          created_at: string
          event_id: string
          font_color: string
          id: string
          name: string
          orientation: string
          qr_config: Json | null
          text_zones: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          background_color?: string
          background_image_opacity?: number | null
          background_image_type?: string
          background_image_url?: string | null
          background_image_x_position?: number | null
          background_image_y_position?: number | null
          canva_template_url?: string | null
          card_size?: string
          card_type?: string
          created_at?: string
          event_id: string
          font_color?: string
          id?: string
          name?: string
          orientation?: string
          qr_config?: Json | null
          text_zones?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          background_color?: string
          background_image_opacity?: number | null
          background_image_type?: string
          background_image_url?: string | null
          background_image_x_position?: number | null
          background_image_y_position?: number | null
          canva_template_url?: string | null
          card_size?: string
          card_type?: string
          created_at?: string
          event_id?: string
          font_color?: string
          id?: string
          name?: string
          orientation?: string
          qr_config?: Json | null
          text_zones?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_card_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_designs: {
        Row: {
          created_at: string
          custom_styles: Json
          custom_text: Json
          event_id: string
          id: string
          include_guest_name: boolean
          include_qr_code: boolean
          qr_position: Json | null
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_styles?: Json
          custom_text?: Json
          event_id: string
          id?: string
          include_guest_name?: boolean
          include_qr_code?: boolean
          qr_position?: Json | null
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_styles?: Json
          custom_text?: Json
          event_id?: string
          id?: string
          include_guest_name?: boolean
          include_qr_code?: boolean
          qr_position?: Json | null
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_designs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_designs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "invitation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_gallery_images: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          name: string
          sort_order: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_url: string
          name: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      invitation_templates: {
        Row: {
          background_url: string
          card_type: string
          category: string
          created_at: string
          default_styles: Json
          height_mm: number
          id: string
          is_active: boolean
          name: string
          orientation: string
          sort_order: number
          text_zones: Json
          thumbnail_url: string | null
          width_mm: number
        }
        Insert: {
          background_url: string
          card_type?: string
          category?: string
          created_at?: string
          default_styles?: Json
          height_mm?: number
          id?: string
          is_active?: boolean
          name: string
          orientation?: string
          sort_order?: number
          text_zones?: Json
          thumbnail_url?: string | null
          width_mm?: number
        }
        Update: {
          background_url?: string
          card_type?: string
          category?: string
          created_at?: string
          default_styles?: Json
          height_mm?: number
          id?: string
          is_active?: boolean
          name?: string
          orientation?: string
          sort_order?: number
          text_zones?: Json
          thumbnail_url?: string | null
          width_mm?: number
        }
        Relationships: []
      }
      live_view_module_settings: {
        Row: {
          ceremony_config: Json | null
          event_id: string
          floor_plan_config: Json | null
          hero_image_config: Json | null
          id: string
          invite_video_config: Json | null
          menu_config: Json | null
          reception_config: Json | null
          reception_floor_plan_config: Json | null
          rsvp_invite_config: Json | null
          search_config: Json | null
          update_details_config: Json | null
          updated_at: string
          welcome_video_config: Json | null
        }
        Insert: {
          ceremony_config?: Json | null
          event_id: string
          floor_plan_config?: Json | null
          hero_image_config?: Json | null
          id?: string
          invite_video_config?: Json | null
          menu_config?: Json | null
          reception_config?: Json | null
          reception_floor_plan_config?: Json | null
          rsvp_invite_config?: Json | null
          search_config?: Json | null
          update_details_config?: Json | null
          updated_at?: string
          welcome_video_config?: Json | null
        }
        Update: {
          ceremony_config?: Json | null
          event_id?: string
          floor_plan_config?: Json | null
          hero_image_config?: Json | null
          id?: string
          invite_video_config?: Json | null
          menu_config?: Json | null
          reception_config?: Json | null
          reception_floor_plan_config?: Json | null
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
          show_floor_plan: boolean
          show_invite_video: boolean
          show_menu: boolean
          show_reception: boolean
          show_reception_floor_plan: boolean
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
          show_floor_plan?: boolean
          show_invite_video?: boolean
          show_menu?: boolean
          show_reception?: boolean
          show_reception_floor_plan?: boolean
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
          show_floor_plan?: boolean
          show_invite_video?: boolean
          show_menu?: boolean
          show_reception?: boolean
          show_reception_floor_plan?: boolean
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
      long_table_seat_arrangements: {
        Row: {
          created_at: string | null
          event_id: string
          guest_id: string
          id: string
          position: number
          side: string
          table_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          guest_id: string
          id?: string
          position: number
          side: string
          table_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          guest_id?: string
          id?: string
          position?: number
          side?: string
          table_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "long_table_seat_arrangements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "long_table_seat_arrangements_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "long_table_seat_arrangements_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          from_email: string | null
          id: string
          resend_api_key: string | null
          resend_api_key_encrypted: string | null
          sms_enabled: boolean | null
          sms_provider: string | null
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          twilio_auth_token_encrypted: string | null
          twilio_messaging_service_sid: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          from_email?: string | null
          id?: string
          resend_api_key?: string | null
          resend_api_key_encrypted?: string | null
          sms_enabled?: boolean | null
          sms_provider?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_auth_token_encrypted?: string | null
          twilio_messaging_service_sid?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          from_email?: string | null
          id?: string
          resend_api_key?: string | null
          resend_api_key_encrypted?: string | null
          sms_enabled?: boolean | null
          sms_provider?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_auth_token_encrypted?: string | null
          twilio_messaging_service_sid?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      place_card_gallery_images: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          name: string
          sort_order: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_url: string
          name: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      place_card_settings: {
        Row: {
          back_image_url: string | null
          background_behind_names: boolean | null
          background_behind_table_seats: boolean | null
          background_color: string
          background_image_opacity: number | null
          background_image_scale: number | null
          background_image_type: string
          background_image_url: string | null
          background_image_x_position: number | null
          background_image_y_position: number | null
          created_at: string
          event_id: string
          font_color: string
          font_family: string
          front_image_url: string | null
          guest_font_family: string | null
          guest_name_bold: boolean | null
          guest_name_font_size: number | null
          guest_name_italic: boolean | null
          guest_name_offset_x: number
          guest_name_offset_y: number
          guest_name_rotation: number
          guest_name_underline: boolean | null
          id: string
          individual_messages: Json | null
          info_bold: boolean
          info_font_color: string
          info_font_family: string | null
          info_font_size: number | null
          info_italic: boolean
          info_underline: boolean
          mass_message: string | null
          message_bold: boolean
          message_font_color: string
          message_font_family: string
          message_font_size: number
          message_italic: boolean
          message_underline: boolean
          name_spacing: number | null
          seat_offset_x: number
          seat_offset_y: number
          table_offset_x: number
          table_offset_y: number
          table_seat_rotation: number
          updated_at: string
          user_id: string
        }
        Insert: {
          back_image_url?: string | null
          background_behind_names?: boolean | null
          background_behind_table_seats?: boolean | null
          background_color?: string
          background_image_opacity?: number | null
          background_image_scale?: number | null
          background_image_type?: string
          background_image_url?: string | null
          background_image_x_position?: number | null
          background_image_y_position?: number | null
          created_at?: string
          event_id: string
          font_color?: string
          font_family?: string
          front_image_url?: string | null
          guest_font_family?: string | null
          guest_name_bold?: boolean | null
          guest_name_font_size?: number | null
          guest_name_italic?: boolean | null
          guest_name_offset_x?: number
          guest_name_offset_y?: number
          guest_name_rotation?: number
          guest_name_underline?: boolean | null
          id?: string
          individual_messages?: Json | null
          info_bold?: boolean
          info_font_color?: string
          info_font_family?: string | null
          info_font_size?: number | null
          info_italic?: boolean
          info_underline?: boolean
          mass_message?: string | null
          message_bold?: boolean
          message_font_color?: string
          message_font_family?: string
          message_font_size?: number
          message_italic?: boolean
          message_underline?: boolean
          name_spacing?: number | null
          seat_offset_x?: number
          seat_offset_y?: number
          table_offset_x?: number
          table_offset_y?: number
          table_seat_rotation?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          back_image_url?: string | null
          background_behind_names?: boolean | null
          background_behind_table_seats?: boolean | null
          background_color?: string
          background_image_opacity?: number | null
          background_image_scale?: number | null
          background_image_type?: string
          background_image_url?: string | null
          background_image_x_position?: number | null
          background_image_y_position?: number | null
          created_at?: string
          event_id?: string
          font_color?: string
          font_family?: string
          front_image_url?: string | null
          guest_font_family?: string | null
          guest_name_bold?: boolean | null
          guest_name_font_size?: number | null
          guest_name_italic?: boolean | null
          guest_name_offset_x?: number
          guest_name_offset_y?: number
          guest_name_rotation?: number
          guest_name_underline?: boolean | null
          id?: string
          individual_messages?: Json | null
          info_bold?: boolean
          info_font_color?: string
          info_font_family?: string | null
          info_font_size?: number | null
          info_italic?: boolean
          info_underline?: boolean
          mass_message?: string | null
          message_bold?: boolean
          message_font_color?: string
          message_font_family?: string
          message_font_size?: number
          message_italic?: boolean
          message_underline?: boolean
          name_spacing?: number | null
          seat_offset_x?: number
          seat_offset_y?: number
          table_offset_x?: number
          table_offset_y?: number
          table_seat_rotation?: number
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
          dots_color: string | null
          dots_shape: string | null
          event_id: string
          foreground_color: string | null
          gradient_colors: Json | null
          gradient_type: string | null
          has_scan_text: boolean | null
          id: string
          marker_border_color: string | null
          marker_border_shape: string | null
          marker_center_color: string | null
          marker_center_shape: string | null
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
          use_simplified_qr: boolean | null
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
          dots_color?: string | null
          dots_shape?: string | null
          event_id: string
          foreground_color?: string | null
          gradient_colors?: Json | null
          gradient_type?: string | null
          has_scan_text?: boolean | null
          id?: string
          marker_border_color?: string | null
          marker_border_shape?: string | null
          marker_center_color?: string | null
          marker_center_shape?: string | null
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
          use_simplified_qr?: boolean | null
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
          dots_color?: string | null
          dots_shape?: string | null
          event_id?: string
          foreground_color?: string | null
          gradient_colors?: Json | null
          gradient_type?: string | null
          has_scan_text?: boolean | null
          id?: string
          marker_border_color?: string | null
          marker_border_shape?: string | null
          marker_center_color?: string | null
          marker_center_shape?: string | null
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
          use_simplified_qr?: boolean | null
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
      qr_scan_logs: {
        Row: {
          event_id: string | null
          id: string
          ip_hash: string | null
          qr_code_id: string
          referrer: string | null
          scanned_at: string
          user_agent: string | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          ip_hash?: string | null
          qr_code_id: string
          referrer?: string | null
          scanned_at?: string
          user_agent?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          ip_hash?: string | null
          qr_code_id?: string
          referrer?: string | null
          scanned_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scan_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scan_logs_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "dynamic_qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_invite_logs: {
        Row: {
          channel: string
          error_message: string | null
          event_id: string
          guest_id: string
          id: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          error_message?: string | null
          event_id: string
          guest_id: string
          id?: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          error_message?: string | null
          event_id?: string
          guest_id?: string
          id?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_invite_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_invite_logs_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_invite_purchases: {
        Row: {
          amount_paid: number
          created_at: string
          event_id: string
          guest_tier_label: string | null
          id: string
          status: string
          stripe_payment_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          event_id: string
          guest_tier_label?: string | null
          id?: string
          status?: string
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          event_id?: string
          guest_tier_label?: string | null
          id?: string
          status?: string
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_invite_purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      running_sheet_items: {
        Row: {
          created_at: string | null
          description_rich: Json
          id: string
          is_bold: boolean | null
          is_italic: boolean | null
          is_section_header: boolean | null
          is_underline: boolean | null
          order_index: number
          responsible: string | null
          sheet_id: string
          time_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_rich?: Json
          id?: string
          is_bold?: boolean | null
          is_italic?: boolean | null
          is_section_header?: boolean | null
          is_underline?: boolean | null
          order_index: number
          responsible?: string | null
          sheet_id: string
          time_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_rich?: Json
          id?: string
          is_bold?: boolean | null
          is_italic?: boolean | null
          is_section_header?: boolean | null
          is_underline?: boolean | null
          order_index?: number
          responsible?: string | null
          sheet_id?: string
          time_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "running_sheet_items_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "running_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      running_sheet_share_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          permission: string
          recipient_name: string | null
          sheet_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          permission?: string
          recipient_name?: string | null
          sheet_id: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          permission?: string
          recipient_name?: string | null
          sheet_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "running_sheet_share_tokens_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "running_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      running_sheets: {
        Row: {
          all_bold: boolean | null
          all_font: string | null
          all_italic: boolean | null
          all_text_color: string | null
          all_text_size: string | null
          created_at: string | null
          event_id: string
          header_bold: boolean | null
          header_color: string | null
          header_font: string | null
          header_italic: boolean | null
          header_size: string | null
          id: string
          section_label: string | null
          section_notes: string | null
          show_responsible: boolean | null
          updated_at: string | null
          updated_by: string | null
          user_id: string
          venue_logo_url: string | null
        }
        Insert: {
          all_bold?: boolean | null
          all_font?: string | null
          all_italic?: boolean | null
          all_text_color?: string | null
          all_text_size?: string | null
          created_at?: string | null
          event_id: string
          header_bold?: boolean | null
          header_color?: string | null
          header_font?: string | null
          header_italic?: boolean | null
          header_size?: string | null
          id?: string
          section_label?: string | null
          section_notes?: string | null
          show_responsible?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
          venue_logo_url?: string | null
        }
        Update: {
          all_bold?: boolean | null
          all_font?: string | null
          all_italic?: boolean | null
          all_text_color?: string | null
          all_text_size?: string | null
          created_at?: string | null
          event_id?: string
          header_bold?: boolean | null
          header_color?: string | null
          header_font?: string | null
          header_italic?: boolean | null
          header_size?: string | null
          id?: string
          section_label?: string | null
          section_notes?: string | null
          show_responsible?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
          venue_logo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "running_sheets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_chart_share_tokens: {
        Row: {
          created_at: string
          event_id: string
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          permission: string
          recipient_name: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          permission?: string
          recipient_name?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          permission?: string
          recipient_name?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_chart_share_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          can_send_email: boolean
          can_send_sms: boolean
          can_send_whatsapp: boolean
          created_at: string
          duration_days: number
          extra_event_price: number
          guest_limit: number | null
          id: string
          is_active: boolean
          name: string
          price_aud: number
          table_limit: number | null
          team_members: number
        }
        Insert: {
          can_send_email?: boolean
          can_send_sms?: boolean
          can_send_whatsapp?: boolean
          created_at?: string
          duration_days: number
          extra_event_price: number
          guest_limit?: number | null
          id?: string
          is_active?: boolean
          name: string
          price_aud: number
          table_limit?: number | null
          team_members?: number
        }
        Update: {
          can_send_email?: boolean
          can_send_sms?: boolean
          can_send_whatsapp?: boolean
          created_at?: string
          duration_days?: number
          extra_event_price?: number
          guest_limit?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price_aud?: number
          table_limit?: number | null
          team_members?: number
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
          table_type: string | null
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
          table_type?: string | null
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
          table_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          grace_period_ends_at: string | null
          id: string
          is_read_only: boolean
          plan_id: string
          started_at: string
          status: string
          trial_extended: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          grace_period_ends_at?: string | null
          id?: string
          is_read_only?: boolean
          plan_id: string
          started_at?: string
          status?: string
          trial_extended?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          grace_period_ends_at?: string | null
          id?: string
          is_read_only?: boolean
          plan_id?: string
          started_at?: string
          status?: string
          trial_extended?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      welcome_video_uploads: {
        Row: {
          cloudflare_playback_url: string | null
          cloudflare_uid: string
          created_at: string | null
          duration_seconds: number | null
          event_id: string
          file_name: string | null
          file_size_bytes: number | null
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cloudflare_playback_url?: string | null
          cloudflare_uid: string
          created_at?: string | null
          duration_seconds?: number | null
          event_id: string
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cloudflare_playback_url?: string | null
          cloudflare_uid?: string
          created_at?: string | null
          duration_seconds?: number | null
          event_id?: string
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "welcome_video_uploads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_dj_mc_item_by_token: {
        Args: {
          at_order_index?: number
          p_row_label?: string
          p_section_id: string
          share_token: string
        }
        Returns: Json
      }
      add_guest_public: {
        Args: {
          _added_by_guest_id?: string
          _dietary?: string
          _email?: string
          _event_id: string
          _first_name: string
          _last_name: string
          _mobile?: string
          _rsvp?: string
        }
        Returns: string
      }
      add_running_sheet_item_by_token: {
        Args: { at_order_index?: number; share_token: string }
        Returns: Json
      }
      can_access_event: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      check_communication_credits: {
        Args: { _channel: string; _count: number; _user_id: string }
        Returns: Json
      }
      check_guest_limit: {
        Args: { _event_id: string; _user_id: string }
        Returns: Json
      }
      cleanup_old_access_attempts: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      clear_dj_mc_section_items_by_token: {
        Args: { p_section_id: string; share_token: string }
        Returns: boolean
      }
      deduct_communication_credit: {
        Args: {
          _channel: string
          _cost: number
          _edge_function: string
          _event_id: string
          _guest_id: string
          _user_id: string
        }
        Returns: boolean
      }
      delete_dj_mc_item_by_token: {
        Args: { item_id: string; share_token: string }
        Returns: boolean
      }
      delete_dj_mc_section_by_token: {
        Args: { p_section_id: string; share_token: string }
        Returns: boolean
      }
      delete_running_sheet_item_by_token: {
        Args: { item_id: string; share_token: string }
        Returns: boolean
      }
      duplicate_dj_mc_item_by_token: {
        Args: { item_id: string; share_token: string }
        Returns: Json
      }
      duplicate_dj_mc_section_by_token: {
        Args: { p_section_id: string; share_token: string }
        Returns: Json
      }
      duplicate_running_sheet_item_by_token: {
        Args: { item_id: string; share_token: string }
        Returns: Json
      }
      generate_dj_mc_share_token: {
        Args: {
          _permission?: string
          _questionnaire_id: string
          _recipient_name?: string
          _validity_days?: number
        }
        Returns: string
      }
      generate_dynamic_qr_code: { Args: never; Returns: string }
      generate_guest_access_token: {
        Args: { _event_id: string; _guest_id: string; _validity_days?: number }
        Returns: string
      }
      generate_media_upload_token: {
        Args: {
          _event_id: string
          _max_uploads?: number
          _validity_days?: number
        }
        Returns: string
      }
      generate_running_sheet_share_token: {
        Args: {
          _permission?: string
          _recipient_name?: string
          _sheet_id: string
          _validity_days?: number
        }
        Returns: string
      }
      generate_seating_chart_share_token: {
        Args: {
          _event_id: string
          _permission?: string
          _recipient_name?: string
          _validity_days?: number
        }
        Returns: string
      }
      generate_short_slug: { Args: never; Returns: string }
      generate_slug: { Args: { input_text: string }; Returns: string }
      get_dj_mc_questionnaire_by_token: {
        Args: { share_token: string }
        Returns: {
          ceremony_date: string
          ceremony_finish_time: string
          ceremony_start_time: string
          ceremony_venue: string
          event_date: string
          event_id: string
          event_name: string
          event_venue: string
          finish_time: string
          permission: string
          questionnaire_id: string
          sections: Json
          start_time: string
        }[]
      }
      get_events_with_guest_count: {
        Args: never
        Returns: {
          created_at: string
          created_date_local: string
          date: string
          event_created: string
          event_timezone: string
          event_type: string
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
          unassigned_guests_count: number
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
      get_notification_settings: { Args: { _user_id: string }; Returns: Json }
      get_public_ceremony_floor_plan: {
        Args: { event_slug: string }
        Returns: {
          altar_label: string
          assigned_rows: number
          bridal_party_count_left: number
          bridal_party_count_right: number
          bridal_party_left: Json
          bridal_party_right: Json
          bridal_party_roles_left: Json
          bridal_party_roles_right: Json
          chairs_per_row: number
          couple_side_arrangement: string
          left_side_label: string
          person_left_name: string
          person_right_name: string
          right_side_label: string
          seat_assignments: Json
          show_row_numbers: boolean
          show_seat_numbers: boolean
          total_rows: number
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
          floor_plan_config: Json
          guest_added_by_guest_id: string
          guest_allow_plus_one: boolean
          guest_dietary: string
          guest_family_group: string
          guest_first_name: string
          guest_id: string
          guest_last_name: string
          guest_rsvp: string
          guest_seat_no: number
          guest_table_id: string
          guest_table_no: number
          hero_image_config: Json
          menu_config: Json
          partner1_name: string
          partner2_name: string
          reception_floor_plan_config: Json
          rsvp_invite_config: Json
          show_floor_plan: boolean
          show_menu: boolean
          show_reception_floor_plan: boolean
          show_rsvp_invite: boolean
          show_welcome_video: boolean
          welcome_video_config: Json
        }[]
      }
      get_public_live_view_settings: {
        Args: { _event_slug: string }
        Returns: {
          show_ceremony: boolean
          show_floor_plan: boolean
          show_invite_video: boolean
          show_menu: boolean
          show_reception: boolean
          show_rsvp_invite: boolean
          show_search: boolean
          show_update_details: boolean
          show_welcome_video: boolean
        }[]
      }
      get_public_table_data: {
        Args: { p_event_id: string; p_table_id: string }
        Returns: {
          guest_dietary: string
          guest_first_name: string
          guest_id: string
          guest_last_name: string
          guest_rsvp: string
          guest_seat_no: number
          limit_seats: number
          table_id: string
          table_name: string
          table_no: number
          table_notes: string
        }[]
      }
      get_running_sheet_by_token: {
        Args: { share_token: string }
        Returns: {
          ceremony_date: string
          ceremony_finish_time: string
          ceremony_start_time: string
          ceremony_venue: string
          event_date: string
          event_id: string
          event_name: string
          event_venue: string
          finish_time: string
          items: Json
          permission: string
          section_label: string
          section_notes: string
          sheet_id: string
          start_time: string
        }[]
      }
      get_seating_chart_by_token: {
        Args: { share_token: string }
        Returns: {
          event_date: string
          event_id: string
          event_name: string
          event_venue: string
          guests: Json
          permission: string
        }[]
      }
      get_user_plan: {
        Args: { _user_id: string }
        Returns: {
          can_send_email: boolean
          can_send_sms: boolean
          can_send_whatsapp: boolean
          expires_at: string
          guest_limit: number
          is_read_only: boolean
          plan_name: string
          status: string
          team_members: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      public_manage_guest_group: {
        Args: {
          _event_id: string
          _guest_type: string
          _new_guest_id: string
          _referring_guest_id: string
        }
        Returns: undefined
      }
      reorder_dj_mc_items_by_token: {
        Args: { item_ids: string[]; p_section_id: string; share_token: string }
        Returns: boolean
      }
      reorder_running_sheet_items_by_token: {
        Args: { item_ids: string[]; share_token: string }
        Returns: boolean
      }
      reset_dj_mc_section_by_token: {
        Args: {
          p_default_items: Json
          p_default_label: string
          p_section_id: string
          share_token: string
        }
        Returns: boolean
      }
      resolve_dynamic_qr: {
        Args: { _code: string }
        Returns: {
          destination_type: string
          event_id: string
          event_slug: string
          qr_code_id: string
        }[]
      }
      sync_relation_display_for_event: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      update_dj_mc_item_by_token:
        | {
            Args: {
              item_id: string
              new_duration?: string
              new_music_url?: string
              new_pronunciation_audio_url?: string
              new_row_label?: string
              new_song_title_artist?: string
              new_value_text?: string
              share_token: string
            }
            Returns: boolean
          }
        | {
            Args: {
              item_id: string
              new_duration?: string
              new_is_bold?: boolean
              new_is_italic?: boolean
              new_is_section_header?: boolean
              new_is_underline?: boolean
              new_music_url?: string
              new_pronunciation_audio_url?: string
              new_row_label?: string
              new_song_title_artist?: string
              new_value_text?: string
              share_token: string
            }
            Returns: boolean
          }
      update_dj_mc_section_by_token: {
        Args: {
          clear_notes?: boolean
          new_is_collapsed?: boolean
          new_notes?: string
          new_section_label?: string
          p_section_id: string
          share_token: string
        }
        Returns: boolean
      }
      update_guest_rsvp_public: {
        Args: {
          _dietary?: string
          _email?: string
          _event_id: string
          _guest_id: string
          _mobile?: string
          _notes?: string
          _rsvp?: string
        }
        Returns: boolean
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
      update_running_sheet_item_by_token: {
        Args: {
          item_id: string
          new_description_rich?: Json
          new_is_bold?: boolean
          new_is_italic?: boolean
          new_is_section_header?: boolean
          new_is_underline?: boolean
          new_responsible?: string
          new_time_text?: string
          share_token: string
        }
        Returns: boolean
      }
      update_running_sheet_meta_by_token: {
        Args: {
          new_section_label?: string
          new_section_notes?: string
          share_token: string
        }
        Returns: boolean
      }
      upsert_notification_settings: {
        Args: {
          _email_enabled?: boolean
          _from_email?: string
          _resend_api_key?: string
          _sms_enabled?: boolean
          _sms_provider?: string
          _twilio_account_sid?: string
          _twilio_auth_token?: string
          _twilio_messaging_service_sid?: string
          _user_id: string
        }
        Returns: Json
      }
      validate_guest_access: {
        Args: { _access_token: string; _guest_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "collaborator" | "owner"
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
      app_role: ["admin", "collaborator", "owner"],
    },
  },
} as const
