export type ApplicationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'waitlisted'
  | 'withdrawn';

export type InfrastructureCategory =
  | 'pitch_fee'
  | 'travel'
  | 'equipment'
  | 'supplies'
  | 'other';

export type UnitStatus = 'active' | 'maintenance' | 'retired';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          business_name: string | null;
          push_token: string | null;
          business_type: string | null;
          currency: string | null;
          custom_metrics: Record<string, unknown>[] | null;
          created_at: string;
          // Subscription fields — read-only from client (server-managed)
          subscription_status: 'none' | 'active' | 'in_grace_period' | 'in_billing_retry' | 'expired' | 'revoked';
          subscription_product_id: string | null;
          subscription_expires_at: string | null;
          subscription_environment: 'Sandbox' | 'Production' | null;
          apple_original_transaction_id: string | null;
          apple_latest_transaction_id: string | null;
          subscription_validated_at: string | null;
          subscription_will_renew: boolean;
          reviewer_grandfathered: boolean;
        };
        Insert: {
          id: string;
          business_name?: string | null;
          push_token?: string | null;
          business_type?: string | null;
          currency?: string | null;
          custom_metrics?: Record<string, unknown>[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string | null;
          push_token?: string | null;
          business_type?: string | null;
          currency?: string | null;
          custom_metrics?: Record<string, unknown>[] | null;
          created_at?: string;
          // Subscription fields not included — guarded by DB trigger
        };
        Relationships: [];
      };
      units: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          registration: string | null;
          notes: string | null;
          status: UnitStatus;
          vehicle_type: string | null;
          height_m: number | null;
          length_m: number | null;
          width_m: number | null;
          mot_date: string | null;
          tax_date: string | null;
          service_date: string | null;
          service_interval: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          registration?: string | null;
          notes?: string | null;
          status?: UnitStatus;
          vehicle_type?: string | null;
          height_m?: number | null;
          length_m?: number | null;
          width_m?: number | null;
          mot_date?: string | null;
          tax_date?: string | null;
          service_date?: string | null;
          service_interval?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          registration?: string | null;
          notes?: string | null;
          status?: UnitStatus;
          vehicle_type?: string | null;
          height_m?: number | null;
          length_m?: number | null;
          width_m?: number | null;
          mot_date?: string | null;
          tax_date?: string | null;
          service_date?: string | null;
          service_interval?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      concessions_companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          website: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          date: string;
          end_date: string | null;
          location: string;
          description: string | null;
          application_date: string | null;
          status: ApplicationStatus;
          notes: string | null;
          company_id: string | null;
          unit_id: string | null;
          overnight_stay: boolean;
          documents_uploaded: boolean;
          application_url: string | null;
          page_hash: string | null;
          url_last_checked_at: string | null;
          url_changed: boolean;
          lat: number | null;
          lng: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          date: string;
          end_date?: string | null;
          location: string;
          description?: string | null;
          application_date?: string | null;
          status?: ApplicationStatus;
          notes?: string | null;
          company_id?: string | null;
          unit_id?: string | null;
          overnight_stay?: boolean;
          documents_uploaded?: boolean;
          application_url?: string | null;
          page_hash?: string | null;
          url_last_checked_at?: string | null;
          url_changed?: boolean;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          date?: string;
          end_date?: string | null;
          location?: string;
          description?: string | null;
          application_date?: string | null;
          status?: ApplicationStatus;
          notes?: string | null;
          company_id?: string | null;
          unit_id?: string | null;
          overnight_stay?: boolean;
          documents_uploaded?: boolean;
          application_url?: string | null;
          page_hash?: string | null;
          url_last_checked_at?: string | null;
          url_changed?: boolean;
          lat?: number | null;
          lng?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "concessions_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          }
        ];
      };
      event_financials: {
        Row: {
          id: string;
          event_id: string;
          gross_sales: number;
          zero_rated_sales: number;
          standard_rated_sales: number;
          concessions_commission_pct: number;
          pitch_fee_refund_pct: number;
          cost_of_goods: number;
          pitch_fee: number;
          power_fee: number;
          travel_costs: number;
          camping_costs: number;
          equipment_costs: number;
          other_costs: number;
          staffing_costs: number;
          fresh_milk_litres: number;
          alt_milk_litres: number;
          miles_driven: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          gross_sales?: number;
          zero_rated_sales?: number;
          standard_rated_sales?: number;
          concessions_commission_pct?: number;
          pitch_fee_refund_pct?: number;
          cost_of_goods?: number;
          pitch_fee?: number;
          power_fee?: number;
          travel_costs?: number;
          camping_costs?: number;
          equipment_costs?: number;
          other_costs?: number;
          staffing_costs?: number;
          fresh_milk_litres?: number;
          alt_milk_litres?: number;
          miles_driven?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          gross_sales?: number;
          zero_rated_sales?: number;
          standard_rated_sales?: number;
          concessions_commission_pct?: number;
          pitch_fee_refund_pct?: number;
          cost_of_goods?: number;
          pitch_fee?: number;
          power_fee?: number;
          travel_costs?: number;
          camping_costs?: number;
          equipment_costs?: number;
          other_costs?: number;
          staffing_costs?: number;
          fresh_milk_litres?: number;
          alt_milk_litres?: number;
          miles_driven?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_financials_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      staffing_entries: {
        Row: {
          id: string;
          event_id: string;
          staff_name: string;
          hours_worked: number;
          hourly_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          staff_name: string;
          hours_worked: number;
          hourly_rate: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          staff_name?: string;
          hours_worked?: number;
          hourly_rate?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staffing_entries_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      infrastructure_items: {
        Row: {
          id: string;
          event_id: string;
          description: string;
          category: InfrastructureCategory;
          cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          description: string;
          category: InfrastructureCategory;
          cost: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          description?: string;
          category?: InfrastructureCategory;
          cost?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "infrastructure_items_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      uk_events_directory: {
        Row: {
          id: string;
          name: string;
          organiser: string | null;
          website: string | null;
          location: string | null;
          region: string | null;
          category: string | null;
          description: string | null;
          application_url: string | null;
          typical_dates: string | null;
          next_date: string | null;
          estimated_footfall: string | null;
          pitch_fee_range: string | null;
          events_managed: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          last_verified_at: string | null;
          application_changed: boolean;
          page_hash: string | null;
          source: string;
          featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          organiser?: string | null;
          website?: string | null;
          location?: string | null;
          region?: string | null;
          category?: string | null;
          description?: string | null;
          application_url?: string | null;
          typical_dates?: string | null;
          next_date?: string | null;
          estimated_footfall?: string | null;
          pitch_fee_range?: string | null;
          events_managed?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          last_verified_at?: string | null;
          application_changed?: boolean;
          source?: string;
          featured?: boolean;
        };
        Update: {
          name?: string;
          organiser?: string | null;
          website?: string | null;
          location?: string | null;
          region?: string | null;
          category?: string | null;
          description?: string | null;
          application_url?: string | null;
          typical_dates?: string | null;
          next_date?: string | null;
          estimated_footfall?: string | null;
          pitch_fee_range?: string | null;
          events_managed?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          last_verified_at?: string | null;
          application_changed?: boolean;
          source?: string;
          featured?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_units: {
        Row: {
          event_id: string;
          unit_id: string;
        };
        Insert: {
          event_id: string;
          unit_id: string;
        };
        Update: {
          event_id?: string;
          unit_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_units_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_units_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          }
        ];
      };
      daily_takings: {
        Row: {
          id: string;
          event_id: string;
          day_date: string;
          day_number: number;
          total_takings: number;
          hot_drinks_sales: number;
          iced_drinks_sales: number;
          avg_temp_c: number | null;
          weather_code: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          day_date: string;
          day_number: number;
          total_takings?: number;
          hot_drinks_sales?: number;
          iced_drinks_sales?: number;
          avg_temp_c?: number | null;
          weather_code?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          day_date?: string;
          day_number?: number;
          total_takings?: number;
          hot_drinks_sales?: number;
          iced_drinks_sales?: number;
          avg_temp_c?: number | null;
          weather_code?: number | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_takings_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      event_documents: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          file_name: string;
          file_size?: number | null;
          mime_type?: string | null;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          file_name?: string;
          file_size?: number | null;
          mime_type?: string | null;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_documents_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      product_catalog: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          sku: string | null;
          selling_price: number;
          // JSONB: array of { label: string; price: number }. Added in
          // migration_011_price_tiers — falls back to [] if not present.
          price_tiers: { label: string; price: number }[] | null;
          unit_cost: number;
          unit: string;
          category: string;
          // Per-product VAT override. null = use category default.
          // Added in migration_012_per_product_vat.
          is_vatable: boolean | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          sku?: string | null;
          selling_price?: number;
          price_tiers?: { label: string; price: number }[] | null;
          unit_cost?: number;
          unit?: string;
          category?: string;
          is_vatable?: boolean | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          sku?: string | null;
          selling_price?: number;
          price_tiers?: { label: string; price: number }[] | null;
          unit_cost?: number;
          unit?: string;
          category?: string;
          is_vatable?: boolean | null;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales_reports: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          storage_path: string | null;
          status: string;
          error_message: string | null;
          total_line_items: number;
          matched_line_items: number;
          total_revenue_from_file: number;
          calculated_cogs: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          file_name: string;
          file_size?: number | null;
          mime_type?: string | null;
          storage_path?: string | null;
          status?: string;
          error_message?: string | null;
          total_line_items?: number;
          matched_line_items?: number;
          total_revenue_from_file?: number;
          calculated_cogs?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          status?: string;
          error_message?: string | null;
          total_line_items?: number;
          matched_line_items?: number;
          total_revenue_from_file?: number;
          calculated_cogs?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sales_reports_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      sales_line_items: {
        Row: {
          id: string;
          sales_report_id: string;
          event_id: string;
          product_name: string;
          product_catalog_id: string | null;
          match_confidence: number | null;
          quantity: number;
          unit_price: number | null;
          line_total: number | null;
          unit_cost_snapshot: number | null;
          cogs_calculated: number | null;
          is_matched: boolean;
          is_manually_assigned: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sales_report_id: string;
          event_id: string;
          product_name: string;
          product_catalog_id?: string | null;
          match_confidence?: number | null;
          quantity: number;
          unit_price?: number | null;
          line_total?: number | null;
          unit_cost_snapshot?: number | null;
          cogs_calculated?: number | null;
          is_matched?: boolean;
          is_manually_assigned?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_catalog_id?: string | null;
          match_confidence?: number | null;
          unit_cost_snapshot?: number | null;
          cogs_calculated?: number | null;
          is_matched?: boolean;
          is_manually_assigned?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "sales_line_items_report_id_fkey";
            columns: ["sales_report_id"];
            isOneToOne: false;
            referencedRelation: "sales_reports";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      application_status: ApplicationStatus;
      infrastructure_category: InfrastructureCategory;
      unit_status: UnitStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
