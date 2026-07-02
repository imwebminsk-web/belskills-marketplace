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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignment_submissions: {
        Row: {
          content: string
          created_at: string
          grade: number | null
          id: string
          lesson_block_id: string
          status: Database["public"]["Enums"]["submission_status"]
          student_id: string
          teacher_comment: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          grade?: number | null
          id?: string
          lesson_block_id: string
          status?: Database["public"]["Enums"]["submission_status"]
          student_id: string
          teacher_comment?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          grade?: number | null
          id?: string
          lesson_block_id?: string
          status?: Database["public"]["Enums"]["submission_status"]
          student_id?: string
          teacher_comment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_lesson_block_id_fkey"
            columns: ["lesson_block_id"]
            isOneToOne: false
            referencedRelation: "lesson_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_answers: {
        Row: {
          answer_data: Json | null
          attempt_id: string
          created_at: string | null
          id: string
          option_id: string
          question_id: string
        }
        Insert: {
          answer_data?: Json | null
          attempt_id: string
          created_at?: string | null
          id?: string
          option_id: string
          question_id: string
        }
        Update: {
          answer_data?: Json | null
          attempt_id?: string
          created_at?: string | null
          id?: string
          option_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "student_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_requests: {
        Row: {
          amount_kopecks: number
          basis_of_authority: string | null
          bic: string | null
          company_name: string | null
          coupon_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          director_name: string | null
          director_position: string | null
          iban: string | null
          id: string
          invoice_number: number
          legal_address: string | null
          organization_id: string
          payment_method: string
          period_months: number
          status: string
          tier_id: string
          unp: string | null
        }
        Insert: {
          amount_kopecks: number
          basis_of_authority?: string | null
          bic?: string | null
          company_name?: string | null
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          director_name?: string | null
          director_position?: string | null
          iban?: string | null
          id?: string
          invoice_number?: number
          legal_address?: string | null
          organization_id: string
          payment_method: string
          period_months: number
          status?: string
          tier_id: string
          unp?: string | null
        }
        Update: {
          amount_kopecks?: number
          basis_of_authority?: string | null
          bic?: string | null
          company_name?: string | null
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          director_name?: string | null
          director_position?: string | null
          iban?: string | null
          id?: string
          invoice_number?: number
          legal_address?: string | null
          organization_id?: string
          payment_method?: string
          period_months?: number
          status?: string
          tier_id?: string
          unp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_requests_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_requests_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_read_receipts: {
        Row: {
          cohort_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_receipts_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_assignments: {
        Row: {
          cohort_id: string
          created_at: string
          due_date: string | null
          id: string
          is_required: boolean
          lesson_id: string | null
          test_id: string | null
        }
        Insert: {
          cohort_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          is_required?: boolean
          lesson_id?: string | null
          test_id?: string | null
        }
        Update: {
          cohort_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          is_required?: boolean
          lesson_id?: string | null
          test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohort_assignments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_messages: {
        Row: {
          cohort_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_messages_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_active: boolean
          is_chat_enabled: boolean
          name: string
          pin_code: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_chat_enabled?: boolean
          name: string
          pin_code: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_chat_enabled?: boolean
          name?: string
          pin_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          name: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name?: string
          used_count?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          age_group: string | null
          category: string | null
          category_id: string | null
          created_at: string
          delivery_format: string | null
          description: string | null
          detailed_description: string | null
          duration_unit: string | null
          duration_value: number | null
          has_certificate: boolean
          has_demo: boolean
          id: string
          image_url: string | null
          is_belskills_partner: boolean
          language: string | null
          level: Database["public"]["Enums"]["course_level"] | null
          marketing_audience: string | null
          marketing_tag_id: string | null
          organization_id: string | null
          price: number
          promotional_images: string[]
          rejection_reason: string | null
          slug: string
          start_date: string | null
          start_date_type: Database["public"]["Enums"]["start_date_type"]
          status: Database["public"]["Enums"]["course_status"]
          subcategory_id: string | null
          target_audience: Database["public"]["Enums"]["target_audience"]
          title: string
          video_url: string | null
          vimeo_url: string | null
          youtube_url: string | null
        }
        Insert: {
          age_group?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          delivery_format?: string | null
          description?: string | null
          detailed_description?: string | null
          duration_unit?: string | null
          duration_value?: number | null
          has_certificate?: boolean
          has_demo?: boolean
          id?: string
          image_url?: string | null
          is_belskills_partner?: boolean
          language?: string | null
          level?: Database["public"]["Enums"]["course_level"] | null
          marketing_audience?: string | null
          marketing_tag_id?: string | null
          organization_id?: string | null
          price?: number
          promotional_images?: string[]
          rejection_reason?: string | null
          slug: string
          start_date?: string | null
          start_date_type?: Database["public"]["Enums"]["start_date_type"]
          status?: Database["public"]["Enums"]["course_status"]
          subcategory_id?: string | null
          target_audience?: Database["public"]["Enums"]["target_audience"]
          title: string
          video_url?: string | null
          vimeo_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          age_group?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          delivery_format?: string | null
          description?: string | null
          detailed_description?: string | null
          duration_unit?: string | null
          duration_value?: number | null
          has_certificate?: boolean
          has_demo?: boolean
          id?: string
          image_url?: string | null
          is_belskills_partner?: boolean
          language?: string | null
          level?: Database["public"]["Enums"]["course_level"] | null
          marketing_audience?: string | null
          marketing_tag_id?: string | null
          organization_id?: string | null
          price?: number
          promotional_images?: string[]
          rejection_reason?: string | null
          slug?: string
          start_date?: string | null
          start_date_type?: Database["public"]["Enums"]["start_date_type"]
          status?: Database["public"]["Enums"]["course_status"]
          subcategory_id?: string | null
          target_audience?: Database["public"]["Enums"]["target_audience"]
          title?: string
          video_url?: string | null
          vimeo_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          activated_at: string | null
          cohort_id: string | null
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          cohort_id?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          cohort_id?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_blocks: {
        Row: {
          content: Json
          created_at: string
          id: string
          lesson_id: string
          order_index: number
          type: Database["public"]["Enums"]["lesson_block_type"]
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          lesson_id: string
          order_index?: number
          type: Database["public"]["Enums"]["lesson_block_type"]
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          lesson_id?: string
          order_index?: number
          type?: Database["public"]["Enums"]["lesson_block_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          student_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          student_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          is_published: boolean
          module_id: string
          order_index: number
          test_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          is_published?: boolean
          module_id: string
          order_index?: number
          test_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          is_published?: boolean
          module_id?: string
          order_index?: number
          test_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      options: {
        Row: {
          content: Json
          id: string
          is_correct: boolean
          order_index: number
          question_id: string
        }
        Insert: {
          content: Json
          id?: string
          is_correct?: boolean
          order_index: number
          question_id: string
        }
        Update: {
          content?: Json
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_branches: {
        Row: {
          address: string
          city: string
          created_at: string
          id: string
          label: string | null
          organization_id: string
          phone: string | null
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          id?: string
          label?: string | null
          organization_id: string
          phone?: string | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          id?: string
          label?: string | null
          organization_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_profiles: {
        Row: {
          advantages: string[]
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_description: string | null
          gallery: string[]
          id: string
          is_verified: boolean
          legal_name: string | null
          logo_url: string | null
          long_description: string | null
          messengers: Json
          organization_id: string
          phone_main: string | null
          phones: string[]
          public_name: string
          rating_avg: number
          reviews_count: number
          rejection_reason: string | null
          short_description: string | null
          slug: string
          social_links: Json
          status: Database["public"]["Enums"]["organization_showcase_status"]
          unp: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          advantages?: string[]
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_description?: string | null
          gallery?: string[]
          id?: string
          is_verified?: boolean
          legal_name?: string | null
          logo_url?: string | null
          long_description?: string | null
          messengers?: Json
          organization_id: string
          phone_main?: string | null
          phones?: string[]
          public_name: string
          rating_avg?: number
          reviews_count?: number
          rejection_reason?: string | null
          short_description?: string | null
          slug: string
          social_links?: Json
          status?: Database["public"]["Enums"]["organization_showcase_status"]
          unp?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          advantages?: string[]
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_description?: string | null
          gallery?: string[]
          id?: string
          is_verified?: boolean
          legal_name?: string | null
          logo_url?: string | null
          long_description?: string | null
          messengers?: Json
          organization_id?: string
          phone_main?: string | null
          phones?: string[]
          public_name?: string
          rating_avg?: number
          reviews_count?: number
          rejection_reason?: string | null
          short_description?: string | null
          slug?: string
          social_links?: Json
          status?: Database["public"]["Enums"]["organization_showcase_status"]
          unp?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          org_type: Database["public"]["Enums"]["organization_type"]
          tier_expires_at: string | null
          tier_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_type?: Database["public"]["Enums"]["organization_type"]
          tier_expires_at?: string | null
          tier_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_type?: Database["public"]["Enums"]["organization_type"]
          tier_expires_at?: string | null
          tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          basis_of_authority: string | null
          bic: string | null
          company_name: string | null
          director_name: string | null
          director_position: string | null
          iban: string | null
          id: number
          legal_address: string | null
          mailing_address: string | null
          signature_image_base64: string | null
          unp: string | null
          updated_at: string
        }
        Insert: {
          basis_of_authority?: string | null
          bic?: string | null
          company_name?: string | null
          director_name?: string | null
          director_position?: string | null
          iban?: string | null
          id?: number
          legal_address?: string | null
          mailing_address?: string | null
          signature_image_base64?: string | null
          unp?: string | null
          updated_at?: string
        }
        Update: {
          basis_of_authority?: string | null
          bic?: string | null
          company_name?: string | null
          director_name?: string | null
          director_position?: string | null
          iban?: string | null
          id?: number
          legal_address?: string | null
          mailing_address?: string | null
          signature_image_base64?: string | null
          unp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profile_secrets: {
        Row: {
          email: string | null
          id: string
        }
        Insert: {
          email?: string | null
          id: string
        }
        Update: {
          email?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_secrets_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          employer_id: string | null
          full_name: string | null
          id: string
          is_global_admin: boolean
          profession: string | null
          role: Database["public"]["Enums"]["profile_role"]
          specialization: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          employer_id?: string | null
          full_name?: string | null
          id: string
          is_global_admin?: boolean
          profession?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          specialization?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          employer_id?: string | null
          full_name?: string | null
          id?: string
          is_global_admin?: boolean
          profession?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          specialization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          media_play_limit: number
          order_index: number
          points: number
          test_id: string
          type: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          media_play_limit?: number
          order_index: number
          points?: number
          test_id: string
          type?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          media_play_limit?: number
          order_index?: number
          points?: number
          test_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attempts: {
        Row: {
          completed_at: string | null
          id: string
          is_training_mode: boolean
          score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["attempt_status"] | null
          student_id: string
          teacher_comment: string | null
          test_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_training_mode?: boolean
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["attempt_status"] | null
          student_id: string
          teacher_comment?: string | null
          test_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_training_mode?: boolean
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["attempt_status"] | null
          student_id?: string
          teacher_comment?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          action_type: Database["public"]["Enums"]["subscription_action_type"]
          created_at: string
          days_added: number
          id: string
          organization_id: string
          tier_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["subscription_action_type"]
          created_at?: string
          days_added: number
          id?: string
          organization_id: string
          tier_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["subscription_action_type"]
          created_at?: string
          days_added?: number
          id?: string
          organization_id?: string
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          category: string | null
          description: string | null
          discount_12_months: number
          discount_3_months: number
          discount_6_months: number
          features: Json
          id: string
          is_active: boolean
          limits: Json
          limits_text: Json
          name: string
          presents: Json
          price_monthly: number
          priority_level: number
        }
        Insert: {
          category?: string | null
          description?: string | null
          discount_12_months?: number
          discount_3_months?: number
          discount_6_months?: number
          features?: Json
          id: string
          is_active?: boolean
          limits?: Json
          limits_text?: Json
          name: string
          presents?: Json
          price_monthly?: number
          priority_level?: number
        }
        Update: {
          category?: string | null
          description?: string | null
          discount_12_months?: number
          discount_3_months?: number
          discount_6_months?: number
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          limits_text?: Json
          name?: string
          presents?: Json
          price_monthly?: number
          priority_level?: number
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          has_unread_student: boolean
          has_unread_teacher: boolean
          id: string
          organization_id: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          has_unread_student?: boolean
          has_unread_teacher?: boolean
          id?: string
          organization_id?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          has_unread_student?: boolean
          has_unread_teacher?: boolean
          id?: string
          organization_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      taxonomies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          parent_id: string | null
          sort_order: number
          type: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          parent_id?: string | null
          sort_order?: number
          type: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          parent_id?: string | null
          sort_order?: number
          type?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomies_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "taxonomies"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          auto_check: boolean
          created_at: string | null
          description: string | null
          folder_name: string | null
          id: string
          is_for_kids: boolean
          is_published: boolean | null
          max_score: number
          organization_id: string | null
          save_to_journal: boolean
          test_type: string
          time_limit: number
          title: string
          title_student: string | null
          title_teacher: string | null
          user_id: string | null
        }
        Insert: {
          auto_check?: boolean
          created_at?: string | null
          description?: string | null
          folder_name?: string | null
          id?: string
          is_for_kids?: boolean
          is_published?: boolean | null
          max_score?: number
          organization_id?: string | null
          save_to_journal?: boolean
          test_type?: string
          time_limit?: number
          title: string
          title_student?: string | null
          title_teacher?: string | null
          user_id?: string | null
        }
        Update: {
          auto_check?: boolean
          created_at?: string | null
          description?: string | null
          folder_name?: string | null
          id?: string
          is_for_kids?: boolean
          is_published?: boolean | null
          max_score?: number
          organization_id?: string | null
          save_to_journal?: boolean
          test_type?: string
          time_limit?: number
          title?: string
          title_student?: string | null
          title_teacher?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      downgrade_expired_tariffs: { Args: never; Returns: undefined }
      get_cohort_student_emails: {
        Args: { p_cohort_id: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_course_organization_id: {
        Args: { p_course_id: string }
        Returns: string
      }
      get_lesson_course_id: { Args: { p_lesson_id: string }; Returns: string }
      get_my_pending_review_counts: {
        Args: never
        Returns: {
          cohort_id: string
          pending_count: number
        }[]
      }
      get_my_student_progress: {
        Args: never
        Returns: {
          assignment_submission_id: string
          course_id: string
          course_slug: string
          course_title: string
          grade10: number
          has_completed_test_attempt: boolean
          id: string
          lesson_block_id: string
          lesson_id: string
          status: string
          test_id: string
          title: string
          type: string
        }[]
      }
      get_user_orgs: { Args: never; Returns: string[] }
      get_users_emails: {
        Args: { p_user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      has_org_role: {
        Args: { p_allowed_roles: string[]; p_org_id: string }
        Returns: boolean
      }
      increment_coupon_used_count: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      is_cohort_peer: { Args: { p_profile_id: string }; Returns: boolean }
      is_course_org_staff: { Args: { p_course_id: string }; Returns: boolean }
      is_lesson_org_staff: { Args: { p_lesson_id: string }; Returns: boolean }
      is_marketplace_course: {
        Args: {
          p_org_id: string
          p_status: Database["public"]["Enums"]["course_status"]
        }
        Returns: boolean
      }
      is_marketplace_course_by_id: {
        Args: { p_course_id: string }
        Returns: boolean
      }
      is_marketplace_lesson: { Args: { p_lesson_id: string }; Returns: boolean }
      is_marketplace_test: {
        Args: { p_is_published: boolean; p_org_id: string }
        Returns: boolean
      }
      is_module_org_staff: { Args: { p_module_id: string }; Returns: boolean }
      is_org_active: { Args: { p_org_id: string }; Returns: boolean }
      is_org_staff: { Args: { p_org_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_staff_user: { Args: never; Returns: boolean }
      join_cohort_by_pin: { Args: { p_pin: string }; Returns: Json }
      mark_support_ticket_read: {
        Args: { p_role: string; p_ticket_id: string }
        Returns: undefined
      }
      subscription_tier_weight: { Args: { p_tier_id: string }; Returns: number }
      touch_support_ticket: {
        Args: { p_sender_role: string; p_ticket_id: string }
        Returns: undefined
      }
    }
    Enums: {
      attempt_status: "in_progress" | "completed" | "pending_review"
      course_level:
        | "0"
        | "A1"
        | "A2"
        | "B1"
        | "B1+"
        | "B2"
        | "B2+"
        | "C1"
        | "C2"
      course_status:
        | "draft"
        | "moderation"
        | "published"
        | "hidden"
        | "rejected"
      lesson_block_type:
        | "text"
        | "image"
        | "youtube"
        | "vimeo"
        | "assignment"
        | "quiz"
      lesson_type: "video" | "text" | "test" | "quiz"
      organization_showcase_status:
        | "draft"
        | "moderation"
        | "published"
        | "hidden"
        | "blocked"
        | "rejected"
      organization_type: "school" | "corporate"
      profile_role: "admin" | "teacher" | "student"
      start_date_type: "fixed" | "on_demand"
      submission_status: "pending" | "approved" | "rejected"
      subscription_action_type: "purchase" | "upgrade" | "manual_adjustment"
      target_audience: "kids" | "adults"
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
      attempt_status: ["in_progress", "completed", "pending_review"],
      course_level: ["0", "A1", "A2", "B1", "B1+", "B2", "B2+", "C1", "C2"],
      course_status: [
        "draft",
        "moderation",
        "published",
        "hidden",
        "rejected",
      ],
      lesson_block_type: [
        "text",
        "image",
        "youtube",
        "vimeo",
        "assignment",
        "quiz",
      ],
      lesson_type: ["video", "text", "test", "quiz"],
      organization_showcase_status: [
        "draft",
        "moderation",
        "published",
        "hidden",
        "blocked",
        "rejected",
      ],
      organization_type: ["school", "corporate"],
      profile_role: ["admin", "teacher", "student"],
      start_date_type: ["fixed", "on_demand"],
      submission_status: ["pending", "approved", "rejected"],
      subscription_action_type: ["purchase", "upgrade", "manual_adjustment"],
      target_audience: ["kids", "adults"],
    },
  },
} as const
