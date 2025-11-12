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
      ai_conversations: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          session_id: string
          user_type: string
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          session_id: string
          user_type: string
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          session_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_base: {
        Row: {
          answer: string
          category: string
          created_at: string | null
          event_id: string
          id: string
          is_active: boolean | null
          question: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          category: string
          created_at?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          question?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          question?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_base_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          audio_url: string | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          message_type: string | null
          role: string
        }
        Insert: {
          audio_url?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          role: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      dietary_chart_settings: {
        Row: {
          created_at: string
          event_id: string
          font_size: string
          id: string
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
      dj_answers: {
        Row: {
          answered_by: string | null
          created_at: string | null
          id: string
          item_id: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          answered_by?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          answered_by?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dj_answers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "dj_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_items: {
        Row: {
          created_at: string | null
          help_text: string | null
          id: string
          meta: Json | null
          prompt: string
          required: boolean | null
          section_id: string
          sort_index: number
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          help_text?: string | null
          id?: string
          meta?: Json | null
          prompt: string
          required?: boolean | null
          section_id: string
          sort_index?: number
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          help_text?: string | null
          id?: string
          meta?: Json | null
          prompt?: string
          required?: boolean | null
          section_id?: string
          sort_index?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dj_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "dj_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_questionnaire_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by_name: string | null
          acknowledged_from_ip: unknown
          created_at: string | null
          id: string
          questionnaire_id: string
          user_agent: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by_name?: string | null
          acknowledged_from_ip?: unknown
          created_at?: string | null
          id?: string
          questionnaire_id: string
          user_agent?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by_name?: string | null
          acknowledged_from_ip?: unknown
          created_at?: string | null
          id?: string
          questionnaire_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dj_questionnaire_acknowledgments_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "dj_questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_questionnaire_tokens: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          questionnaire_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          questionnaire_id: string
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          questionnaire_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "dj_questionnaire_tokens_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "dj_questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_questionnaires: {
        Row: {
          approved_at: string | null
          approved_by_name: string | null
          approved_from_ip: unknown
          created_at: string | null
          created_by: string
          event_id: string
          header_overrides: Json | null
          id: string
          meta: Json | null
          notes: string | null
          recipient_emails: string[] | null
          recipient_phones: string[] | null
          sent_at: string | null
          share_token: string | null
          sms_sent_at: string | null
          status: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by_name?: string | null
          approved_from_ip?: unknown
          created_at?: string | null
          created_by: string
          event_id: string
          header_overrides?: Json | null
          id?: string
          meta?: Json | null
          notes?: string | null
          recipient_emails?: string[] | null
          recipient_phones?: string[] | null
          sent_at?: string | null
          share_token?: string | null
          sms_sent_at?: string | null
          status?: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by_name?: string | null
          approved_from_ip?: unknown
          created_at?: string | null
          created_by?: string
          event_id?: string
          header_overrides?: Json | null
          id?: string
          meta?: Json | null
          notes?: string | null
          recipient_emails?: string[] | null
          recipient_phones?: string[] | null
          sent_at?: string | null
          share_token?: string | null
          sms_sent_at?: string | null
          status?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dj_questionnaires_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_sections: {
        Row: {
          created_at: string | null
          id: string
          instructions: string | null
          label: string
          questionnaire_id: string
          recommendations: Json | null
          sort_index: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instructions?: string | null
          label: string
          questionnaire_id: string
          recommendations?: Json | null
          sort_index?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instructions?: string | null
          label?: string
          questionnaire_id?: string
          recommendations?: Json | null
          sort_index?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dj_sections_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "dj_questionnaires"
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
      event_rsvp_automation_settings: {
        Row: {
          auto_reminders_enabled: boolean | null
          created_at: string | null
          daily_summary_enabled: boolean | null
          daily_summary_time: string | null
          event_id: string
          id: string
          last_daily_summary_sent_at: string | null
          last_reminder_sent_at: string | null
          next_reminder_scheduled_at: string | null
          notify_both_partners: boolean | null
          notify_event_planner: boolean | null
          notify_partner1: boolean | null
          notify_partner2: boolean | null
          reminder_days_before: number | null
          reminder_only_no_reply: boolean | null
          updated_at: string | null
        }
        Insert: {
          auto_reminders_enabled?: boolean | null
          created_at?: string | null
          daily_summary_enabled?: boolean | null
          daily_summary_time?: string | null
          event_id: string
          id?: string
          last_daily_summary_sent_at?: string | null
          last_reminder_sent_at?: string | null
          next_reminder_scheduled_at?: string | null
          notify_both_partners?: boolean | null
          notify_event_planner?: boolean | null
          notify_partner1?: boolean | null
          notify_partner2?: boolean | null
          reminder_days_before?: number | null
          reminder_only_no_reply?: boolean | null
          updated_at?: string | null
        }
        Update: {
          auto_reminders_enabled?: boolean | null
          created_at?: string | null
          daily_summary_enabled?: boolean | null
          daily_summary_time?: string | null
          event_id?: string
          id?: string
          last_daily_summary_sent_at?: string | null
          last_reminder_sent_at?: string | null
          next_reminder_scheduled_at?: string | null
          notify_both_partners?: boolean | null
          notify_event_planner?: boolean | null
          notify_partner1?: boolean | null
          notify_partner2?: boolean | null
          reminder_days_before?: number | null
          reminder_only_no_reply?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvp_automation_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
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
      full_seating_chart_settings: {
        Row: {
          created_at: string
          event_id: string
          font_size: string
          id: string
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
      guestbook_messages: {
        Row: {
          created_at: string
          event_id: string
          guest_name: string | null
          id: string
          message: string
          uploader_id: string | null
          visibility: string
        }
        Insert: {
          created_at?: string
          event_id: string
          guest_name?: string | null
          id?: string
          message: string
          uploader_id?: string | null
          visibility?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          guest_name?: string | null
          id?: string
          message?: string
          uploader_id?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "guestbook_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      media_gallery_settings: {
        Row: {
          album_expires_at: string | null
          album_title: string | null
          allow_photos: boolean | null
          allow_videos: boolean | null
          cover_photo_url: string | null
          created_at: string
          event_id: string
          gallery_password: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          max_photo_size_mb: number | null
          max_uploads_per_guest: number | null
          max_video_duration_seconds: number | null
          max_video_size_mb: number | null
          password_protected: boolean | null
          primary_color: string | null
          require_approval: boolean | null
          show_captions: boolean | null
          show_download_buttons: boolean | null
          slideshow_interval_seconds: number | null
          updated_at: string
          user_id: string
          watermark_enabled: boolean | null
          watermark_text: string | null
          welcome_text: string | null
        }
        Insert: {
          album_expires_at?: string | null
          album_title?: string | null
          allow_photos?: boolean | null
          allow_videos?: boolean | null
          cover_photo_url?: string | null
          created_at?: string
          event_id: string
          gallery_password?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_photo_size_mb?: number | null
          max_uploads_per_guest?: number | null
          max_video_duration_seconds?: number | null
          max_video_size_mb?: number | null
          password_protected?: boolean | null
          primary_color?: string | null
          require_approval?: boolean | null
          show_captions?: boolean | null
          show_download_buttons?: boolean | null
          slideshow_interval_seconds?: number | null
          updated_at?: string
          user_id: string
          watermark_enabled?: boolean | null
          watermark_text?: string | null
          welcome_text?: string | null
        }
        Update: {
          album_expires_at?: string | null
          album_title?: string | null
          allow_photos?: boolean | null
          allow_videos?: boolean | null
          cover_photo_url?: string | null
          created_at?: string
          event_id?: string
          gallery_password?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_photo_size_mb?: number | null
          max_uploads_per_guest?: number | null
          max_video_duration_seconds?: number | null
          max_video_size_mb?: number | null
          password_protected?: boolean | null
          primary_color?: string | null
          require_approval?: boolean | null
          show_captions?: boolean | null
          show_download_buttons?: boolean | null
          slideshow_interval_seconds?: number | null
          updated_at?: string
          user_id?: string
          watermark_enabled?: boolean | null
          watermark_text?: string | null
          welcome_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_gallery_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          caption: string | null
          cloudflare_stream_uid: string | null
          created_at: string
          duration_sec: number | null
          event_id: string
          filesize: number | null
          height: number | null
          id: string
          sort_index: number | null
          status: string
          storage_path: string | null
          thumbnail_path: string | null
          type: string
          updated_at: string
          uploader_id: string | null
          visibility: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          cloudflare_stream_uid?: string | null
          created_at?: string
          duration_sec?: number | null
          event_id: string
          filesize?: number | null
          height?: number | null
          id?: string
          sort_index?: number | null
          status?: string
          storage_path?: string | null
          thumbnail_path?: string | null
          type: string
          updated_at?: string
          uploader_id?: string | null
          visibility?: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          cloudflare_stream_uid?: string | null
          created_at?: string
          duration_sec?: number | null
          event_id?: string
          filesize?: number | null
          height?: number | null
          id?: string
          sort_index?: number | null
          status?: string
          storage_path?: string | null
          thumbnail_path?: string | null
          type?: string
          updated_at?: string
          uploader_id?: string | null
          visibility?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
          sms_enabled: boolean | null
          sms_provider: string | null
          twilio_account_sid: string | null
          twilio_auth_token: string | null
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
          sms_enabled?: boolean | null
          sms_provider?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
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
          sms_enabled?: boolean | null
          sms_provider?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_messaging_service_sid?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      place_card_settings: {
        Row: {
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
      reminder_deliveries: {
        Row: {
          campaign_id: string
          created_at: string | null
          delivered_at: string | null
          delivery_method: string
          error_message: string | null
          guest_id: string
          id: string
          reminder_type: string | null
          sent_at: string | null
          sent_by_user_id: string | null
          status: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          delivered_at?: string | null
          delivery_method: string
          error_message?: string | null
          guest_id: string
          id?: string
          reminder_type?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          delivered_at?: string | null
          delivery_method?: string
          error_message?: string | null
          guest_id?: string
          id?: string
          reminder_type?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_deliveries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "rsvp_reminder_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_deliveries_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_notification_settings: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          notification_email: string | null
          notify_on_accept: boolean | null
          notify_on_decline: boolean | null
          notify_on_update: boolean | null
          sms_enabled: boolean | null
          twilio_sender_id: string | null
          updated_at: string | null
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          notification_email?: string | null
          notify_on_accept?: boolean | null
          notify_on_decline?: boolean | null
          notify_on_update?: boolean | null
          sms_enabled?: boolean | null
          twilio_sender_id?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          notification_email?: string | null
          notify_on_accept?: boolean | null
          notify_on_decline?: boolean | null
          notify_on_update?: boolean | null
          sms_enabled?: boolean | null
          twilio_sender_id?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      rsvp_reminder_campaigns: {
        Row: {
          created_at: string | null
          delivery_method: string
          event_id: string
          id: string
          message_template: string
          name: string
          scheduled_for: string | null
          sent_count: number | null
          status: string | null
          target_status: string[] | null
          total_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_method: string
          event_id: string
          id?: string
          message_template: string
          name: string
          scheduled_for?: string | null
          sent_count?: number | null
          status?: string | null
          target_status?: string[] | null
          total_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivery_method?: string
          event_id?: string
          id?: string
          message_template?: string
          name?: string
          scheduled_for?: string | null
          sent_count?: number | null
          status?: string | null
          target_status?: string[] | null
          total_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_reminder_campaigns_event_id_fkey"
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
          is_section_header: boolean | null
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
          is_section_header?: boolean | null
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
          is_section_header?: boolean | null
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
      upload_rate_limits: {
        Row: {
          event_slug: string
          id: string
          ip_address: unknown
          request_count: number
          window_start: string
        }
        Insert: {
          event_slug: string
          id?: string
          ip_address: unknown
          request_count?: number
          window_start?: string
        }
        Update: {
          event_slug?: string
          id?: string
          ip_address?: unknown
          request_count?: number
          window_start?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_event: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_old_access_attempts: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
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
      generate_short_slug: { Args: never; Returns: string }
      generate_slug: { Args: { input_text: string }; Returns: string }
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
      get_gallery_media: {
        Args: { _event_slug: string }
        Returns: {
          caption: string
          cloudflare_stream_uid: string
          created_at: string
          duration_sec: number
          filesize: number
          height: number
          id: string
          status: string
          storage_path: string
          thumbnail_path: string
          type: string
          width: number
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
      get_guestbook_messages: {
        Args: { _event_slug: string }
        Returns: {
          created_at: string
          guest_name: string
          id: string
          message: string
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
      get_questionnaire_by_token: {
        Args: { _share_token: string }
        Returns: {
          answer_value: Json
          approved_at: string
          approved_by_name: string
          event_date: string
          event_id: string
          event_name: string
          header_overrides: Json
          item_id: string
          item_prompt: string
          item_sort_index: number
          item_type: string
          questionnaire_id: string
          section_id: string
          section_label: string
          section_sort_index: number
          status: string
          template_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
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
