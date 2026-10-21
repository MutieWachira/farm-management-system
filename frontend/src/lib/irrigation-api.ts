import { apiRequest } from "@/src/lib/api";
import { getAccessToken } from "@/src/lib/auth_storage";

import type {
  CreateIrrigationRecordRequest,
  IrrigationRecord,
  UpdateIrrigationRecordRequest,
} from "@/src/types/irrigation-record";

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Authentication is required. Please log in.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function getEndpoint(farmId: string): string {
  return `/api/v1/farms/${encodeURIComponent(farmId)}/irrigation-records`;
}

export function getIrrigationRecords(
  farmId: string,
): Promise<IrrigationRecord[]> {
  return apiRequest<IrrigationRecord[]>(getEndpoint(farmId), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });
}

export function createIrrigationRecord(
  farmId: string,
  data: CreateIrrigationRecordRequest,
): Promise<IrrigationRecord> {
  return apiRequest<IrrigationRecord>(getEndpoint(farmId), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateIrrigationRecord(
  farmId: string,
  recordId: string,
  data: UpdateIrrigationRecordRequest,
): Promise<IrrigationRecord> {
  return apiRequest<IrrigationRecord>(
    `${getEndpoint(farmId)}/${encodeURIComponent(recordId)}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
}

export function deleteIrrigationRecord(
  farmId: string,
  recordId: string,
): Promise<void> {
  return apiRequest<void>(
    `${getEndpoint(farmId)}/${encodeURIComponent(recordId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );
}
