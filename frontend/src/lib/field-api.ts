import { apiRequest } from "@/src/lib/api";
import { getAccessToken } from "@/src/lib/auth_storage";

import type {
  CreateFieldRequest,
  Field,
  UpdateFieldRequest,
} from "@/src/types/field";

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function getFields(
  farmId: string,
): Promise<Field[]> {
  return apiRequest<Field[]>(
    `/api/v1/farms/${farmId}/fields`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );
}

export async function getField(
  farmId: string,
  fieldId: string,
): Promise<Field> {
  return apiRequest<Field>(
    `/api/v1/farms/${farmId}/fields/${fieldId}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );
}

export async function createField(
  farmId: string,
  data: CreateFieldRequest,
): Promise<Field> {
  return apiRequest<Field>(
    `/api/v1/farms/${farmId}/fields`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
}

export async function updateField(
  farmId: string,
  fieldId: string,
  data: UpdateFieldRequest,
): Promise<Field> {
  return apiRequest<Field>(
    `/api/v1/farms/${farmId}/fields/${fieldId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
}

export async function deleteField(
  farmId: string,
  fieldId: string,
): Promise<void> {
  await apiRequest<void>(
    `/api/v1/farms/${farmId}/fields/${fieldId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );
}