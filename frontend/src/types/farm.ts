export interface Farm {
  id: string;
  owner_id: string;
  name: string;
  location: string;
  area_hectares: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFarmRequest {
  name: string;
  location: string;
  area_hectares?: number;
  description?: string;
}