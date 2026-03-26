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
      audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_disciplines: {
        Row: {
          all_matches_fee: number | null
          all_matches_u19_fee: number | null
          all_matches_u25_fee: number | null
          competition_id: string | null
          discipline_id: string | null
          id: string
          max_entries: number | null
        }
        Insert: {
          all_matches_fee?: number | null
          all_matches_u19_fee?: number | null
          all_matches_u25_fee?: number | null
          competition_id?: string | null
          discipline_id?: string | null
          id?: string
          max_entries?: number | null
        }
        Update: {
          all_matches_fee?: number | null
          all_matches_u19_fee?: number | null
          all_matches_u25_fee?: number | null
          competition_id?: string | null
          discipline_id?: string | null
          id?: string
          max_entries?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_disciplines_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_disciplines_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_matches: {
        Row: {
          competition_id: string | null
          created_at: string | null
          distance: string | null
          entry_fee: number
          id: string
          is_optional: boolean | null
          match_date: string | null
          match_name: string
          max_entries: number | null
        }
        Insert: {
          competition_id?: string | null
          created_at?: string | null
          distance?: string | null
          entry_fee: number
          id?: string
          is_optional?: boolean | null
          match_date?: string | null
          match_name: string
          max_entries?: number | null
        }
        Update: {
          competition_id?: string | null
          created_at?: string | null
          distance?: string | null
          entry_fee?: number
          id?: string
          is_optional?: boolean | null
          match_date?: string | null
          match_name?: string
          max_entries?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      match_stages: {
        Row: {
          created_at: string | null
          discipline_id: string
          id: string
          match_id: string
          max_score: number | null
          rounds: number | null
          sighters: number | null
          stage_id: string
        }
        Insert: {
          created_at?: string | null
          discipline_id: string
          id?: string
          match_id: string
          max_score?: number | null
          rounds?: number | null
          sighters?: number | null
          stage_id: string
        }
        Update: {
          created_at?: string | null
          discipline_id?: string
          id?: string
          match_id?: string
          max_score?: number | null
          rounds?: number | null
          sighters?: number | null
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_stages_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_stages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "competition_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_stages_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      championship_registrations: {
        Row: {
          amount_paid: number | null
          championship_id: string
          created_at: string | null
          discipline_id: string
          id: string
          payment_reference: string | null
          payment_status: string | null
          registered_at: string | null
          registration_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          championship_id: string
          created_at?: string | null
          discipline_id: string
          id?: string
          payment_reference?: string | null
          payment_status?: string | null
          registered_at?: string | null
          registration_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          championship_id?: string
          created_at?: string | null
          discipline_id?: string
          id?: string
          payment_reference?: string | null
          payment_status?: string | null
          registered_at?: string | null
          registration_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "championship_registrations_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championship_registrations_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championship_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      championships: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          registration_closes: string | null
          registration_fee: number | null
          registration_opens: string | null
          slug: string
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          registration_closes?: string | null
          registration_fee?: number | null
          registration_opens?: string | null
          slug: string
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          registration_closes?: string | null
          registration_fee?: number | null
          registration_opens?: string | null
          slug?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "championships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          capacity: number | null
          championship_id: string | null
          compulsory_range_fee: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          import_export_permit_fee: number | null
          is_active: boolean | null
          is_featured: boolean | null
          late_entry_fee: number | null
          late_registration_date: string | null
          location: string
          name: string
          registration_closes: string | null
          registration_opens: string | null
          rules_document_url: string | null
          slug: string
          start_date: string
          updated_at: string | null
          venue_details: string | null
        }
        Insert: {
          capacity?: number | null
          championship_id?: string | null
          compulsory_range_fee?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          import_export_permit_fee?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          late_entry_fee?: number | null
          late_registration_date?: string | null
          location: string
          name: string
          registration_closes?: string | null
          registration_opens?: string | null
          rules_document_url?: string | null
          slug: string
          start_date: string
          updated_at?: string | null
          venue_details?: string | null
        }
        Update: {
          capacity?: number | null
          championship_id?: string | null
          compulsory_range_fee?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          import_export_permit_fee?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          late_entry_fee?: number | null
          late_registration_date?: string | null
          location?: string
          name?: string
          registration_closes?: string | null
          registration_opens?: string | null
          rules_document_url?: string | null
          slug?: string
          start_date?: string
          updated_at?: string | null
          venue_details?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitions_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_read: boolean | null
          message: string
          name: string
          phone: string | null
          responded_at: string | null
          responded_by: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_read?: boolean | null
          message: string
          name: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_read?: boolean | null
          message?: string
          name?: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplines: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          equipment_requirements: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          rules_summary: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          equipment_requirements?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          rules_summary?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          equipment_requirements?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          rules_summary?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          competition_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          is_featured: boolean | null
          photographer: string | null
          title: string | null
          uploaded_by: string | null
        }
        Insert: {
          competition_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_featured?: boolean | null
          photographer?: string | null
          title?: string | null
          uploaded_by?: string | null
        }
        Update: {
          competition_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_featured?: boolean | null
          photographer?: string | null
          title?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_fees: {
        Row: {
          created_at: string | null
          fee_amount: number
          id: string
          member_type: string
          year: number
        }
        Insert: {
          created_at?: string | null
          fee_amount: number
          id?: string
          member_type: string
          year: number
        }
        Update: {
          created_at?: string | null
          fee_amount?: number
          id?: string
          member_type?: string
          year?: number
        }
        Relationships: []
      }
      news_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "news_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link_url: string | null
          message: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          proof_of_payment_url: string | null
          reference: string | null
          registration_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          proof_of_payment_url?: string | null
          reference?: string | null
          registration_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          proof_of_payment_url?: string | null
          reference?: string | null
          registration_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          achievements: string[] | null
          age_classification:
            | Database["public"]["Enums"]["age_classification"]
            | null
          bio: string | null
          club: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_sa_championships: boolean | null
          full_names: string
          gender: string | null
          id: string
          life_member: boolean | null
          medical_info: string | null
          membership_paid_until: string | null
          mobile_number: string | null
          office_phone: string | null
          postal_address: string | null
          postal_code: string | null
          preferred_disciplines: string[] | null
          profile_image: string | null
          province: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          rsa_id_number: string | null
          sa_citizen: boolean | null
          sabu_number: string | null
          shoulder_preference:
            | Database["public"]["Enums"]["shoulder_preference"]
            | null
          surname: string
          updated_at: string | null
        }
        Insert: {
          achievements?: string[] | null
          age_classification?:
            | Database["public"]["Enums"]["age_classification"]
            | null
          bio?: string | null
          club?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_sa_championships?: boolean | null
          full_names: string
          gender?: string | null
          id: string
          life_member?: boolean | null
          medical_info?: string | null
          membership_paid_until?: string | null
          mobile_number?: string | null
          office_phone?: string | null
          postal_address?: string | null
          postal_code?: string | null
          preferred_disciplines?: string[] | null
          profile_image?: string | null
          province?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          rsa_id_number?: string | null
          sa_citizen?: boolean | null
          sabu_number?: string | null
          shoulder_preference?:
            | Database["public"]["Enums"]["shoulder_preference"]
            | null
          surname: string
          updated_at?: string | null
        }
        Update: {
          achievements?: string[] | null
          age_classification?:
            | Database["public"]["Enums"]["age_classification"]
            | null
          bio?: string | null
          club?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_sa_championships?: boolean | null
          full_names?: string
          gender?: string | null
          id?: string
          life_member?: boolean | null
          medical_info?: string | null
          membership_paid_until?: string | null
          mobile_number?: string | null
          office_phone?: string | null
          postal_address?: string | null
          postal_code?: string | null
          preferred_disciplines?: string[] | null
          profile_image?: string | null
          province?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          rsa_id_number?: string | null
          sa_citizen?: boolean | null
          sabu_number?: string | null
          shoulder_preference?:
            | Database["public"]["Enums"]["shoulder_preference"]
            | null
          surname?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      registration_matches: {
        Row: {
          created_at: string | null
          fee_paid: number | null
          id: string
          match_id: string | null
          registration_id: string | null
        }
        Insert: {
          created_at?: string | null
          fee_paid?: number | null
          id?: string
          match_id?: string | null
          registration_id?: string | null
        }
        Update: {
          created_at?: string | null
          fee_paid?: number | null
          id?: string
          match_id?: string | null
          registration_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "competition_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_matches_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          age_classification: Database["public"]["Enums"]["age_classification"]
          all_matches: boolean | null
          amount_paid: number | null
          competition_id: string | null
          confirmed_at: string | null
          discipline_id: string | null
          entry_number: string | null
          id: string
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          permit_application_by: string | null
          receipt_number: string | null
          registered_at: string | null
          registration_status:
            | Database["public"]["Enums"]["registration_status"]
            | null
          requires_import_permit: boolean | null
          squad_number: number | null
          target_number: number | null
          team_id: string | null
          total_fee: number | null
          user_id: string | null
        }
        Insert: {
          age_classification: Database["public"]["Enums"]["age_classification"]
          all_matches?: boolean | null
          amount_paid?: number | null
          competition_id?: string | null
          confirmed_at?: string | null
          discipline_id?: string | null
          entry_number?: string | null
          id?: string
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          permit_application_by?: string | null
          receipt_number?: string | null
          registered_at?: string | null
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          requires_import_permit?: boolean | null
          squad_number?: number | null
          target_number?: number | null
          team_id?: string | null
          total_fee?: number | null
          user_id?: string | null
        }
        Update: {
          age_classification?: Database["public"]["Enums"]["age_classification"]
          all_matches?: boolean | null
          amount_paid?: number | null
          competition_id?: string | null
          confirmed_at?: string | null
          discipline_id?: string | null
          entry_number?: string | null
          id?: string
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          permit_application_by?: string | null
          receipt_number?: string | null
          registered_at?: string | null
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          requires_import_permit?: boolean | null
          squad_number?: number | null
          target_number?: number | null
          team_id?: string | null
          total_fee?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          id: string
          is_dnf: boolean | null
          is_dq: boolean | null
          match_id: string | null
          notes: string | null
          registration_id: string | null
          score: number
          stage_id: string | null
          submitted_at: string | null
          submitted_by: string | null
          v_count: number | null
          verified_at: string | null
          verified_by: string | null
          x_count: number | null
        }
        Insert: {
          id?: string
          is_dnf?: boolean | null
          is_dq?: boolean | null
          match_id?: string | null
          notes?: string | null
          registration_id?: string | null
          score: number
          stage_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          v_count?: number | null
          verified_at?: string | null
          verified_by?: string | null
          x_count?: number | null
        }
        Update: {
          id?: string
          is_dnf?: boolean | null
          is_dq?: boolean | null
          match_id?: string | null
          notes?: string | null
          registration_id?: string | null
          score?: number
          stage_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          v_count?: number | null
          verified_at?: string | null
          verified_by?: string | null
          x_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "competition_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          discipline_id: string
          distance: string | null
          id: string
          max_score: number | null
          name: string
          rounds: number | null
          sighters: number | null
          stage_number: number
        }
        Insert: {
          discipline_id: string
          distance?: string | null
          id?: string
          max_score?: number | null
          name: string
          rounds?: number | null
          sighters?: number | null
          stage_number?: number
        }
        Update: {
          discipline_id?: string
          distance?: string | null
          id?: string
          max_score?: number | null
          name?: string
          rounds?: number | null
          sighters?: number | null
          stage_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "stages_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          max_members: number | null
          name: string
          province: string | null
          updated_at: string | null
        }
        Insert: {
          captain_id?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          max_members?: number | null
          name: string
          province?: string | null
          updated_at?: string | null
        }
        Update: {
          captain_id?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          max_members?: number | null
          name?: string
          province?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      age_classification:
        | "Open"
        | "Under_19"
        | "Under_25"
        | "Veteran_60_plus"
        | "Veteran_70_plus"
      payment_status: "pending" | "paid" | "partial" | "refunded"
      registration_status:
        | "draft"
        | "pending"
        | "confirmed"
        | "cancelled"
        | "waitlist"
      shoulder_preference: "left" | "right"
      user_role:
        | "super_admin"
        | "admin"
        | "team_captain"
        | "shooter"
        | "range_officer"
        | "stats_officer"
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
      age_classification: [
        "Open",
        "Under_19",
        "Under_25",
        "Veteran_60_plus",
        "Veteran_70_plus",
      ],
      payment_status: ["pending", "paid", "partial", "refunded"],
      registration_status: [
        "draft",
        "pending",
        "confirmed",
        "cancelled",
        "waitlist",
      ],
      shoulder_preference: ["left", "right"],
      user_role: [
        "super_admin",
        "admin",
        "team_captain",
        "shooter",
        "range_officer",
        "stats_officer",
      ],
    },
  },
} as const
