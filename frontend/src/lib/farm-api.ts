import { apiRequest } from "./api";
import { getAccessToken } from "./auth_storage";

import type {
  CreateFarmRequest,
  Farm,
} from "@/src/types/farm";

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();

  if (!token) {
    throw new Error(
      "Authentication is required.",
    );
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export function getFarms(): Promise<Farm[]> {
  return apiRequest<Farm[]>(
    "/api/v1/farms",
    {
      headers: getAuthHeaders(),
    },
  );
}

export function createFarm(
  data: CreateFarmRequest,
): Promise<Farm> {
  return apiRequest<Farm>(
    "/api/v1/farms",
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
}