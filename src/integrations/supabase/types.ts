export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      company_analyses: {
        Row: {
          analysis_status: string | null;
          analyzed_at: string | null;
          buying_signals: Json | null;
          company_name: string;
          company_url: string | null;
          created_at: string;
          custom_hook: string | null;
          description_long: string | null;
          detected_pain_points: Json | null;
          headcount: string | null;
          id: string;
          industry: string | null;
          key_urls: Json | null;
          location: string | null;
          logo_url: string | null;
          match_explanation: string | null;
          match_score: number | null;
          project_id: string;
          strategic_analysis: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          analysis_status?: string | null;
          analyzed_at?: string | null;
          buying_signals?: Json | null;
          company_name: string;
          company_url?: string | null;
          created_at?: string;
          custom_hook?: string | null;
          description_long?: string | null;
          detected_pain_points?: Json | null;
          headcount?: string | null;
          id?: string;
          industry?: string | null;
          key_urls?: Json | null;
          location?: string | null;
          logo_url?: string | null;
          match_explanation?: string | null;
          match_score?: number | null;
          project_id: string;
          strategic_analysis?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          analysis_status?: string | null;
          analyzed_at?: string | null;
          buying_signals?: Json | null;
          company_name?: string;
          company_url?: string | null;
          created_at?: string;
          custom_hook?: string | null;
          description_long?: string | null;
          detected_pain_points?: Json | null;
          headcount?: string | null;
          id?: string;
          industry?: string | null;
          key_urls?: Json | null;
          location?: string | null;
          logo_url?: string | null;
          match_explanation?: string | null;
          match_score?: number | null;
          project_id?: string;
          strategic_analysis?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_analyses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      company_documents: {
        Row: {
          created_at: string;
          extracted_content: string | null;
          extraction_status: string | null;
          file_name: string;
          file_size: number | null;
          file_type: string;
          file_url: string;
          id: string;
          project_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          extracted_content?: string | null;
          extraction_status?: string | null;
          file_name: string;
          file_size?: number | null;
          file_type: string;
          file_url: string;
          id?: string;
          project_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          extracted_content?: string | null;
          extraction_status?: string | null;
          file_name?: string;
          file_size?: number | null;
          file_type?: string;
          file_url?: string;
          id?: string;
          project_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      knowledge_base: {
        Row: {
          created_at: string;
          doc_type: string;
          extracted_data: Json | null;
          file_name: string;
          file_url: string;
          id: string;
          org_id: string;
          processing_status: string;
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          doc_type?: string;
          extracted_data?: Json | null;
          file_name: string;
          file_url: string;
          id?: string;
          org_id: string;
          processing_status?: string;
          summary?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          doc_type?: string;
          extracted_data?: Json | null;
          file_name?: string;
          file_url?: string;
          id?: string;
          org_id?: string;
          processing_status?: string;
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_base_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_chunks: {
        Row: {
          content: string;
          created_at: string;
          embedding: string | null;
          id: string;
          knowledge_id: string;
          metadata: Json | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          knowledge_id: string;
          metadata?: Json | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          knowledge_id?: string;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_knowledge_id_fkey";
            columns: ["knowledge_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_base";
            referencedColumns: ["id"];
          },
        ];
      };
      kortex_cache: {
        Row: {
          key: string;
          updated_at: string | null;
          user_id: string;
          value: Json | null;
        };
        Insert: {
          key: string;
          updated_at?: string | null;
          user_id: string;
          value?: Json | null;
        };
        Update: {
          key?: string;
          updated_at?: string | null;
          user_id?: string;
          value?: Json | null;
        };
        Relationships: [];
      };
      lead_interactions: {
        Row: {
          action: string;
          company_id: string;
          created_at: string;
          duration_ms: number | null;
          id: string;
          metadata: Json | null;
          project_id: string;
          user_id: string;
        };
        Insert: {
          action: string;
          company_id: string;
          created_at?: string;
          duration_ms?: number | null;
          id?: string;
          metadata?: Json | null;
          project_id: string;
          user_id: string;
        };
        Update: {
          action?: string;
          company_id?: string;
          created_at?: string;
          duration_ms?: number | null;
          id?: string;
          metadata?: Json | null;
          project_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_interactions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company_analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_interactions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          assigned_agent_id: string | null;
          company_name: string | null;
          contact_info: Json | null;
          created_at: string;
          id: string;
          linkedin_data: Json | null;
          notes: string | null;
          org_id: string;
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"];
          project_id: string | null;
          qualification_score: number | null;
          updated_at: string;
        };
        Insert: {
          assigned_agent_id?: string | null;
          company_name?: string | null;
          contact_info?: Json | null;
          created_at?: string;
          id?: string;
          linkedin_data?: Json | null;
          notes?: string | null;
          org_id: string;
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"];
          project_id?: string | null;
          qualification_score?: number | null;
          updated_at?: string;
        };
        Update: {
          assigned_agent_id?: string | null;
          company_name?: string | null;
          contact_info?: Json | null;
          created_at?: string;
          id?: string;
          linkedin_data?: Json | null;
          notes?: string | null;
          org_id?: string;
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"];
          project_id?: string | null;
          qualification_score?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_assigned_agent_id_fkey";
            columns: ["assigned_agent_id"];
            isOneToOne: false;
            referencedRelation: "virtual_agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      learned_preferences: {
        Row: {
          created_at: string;
          excluded_patterns: Json | null;
          id: string;
          keyword_boosts: Json | null;
          last_calibrated_at: string | null;
          project_id: string;
          sector_weights: Json | null;
          size_weights: Json | null;
          technology_weights: Json | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          excluded_patterns?: Json | null;
          id?: string;
          keyword_boosts?: Json | null;
          last_calibrated_at?: string | null;
          project_id: string;
          sector_weights?: Json | null;
          size_weights?: Json | null;
          technology_weights?: Json | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          excluded_patterns?: Json | null;
          id?: string;
          keyword_boosts?: Json | null;
          last_calibrated_at?: string | null;
          project_id?: string;
          sector_weights?: Json | null;
          size_weights?: Json | null;
          technology_weights?: Json | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learned_preferences_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      missions: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          org_id: string;
          stats: Json | null;
          status: string;
          strategy_prompt: string | null;
          target_criteria: Json | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          org_id: string;
          stats?: Json | null;
          status?: string;
          strategy_prompt?: string | null;
          target_criteria?: Json | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          org_id?: string;
          stats?: Json | null;
          status?: string;
          strategy_prompt?: string | null;
          target_criteria?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "missions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          api_settings: Json | null;
          brand_identity: Json | null;
          created_at: string;
          credits_balance: number;
          id: string;
          name: string;
          resources_limit: Json;
          subscription_tier: Database["public"]["Enums"]["subscription_tier"];
          updated_at: string;
        };
        Insert: {
          api_settings?: Json | null;
          brand_identity?: Json | null;
          created_at?: string;
          credits_balance?: number;
          id?: string;
          name: string;
          resources_limit?: Json;
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"];
          updated_at?: string;
        };
        Update: {
          api_settings?: Json | null;
          brand_identity?: Json | null;
          created_at?: string;
          credits_balance?: number;
          id?: string;
          name?: string;
          resources_limit?: Json;
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"];
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          onboarding_completed: boolean;
          org_id: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          onboarding_completed?: boolean;
          org_id?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          onboarding_completed?: boolean;
          org_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      project_data: {
        Row: {
          created_at: string;
          data: Json;
          data_type: string;
          id: string;
          project_id: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          data?: Json;
          data_type: string;
          id?: string;
          project_id: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          data?: Json;
          data_type?: string;
          id?: string;
          project_id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_data_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      research_jobs: {
        Row: {
          completed_at: string | null;
          created_at: string;
          current_step: string | null;
          error_message: string | null;
          id: string;
          progress: number;
          project_id: string;
          results: Json | null;
          started_at: string | null;
          status: string;
          step_details: Json | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          current_step?: string | null;
          error_message?: string | null;
          id?: string;
          progress?: number;
          project_id: string;
          results?: Json | null;
          started_at?: string | null;
          status?: string;
          step_details?: Json | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          current_step?: string | null;
          error_message?: string | null;
          id?: string;
          progress?: number;
          project_id?: string;
          results?: Json | null;
          started_at?: string | null;
          status?: string;
          step_details?: Json | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_jobs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      system_secrets: {
        Row: {
          created_at: string;
          description: string | null;
          secret_name: string;
          secret_value: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          secret_name: string;
          secret_value: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          secret_name?: string;
          secret_value?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          agent_id: string | null;
          created_at: string;
          executed_at: string | null;
          id: string;
          lead_id: string | null;
          mission_id: string | null;
          org_id: string;
          payload: Json | null;
          result: Json | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["task_status"];
          type: Database["public"]["Enums"]["task_type"];
        };
        Insert: {
          agent_id?: string | null;
          created_at?: string;
          executed_at?: string | null;
          id?: string;
          lead_id?: string | null;
          mission_id?: string | null;
          org_id: string;
          payload?: Json | null;
          result?: Json | null;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          type: Database["public"]["Enums"]["task_type"];
        };
        Update: {
          agent_id?: string | null;
          created_at?: string;
          executed_at?: string | null;
          id?: string;
          lead_id?: string | null;
          mission_id?: string | null;
          org_id?: string;
          payload?: Json | null;
          result?: Json | null;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          type?: Database["public"]["Enums"]["task_type"];
        };
        Relationships: [
          {
            foreignKeyName: "tasks_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "virtual_agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          org_id: string;
          role: Database["public"]["Enums"]["org_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          org_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      virtual_agents: {
        Row: {
          archetype: Database["public"]["Enums"]["agent_archetype"];
          created_at: string;
          id: string;
          memory: Json;
          name: string;
          org_id: string;
          personality_prompt: string | null;
          status: Database["public"]["Enums"]["agent_status"];
          updated_at: string;
        };
        Insert: {
          archetype?: Database["public"]["Enums"]["agent_archetype"];
          created_at?: string;
          id?: string;
          memory?: Json;
          name: string;
          org_id: string;
          personality_prompt?: string | null;
          status?: Database["public"]["Enums"]["agent_status"];
          updated_at?: string;
        };
        Update: {
          archetype?: Database["public"]["Enums"]["agent_archetype"];
          created_at?: string;
          id?: string;
          memory?: Json;
          name?: string;
          org_id?: string;
          personality_prompt?: string | null;
          status?: Database["public"]["Enums"]["agent_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "virtual_agents_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_credits: {
        Args: { p_amount: number; p_org_id: string };
        Returns: Json;
      };
      consume_resources: {
        Args: { p_amount: number; p_org_id: string; p_resource_type?: string };
        Returns: Json;
      };
      ensure_user_org: { Args: never; Returns: string };
      get_org_stats: { Args: { p_org_id: string }; Returns: Json };
      get_user_org_id: { Args: { _user_id: string }; Returns: string };
      has_org_role: {
        Args: {
          _org_id: string;
          _role: Database["public"]["Enums"]["org_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean };
      match_documents: {
        Args: {
          p_match_count?: number;
          p_match_threshold?: number;
          p_org_id: string;
          p_query_embedding: string;
        };
        Returns: {
          content: string;
          doc_type: string;
          file_name: string;
          id: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      agent_archetype: "SDR" | "RESEARCHER" | "COPYWRITER";
      agent_status: "active" | "paused" | "training";
      org_role: "admin" | "viewer";
      pipeline_stage:
        | "detected"
        | "enriched"
        | "contacted"
        | "negotiation"
        | "closed";
      subscription_tier: "free" | "starter" | "empire";
      task_status: "pending" | "running" | "done" | "failed";
      task_type:
        | "send_email"
        | "send_linkedin"
        | "scrape"
        | "analyze"
        | "enrich";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema =
  DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof (
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
        "Tables"
      ]
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
        "Views"
      ]
    )
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? (
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Views"
    ]
  )[TableName] extends {
    Row: infer R;
  } ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (
    & DefaultSchema["Tables"]
    & DefaultSchema["Views"]
  ) ? (
      & DefaultSchema["Tables"]
      & DefaultSchema["Views"]
    )[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    } ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
    "Tables"
  ][TableName] extends {
    Insert: infer I;
  } ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    } ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
    "Tables"
  ][TableName] extends {
    Update: infer U;
  } ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    } ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]][
      "Enums"
    ]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][
    EnumName
  ]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[
      PublicCompositeTypeNameOrOptions["schema"]
    ]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]][
    "CompositeTypes"
  ][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      agent_archetype: ["SDR", "RESEARCHER", "COPYWRITER"],
      agent_status: ["active", "paused", "training"],
      org_role: ["admin", "viewer"],
      pipeline_stage: [
        "detected",
        "enriched",
        "contacted",
        "negotiation",
        "closed",
      ],
      subscription_tier: ["free", "starter", "empire"],
      task_status: ["pending", "running", "done", "failed"],
      task_type: ["send_email", "send_linkedin", "scrape", "analyze", "enrich"],
    },
  },
} as const;
