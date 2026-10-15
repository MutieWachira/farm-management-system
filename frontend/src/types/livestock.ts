
export type LivestockStatus =
  | "ACTIVE"
  | "SOLD"
  | "DECEASED"
  | "MISSING";

export interface Livestock {
  id: string;
  farm_id: string;
  name: string;
  species: string;
  breed: string | null;
  tag_number: string | null;
  quantity: number;
  sex: string | null;
  birth_date: string | null;
  acquisition_date: string | null;
  purpose: string | null;
  status: LivestockStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLivestockRequest {
  name: string;
  species: string;
  breed?: string | null;
  tag_number?: string | null;
  quantity?: number;
  sex?: string | null;
  birth_date?: string | null;
  acquisition_date?: string | null;
  purpose?: string | null;
  status?: LivestockStatus;
  notes?: string | null;
}

export interface UpdateLivestockRequest {
  name?: string;
  species?: string;
  breed?: string | null;
  tag_number?: string | null;
  quantity?: number;
  sex?: string | null;
  birth_date?: string | null;
  acquisition_date?: string | null;
  purpose?: string | null;
  status?: LivestockStatus;
  notes?: string | null;
}

export interface LivestockFilters {
  search?: string;
  species?: string;
  status?: LivestockStatus;
  purpose?: string;
  acquisition_date_from?: string;
  acquisition_date_to?: string;
  limit?: number;
  offset?: number;
}
