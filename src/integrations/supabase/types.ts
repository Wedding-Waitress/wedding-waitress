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
          event_timezone: string | null
          event_type: string | null
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
          event_timezone?: string | null
          event_type?: string | null
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
          event_timezone?: string | null
          event_type?: string | null
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
      galleries: {
        Row: {
          created_at: string
          event_date: string | null
          event_id: string | null
          event_type: string | null
          id: string
          is_active: boolean
          owner_id: string
          require_approval: boolean
          show_footer: boolean
          show_public_gallery: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_date?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          is_active?: boolean
          owner_id: string
          require_approval?: boolean
          show_footer?: boolean
          show_public_gallery?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_date?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          is_active?: boolean
          owner_id?: string
          require_approval?: boolean
          show_footer?: boolean
          show_public_gallery?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "galleries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_analytics: {
        Row: {
          created_at: string
          device_type: string | null
          event_id: string | null
          gallery_id: string
          id: string
          ip_address: unknown | null
          referrer: string | null
          session_id: string | null
          source: string | null
          type: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          event_id?: string | null
          gallery_id: string
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          session_id?: string | null
          source?: string | null
          type: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          event_id?: string | null
          gallery_id?: string
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          session_id?: string | null
          source?: string | null
          type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_analytics_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          download_url: string | null
          error_message: string | null
          expires_at: string | null
          file_path: string | null
          file_size_bytes: number | null
          gallery_id: string
          id: string
          items_count: number | null
          scope: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          download_url?: string | null
          error_message?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          gallery_id: string
          id?: string
          items_count?: number | null
          scope: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          download_url?: string | null
          error_message?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          gallery_id?: string
          id?: string
          items_count?: number | null
          scope?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_exports_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_settings: {
        Row: {
          allow_photos: boolean
          allow_videos: boolean
          created_at: string
          gallery_id: string
          id: string
          max_photo_size_mb: number
          max_uploads_per_guest: number
          max_video_size_mb: number
          show_captions: boolean
          slideshow_interval_seconds: number
          updated_at: string
        }
        Insert: {
          allow_photos?: boolean
          allow_videos?: boolean
          created_at?: string
          gallery_id: string
          id?: string
          max_photo_size_mb?: number
          max_uploads_per_guest?: number
          max_video_size_mb?: number
          show_captions?: boolean
          slideshow_interval_seconds?: number
          updated_at?: string
        }
        Update: {
          allow_photos?: boolean
          allow_videos?: boolean
          created_at?: string
          gallery_id?: string
          id?: string
          max_photo_size_mb?: number
          max_uploads_per_guest?: number
          max_video_size_mb?: number
          show_captions?: boolean
          slideshow_interval_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_settings_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: true
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_shortlinks: {
        Row: {
          click_count: number
          created_at: string
          gallery_id: string
          id: string
          last_clicked_at: string | null
          slug: string
          target_path: string
          updated_at: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          gallery_id: string
          id?: string
          last_clicked_at?: string | null
          slug: string
          target_path: string
          updated_at?: string
        }
        Update: {
          click_count?: number
          created_at?: string
          gallery_id?: string
          id?: string
          last_clicked_at?: string | null
          slug?: string
          target_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_shortlinks_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
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
      media_gallery_settings: {
        Row: {
          album_expires_at: string | null
          allow_photos: boolean | null
          allow_videos: boolean | null
          created_at: string
          event_id: string
          id: string
          is_active: boolean | null
          max_photo_size_mb: number | null
          max_uploads_per_guest: number | null
          max_video_duration_seconds: number | null
          max_video_size_mb: number | null
          require_approval: boolean | null
          show_captions: boolean | null
          slideshow_interval_seconds: number | null
          updated_at: string
          user_id: string
          watermark_enabled: boolean | null
          watermark_text: string | null
        }
        Insert: {
          album_expires_at?: string | null
          allow_photos?: boolean | null
          allow_videos?: boolean | null
          created_at?: string
          event_id: string
          id?: string
          is_active?: boolean | null
          max_photo_size_mb?: number | null
          max_uploads_per_guest?: number | null
          max_video_duration_seconds?: number | null
          max_video_size_mb?: number | null
          require_approval?: boolean | null
          show_captions?: boolean | null
          slideshow_interval_seconds?: number | null
          updated_at?: string
          user_id: string
          watermark_enabled?: boolean | null
          watermark_text?: string | null
        }
        Update: {
          album_expires_at?: string | null
          allow_photos?: boolean | null
          allow_videos?: boolean | null
          created_at?: string
          event_id?: string
          id?: string
          is_active?: boolean | null
          max_photo_size_mb?: number | null
          max_uploads_per_guest?: number | null
          max_video_duration_seconds?: number | null
          max_video_size_mb?: number | null
          require_approval?: boolean | null
          show_captions?: boolean | null
          slideshow_interval_seconds?: number | null
          updated_at?: string
          user_id?: string
          watermark_enabled?: boolean | null
          watermark_text?: string | null
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
      media_upload_tokens: {
        Row: {
          created_at: string
          event_id: string | null
          expires_at: string
          gallery_id: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          max_uploads: number | null
          token: string
          uploads_used: number | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          expires_at: string
          gallery_id?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          max_uploads?: number | null
          token: string
          uploads_used?: number | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          expires_at?: string
          gallery_id?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          max_uploads?: number | null
          token?: string
          uploads_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_upload_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_upload_tokens_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      media_uploads: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          caption: string | null
          cloudflare_stream_uid: string | null
          created_at: string
          duration_seconds: number | null
          event_id: string | null
          file_size_bytes: number | null
          file_url: string
          gallery_id: string | null
          height: number | null
          id: string
          mime_type: string | null
          post_type: string | null
          poster_url: string | null
          rejected_at: string | null
          rejected_by: string | null
          status: string
          stream_preview_image: string | null
          stream_ready: boolean | null
          stream_status: string | null
          text_content: string | null
          theme_id: string | null
          thumb_1280_url: string | null
          thumb_512_url: string | null
          thumbnail_url: string | null
          type: string
          uploader_token: string
          width: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          cloudflare_stream_uid?: string | null
          created_at?: string
          duration_seconds?: number | null
          event_id?: string | null
          file_size_bytes?: number | null
          file_url: string
          gallery_id?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          post_type?: string | null
          poster_url?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          status?: string
          stream_preview_image?: string | null
          stream_ready?: boolean | null
          stream_status?: string | null
          text_content?: string | null
          theme_id?: string | null
          thumb_1280_url?: string | null
          thumb_512_url?: string | null
          thumbnail_url?: string | null
          type: string
          uploader_token: string
          width?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          cloudflare_stream_uid?: string | null
          created_at?: string
          duration_seconds?: number | null
          event_id?: string | null
          file_size_bytes?: number | null
          file_url?: string
          gallery_id?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          post_type?: string | null
          poster_url?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          status?: string
          stream_preview_image?: string | null
          stream_ready?: boolean | null
          stream_status?: string | null
          text_content?: string | null
          theme_id?: string | null
          thumb_1280_url?: string | null
          thumb_512_url?: string | null
          thumbnail_url?: string | null
          type?: string
          uploader_token?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_uploads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_uploads_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      place_card_settings: {
        Row: {
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
      upload_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          file_name: string
          file_path: string
          file_size: number
          gallery_id: string
          id: string
          mime_type: string
          total_chunks: number
          upload_id: string | null
          uploaded_chunks: number[] | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          gallery_id: string
          id?: string
          mime_type: string
          total_chunks: number
          upload_id?: string | null
          uploaded_chunks?: number[] | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          gallery_id?: string
          id?: string
          mime_type?: string
          total_chunks?: number
          upload_id?: string | null
          uploaded_chunks?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_sessions_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_upload_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_access_attempts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_gallery_slug: {
        Args: { _title: string }
        Returns: string
      }
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
      generate_short_slug: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_slug: {
        Args: { input_text: string }
        Returns: string
      }
      get_all_gallery_analytics: {
        Args: Record<PropertyKey, never>
        Returns: {
          event_date: string
          event_name: string
          gallery_id: string
          gallery_title: string
          last_activity: string
          owner_email: string
          total_downloads: number
          total_shares: number
          total_views: number
          unique_sessions: number
        }[]
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
      get_gallery_analytics_summary: {
        Args: { _gallery_id: string }
        Returns: {
          last_activity: string
          total_downloads: number
          total_shares: number
          total_views: number
          unique_sessions: number
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
      get_public_gallery_data: {
        Args: { _gallery_slug: string }
        Returns: {
          caption: string
          cloudflare_stream_uid: string
          created_at: string
          event_date: string
          file_url: string
          gallery_id: string
          gallery_title: string
          is_active: boolean
          media_id: string
          post_type: string
          thumbnail_url: string
        }[]
      }
      get_public_gallery_media: {
        Args: { _event_slug: string }
        Returns: {
          caption: string
          cloudflare_stream_uid: string
          created_at: string
          file_url: string
          height: number
          id: string
          thumbnail_url: string
          type: string
          width: number
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
      validate_media_token: {
        Args: { _gallery_id: string; _token: string }
        Returns: {
          allow_photos: boolean
          allow_videos: boolean
          can_upload: boolean
          gallery_title: string
          is_valid: boolean
          max_photo_size_mb: number
          max_video_size_mb: number
          remaining_uploads: number
          require_approval: boolean
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
