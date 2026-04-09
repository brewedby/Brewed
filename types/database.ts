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
          }
        ];
      };
      event_financials: {
        Row: {
          id: string;
          event_id: string;
          gross_sales: number;
          cost_of_goods: number;
          pitch_fee: number;
          travel_costs: number;
          equipment_costs: number;
          other_costs: number;
          staffing_costs: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          gross_sales?: number;
          cost_of_goods?: number;
          pitch_fee?: number;
          travel_costs?: number;
          equipment_costs?: number;
          other_costs?: number;
          staffing_costs?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          gross_sales?: number;
          cost_of_goods?: number;
          pitch_fee?: number;
          travel_costs?: number;
          equipment_costs?: number;
          other_costs?: number;
          staffing_costs?: number;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      application_status: ApplicationStatus;
      infrastructure_category: InfrastructureCategory;
    };
    CompositeTypes: Record<string, never>;
  };
}
