/**
 * Supabase Database type definitions.
 *
 * Fully compliant with @supabase/supabase-js v2 type generation.
 * All money amounts are stored as bigint centavos (integer).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dorms: {
        Row: {
          id: string;
          name: string;
          currency: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          currency?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          currency?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dorm_members: {
        Row: {
          id: string;
          dorm_id: string;
          user_id: string;
          role: "admin" | "member";
          move_in_date: string;
          move_out_date: string | null;
          status: "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dorm_id: string;
          user_id: string;
          role?: "admin" | "member";
          move_in_date: string;
          move_out_date?: string | null;
          status?: "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dorm_id?: string;
          user_id?: string;
          role?: "admin" | "member";
          move_in_date?: string;
          move_out_date?: string | null;
          status?: "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dorm_invites: {
        Row: {
          id: string;
          dorm_id: string;
          code: string;
          invited_by: string;
          expires_at: string;
          is_used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          dorm_id: string;
          code: string;
          invited_by: string;
          expires_at: string;
          is_used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          dorm_id?: string;
          code?: string;
          invited_by?: string;
          expires_at?: string;
          is_used?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      bill_categories: {
        Row: {
          id: string;
          dorm_id: string | null;
          name: string;
          icon: string;
          is_predefined: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          dorm_id?: string | null;
          name: string;
          icon?: string;
          is_predefined?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          dorm_id?: string | null;
          name?: string;
          icon?: string;
          is_predefined?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      bills: {
        Row: {
          id: string;
          dorm_id: string;
          category_id: string;
          amount_centavos: number;
          billing_period_start: string;
          billing_period_end: string;
          due_date: string;
          created_by: string;
          paid_by: string;
          status: "draft" | "active" | "settled" | "reopened";
          split_method:
            | "equal"
            | "percentage"
            | "custom_amount"
            | "prorated_by_days";
          recurring_template_id: string | null;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dorm_id: string;
          category_id: string;
          amount_centavos: number;
          billing_period_start: string;
          billing_period_end: string;
          due_date: string;
          created_by: string;
          paid_by: string;
          status?: "draft" | "active" | "settled" | "reopened";
          split_method:
            | "equal"
            | "percentage"
            | "custom_amount"
            | "prorated_by_days";
          recurring_template_id?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dorm_id?: string;
          category_id?: string;
          amount_centavos?: number;
          billing_period_start?: string;
          billing_period_end?: string;
          due_date?: string;
          created_by?: string;
          paid_by?: string;
          status?: "draft" | "active" | "settled" | "reopened";
          split_method?:
            | "equal"
            | "percentage"
            | "custom_amount"
            | "prorated_by_days";
          recurring_template_id?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bill_shares: {
        Row: {
          id: string;
          bill_id: string;
          member_id: string;
          amount_owed_centavos: number;
          amount_paid_centavos: number;
          payment_status: "unpaid" | "acknowledged" | "partial" | "paid" | "confirmed";
          days_present?: number | null;
          is_days_confirmed?: boolean;
          acknowledged_at?: string | null;
          paid_at: string | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
        };
        Insert: {
          id?: string;
          bill_id: string;
          member_id: string;
          amount_owed_centavos: number;
          amount_paid_centavos?: number;
          payment_status?: "unpaid" | "acknowledged" | "partial" | "paid" | "confirmed";
          days_present?: number | null;
          is_days_confirmed?: boolean;
          acknowledged_at?: string | null;
          paid_at?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
        };
        Update: {
          id?: string;
          bill_id?: string;
          member_id?: string;
          amount_owed_centavos?: number;
          amount_paid_centavos?: number;
          payment_status?: "unpaid" | "acknowledged" | "partial" | "paid" | "confirmed";
          days_present?: number | null;
          is_days_confirmed?: boolean;
          acknowledged_at?: string | null;
          paid_at?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
        };
        Relationships: [];
      };
      bill_amendments: {
        Row: {
          id: string;
          bill_id: string;
          amended_by: string;
          old_amount_centavos: number;
          new_amount_centavos: number;
          old_split_method: string;
          new_split_method: string;
          changes_diff: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          bill_id: string;
          amended_by: string;
          old_amount_centavos: number;
          new_amount_centavos: number;
          old_split_method: string;
          new_split_method: string;
          changes_diff?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          bill_id?: string;
          amended_by?: string;
          old_amount_centavos?: number;
          new_amount_centavos?: number;
          old_split_method?: string;
          new_split_method?: string;
          changes_diff?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      recurring_templates: {
        Row: {
          id: string;
          dorm_id: string;
          category_id: string;
          default_amount_centavos: number;
          split_method:
            | "equal"
            | "percentage"
            | "custom_amount"
            | "prorated_by_days";
          draft_days_before_due: number;
          billing_day_of_month: number;
          due_day_of_month: number;
          created_by: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dorm_id: string;
          category_id: string;
          default_amount_centavos: number;
          split_method:
            | "equal"
            | "percentage"
            | "custom_amount"
            | "prorated_by_days";
          draft_days_before_due?: number;
          billing_day_of_month: number;
          due_day_of_month: number;
          created_by: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dorm_id?: string;
          category_id?: string;
          default_amount_centavos?: number;
          split_method?:
            | "equal"
            | "percentage"
            | "custom_amount"
            | "prorated_by_days";
          draft_days_before_due?: number;
          billing_day_of_month?: number;
          due_day_of_month?: number;
          created_by?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          dorm_id: string;
          from_member: string;
          to_member: string;
          amount_centavos: number;
          note: string | null;
          status: "pending" | "confirmed";
          created_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          dorm_id: string;
          from_member: string;
          to_member: string;
          amount_centavos: number;
          note?: string | null;
          status?: "pending" | "confirmed";
          created_at?: string;
          confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          dorm_id?: string;
          from_member?: string;
          to_member?: string;
          amount_centavos?: number;
          note?: string | null;
          status?: "pending" | "confirmed";
          created_at?: string;
          confirmed_at?: string | null;
        };
        Relationships: [];
      };
      reopen_requests: {
        Row: {
          id: string;
          bill_id: string;
          requested_by: string;
          reason: string;
          status: "pending" | "approved" | "rejected";
          reviewed_by: string | null;
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          bill_id: string;
          requested_by: string;
          reason: string;
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          bill_id?: string;
          requested_by?: string;
          reason?: string;
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      member_role: "admin" | "member";
      member_status: "active" | "inactive";
      bill_status: "draft" | "active" | "settled" | "reopened";
      split_method:
        | "equal"
        | "percentage"
        | "custom_amount"
        | "prorated_by_days";
      payment_status: "unpaid" | "partial" | "paid" | "confirmed";
      settle_status: "pending" | "confirmed";
      reopen_status: "pending" | "approved" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

/* Convenience type aliases */
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Dorm = Database["public"]["Tables"]["dorms"]["Row"];
export type DormMember = Database["public"]["Tables"]["dorm_members"]["Row"];
export type DormInvite = Database["public"]["Tables"]["dorm_invites"]["Row"];
export type BillCategory =
  Database["public"]["Tables"]["bill_categories"]["Row"];
export type Bill = Database["public"]["Tables"]["bills"]["Row"];
export type BillShare = Database["public"]["Tables"]["bill_shares"]["Row"];
export type BillAmendment =
  Database["public"]["Tables"]["bill_amendments"]["Row"];
export type RecurringTemplate =
  Database["public"]["Tables"]["recurring_templates"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type ReopenRequest =
  Database["public"]["Tables"]["reopen_requests"]["Row"];
