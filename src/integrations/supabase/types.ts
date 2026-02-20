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
      companies: {
        Row: {
          cash_flow: number | null
          city: string | null
          cnpj: string | null
          created_at: string
          debt: number | null
          description: string | null
          ebitda: number | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          revenue: number | null
          risk_level: string | null
          sector: string | null
          size: string | null
          state: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cash_flow?: number | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          debt?: number | null
          description?: string | null
          ebitda?: number | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          revenue?: number | null
          risk_level?: string | null
          sector?: string | null
          size?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cash_flow?: number | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          debt?: number | null
          description?: string | null
          ebitda?: number | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          revenue?: number | null
          risk_level?: string | null
          sector?: string | null
          size?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          content: string | null
          contract_type: string
          created_at: string
          id: string
          parameters: Json | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          contract_type: string
          created_at?: string
          id?: string
          parameters?: Json | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          contract_type?: string
          created_at?: string
          id?: string
          parameters?: Json | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      dd_checklist_items: {
        Row: {
          category: string
          company_id: string
          created_at: string
          description: string | null
          document_url: string | null
          due_date: string | null
          id: string
          item_name: string
          notes: string | null
          responsible: string | null
          severity: string
          sort_order: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          description?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          item_name: string
          notes?: string | null
          responsible?: string | null
          severity?: string
          sort_order?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          description?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          responsible?: string | null
          severity?: string
          sort_order?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dd_documents: {
        Row: {
          ai_analysis: string | null
          category: string
          checklist_item_id: string | null
          company_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          category: string
          checklist_item_id?: string | null
          company_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          category?: string
          checklist_item_id?: string | null
          company_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      deep_dive_results: {
        Row: {
          company_id: string
          created_at: string
          id: string
          result: Json
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          result?: Json
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          result?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deep_dive_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      due_diligence_reports: {
        Row: {
          ai_report: string | null
          company_id: string
          created_at: string
          document_url: string | null
          id: string
          risk_items: Json | null
          status: string
          user_id: string
        }
        Insert: {
          ai_report?: string | null
          company_id: string
          created_at?: string
          document_url?: string | null
          id?: string
          risk_items?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          ai_report?: string | null
          company_id?: string
          created_at?: string
          document_url?: string | null
          id?: string
          risk_items?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "due_diligence_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      match_criteria: {
        Row: {
          created_at: string
          geo_latitude: number | null
          geo_longitude: number | null
          geo_radius_km: number | null
          geo_reference_city: string | null
          id: string
          max_ebitda: number | null
          max_revenue: number | null
          min_ebitda: number | null
          min_revenue: number | null
          notes: string | null
          target_location: string | null
          target_sector: string | null
          target_size: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          geo_latitude?: number | null
          geo_longitude?: number | null
          geo_radius_km?: number | null
          geo_reference_city?: string | null
          id?: string
          max_ebitda?: number | null
          max_revenue?: number | null
          min_ebitda?: number | null
          min_revenue?: number | null
          notes?: string | null
          target_location?: string | null
          target_sector?: string | null
          target_size?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          geo_latitude?: number | null
          geo_longitude?: number | null
          geo_radius_km?: number | null
          geo_reference_city?: string | null
          id?: string
          max_ebitda?: number | null
          max_revenue?: number | null
          min_ebitda?: number | null
          min_revenue?: number | null
          notes?: string | null
          target_location?: string | null
          target_sector?: string | null
          target_size?: string | null
          user_id?: string
        }
        Relationships: []
      }
      match_feedback: {
        Row: {
          action_type: string
          company_id: string
          created_at: string
          criteria_snapshot: Json | null
          id: string
          match_id: string | null
          rank_position: number | null
          rejection_reason: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          company_id: string
          created_at?: string
          criteria_snapshot?: Json | null
          id?: string
          match_id?: string | null
          rank_position?: number | null
          rejection_reason?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          company_id?: string
          created_at?: string
          criteria_snapshot?: Json | null
          id?: string
          match_id?: string | null
          rank_position?: number | null
          rejection_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_feedback_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          ai_analysis: string | null
          buyer_id: string
          compatibility_score: number | null
          created_at: string
          id: string
          seller_company_id: string
          status: string
        }
        Insert: {
          ai_analysis?: string | null
          buyer_id: string
          compatibility_score?: number | null
          created_at?: string
          id?: string
          seller_company_id: string
          status?: string
        }
        Update: {
          ai_analysis?: string | null
          buyer_id?: string
          compatibility_score?: number | null
          created_at?: string
          id?: string
          seller_company_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pmi_activities: {
        Row: {
          activity: string
          area: string
          created_at: string
          deadline: string
          discipline: string
          due_date: string | null
          group_name: string
          id: string
          milestone: string
          notes: string | null
          responsible: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity: string
          area: string
          created_at?: string
          deadline: string
          discipline: string
          due_date?: string | null
          group_name: string
          id?: string
          milestone: string
          notes?: string | null
          responsible?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: string
          area?: string
          created_at?: string
          deadline?: string
          discipline?: string
          due_date?: string | null
          group_name?: string
          id?: string
          milestone?: string
          notes?: string | null
          responsible?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pmi_activities_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          ai_recommendations: string | null
          company_id: string
          created_at: string
          details: Json | null
          financial_score: number | null
          id: string
          legal_score: number | null
          operational_score: number | null
          overall_score: number | null
          user_id: string
        }
        Insert: {
          ai_recommendations?: string | null
          company_id: string
          created_at?: string
          details?: Json | null
          financial_score?: number | null
          id?: string
          legal_score?: number | null
          operational_score?: number | null
          overall_score?: number | null
          user_id: string
        }
        Update: {
          ai_recommendations?: string | null
          company_id?: string
          created_at?: string
          details?: Json | null
          financial_score?: number | null
          id?: string
          legal_score?: number | null
          operational_score?: number | null
          overall_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          buyer_id: string
          company_id: string
          created_at: string
          deal_value: number | null
          id: string
          seller_id: string
          status: string
        }
        Insert: {
          buyer_id: string
          company_id: string
          created_at?: string
          deal_value?: number | null
          id?: string
          seller_id: string
          status?: string
        }
        Update: {
          buyer_id?: string
          company_id?: string
          created_at?: string
          deal_value?: number | null
          id?: string
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      valuations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          inputs: Json | null
          method: string
          result: Json | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          inputs?: Json | null
          method?: string
          result?: Json | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          inputs?: Json | null
          method?: string
          result?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "valuations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "buyer" | "seller" | "advisor" | "admin"
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
      app_role: ["buyer", "seller", "advisor", "admin"],
    },
  },
} as const
