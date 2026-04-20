import type { Database, ApplicationStatus, UnitStatus } from './database';

export type { ApplicationStatus, UnitStatus } from './database';

type Tables = Database['public']['Tables'];

export type Profile = Tables['profiles']['Row'];
export type ConcessionsCompany = Tables['concessions_companies']['Row'];
export type Event = Tables['events']['Row'];
export type EventFinancials = Tables['event_financials']['Row'];
export type StaffingEntry = Tables['staffing_entries']['Row'];
export type InfrastructureItem = Tables['infrastructure_items']['Row'];
export type Unit = Tables['units']['Row'];
export type UkEventDirectory = Tables['uk_events_directory']['Row'];

export type InfrastructureCategory = 'pitch_fee' | 'travel' | 'equipment' | 'supplies' | 'other';

export interface EventCalculations {
  // VAT breakdown
  standardRatedNet: number;
  vatCollected: number;
  totalNetSales: number;
  // Commission & pitch fee settlement
  commissionAmount: number;
  pitchFeeRefundGross: number;
  netRefund: number;
  effectivePitchFee: number;
  // Summary
  grossProfit: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  totalStaffingCost: number;
}

export const EMPTY_CALCULATIONS: EventCalculations = {
  standardRatedNet: 0, vatCollected: 0, totalNetSales: 0,
  commissionAmount: 0, pitchFeeRefundGross: 0, netRefund: 0, effectivePitchFee: 0,
  grossProfit: 0, totalCosts: 0, netProfit: 0, profitMargin: 0, totalStaffingCost: 0,
};

export interface EventWithFinancials extends Event {
  event_financials: EventFinancials | null;
  concessions_companies: ConcessionsCompany | null;
  units: Unit[];
  calculations: EventCalculations;
}

export interface EventDetail extends EventWithFinancials {
  staffing_entries: StaffingEntry[];
  infrastructure_items: InfrastructureItem[];
}

export interface DiscoveredEvent {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  location: string | null;
  dateHint: string | null;
  category: string;
  region: string | null;
  organiser: string | null;
  estimatedFootfall: string | null;
  pitchFeeRange: string | null;
  featured: boolean;
  // Company-specific fields
  eventsManaged: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  lastVerifiedAt: string | null;
  applicationChanged: boolean;
  isCompany: boolean;
}

export interface CompanyWithStats extends ConcessionsCompany {
  totalEvents: number;
  acceptedEvents: number;
  totalRevenue: number;
  totalNetProfit: number;
  lastEventDate: string | null;
  avgProfitMargin: number | null;
  completedEventCount: number;
}

export interface UnitWithStatus extends Unit {
  currentEvent: EventWithFinancials | null;
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
  totalFreshMilkLitres: number;
  totalAltMilkLitres: number;
  unitStatuses: UnitWithStatus[];
  committedFees: number;
  upcomingCommitments: {
    id: string;
    name: string;
    date: string;
    end_date: string | null;
    location: string;
    committedFee: number;
  }[];
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
  totalFreshMilkLitres: number;
  totalAltMilkLitres: number;
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

export type { UnitFormValues } from '@/lib/validations/unit.schema';

export interface DailyTakings {
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
}

export interface DailyTakingsForm {
  day_date: string;
  day_number: number;
  total_takings: number;
  hot_drinks_sales: number;
  iced_drinks_sales: number;
  avg_temp_c: number | null;
  weather_code: number | null;
  notes: string;
}

export interface DrinkSplitPrediction {
  hotPct: number;
  icedPct: number;
  confidence: 'high' | 'medium' | 'low';
  basedOnDays: number;
  tempBracket: string;
}

export interface CompanyFormValues {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
}
