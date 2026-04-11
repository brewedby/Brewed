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
          created_at: string;
        };
        Insert: {
          id: string;
          business_name?: string | null;
          push_token?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string | null;
          push_token?: string | null;
          created_at?: string;
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
