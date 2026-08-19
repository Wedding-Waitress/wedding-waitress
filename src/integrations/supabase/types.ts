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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_invitations: {
        Row: {
          accepted_user_id: string | null
          account_owner_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_user_id?: string | null
          account_owner_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_user_id?: string | null
          account_owner_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      account_lifecycle: {
        Row: {
          account_owner_id: string
          audit_metadata: Json
          deleted_by_user_id: string | null
          deletion_processing_error: string | null
          deletion_requested_at: string | null
          purge_after: string | null
          reactivated_at: string | null
          status: string
          stripe_cancellation_at: string | null
          stripe_cancellation_succeeded: boolean | null
          updated_at: string
        }
        Insert: {
          account_owner_id: string
          audit_metadata?: Json
          deleted_by_user_id?: string | null
          deletion_processing_error?: string | null
          deletion_requested_at?: string | null
          purge_after?: string | null
          reactivated_at?: string | null
          status?: string
          stripe_cancellation_at?: string | null
          stripe_cancellation_succeeded?: boolean | null
          updated_at?: string
        }
        Update: {
          account_owner_id?: string
          audit_metadata?: Json
          deleted_by_user_id?: string | null
          deletion_processing_error?: string | null
          deletion_requested_at?: string | null
          purge_after?: string | null
          reactivated_at?: string | null
          status?: string
          stripe_cancellation_at?: string | null
          stripe_cancellation_succeeded?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      account_lifecycle_audit: {
        Row: {
          account_owner_id: string | null
          action: string
          actor_user_id: string | null
          id: string
          metadata: Json
          occurred_at: string
        }
        Insert: {
          account_owner_id?: string | null
          action: string
          actor_user_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
        }
        Update: {
          account_owner_id?: string | null
          action?: string
          actor_user_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
        }
        Relationships: []
      }
      account_members: {
        Row: {
          accepted_at: string | null
          access_disabled_at: string | null
          account_owner_id: string
          created_at: string
          id: string
          invited_at: string
          member_user_id: string
          role: string
        }
        Insert: {
          accepted_at?: string | null
          access_disabled_at?: string | null
          account_owner_id: string
          created_at?: string
          id?: string
          invited_at?: string
          member_user_id: string
          role?: string
        }
        Update: {
          accepted_at?: string | null
          access_disabled_at?: string | null
          account_owner_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          member_user_id?: string
          role?: string
        }
        Relationships: []
      }
      additional_event_purchases: {
        Row: {
          amount: number
          created_at: string
          currency: string
          event_id: string | null
          id: string
          status: string
          stripe_price_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          event_id?: string | null
          id?: string
          status?: string
          stripe_price_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          event_id?: string | null
          id?: string
          status?: string
          stripe_price_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "additional_event_purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_account_controls: {
        Row: {
          account_owner_id: string
          changed_at: string
          changed_by: string | null
          reason: string | null
          status: string
        }
        Insert: {
          account_owner_id: string
          changed_at?: string
          changed_by?: string | null
          reason?: string | null
          status?: string
        }
        Update: {
          account_owner_id?: string
          changed_at?: string
          changed_by?: string | null
          reason?: string | null
          status?: string
        }
        Relationships: []
      }
      admin_action_audit: {
        Row: {
          action: string
          administrator_id: string | null
          created_at: string
          id: string
          new_state: Json
          previous_state: Json
          reason: string
          result: string
          safe_error_reference: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          administrator_id?: string | null
          created_at?: string
          id?: string
          new_state?: Json
          previous_state?: Json
          reason: string
          result: string
          safe_error_reference?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          administrator_id?: string | null
          created_at?: string
          id?: string
          new_state?: Json
          previous_state?: Json
          reason?: string
          result?: string
          safe_error_reference?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      admin_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          kind: string
          metadata: Json
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          metadata?: Json
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      dietary_chart_settings: {
        Row: {
          created_at: string
          dietary_color: string
          event_id: string
          font_size: string
          guest_list_color: string
          guest_name_color: string
          id: string
          is_bold: boolean
          is_italic: boolean
          is_underline: boolean
          mobile_color: string
          paper_size: string
          relationship_color: string
          seat_number_color: string
          show_dietary: boolean
          show_guest_list: boolean
          show_guest_names: boolean
          show_logo: boolean
          show_mobile: boolean
          show_relation: boolean
          show_seat_no: boolean
          show_seat_numbers: boolean
          sort_by: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dietary_color?: string
          event_id: string
          font_size?: string
          guest_list_color?: string
          guest_name_color?: string
          id?: string
          is_bold?: boolean
          is_italic?: boolean
          is_underline?: boolean
          mobile_color?: string
          paper_size?: string
          relationship_color?: string
          seat_number_color?: string
          show_dietary?: boolean
          show_guest_list?: boolean
          show_guest_names?: boolean
          show_logo?: boolean
          show_mobile?: boolean
          show_relation?: boolean
          show_seat_no?: boolean
          show_seat_numbers?: boolean
          sort_by?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dietary_color?: string
          event_id?: string
          font_size?: string
          guest_list_color?: string
          guest_name_color?: string
          id?: string
          is_bold?: boolean
          is_italic?: boolean
          is_underline?: boolean
          mobile_color?: string
          paper_size?: string
          relationship_color?: string
          seat_number_color?: string
          show_dietary?: boolean
          show_guest_list?: boolean
          show_guest_names?: boolean
          show_logo?: boolean
          show_mobile?: boolean
          show_relation?: boolean
          show_seat_no?: boolean
          show_seat_numbers?: boolean
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
      event_guestbook_messages: {
        Row: {
          created_at: string
          event_id: string
          gallery_id: string
          guestbook_seq: number | null
          id: string
          message: string
          moderation_status: string
          source_category: string
          updated_at: string
          uploader_name: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          gallery_id: string
          guestbook_seq?: number | null
          id?: string
          message: string
          moderation_status?: string
          source_category?: string
          updated_at?: string
          uploader_name?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          gallery_id?: string
          guestbook_seq?: number | null
          id?: string
          message?: string
          moderation_status?: string
          source_category?: string
          updated_at?: string
          uploader_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_guestbook_messages_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "event_media_galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      event_media_galleries: {
        Row: {
          background_color: string | null
          background_image_url: string | null
          background_mode: string
          background_style: string
          cover_image_url: string | null
          created_at: string
          event_id: string
          gallery_title: string | null
          gallery_view_enabled: boolean
          guest_upload_enabled: boolean
          guestbook_text_enabled: boolean
          id: string
          is_open: boolean
          logo_image_url: string | null
          password_enabled: boolean
          password_hash: string | null
          photo_booth_enabled: boolean
          photo_booth_mode: string
          photo_booth_single_bottom_text: string | null
          photo_booth_single_logo_url: string | null
          photo_booth_single_template_url: string | null
          photo_booth_strip_bottom_text: string | null
          photo_booth_strip_logo_url: string | null
          photo_booth_strip_style: Json
          photo_booth_strip_template_url: string | null
          show_branding: boolean
          show_event_date: boolean
          slideshow_albums: string[]
          slideshow_enabled: boolean
          slideshow_include_photos: boolean
          slideshow_include_videos: boolean
          slideshow_loop: boolean
          slideshow_order: string
          slideshow_photo_duration_sec: number
          slideshow_show_caption: boolean
          slideshow_slide_duration_sec: number
          slideshow_transition: string
          theme_color: string | null
          updated_at: string
          user_id: string
          video_guestbook_enabled: boolean
          welcome_message: string | null
        }
        Insert: {
          background_color?: string | null
          background_image_url?: string | null
          background_mode?: string
          background_style?: string
          cover_image_url?: string | null
          created_at?: string
          event_id: string
          gallery_title?: string | null
          gallery_view_enabled?: boolean
          guest_upload_enabled?: boolean
          guestbook_text_enabled?: boolean
          id?: string
          is_open?: boolean
          logo_image_url?: string | null
          password_enabled?: boolean
          password_hash?: string | null
          photo_booth_enabled?: boolean
          photo_booth_mode?: string
          photo_booth_single_bottom_text?: string | null
          photo_booth_single_logo_url?: string | null
          photo_booth_single_template_url?: string | null
          photo_booth_strip_bottom_text?: string | null
          photo_booth_strip_logo_url?: string | null
          photo_booth_strip_style?: Json
          photo_booth_strip_template_url?: string | null
          show_branding?: boolean
          show_event_date?: boolean
          slideshow_albums?: string[]
          slideshow_enabled?: boolean
          slideshow_include_photos?: boolean
          slideshow_include_videos?: boolean
          slideshow_loop?: boolean
          slideshow_order?: string
          slideshow_photo_duration_sec?: number
          slideshow_show_caption?: boolean
          slideshow_slide_duration_sec?: number
          slideshow_transition?: string
          theme_color?: string | null
          updated_at?: string
          user_id: string
          video_guestbook_enabled?: boolean
          welcome_message?: string | null
        }
        Update: {
          background_color?: string | null
          background_image_url?: string | null
          background_mode?: string
          background_style?: string
          cover_image_url?: string | null
          created_at?: string
          event_id?: string
          gallery_title?: string | null
          gallery_view_enabled?: boolean
          guest_upload_enabled?: boolean
          guestbook_text_enabled?: boolean
          id?: string
          is_open?: boolean
          logo_image_url?: string | null
          password_enabled?: boolean
          password_hash?: string | null
          photo_booth_enabled?: boolean
          photo_booth_mode?: string
          photo_booth_single_bottom_text?: string | null
          photo_booth_single_logo_url?: string | null
          photo_booth_single_template_url?: string | null
          photo_booth_strip_bottom_text?: string | null
          photo_booth_strip_logo_url?: string | null
          photo_booth_strip_style?: Json
          photo_booth_strip_template_url?: string | null
          show_branding?: boolean
          show_event_date?: boolean
          slideshow_albums?: string[]
          slideshow_enabled?: boolean
          slideshow_include_photos?: boolean
          slideshow_include_videos?: boolean
          slideshow_loop?: boolean
          slideshow_order?: string
          slideshow_photo_duration_sec?: number
          slideshow_show_caption?: boolean
          slideshow_slide_duration_sec?: number
          slideshow_transition?: string
          theme_color?: string | null
          updated_at?: string
          user_id?: string
          video_guestbook_enabled?: boolean
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_media_galleries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_media_items: {
        Row: {
          album: string | null
          byte_size: number
          caption: string | null
          created_at: string
          duration_sec: number | null
          event_id: string
          gallery_id: string
          guestbook_message: string | null
          guestbook_recording_seq: number | null
          id: string
          is_guestbook: boolean
          is_photo_booth: boolean
          is_photo_booth_strip: boolean
          kind: Database["public"]["Enums"]["event_media_kind"]
          like_count: number
          mime_type: string
          moderation_status: string
          photo_booth_seq: number | null
          share_photo_seq: number | null
          share_video_seq: number | null
          shared_to_gallery: boolean
          source_category: string
          storage_path: string
          upload_status: Database["public"]["Enums"]["event_media_upload_status"]
          upload_token_expires_at: string | null
          upload_token_hash: string | null
          upload_token_id: string | null
          upload_token_used_at: string | null
          uploaded_at: string | null
          uploader_name: string | null
        }
        Insert: {
          album?: string | null
          byte_size: number
          caption?: string | null
          created_at?: string
          duration_sec?: number | null
          event_id: string
          gallery_id: string
          guestbook_message?: string | null
          guestbook_recording_seq?: number | null
          id?: string
          is_guestbook?: boolean
          is_photo_booth?: boolean
          is_photo_booth_strip?: boolean
          kind: Database["public"]["Enums"]["event_media_kind"]
          like_count?: number
          mime_type: string
          moderation_status?: string
          photo_booth_seq?: number | null
          share_photo_seq?: number | null
          share_video_seq?: number | null
          shared_to_gallery?: boolean
          source_category?: string
          storage_path: string
          upload_status?: Database["public"]["Enums"]["event_media_upload_status"]
          upload_token_expires_at?: string | null
          upload_token_hash?: string | null
          upload_token_id?: string | null
          upload_token_used_at?: string | null
          uploaded_at?: string | null
          uploader_name?: string | null
        }
        Update: {
          album?: string | null
          byte_size?: number
          caption?: string | null
          created_at?: string
          duration_sec?: number | null
          event_id?: string
          gallery_id?: string
          guestbook_message?: string | null
          guestbook_recording_seq?: number | null
          id?: string
          is_guestbook?: boolean
          is_photo_booth?: boolean
          is_photo_booth_strip?: boolean
          kind?: Database["public"]["Enums"]["event_media_kind"]
          like_count?: number
          mime_type?: string
          moderation_status?: string
          photo_booth_seq?: number | null
          share_photo_seq?: number | null
          share_video_seq?: number | null
          shared_to_gallery?: boolean
          source_category?: string
          storage_path?: string
          upload_status?: Database["public"]["Enums"]["event_media_upload_status"]
          upload_token_expires_at?: string | null
          upload_token_hash?: string | null
          upload_token_id?: string | null
          upload_token_used_at?: string | null
          uploaded_at?: string | null
          uploader_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_media_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_media_items_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "event_media_galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_media_items_upload_token_id_fkey"
            columns: ["upload_token_id"]
            isOneToOne: false
            referencedRelation: "event_media_upload_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      event_media_likes: {
        Row: {
          created_at: string
          device_id: string
          id: string
          item_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          item_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_media_likes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "event_media_items"
            referencedColumns: ["id"]
          },
        ]
      }
      event_media_limits: {
        Row: {
          allowed_photo_mimes: string[]
          allowed_video_mimes: string[]
          created_at: string
          event_id: string
          id: string
          max_photo_bytes: number
          max_photos: number
          max_total_bytes: number
          max_video_bytes: number
          max_video_duration_sec: number
          max_videos: number
          updated_at: string
        }
        Insert: {
          allowed_photo_mimes?: string[]
          allowed_video_mimes?: string[]
          created_at?: string
          event_id: string
          id?: string
          max_photo_bytes?: number
          max_photos?: number
          max_total_bytes?: number
          max_video_bytes?: number
          max_video_duration_sec?: number
          max_videos?: number
          updated_at?: string
        }
        Update: {
          allowed_photo_mimes?: string[]
          allowed_video_mimes?: string[]
          created_at?: string
          event_id?: string
          id?: string
          max_photo_bytes?: number
          max_photos?: number
          max_total_bytes?: number
          max_video_bytes?: number
          max_video_duration_sec?: number
          max_videos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_media_limits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_media_seq_counters: {
        Row: {
          created_at: string
          event_id: string
          last_value: number
          seq_kind: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          last_value?: number
          seq_kind: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          last_value?: number
          seq_kind?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_media_upload_tokens: {
        Row: {
          created_at: string
          event_id: string
          expires_at: string | null
          gallery_id: string
          id: string
          max_uploads: number | null
          token: string
          uploads_used: number
        }
        Insert: {
          created_at?: string
          event_id: string
          expires_at?: string | null
          gallery_id: string
          id?: string
          max_uploads?: number | null
          token: string
          uploads_used?: number
        }
        Update: {
          created_at?: string
          event_id?: string
          expires_at?: string | null
          gallery_id?: string
          id?: string
          max_uploads?: number | null
          token?: string
          uploads_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_media_upload_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_media_upload_tokens_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "event_media_galleries"
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
      event_referral_dismissals: {
        Row: {
          dismissed_at: string
          event_id: string
          snooze_until: string | null
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          event_id: string
          snooze_until?: string | null
          user_id: string
        }
        Update: {
          dismissed_at?: string
          event_id?: string
          snooze_until?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_referral_dismissals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
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
          allow_guest_plus_ones: boolean
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
          ceremony_venue_contact_email: string | null
          ceremony_venue_phone: string | null
          collect_guest_addresses: boolean
          created_at: string
          created_date_local: string | null
          custom_roles: Json | null
          date: string | null
          event_created: string
          event_date_override: string | null
          event_display_name: string | null
          event_id: string
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
          public_show_date: boolean
          public_show_partner_names: boolean
          public_show_venue: boolean
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
          venue_contact_email: string | null
          venue_lat: number | null
          venue_lng: number | null
          venue_name: string | null
          venue_phone: string | null
          venue_place_id: string | null
        }
        Insert: {
          allow_guest_plus_ones?: boolean
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
          ceremony_venue_contact_email?: string | null
          ceremony_venue_phone?: string | null
          collect_guest_addresses?: boolean
          created_at?: string
          created_date_local?: string | null
          custom_roles?: Json | null
          date?: string | null
          event_created?: string
          event_date_override?: string | null
          event_display_name?: string | null
          event_id?: string
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
          public_show_date?: boolean
          public_show_partner_names?: boolean
          public_show_venue?: boolean
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
          venue_contact_email?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
          venue_phone?: string | null
          venue_place_id?: string | null
        }
        Update: {
          allow_guest_plus_ones?: boolean
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
          ceremony_venue_contact_email?: string | null
          ceremony_venue_phone?: string | null
          collect_guest_addresses?: boolean
          created_at?: string
          created_date_local?: string | null
          custom_roles?: Json | null
          date?: string | null
          event_created?: string
          event_date_override?: string | null
          event_display_name?: string | null
          event_id?: string
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
          public_show_date?: boolean
          public_show_partner_names?: boolean
          public_show_venue?: boolean
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
          venue_contact_email?: string | null
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
          dietary_color: string
          event_id: string
          font_size: string
          guest_list_color: string
          guest_name_color: string
          id: string
          is_bold: boolean
          is_italic: boolean
          is_underline: boolean
          paper_size: string
          relationship_color: string
          seat_number_color: string
          show_dietary: boolean
          show_guest_list: boolean
          show_guest_names: boolean
          show_logo: boolean | null
          show_relation: boolean
          show_rsvp: boolean
          show_seat_numbers: boolean
          sort_by: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dietary_color?: string
          event_id: string
          font_size?: string
          guest_list_color?: string
          guest_name_color?: string
          id?: string
          is_bold?: boolean
          is_italic?: boolean
          is_underline?: boolean
          paper_size?: string
          relationship_color?: string
          seat_number_color?: string
          show_dietary?: boolean
          show_guest_list?: boolean
          show_guest_names?: boolean
          show_logo?: boolean | null
          show_relation?: boolean
          show_rsvp?: boolean
          show_seat_numbers?: boolean
          sort_by?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dietary_color?: string
          event_id?: string
          font_size?: string
          guest_list_color?: string
          guest_name_color?: string
          id?: string
          is_bold?: boolean
          is_italic?: boolean
          is_underline?: boolean
          paper_size?: string
          relationship_color?: string
          seat_number_color?: string
          show_dietary?: boolean
          show_guest_list?: boolean
          show_guest_names?: boolean
          show_logo?: boolean | null
          show_relation?: boolean
          show_rsvp?: boolean
          show_seat_numbers?: boolean
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
      guest_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["guest_activity_type"]
          channel: Database["public"]["Enums"]["guest_activity_channel"]
          created_at: string
          event_id: string
          guest_id: string
          id: string
          metadata: Json
          occurred_at: string
          status: Database["public"]["Enums"]["guest_activity_status"]
          summary: string | null
          user_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["guest_activity_type"]
          channel?: Database["public"]["Enums"]["guest_activity_channel"]
          created_at?: string
          event_id: string
          guest_id: string
          id?: string
          metadata?: Json
          occurred_at?: string
          status?: Database["public"]["Enums"]["guest_activity_status"]
          summary?: string | null
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["guest_activity_type"]
          channel?: Database["public"]["Enums"]["guest_activity_channel"]
          created_at?: string
          event_id?: string
          guest_id?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          status?: Database["public"]["Enums"]["guest_activity_status"]
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_activities_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_activities_guest_id_fkey"
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
      guest_song_request_settings: {
        Row: {
          created_at: string
          enabled: boolean
          event_id: string
          id: string
          max_requests_per_guest: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event_id: string
          id?: string
          max_requests_per_guest?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event_id?: string
          id?: string
          max_requests_per_guest?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_song_request_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_song_requests: {
        Row: {
          artist_name: string
          created_at: string
          event_id: string
          guest_id: string
          guest_name: string
          id: string
          music_link: string | null
          note: string | null
          slot_index: number
          song_title: string
          status: string
          updated_at: string
        }
        Insert: {
          artist_name?: string
          created_at?: string
          event_id: string
          guest_id: string
          guest_name?: string
          id?: string
          music_link?: string | null
          note?: string | null
          slot_index?: number
          song_title?: string
          status?: string
          updated_at?: string
        }
        Update: {
          artist_name?: string
          created_at?: string
          event_id?: string
          guest_id?: string
          guest_name?: string
          id?: string
          music_link?: string | null
          note?: string | null
          slot_index?: number
          song_title?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_song_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_song_requests_guest_id_fkey"
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
          added_by_guest_id: string | null
          address_received: boolean
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
          mailing_address: string | null
          mailing_postcode: string | null
          mailing_state: string | null
          mailing_suburb: string | null
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
          address_received?: boolean
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
          mailing_address?: string | null
          mailing_postcode?: string | null
          mailing_state?: string | null
          mailing_suburb?: string | null
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
          address_received?: boolean
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
          mailing_address?: string | null
          mailing_postcode?: string | null
          mailing_state?: string | null
          mailing_suburb?: string | null
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
          background_image_height_px: number | null
          background_image_opacity: number | null
          background_image_preview_url: string | null
          background_image_thumb_url: string | null
          background_image_type: string
          background_image_url: string | null
          background_image_width_px: number | null
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
          background_image_height_px?: number | null
          background_image_opacity?: number | null
          background_image_preview_url?: string | null
          background_image_thumb_url?: string | null
          background_image_type?: string
          background_image_url?: string | null
          background_image_width_px?: number | null
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
          background_image_height_px?: number | null
          background_image_opacity?: number | null
          background_image_preview_url?: string | null
          background_image_thumb_url?: string | null
          background_image_type?: string
          background_image_url?: string | null
          background_image_width_px?: number | null
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
      invitation_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
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
          thumbnail_url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_url: string
          name: string
          sort_order?: number
          thumbnail_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          sort_order?: number
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      invitation_image_categories: {
        Row: {
          category_id: string
          created_at: string
          image_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          image_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          image_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_image_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "invitation_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_image_categories_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: true
            referencedRelation: "invitation_gallery_images"
            referencedColumns: ["id"]
          },
        ]
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
          kiosk_show_dietary: boolean
          kiosk_show_rsvp_status: boolean
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
          kiosk_show_dietary?: boolean
          kiosk_show_rsvp_status?: boolean
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
          kiosk_show_dietary?: boolean
          kiosk_show_rsvp_status?: boolean
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
      media_password_rate_limits: {
        Row: {
          attempt_count: number
          blocked_until: string | null
          created_at: string
          event_id: string | null
          id: string
          key_hash: string
          last_attempt_at: string
          scope: string
          updated_at: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          key_hash: string
          last_attempt_at?: string
          scope: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          key_hash?: string
          last_attempt_at?: string
          scope?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          from_email: string | null
          id: string
          resend_api_key_encrypted: string | null
          sms_enabled: boolean | null
          sms_provider: string | null
          twilio_account_sid: string | null
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
          resend_api_key_encrypted?: string | null
          sms_enabled?: boolean | null
          sms_provider?: string | null
          twilio_account_sid?: string | null
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
          resend_api_key_encrypted?: string | null
          sms_enabled?: boolean | null
          sms_provider?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token_encrypted?: string | null
          twilio_messaging_service_sid?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      photo_booth_background_templates: {
        Row: {
          category: string
          colour: string
          created_at: string
          id: string
          image_url: string
          name: string
          original_path: string
          sort_order: number
          thumbnail_path: string
          thumbnail_url: string
          updated_at: string
        }
        Insert: {
          category?: string
          colour?: string
          created_at?: string
          id?: string
          image_url: string
          name: string
          original_path: string
          sort_order?: number
          thumbnail_path: string
          thumbnail_url: string
          updated_at?: string
        }
        Update: {
          category?: string
          colour?: string
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          original_path?: string
          sort_order?: number
          thumbnail_path?: string
          thumbnail_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      place_card_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
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
          thumbnail_url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_url: string
          name: string
          sort_order?: number
          thumbnail_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          sort_order?: number
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      place_card_image_categories: {
        Row: {
          category_id: string
          created_at: string
          image_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          image_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          image_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_card_image_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "place_card_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_card_image_categories_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "place_card_gallery_images"
            referencedColumns: ["id"]
          },
        ]
      }
      place_card_settings: {
        Row: {
          back_image_url: string | null
          background_behind_names: boolean | null
          background_behind_table_seats: boolean | null
          background_color: string
          background_image_height_px: number | null
          background_image_opacity: number | null
          background_image_preview_url: string | null
          background_image_scale: number | null
          background_image_thumb_url: string | null
          background_image_type: string
          background_image_url: string | null
          background_image_width_px: number | null
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
          photo_video_qr_enabled: boolean
          photo_video_qr_size: number
          photo_video_qr_x: number
          photo_video_qr_y: number
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
          background_image_height_px?: number | null
          background_image_opacity?: number | null
          background_image_preview_url?: string | null
          background_image_scale?: number | null
          background_image_thumb_url?: string | null
          background_image_type?: string
          background_image_url?: string | null
          background_image_width_px?: number | null
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
          photo_video_qr_enabled?: boolean
          photo_video_qr_size?: number
          photo_video_qr_x?: number
          photo_video_qr_y?: number
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
          background_image_height_px?: number | null
          background_image_opacity?: number | null
          background_image_preview_url?: string | null
          background_image_scale?: number | null
          background_image_thumb_url?: string | null
          background_image_type?: string
          background_image_url?: string | null
          background_image_width_px?: number | null
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
          photo_video_qr_enabled?: boolean
          photo_video_qr_size?: number
          photo_video_qr_x?: number
          photo_video_qr_y?: number
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
          account_id: string
          country_code: string | null
          created_at: string | null
          display_countdown_event_id: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          mobile: string | null
          profile_image_fit: string
          profile_image_path: string | null
          profile_image_position_x: number
          profile_image_position_y: number
        }
        Insert: {
          account_id?: string
          country_code?: string | null
          created_at?: string | null
          display_countdown_event_id?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          mobile?: string | null
          profile_image_fit?: string
          profile_image_path?: string | null
          profile_image_position_x?: number
          profile_image_position_y?: number
        }
        Update: {
          account_id?: string
          country_code?: string | null
          created_at?: string | null
          display_countdown_event_id?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          mobile?: string | null
          profile_image_fit?: string
          profile_image_path?: string | null
          profile_image_position_x?: number
          profile_image_position_y?: number
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
      reception_floor_plans: {
        Row: {
          approval_status: string
          background_height: number | null
          background_image_url: string | null
          background_locked: boolean
          background_opacity: number
          background_rotation: number
          background_visible: boolean
          background_width: number | null
          background_x: number
          background_y: number
          created_at: string
          event_id: string
          fixtures: Json
          grid_size_cm: number
          id: string
          last_saved_at: string
          pan_x: number
          pan_y: number
          room_length_m: number
          room_polygon: Json | null
          room_shape: string
          room_width_m: number
          share_enabled: boolean
          share_token: string | null
          table_positions: Json
          updated_at: string
          user_id: string
          vendor_notes: string | null
          zoom: number
        }
        Insert: {
          approval_status?: string
          background_height?: number | null
          background_image_url?: string | null
          background_locked?: boolean
          background_opacity?: number
          background_rotation?: number
          background_visible?: boolean
          background_width?: number | null
          background_x?: number
          background_y?: number
          created_at?: string
          event_id: string
          fixtures?: Json
          grid_size_cm?: number
          id?: string
          last_saved_at?: string
          pan_x?: number
          pan_y?: number
          room_length_m?: number
          room_polygon?: Json | null
          room_shape?: string
          room_width_m?: number
          share_enabled?: boolean
          share_token?: string | null
          table_positions?: Json
          updated_at?: string
          user_id: string
          vendor_notes?: string | null
          zoom?: number
        }
        Update: {
          approval_status?: string
          background_height?: number | null
          background_image_url?: string | null
          background_locked?: boolean
          background_opacity?: number
          background_rotation?: number
          background_visible?: boolean
          background_width?: number | null
          background_x?: number
          background_y?: number
          created_at?: string
          event_id?: string
          fixtures?: Json
          grid_size_cm?: number
          id?: string
          last_saved_at?: string
          pan_x?: number
          pan_y?: number
          room_length_m?: number
          room_polygon?: Json | null
          room_shape?: string
          room_width_m?: number
          share_enabled?: boolean
          share_token?: string | null
          table_positions?: Json
          updated_at?: string
          user_id?: string
          vendor_notes?: string | null
          zoom?: number
        }
        Relationships: [
          {
            foreignKeyName: "reception_floor_plans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_user_id: string | null
          referrer_user_id: string
          signed_up_at: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_user_id?: string | null
          referrer_user_id: string
          signed_up_at?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_user_id?: string | null
          referrer_user_id?: string
          signed_up_at?: string | null
          status?: string
        }
        Relationships: []
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
          delivery_method: string | null
          event_id: string
          guest_count_at_purchase: number | null
          guest_tier_label: string | null
          id: string
          overage_blocks: number
          purchase_type: string
          purchased_limit: number | null
          status: string
          stripe_payment_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          delivery_method?: string | null
          event_id: string
          guest_count_at_purchase?: number | null
          guest_tier_label?: string | null
          id?: string
          overage_blocks?: number
          purchase_type?: string
          purchased_limit?: number | null
          status?: string
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          delivery_method?: string | null
          event_id?: string
          guest_count_at_purchase?: number | null
          guest_tier_label?: string | null
          id?: string
          overage_blocks?: number
          purchase_type?: string
          purchased_limit?: number | null
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
      signage_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      signage_gallery_images: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          name: string
          preview_url: string | null
          sort_order: number
          thumbnail_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          image_url: string
          name: string
          preview_url?: string | null
          sort_order?: number
          thumbnail_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          preview_url?: string | null
          sort_order?: number
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      signage_image_categories: {
        Row: {
          category_id: string
          created_at: string
          image_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          image_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          image_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signage_image_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "signage_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signage_image_categories_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: true
            referencedRelation: "signage_gallery_images"
            referencedColumns: ["id"]
          },
        ]
      }
      signage_settings: {
        Row: {
          background_color: string
          background_image_height_px: number | null
          background_image_opacity: number
          background_image_preview_url: string | null
          background_image_print_url: string | null
          background_image_thumb_url: string | null
          background_image_type: string
          background_image_url: string | null
          background_image_width_px: number | null
          background_image_x_position: number
          background_image_y_position: number
          created_at: string
          event_id: string
          id: string
          notes: string | null
          orientation: string
          qr_config: Json
          text_zones: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          background_color?: string
          background_image_height_px?: number | null
          background_image_opacity?: number
          background_image_preview_url?: string | null
          background_image_print_url?: string | null
          background_image_thumb_url?: string | null
          background_image_type?: string
          background_image_url?: string | null
          background_image_width_px?: number | null
          background_image_x_position?: number
          background_image_y_position?: number
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          orientation?: string
          qr_config?: Json
          text_zones?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          background_color?: string
          background_image_height_px?: number | null
          background_image_opacity?: number
          background_image_preview_url?: string | null
          background_image_print_url?: string | null
          background_image_thumb_url?: string | null
          background_image_type?: string
          background_image_url?: string | null
          background_image_width_px?: number | null
          background_image_x_position?: number
          background_image_y_position?: number
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          orientation?: string
          qr_config?: Json
          text_zones?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_credits: {
        Row: {
          created_at: string
          event_id: string
          id: string
          last_topup_at: string | null
          remaining: number | null
          total: number
          updated_at: string
          used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          last_topup_at?: string | null
          remaining?: number | null
          total?: number
          updated_at?: string
          used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          last_topup_at?: string | null
          remaining?: number | null
          total?: number
          updated_at?: string
          used?: number
          user_id?: string
        }
        Relationships: []
      }
      sms_pricing_constants: {
        Row: {
          created_at: string
          gst_rate: number
          id: string
          included_credits: number
          is_active: boolean
          topup_credits: number
          topup_price_aud: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          gst_rate?: number
          id?: string
          included_credits?: number
          is_active?: boolean
          topup_credits?: number
          topup_price_aud?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          gst_rate?: number
          id?: string
          included_credits?: number
          is_active?: boolean
          topup_credits?: number
          topup_price_aud?: number
          updated_at?: string
        }
        Relationships: []
      }
      sms_send_logs: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_method: string
          error_code: string | null
          error_message: string | null
          event_id: string
          failed_at: string | null
          guest_id: string | null
          id: string
          last_status_at: string
          raw_twilio_status: string | null
          status: Database["public"]["Enums"]["sms_delivery_status"]
          to_masked: string | null
          twilio_error_code: string | null
          twilio_error_message: string | null
          twilio_sid: string | null
          user_id: string
          webhook_payload: Json | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_method?: string
          error_code?: string | null
          error_message?: string | null
          event_id: string
          failed_at?: string | null
          guest_id?: string | null
          id?: string
          last_status_at?: string
          raw_twilio_status?: string | null
          status: Database["public"]["Enums"]["sms_delivery_status"]
          to_masked?: string | null
          twilio_error_code?: string | null
          twilio_error_message?: string | null
          twilio_sid?: string | null
          user_id: string
          webhook_payload?: Json | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_method?: string
          error_code?: string | null
          error_message?: string | null
          event_id?: string
          failed_at?: string | null
          guest_id?: string | null
          id?: string
          last_status_at?: string
          raw_twilio_status?: string | null
          status?: Database["public"]["Enums"]["sms_delivery_status"]
          to_masked?: string | null
          twilio_error_code?: string | null
          twilio_error_message?: string | null
          twilio_sid?: string | null
          user_id?: string
          webhook_payload?: Json | null
        }
        Relationships: []
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
          included_events: number
          is_active: boolean
          max_users: number
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
          included_events?: number
          is_active?: boolean
          max_users?: number
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
          included_events?: number
          is_active?: boolean
          max_users?: number
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
      testimonial_submissions: {
        Row: {
          caption: string | null
          consent_approved: boolean
          created_at: string
          duration_seconds: number | null
          event_name: string | null
          id: string
          mime_type: string | null
          review_notes: string | null
          reviewed_at: string | null
          size_bytes: number | null
          status: string
          storage_path: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          consent_approved?: boolean
          created_at?: string
          duration_seconds?: number | null
          event_name?: string | null
          id?: string
          mime_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          size_bytes?: number | null
          status?: string
          storage_path: string
          user_id?: string
        }
        Update: {
          caption?: string | null
          consent_approved?: boolean
          created_at?: string
          duration_seconds?: number | null
          event_name?: string | null
          id?: string
          mime_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string
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
      venue_floor_plan_templates: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          background_height: number | null
          background_image_path: string | null
          background_opacity: number
          background_rotation: number
          background_width: number | null
          background_x: number
          background_y: number
          capacity: number
          city: string | null
          country: string | null
          created_at: string
          featured: boolean
          fixtures: Json
          grid_size_cm: number
          id: string
          notes: string | null
          room_length_m: number
          room_name: string
          room_polygon: Json | null
          room_shape: string
          room_width_m: number
          submitted_by: string
          table_positions: Json
          updated_at: string
          venue_name: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          background_height?: number | null
          background_image_path?: string | null
          background_opacity?: number
          background_rotation?: number
          background_width?: number | null
          background_x?: number
          background_y?: number
          capacity?: number
          city?: string | null
          country?: string | null
          created_at?: string
          featured?: boolean
          fixtures?: Json
          grid_size_cm?: number
          id?: string
          notes?: string | null
          room_length_m?: number
          room_name: string
          room_polygon?: Json | null
          room_shape?: string
          room_width_m?: number
          submitted_by: string
          table_positions?: Json
          updated_at?: string
          venue_name: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          background_height?: number | null
          background_image_path?: string | null
          background_opacity?: number
          background_rotation?: number
          background_width?: number | null
          background_x?: number
          background_y?: number
          capacity?: number
          city?: string | null
          country?: string | null
          created_at?: string
          featured?: boolean
          fixtures?: Json
          grid_size_cm?: number
          id?: string
          notes?: string | null
          room_length_m?: number
          room_name?: string
          room_polygon?: Json | null
          room_shape?: string
          room_width_m?: number
          submitted_by?: string
          table_positions?: Json
          updated_at?: string
          venue_name?: string
        }
        Relationships: []
      }
      venue_invitations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          sent_at: string
          status: string
          user_id: string
          venue_contact_name: string | null
          venue_email: string
          venue_name: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          sent_at?: string
          status?: string
          user_id: string
          venue_contact_name?: string | null
          venue_email: string
          venue_name?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          sent_at?: string
          status?: string
          user_id?: string
          venue_contact_name?: string | null
          venue_email?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      _hash_upload_token: { Args: { _raw: string }; Returns: string }
      _random_id8: { Args: never; Returns: string }
      account_event_access: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
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
      add_sms_credits: {
        Args: {
          _amount: number
          _event_id: string
          _source?: string
          _user_id: string
        }
        Returns: Json
      }
      admin_force_account_sign_out: {
        Args: { p_actor: string; p_reason: string; p_target: string }
        Returns: undefined
      }
      admin_lifecycle_action: {
        Args: {
          p_action: string
          p_actor: string
          p_reason: string
          p_target: string
        }
        Returns: Json
      }
      admin_set_account_control: {
        Args: {
          p_action: string
          p_actor: string
          p_reason: string
          p_safe_error_reference?: string
          p_target: string
        }
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
      check_media_password_rate_limit: {
        Args: { _device_key: string; _ip_key: string }
        Returns: number
      }
      cleanup_media_password_rate_limits: { Args: never; Returns: number }
      cleanup_old_access_attempts: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      clear_dj_mc_section_items_by_token: {
        Args: { p_section_id: string; share_token: string }
        Returns: boolean
      }
      complete_account_purge: {
        Args: { p_metadata?: Json; p_user_id: string }
        Returns: undefined
      }
      consume_sms_credit: {
        Args: {
          _event_id: string
          _guest_id: string
          _twilio_sid: string
          _user_id: string
        }
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
      delete_event_guestbook_media: {
        Args: { _item_id: string; _token: string }
        Returns: boolean
      }
      delete_event_guestbook_text: {
        Args: { _id: string; _token: string }
        Returns: boolean
      }
      delete_event_media_item: { Args: { _item_id: string }; Returns: boolean }
      delete_event_media_items: {
        Args: { _item_ids: string[] }
        Returns: {
          event_id: string
          id: string
          storage_path: string
        }[]
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
      ensure_event_media_gallery: {
        Args: { _event_id: string }
        Returns: string
      }
      fail_event_media_upload: {
        Args: { _item_id: string; _upload_token: string }
        Returns: boolean
      }
      finalize_event_media_upload: {
        Args: { _item_id: string; _upload_token: string }
        Returns: boolean
      }
      generate_account_id: { Args: { _country: string }; Returns: string }
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
      generate_event_id: { Args: never; Returns: string }
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
      get_account_closure_admin_summary: {
        Args: never
        Returns: {
          account_owner_id: string
          deletion_processing_error: string
          deletion_requested_at: string
          email: string
          full_name: string
          plan_status: string
          purge_after: string
          reactivated_at: string
          status: string
          stripe_cancellation_succeeded: boolean
        }[]
      }
      get_admin_centre_snapshot: { Args: never; Returns: Json }
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
      get_due_account_purges: {
        Args: { p_limit?: number }
        Returns: {
          account_owner_id: string
          audit_metadata: Json
          deleted_by_user_id: string | null
          deletion_processing_error: string | null
          deletion_requested_at: string | null
          purge_after: string | null
          reactivated_at: string | null
          status: string
          stripe_cancellation_at: string | null
          stripe_cancellation_succeeded: boolean | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "account_lifecycle"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_event_id_for_media_token: {
        Args: { _token: string }
        Returns: string
      }
      get_event_media_gallery_host: {
        Args: { _event_id: string }
        Returns: {
          background_color: string
          background_image_url: string
          background_mode: string
          background_style: string
          cover_image_url: string
          gallery_id: string
          gallery_title: string
          gallery_view_enabled: boolean
          guest_upload_enabled: boolean
          guestbook_text_enabled: boolean
          has_password: boolean
          is_open: boolean
          logo_image_url: string
          max_photo_bytes: number
          max_photos: number
          max_total_bytes: number
          max_video_bytes: number
          max_video_duration_sec: number
          max_videos: number
          password_enabled: boolean
          photo_booth_enabled: boolean
          photo_booth_mode: string
          photo_booth_single_bottom_text: string
          photo_booth_single_logo_url: string
          photo_booth_single_template_url: string
          photo_booth_strip_bottom_text: string
          photo_booth_strip_logo_url: string
          photo_booth_strip_style: Json
          photo_booth_strip_template_url: string
          primary_token: string
          show_branding: boolean
          show_event_date: boolean
          slideshow_albums: string[]
          slideshow_enabled: boolean
          slideshow_include_photos: boolean
          slideshow_include_videos: boolean
          slideshow_loop: boolean
          slideshow_order: string
          slideshow_photo_duration_sec: number
          slideshow_show_caption: boolean
          slideshow_slide_duration_sec: number
          slideshow_transition: string
          theme_color: string
          video_guestbook_enabled: boolean
          welcome_message: string
        }[]
      }
      get_event_media_gallery_public: {
        Args: { _token: string }
        Returns: {
          allowed_photo_mimes: string[]
          allowed_video_mimes: string[]
          background_color: string
          background_image_url: string
          background_mode: string
          background_style: string
          cover_image_url: string
          event_date: string
          event_id: string
          event_name: string
          gallery_id: string
          gallery_title: string
          gallery_view_enabled: boolean
          guest_upload_enabled: boolean
          guestbook_text_enabled: boolean
          is_open: boolean
          logo_image_url: string
          max_photo_bytes: number
          max_photos: number
          max_video_bytes: number
          max_video_duration_sec: number
          max_videos: number
          partner1_name: string
          partner2_name: string
          password_required: boolean
          photo_booth_enabled: boolean
          photo_booth_mode: string
          photo_booth_single_bottom_text: string
          photo_booth_single_logo_url: string
          photo_booth_single_template_url: string
          photo_booth_strip_bottom_text: string
          photo_booth_strip_logo_url: string
          photo_booth_strip_style: Json
          photo_booth_strip_template_url: string
          show_branding: boolean
          show_event_date: boolean
          slideshow_albums: string[]
          slideshow_enabled: boolean
          slideshow_include_photos: boolean
          slideshow_include_videos: boolean
          slideshow_loop: boolean
          slideshow_order: string
          slideshow_photo_duration_sec: number
          slideshow_show_caption: boolean
          slideshow_slide_duration_sec: number
          slideshow_transition: string
          theme_color: string
          video_guestbook_enabled: boolean
          welcome_message: string
        }[]
      }
      get_event_media_gallery_usage_public: {
        Args: { _token: string }
        Returns: {
          bytes_used: number
          max_photos: number
          max_total_bytes: number
          max_videos: number
          photos_used: number
          videos_used: number
        }[]
      }
      get_event_media_items_host: {
        Args: { _event_id: string }
        Returns: {
          album: string
          byte_size: number
          caption: string
          duration_sec: number
          guestbook_message: string
          guestbook_recording_seq: number
          id: string
          is_guestbook: boolean
          is_photo_booth: boolean
          is_photo_booth_strip: boolean
          kind: Database["public"]["Enums"]["event_media_kind"]
          like_count: number
          mime_type: string
          moderation_status: string
          photo_booth_seq: number
          share_photo_seq: number
          share_video_seq: number
          shared_to_gallery: boolean
          source_category: string
          storage_path: string
          uploaded_at: string
          uploader_name: string
        }[]
      }
      get_event_media_items_public: {
        Args: { _token: string }
        Returns: {
          album: string
          caption: string
          duration_sec: number
          id: string
          is_photo_booth_strip: boolean
          kind: Database["public"]["Enums"]["event_media_kind"]
          like_count: number
          mime_type: string
          photo_booth_seq: number
          share_photo_seq: number
          share_video_seq: number
          source_category: string
          storage_path: string
          uploaded_at: string
          uploader_name: string
        }[]
      }
      get_event_media_likes_for_device: {
        Args: { _device_id: string; _token: string }
        Returns: {
          item_id: string
        }[]
      }
      get_event_messaging_analytics: {
        Args: { _event_id: string }
        Returns: Json
      }
      get_events_with_guest_count: {
        Args: never
        Returns: {
          created_at: string
          created_date_local: string
          date: string
          event_created: string
          event_id: string
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
      get_guest_song_request_settings_public: {
        Args: { _event_id: string }
        Returns: {
          enabled: boolean
          max_requests_per_guest: number
        }[]
      }
      get_guest_song_requests_for_guest: {
        Args: { _event_id: string; _guest_id: string }
        Returns: {
          artist_name: string
          id: string
          music_link: string
          note: string
          slot_index: number
          song_title: string
          status: string
        }[]
      }
      get_my_account_lifecycle: { Args: never; Returns: Json }
      get_my_credit_transactions: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          created_at: string
          description: string
          id: string
          kind: string
        }[]
      }
      get_my_credits_balance: { Args: never; Returns: number }
      get_my_referral_stats: {
        Args: never
        Returns: {
          credits_earned: number
          pending: number
          signed_up: number
          total: number
        }[]
      }
      get_my_testimonial_submissions: {
        Args: { p_limit?: number }
        Returns: {
          caption: string
          created_at: string
          event_name: string
          id: string
          status: string
        }[]
      }
      get_notification_settings: { Args: { _user_id: string }; Returns: Json }
      get_or_create_my_referral_code: { Args: never; Returns: string }
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
          ceremony_finish_time: string
          ceremony_start_time: string
          ceremony_venue: string
          ceremony_venue_address: string
          event_allow_guest_plus_ones: boolean
          event_collect_guest_addresses: boolean
          event_date: string
          event_finish_time: string
          event_id: string
          event_name: string
          event_start_time: string
          event_venue: string
          event_venue_address: string
          floor_plan_config: Json
          guest_added_by_guest_id: string
          guest_address_received: boolean
          guest_allow_plus_one: boolean
          guest_dietary: string
          guest_family_group: string
          guest_first_name: string
          guest_id: string
          guest_last_name: string
          guest_mailing_address: string
          guest_mailing_postcode: string
          guest_mailing_state: string
          guest_mailing_suburb: string
          guest_rsvp: string
          guest_seat_no: number
          guest_table_id: string
          guest_table_no: number
          hero_image_config: Json
          kiosk_show_dietary: boolean
          kiosk_show_rsvp_status: boolean
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
      get_reception_floor_plan_by_share_token: {
        Args: { _token: string }
        Returns: Json
      }
      get_reception_share_background_signed_url: {
        Args: { _token: string }
        Returns: string
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
      get_sms_credits: {
        Args: { _event_id: string; _user_id: string }
        Returns: {
          remaining: number
          total: number
          used: number
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
      is_account_master: { Args: { _user_id: string }; Returns: boolean }
      is_account_operational: { Args: { p_user_id?: string }; Returns: boolean }
      is_owner_admin: { Args: never; Returns: boolean }
      is_pending_event_media_path: { Args: { _path: string }; Returns: boolean }
      log_guest_activity: {
        Args: {
          _activity_type: Database["public"]["Enums"]["guest_activity_type"]
          _channel?: Database["public"]["Enums"]["guest_activity_channel"]
          _guest_id: string
          _metadata?: Json
          _occurred_at?: string
          _status?: Database["public"]["Enums"]["guest_activity_status"]
          _summary?: string
        }
        Returns: string
      }
      log_sms_send: {
        Args: {
          _delivery_method?: string
          _error?: string
          _event_id: string
          _guest_id: string
          _status: string
          _to_masked: string
          _twilio_sid: string
          _user_id: string
        }
        Returns: string
      }
      next_event_media_seq: {
        Args: { _event_id: string; _seq_kind: string }
        Returns: number
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
      reactivate_my_account: { Args: never; Returns: Json }
      record_media_password_attempt: {
        Args: {
          _device_key: string
          _event_id: string
          _ip_key: string
          _success: boolean
        }
        Returns: number
      }
      record_referral_signup: { Args: { p_code: string }; Returns: undefined }
      register_event_guestbook_upload: {
        Args: {
          _byte_size: number
          _duration_sec: number
          _filename: string
          _kind: Database["public"]["Enums"]["event_media_kind"]
          _message: string
          _mime_type: string
          _token: string
          _uploader_name: string
        }
        Returns: {
          item_id: string
          storage_path: string
          upload_token: string
        }[]
      }
      register_event_media_upload: {
        Args: {
          _album?: string
          _byte_size: number
          _caption: string
          _duration_sec: number
          _filename: string
          _guestbook_message: string
          _kind: Database["public"]["Enums"]["event_media_kind"]
          _mime_type: string
          _token: string
          _uploader_name: string
        }
        Returns: {
          item_id: string
          storage_path: string
          upload_token: string
        }[]
      }
      register_event_photobooth_upload: {
        Args: {
          _byte_size: number
          _filename: string
          _is_strip?: boolean
          _mime_type: string
          _token: string
          _uploader_name: string
        }
        Returns: {
          item_id: string
          storage_path: string
          upload_token: string
        }[]
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
      schedule_account_closure: {
        Args: {
          p_metadata?: Json
          p_processing_error?: string
          p_stripe_cancelled: boolean
          p_user_id: string
        }
        Returns: Json
      }
      set_event_media_album: {
        Args: { _album: string; _item_id: string }
        Returns: undefined
      }
      set_event_media_albums: {
        Args: { _album: string; _item_ids: string[] }
        Returns: number
      }
      set_event_media_gallery_open: {
        Args: { _event_id: string; _is_open: boolean }
        Returns: boolean
      }
      set_event_media_guest_feature: {
        Args: { _enabled: boolean; _event_id: string; _feature: string }
        Returns: undefined
      }
      set_event_media_guestbook_share: {
        Args: { _item_id: string; _shared: boolean }
        Returns: undefined
      }
      set_event_media_moderation: {
        Args: { _item_id: string; _status: string }
        Returns: undefined
      }
      set_event_media_password: {
        Args: { _enabled: boolean; _event_id: string; _password: string }
        Returns: boolean
      }
      set_event_media_photo_booth: {
        Args: { _enabled: boolean; _event_id: string }
        Returns: undefined
      }
      set_event_media_photo_booth_mode: {
        Args: { _event_id: string; _mode: string }
        Returns: undefined
      }
      set_event_media_slideshow: {
        Args: { _enabled: boolean; _event_id: string }
        Returns: undefined
      }
      set_event_media_video_guestbook: {
        Args: { _enabled: boolean; _event_id: string }
        Returns: undefined
      }
      submit_event_guestbook_text: {
        Args: { _message: string; _token: string; _uploader_name: string }
        Returns: string
      }
      submit_guest_song_requests: {
        Args: { _event_id: string; _guest_id: string; _requests: Json }
        Returns: boolean
      }
      sync_relation_display_for_event: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      toggle_event_media_like: {
        Args: { _device_id: string; _item_id: string; _token: string }
        Returns: {
          like_count: number
          liked: boolean
        }[]
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
      update_event_guestbook_text: {
        Args: {
          _id: string
          _message: string
          _token: string
          _uploader_name: string
        }
        Returns: string
      }
      update_event_media_branding: {
        Args: {
          _background_color?: string
          _background_image_url?: string
          _background_mode?: string
          _background_style: string
          _cover_image_url: string
          _event_id: string
          _logo_image_url: string
          _show_branding: boolean
          _theme_color: string
        }
        Returns: undefined
      }
      update_event_media_display_settings: {
        Args: {
          _event_id: string
          _gallery_title: string
          _show_event_date: boolean
          _slideshow_photo_duration_sec: number
          _welcome_message: string
        }
        Returns: boolean
      }
      update_event_media_limits: {
        Args: {
          _event_id: string
          _max_photo_bytes: number
          _max_photos: number
          _max_total_bytes: number
          _max_video_bytes: number
          _max_video_duration_sec: number
          _max_videos: number
        }
        Returns: boolean
      }
      update_event_media_photo_booth_template:
        | {
            Args: {
              _bottom_text: string
              _event_id: string
              _kind: string
              _logo_url: string
              _template_url: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _bottom_text: string
              _event_id: string
              _kind: string
              _logo_url: string
              _style?: Json
              _template_url: string
            }
            Returns: undefined
          }
      update_event_media_slideshow_settings: {
        Args: {
          _albums: string[]
          _event_id: string
          _include_photos: boolean
          _include_videos: boolean
          _loop: boolean
          _order: string
          _show_caption: boolean
          _slide_duration_sec: number
          _transition: string
        }
        Returns: undefined
      }
      update_guest_rsvp_public: {
        Args: {
          _dietary?: string
          _email?: string
          _event_id: string
          _guest_id: string
          _mailing_address?: string
          _mailing_postcode?: string
          _mailing_state?: string
          _mailing_suburb?: string
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
      update_referring_guest_notes: {
        Args: {
          _event_id: string
          _note_text: string
          _referring_guest_id: string
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
      update_sms_delivery_status: {
        Args: {
          _error_code?: string
          _error_message?: string
          _payload?: Json
          _raw_status?: string
          _status: string
          _twilio_sid: string
        }
        Returns: boolean
      }
      update_sms_log_status: {
        Args: {
          _error?: string
          _error_code?: string
          _id: string
          _status: string
          _twilio_sid?: string
        }
        Returns: undefined
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
      verify_event_media_password: {
        Args: { _password: string; _token: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "collaborator"
        | "owner"
        | "account_master"
        | "account_standard"
      event_media_kind: "photo" | "video" | "audio"
      event_media_upload_status: "pending" | "uploaded" | "failed"
      guest_activity_channel: "email" | "sms" | "whatsapp" | "system" | "web"
      guest_activity_status: "success" | "failure" | "pending" | "info"
      guest_activity_type:
        | "invited_email"
        | "invited_sms"
        | "delivered"
        | "opened"
        | "clicked"
        | "responded"
        | "resent"
        | "reminder_sent"
        | "rsvp_changed"
        | "plus_one_added"
        | "note_added"
        | "bounced"
        | "failed"
        | "unsubscribed"
      sms_delivery_status:
        | "queued"
        | "sent"
        | "delivered"
        | "undelivered"
        | "failed"
        | "blocked"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "admin",
        "collaborator",
        "owner",
        "account_master",
        "account_standard",
      ],
      event_media_kind: ["photo", "video", "audio"],
      event_media_upload_status: ["pending", "uploaded", "failed"],
      guest_activity_channel: ["email", "sms", "whatsapp", "system", "web"],
      guest_activity_status: ["success", "failure", "pending", "info"],
      guest_activity_type: [
        "invited_email",
        "invited_sms",
        "delivered",
        "opened",
        "clicked",
        "responded",
        "resent",
        "reminder_sent",
        "rsvp_changed",
        "plus_one_added",
        "note_added",
        "bounced",
        "failed",
        "unsubscribed",
      ],
      sms_delivery_status: [
        "queued",
        "sent",
        "delivered",
        "undelivered",
        "failed",
        "blocked",
      ],
    },
  },
} as const
