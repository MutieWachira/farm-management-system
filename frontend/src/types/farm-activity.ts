
export type ActivityType =
  | "PLANTING"
  | "IRRIGATION"
  | "FERTILIZATION"
  | "SPRAYING"
  | "WEEDING"
  | "PEST_CONTROL"
  | "HARVESTING"
  | "LAND_PREPARATION"
  | "MAINTENANCE"
  | "OTHER";

export interface FarmActivity {
  id: string;
  farm_id: string;
  field_id: string | null;
  crop_id: string | null;
  activity_type: ActivityType;
  activity_date: string;
  title: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFarmActivityRequest {
  field_id?: string | null;
  crop_id?: string | null;
  activity_type: ActivityType;
  activity_date: string;
  title: string;
  description?: string | null;
  quantity?: number | null;
  unit?: string | null;
  cost?: number | null;
}

export interface UpdateFarmActivityRequest {
  field_id?: string | null;
  crop_id?: string | null;
  activity_type?: ActivityType;
  activity_date?: string;
  title?: string;
  description?: string | null;
  quantity?: number | null;
  unit?: string | null;
  cost?: number | null;
}
