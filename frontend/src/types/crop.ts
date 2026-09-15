export type CropStatus =
  | "PLANNED"
  | "PLANTED"
  | "GROWING"
  | "HARVESTED"
  | "FAILED"
  | "CANCELLED";

export interface Crop {
  id: string;
  field_id: string;
  name: string;
  variety: string | null;
  planting_date: string | null;
  expected_harvest_date: string | null;
  actual_harvest_date: string | null;
  status: CropStatus;
  area_hectares: number | null;
  expected_yield: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCropRequest {
  name: string;
  variety?: string;
  planting_date?: string;
  expected_harvest_date?: string;
  actual_harvest_date?: string;
  status?: CropStatus;
  area_hectares?: number;
  expected_yield?: number;
  notes?: string;
}

export interface UpdateCropRequest {
  name?: string;
  variety?: string | null;
  planting_date?: string | null;
  expected_harvest_date?: string | null;
  actual_harvest_date?: string | null;
  status?: CropStatus;
  area_hectares?: number | null;
  expected_yield?: number | null;
  notes?: string | null;
}