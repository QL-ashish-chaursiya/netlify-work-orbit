// Hand-authored to mirror supabase/migrations/0001_init.sql + 0002_supplementary_rls_and_guards.sql.
// Once the project is linked, regenerate the source of truth with:
//   npm run supabase:types
// (wraps `supabase gen types typescript --linked --schema public`)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole =
  | "admin"
  | "resource_manager"
  | "project_manager"
  | "tech_lead"
  | "team_member"
  | "sales_lead";

export type AccountStatus = "invited" | "pending_activation" | "active" | "deactivated";

export type ProvisioningSource = "individual_invite" | "bulk_import" | "self_signup_admin";

export type ProjectStatus = "draft" | "staffing" | "in_progress" | "releasing" | "closed" | "cancelled";

export type AllocationStatus = "soft_reserved" | "active" | "planned_for_release" | "released" | "cancelled";

export type RequestType = "hard_allocation" | "soft_reservation";

export type RequestStatus = "pending" | "approved" | "rejected" | "withdrawn" | "conflict_flagged";

export type PocOutcome = "pending" | "closed_won" | "closed_lost";

export type PocPriority = "normal" | "high" | "urgent";

export type ImportJobStatus = "processing" | "completed" | "completed_with_errors" | "failed";

export type PlanTier = "trial" | "starter" | "growth" | "enterprise";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          industry: string | null;
          company_size: string | null;
          plan: PlanTier;
          seat_limit: number;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          industry?: string | null;
          company_size?: string | null;
          plan?: PlanTier;
          seat_limit?: number;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          email: string;
          primary_role: UserRole;
          designation: string | null;
          business_function_id: string | null;
          reporting_manager_id: string | null;
          status: AccountStatus;
          provisioning_source: ProvisioningSource;
          invited_by: string | null;
          bulk_import_job_id: string | null;
          profile_completed_at: string | null;
          deactivated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          full_name: string;
          email: string;
          primary_role: UserRole;
          designation?: string | null;
          business_function_id?: string | null;
          reporting_manager_id?: string | null;
          status?: AccountStatus;
          provisioning_source?: ProvisioningSource;
          invited_by?: string | null;
          bulk_import_job_id?: string | null;
          profile_completed_at?: string | null;
          deactivated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      user_roles: {
        Row: { id: string; profile_id: string; role: UserRole; created_at: string };
        Insert: { id?: string; profile_id: string; role: UserRole; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Insert"]>;
        Relationships: [];
      };
      business_functions: {
        Row: { id: string; organization_id: string; name: string; created_at: string };
        Insert: { id?: string; organization_id: string; name: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["business_functions"]["Insert"]>;
        Relationships: [];
      };
      skills: {
        Row: { id: string; organization_id: string; name: string; category: string | null; created_at: string };
        Insert: { id?: string; organization_id: string; name: string; category?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["skills"]["Insert"]>;
        Relationships: [];
      };
      profile_skills: {
        Row: {
          id: string;
          profile_id: string;
          skill_id: string;
          experience_years: number | null;
          last_used_on: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          skill_id: string;
          experience_years?: number | null;
          last_used_on?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profile_skills"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          code: string | null;
          client_name: string | null;
          description: string | null;
          business_function_id: string | null;
          project_manager_id: string | null;
          resource_manager_id: string | null;
          status: ProjectStatus;
          planned_start_date: string | null;
          planned_end_date: string | null;
          source_poc_id: string | null;
          created_by: string;
          closed_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          code?: string | null;
          client_name?: string | null;
          description?: string | null;
          business_function_id?: string | null;
          project_manager_id?: string | null;
          resource_manager_id?: string | null;
          status?: ProjectStatus;
          planned_start_date?: string | null;
          planned_end_date?: string | null;
          source_poc_id?: string | null;
          created_by: string;
          closed_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      project_owners: {
        Row: { id: string; project_id: string; profile_id: string; is_primary: boolean; created_at: string };
        Insert: { id?: string; project_id: string; profile_id: string; is_primary?: boolean; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["project_owners"]["Insert"]>;
        Relationships: [];
      };
      project_role_requirements: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          headcount: number;
          required_skills: string[];
          status: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          headcount?: number;
          required_skills?: string[];
          status?: string;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_role_requirements"]["Insert"]>;
        Relationships: [];
      };
      allocations: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          profile_id: string;
          allocation_percent: number;
          status: AllocationStatus;
          start_date: string;
          expected_completion_date: string | null;
          planned_release_date: string | null;
          actual_release_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          profile_id: string;
          allocation_percent: number;
          status?: AllocationStatus;
          start_date: string;
          expected_completion_date?: string | null;
          planned_release_date?: string | null;
          actual_release_date?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["allocations"]["Insert"]>;
        Relationships: [];
      };
      allocation_history: {
        Row: {
          id: string;
          allocation_id: string;
          changed_by: string;
          change_type: string;
          before_state: Json | null;
          after_state: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          allocation_id: string;
          changed_by: string;
          change_type: string;
          before_state?: Json | null;
          after_state?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["allocation_history"]["Insert"]>;
        Relationships: [];
      };
      allocation_requests: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          requested_profile_id: string | null;
          requirement_id: string | null;
          requested_by: string;
          request_type: RequestType;
          allocation_percent: number;
          start_date: string;
          end_date: string | null;
          justification: string | null;
          status: RequestStatus;
          routed_to: string | null;
          decided_by: string | null;
          decided_at: string | null;
          decision_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          requested_profile_id?: string | null;
          requirement_id?: string | null;
          requested_by: string;
          request_type?: RequestType;
          allocation_percent: number;
          start_date: string;
          end_date?: string | null;
          justification?: string | null;
          status?: RequestStatus;
          routed_to?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          decision_notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["allocation_requests"]["Insert"]>;
        Relationships: [];
      };
      request_conflicts: {
        Row: {
          id: string;
          request_id_a: string;
          request_id_b: string;
          detected_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          request_id_a: string;
          request_id_b: string;
          detected_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["request_conflicts"]["Insert"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
      idle_thresholds: {
        Row: {
          id: string;
          organization_id: string;
          business_function_id: string | null;
          threshold_percent: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          business_function_id?: string | null;
          threshold_percent?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["idle_thresholds"]["Insert"]>;
        Relationships: [];
      };
      pocs: {
        Row: {
          id: string;
          organization_id: string;
          client_name: string;
          opportunity_name: string | null;
          business_function_id: string | null;
          start_date: string | null;
          end_date: string | null;
          outcome: PocOutcome;
          outcome_notes: string | null;
          converted_project_id: string | null;
          priority: PocPriority;
          presales_lead_id: string | null;
          justification: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_name: string;
          opportunity_name?: string | null;
          business_function_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          outcome?: PocOutcome;
          outcome_notes?: string | null;
          converted_project_id?: string | null;
          priority?: PocPriority;
          presales_lead_id?: string | null;
          justification?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pocs"]["Insert"]>;
        Relationships: [];
      };
      poc_resources: {
        Row: { id: string; poc_id: string; profile_id: string; allocation_id: string | null; created_at: string };
        Insert: { id?: string; poc_id: string; profile_id: string; allocation_id?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["poc_resources"]["Insert"]>;
        Relationships: [];
      };
      poc_milestones: {
        Row: {
          id: string;
          poc_id: string;
          name: string;
          backend_days: number;
          frontend_days: number;
          pm_days: number;
          qa_days: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          poc_id: string;
          name: string;
          backend_days?: number;
          frontend_days?: number;
          pm_days?: number;
          qa_days?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["poc_milestones"]["Insert"]>;
        Relationships: [];
      };
      notification_rules: {
        Row: {
          id: string;
          organization_id: string;
          role: UserRole;
          event_type: string;
          lead_time_days: number | null;
          channel: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          role: UserRole;
          event_type: string;
          lead_time_days?: number | null;
          channel?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_rules"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          profile_id: string;
          type: string;
          title: string;
          body: string | null;
          entity_type: string | null;
          entity_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          profile_id: string;
          type: string;
          title: string;
          body?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      bulk_import_jobs: {
        Row: {
          id: string;
          organization_id: string;
          uploaded_by: string;
          file_name: string | null;
          total_rows: number;
          valid_rows: number;
          error_rows: number;
          status: ImportJobStatus;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          uploaded_by: string;
          file_name?: string | null;
          total_rows?: number;
          valid_rows?: number;
          error_rows?: number;
          status?: ImportJobStatus;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["bulk_import_jobs"]["Insert"]>;
        Relationships: [];
      };
      bulk_import_error_rows: {
        Row: {
          id: string;
          job_id: string;
          row_number: number;
          raw_data: Json;
          error_reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          row_number: number;
          raw_data: Json;
          error_reason: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bulk_import_error_rows"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      auth_org_id: { Args: Record<string, never>; Returns: string };
      auth_role: { Args: Record<string, never>; Returns: UserRole };
      auth_has_role: { Args: { check_role: UserRole }; Returns: boolean };
      create_organization_and_admin: {
        Args: { p_company_name: string; p_full_name: string };
        Returns: string;
      };
      notify_release_stakeholder: {
        Args: { p_allocation_id: string; p_target: "resource_manager" | "project_manager" };
        Returns: void;
      };
      resolve_request_conflict: { Args: { p_conflict_id: string }; Returns: void };
      reopen_request_conflict: { Args: { p_conflict_id: string }; Returns: void };
    };
    Enums: {
      user_role: UserRole;
      account_status: AccountStatus;
      provisioning_source: ProvisioningSource;
      project_status: ProjectStatus;
      allocation_status: AllocationStatus;
      request_type: RequestType;
      request_status: RequestStatus;
      poc_outcome: PocOutcome;
      poc_priority: PocPriority;
      import_job_status: ImportJobStatus;
      plan_tier: PlanTier;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
