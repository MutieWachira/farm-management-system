
import { apiRequest } from "@/src/lib/api";
import { getAccessToken } from "@/src/lib/auth_storage";

import type {
  CreateFarmActivityRequest,
  FarmActivity,
  UpdateFarmActivityRequest,
} from "@/src/types/farm-activity";

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function getFarmActivities(
  farmId: string,
): Promise<FarmActivity[]> {
  return apiRequest<FarmActivity[]>(
    `/api/v1/farms/${farmId}/activities`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );
}

export async function getFarmActivity(
  farmId: string,
  activityId: string,
): Promise<FarmActivity> {
  return apiRequest<FarmActivity>(
    `/api/v1/farms/${farmId}/activities/${activityId}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );
}

export async function createFarmActivity(
  farmId: string,
  data: CreateFarmActivityRequest,
): Promise<FarmActivity> {
  return apiRequest<FarmActivity>(
    `/api/v1/farms/${farmId}/activities`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
}

export async function updateFarmActivity(
  farmId: string,
  activityId: string,
  data: UpdateFarmActivityRequest,
): Promise<FarmActivity> {
  return apiRequest<FarmActivity>(
    `/api/v1/farms/${farmId}/activities/${activityId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
}

export async function deleteFarmActivity(
  farmId: string,
  activityId: string,
): Promise<void> {
  await apiRequest<void>(
    `/api/v1/farms/${farmId}/activities/${activityId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );
}
