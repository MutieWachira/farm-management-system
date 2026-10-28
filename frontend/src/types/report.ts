export interface ReportPeriod {
  start_date: string | null;
  end_date: string | null;
}

export interface FarmReportInfo {
  id: string;
  name: string;
  location: string;
  area_hectares: number | null;
  created_at: string;
}

export interface FieldReportSummary {
  total_fields: number;
  active_fields: number;
  fallow_fields: number;
  inactive_fields: number;
  total_field_area_hectares: number;
}

export interface ActivityReportSummary {
  total_activities: number;
  activities_by_type: Record<string, number>;
}

export interface IrrigationReportSummary {
  total_sessions: number;
  total_duration_minutes: number;
  total_water_volume_liters: number;
}

export interface FinancialCurrencySummary {
  currency_code: string;
  total_income: string | number;
  total_expenses: string | number;
  net_balance: string | number;
}

export interface FarmOverviewReport {
  period: ReportPeriod;
  farm: FarmReportInfo;
  fields: FieldReportSummary;
  activities: ActivityReportSummary;
  irrigation: IrrigationReportSummary;
  finances: FinancialCurrencySummary[];
}

export interface ReportDateFilters {
  start_date?: string;
  end_date?: string;
}