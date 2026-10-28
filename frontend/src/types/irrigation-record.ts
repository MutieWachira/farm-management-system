export interface IrrigationRecord {
  id: string;
  farm_id: string;
  field_id: string;
  irrigation_date: string;
  method: string;
  duration_minutes: number;
  water_volume_liters: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateIrrigationRecordRequest {
  field_id: string;
  irrigation_date: string;
  method: string;
  duration_minutes: number;
  water_volume_liters: number;
  notes?: string | null;
}

export interface UpdateIrrigationRecordRequest {
  field_id?: string;
  irrigation_date?: string;
  method?: string;
  duration_minutes?: number;
  water_volume_liters?: number;
  notes?: string | null;
}
