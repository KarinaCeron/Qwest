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
      application_actions: {
        Row: {
          application_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          application_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          application_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_actions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      company_research: {
        Row: {
          company: string
          company_key: string
          created_at: string
          id: string
          research_text: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          company: string
          company_key: string
          created_at?: string
          id?: string
          research_text: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company?: string
          company_key?: string
          created_at?: string
          id?: string
          research_text?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      compensation_items: {
        Row: {
          created_at: string
          currency: string
          id: string
          kind: string
          label: string | null
          min_value: string | null
          notes: string | null
          period: string
          required: boolean
          sort_order: number
          updated_at: string
          user_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          label?: string | null
          min_value?: string | null
          notes?: string | null
          period?: string
          required?: boolean
          sort_order?: number
          updated_at?: string
          user_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          label?: string | null
          min_value?: string | null
          notes?: string | null
          period?: string
          required?: boolean
          sort_order?: number
          updated_at?: string
          user_id?: string
          value?: string | null
        }
        Relationships: []
      }
      cv_documents: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          id: string
          size: number | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          id?: string
          size?: number | null
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          id?: string
          size?: number | null
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cv_rag: {
        Row: {
          content: string | null
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          application_date: string
          benefits: Json
          company: string
          cover_letter: string | null
          created_at: string
          hiring_manager_linkedin: string | null
          hiring_manager_name: string | null
          id: string
          interview_questions: Json
          job_content: string | null
          job_insights: string | null
          job_link: string | null
          notes: string | null
          priority: string
          questions: Json
          recruiter_name: string | null
          requested_salary: string | null
          role: string
          salary: string | null
          salary_currency: string
          salary_offered: boolean
          salary_period: string
          status: string
          status_changed_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          application_date: string
          benefits?: Json
          company: string
          cover_letter?: string | null
          created_at?: string
          hiring_manager_linkedin?: string | null
          hiring_manager_name?: string | null
          id?: string
          interview_questions?: Json
          job_content?: string | null
          job_insights?: string | null
          job_link?: string | null
          notes?: string | null
          priority: string
          questions?: Json
          recruiter_name?: string | null
          requested_salary?: string | null
          role: string
          salary?: string | null
          salary_currency?: string
          salary_offered?: boolean
          salary_period?: string
          status: string
          status_changed_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          application_date?: string
          benefits?: Json
          company?: string
          cover_letter?: string | null
          created_at?: string
          hiring_manager_linkedin?: string | null
          hiring_manager_name?: string | null
          id?: string
          interview_questions?: Json
          job_content?: string | null
          job_insights?: string | null
          job_link?: string | null
          notes?: string | null
          priority?: string
          questions?: Json
          recruiter_name?: string | null
          requested_salary?: string | null
          role?: string
          salary?: string | null
          salary_currency?: string
          salary_offered?: boolean
          salary_period?: string
          status?: string
          status_changed_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          id: string
          message: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          message: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          message?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          portfolio_url: string | null
          target_roles: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          portfolio_url?: string | null
          target_roles?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          portfolio_url?: string | null
          target_roles?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          application_id: string | null
          auto_key: string | null
          completed: boolean
          created_at: string
          deleted: boolean
          due_date: string | null
          id: string
          kind: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          auto_key?: string | null
          completed?: boolean
          created_at?: string
          deleted?: boolean
          due_date?: string | null
          id?: string
          kind: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          auto_key?: string | null
          completed?: boolean
          created_at?: string
          deleted?: boolean
          due_date?: string | null
          id?: string
          kind?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_move_stale_applications: { Args: never; Returns: undefined }
      match_documents: {
        Args: {
          filter?: Json
          match_count: number
          p_user_id?: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
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
