import { apiRequest } from "@/src/lib/api";
import { getAccessToken } from "@/src/lib/auth_storage";

import type {
  CreateCropRequest,
  Crop,
  UpdateCropRequest,
} from "@/src/types/crop";

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function getCrops(
  fieldId: string,
): Promise<Crop[]> {
  return apiRequest<Crop[]>(
    `/api/v1/fields/${fieldId}/crops`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );
}

export async function getCrop(
  fieldId: string,
  cropId: string,
): Promise<Crop> {
  return apiRequest<Crop>(
    `/api/v1/fields/${fieldId}/crops/${cropId}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );
}

export async function createCrop(
  fieldId: string,
  data: CreateCropRequest,
): Promise<Crop> {
  return apiRequest<Crop>(
    `/api/v1/fields/${fieldId}/crops`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
}

export async function updateCrop(
  fieldId: string,
  cropId: string,
  data: UpdateCropRequest,
): Promise<Crop> {
  return apiRequest<Crop>(
    `/api/v1/fields/${fieldId}/crops/${cropId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
}

export async function deleteCrop(
  fieldId: string,
  cropId: string,
): Promise<void> {
  await apiRequest<void>(
    `/api/v1/fields/${fieldId}/crops/${cropId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );
}