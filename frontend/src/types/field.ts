export type FieldStatus =
  | "ACTIVE"
  | "FALLOW"
  | "INACTIVE";

export interface Field {
  id: string;
  farm_id: string;
  name: string;
  area_hectares: number;
  soil_type: string | null;
  status: FieldStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFieldRequest {
  name: string;
  area_hectares: number;
  soil_type?: string;
  status?: FieldStatus;
  description?: string;
}

export interface UpdateFieldRequest {
  name?: string;
  area_hectares?: number;
  soil_type?: string | null;
  status?: FieldStatus;
  description?: string | null;
}