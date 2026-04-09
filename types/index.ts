import type { Database, ApplicationStatus } from './database';

export type { ApplicationStatus } from './database';

type Tables = Database['public']['Tables'];

export type Profile = Tables['profiles']['Row'];
export type ConcessionsCompany = Tables['concessions_companies']['Row'];
export type Event = Tables['events']['Row'];
export type EventFinancials = Tables['event_financials']['Row'];
export type StaffingEntry = Tables['staffing_entries']['Row'];
export type InfrastructureItem = Tables['infrastructure_items']['Row'];

export type InfrastructureCategory = 'pitch_fee' | 'travel' | 'equipment' | 'supplies' | 'other';

export interface EventCalculations {
  grossProfit: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  totalStaffingCost: number;
}

export interface EventWithFinancials extends Event {
  event_financials: EventFinancials | null;
  concessions_companies: ConcessionsCompany | null;
  calculations: EventCalculations;
}

export interface EventDetail extends EventWithFinancials {
  staffing_entries: StaffingEntry[];
  infrastructure_items: InfrastructureItem[];
}

export interface CompanyWithStats extends ConcessionsCompany {
  totalEvents: number;
  acceptedEvents: number;
  totalRevenue: number;
  totalNetProfit: number;
  lastEventDate: string | null;
}

export interface DashboardStats {
  totalEventsYtd: number;
  grossSalesYtd: number;
  netProfitYtd: number;
  acceptanceRate: number;
  avgRevenuePerEvent: number;
  upcomingEvents: EventWithFinancials[];
  monthlyRevenue: MonthlyRevenue[];
  statusBreakdown: StatusCount[];
}

export interface MonthlyRevenue {
  month: string;
  grossSales: number;
  netProfit: number;
}

export interface StatusCount {
  status: ApplicationStatus;
  count: number;
}

export interface ReportData {
  year: number;
  totalGross: number;
  totalNet: number;
  totalEvents: number;
  avgMargin: number;
  monthly: MonthlyBreakdown[];
  topEvents: EventWithFinancials[];
  companyPerformance: CompanyPerformance[];
}

export interface MonthlyBreakdown {
  month: number;
  monthLabel: string;
  eventCount: number;
  grossSales: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
}

export interface CompanyPerformance {
  company: ConcessionsCompany;
  totalEvents: number;
  acceptedEvents: number;
  totalRevenue: number;
  acceptanceRate: number;
}

export interface EventFormValues {
  name: string;
  date: string;
  end_date?: string;
  location: string;
  description?: string;
  application_date?: string;
  status: ApplicationStatus;
  notes?: string;
  company_id?: string;
  gross_sales: number;
  cost_of_goods: number;
  pitch_fee: number;
  travel_costs: number;
  equipment_costs: number;
  other_costs: number;
  staffing_costs: number;
  staffing_entries: StaffingEntryForm[];
  infrastructure_items: InfrastructureItemForm[];
}

export interface StaffingEntryForm {
  id?: string;
  staff_name: string;
  hours_worked: number;
  hourly_rate: number;
}

export interface InfrastructureItemForm {
  id?: string;
  description: string;
  category: InfrastructureCategory;
  cost: number;
}

export interface CompanyFormValues {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
}
