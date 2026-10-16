
import { apiRequest } from "@/src/lib/api";
import { getAccessToken } from "@/src/lib/auth_storage";

import type {
  CreateLivestockRequest,
  Livestock,
  LivestockFilters,
  UpdateLivestockRequest,
} from "@/src/types/livestock";

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Authentication is required.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function livestockPath(farmId: string): string {
  return `/api/v1/farms/${encodeURIComponent(farmId)}/livestock`;
}

function buildQuery<T extends object>(filters: T): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

export function getLivestock(
  farmId: string,
  filters: LivestockFilters = {},
): Promise<Livestock[]> {
  return apiRequest<Livestock[]>(
    `${livestockPath(farmId)}${buildQuery(filters)}`,
    {
      headers: getAuthHeaders(),
    },
  );
}

export function getLivestockRecord(
  farmId: string,
  livestockId: string,
): Promise<Livestock> {
  return apiRequest<Livestock>(
    `${livestockPath(farmId)}/${encodeURIComponent(livestockId)}`,
    {
      headers: getAuthHeaders(),
    },
  );
}

export function createLivestock(
  farmId: string,
  data: CreateLivestockRequest,
): Promise<Livestock> {
  return apiRequest<Livestock>(livestockPath(farmId), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateLivestock(
  farmId: string,
  livestockId: string,
  data: UpdateLivestockRequest,
): Promise<Livestock> {
  return apiRequest<Livestock>(
    `${livestockPath(farmId)}/${encodeURIComponent(livestockId)}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
}
