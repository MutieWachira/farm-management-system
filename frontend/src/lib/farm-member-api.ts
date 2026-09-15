import { apiRequest } from "./api";
import { getAccessToken } from "./auth_storage";

import type {
  AddFarmMemberRequest,
  FarmMember,
  UpdateFarmMemberRequest,
} from "@/src/types/farm-member";

function authHeaders(): HeadersInit {
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

export function getFarmMembers(
  farmId: string,
): Promise<FarmMember[]> {
  return apiRequest<FarmMember[]>(
    `/api/v1/farms/${farmId}/members`,
    {
      headers: authHeaders(),
    },
  );
}

export function addFarmMember(
  farmId: string,
  data: AddFarmMemberRequest,
): Promise<FarmMember> {
  return apiRequest<FarmMember>(
    `/api/v1/farms/${farmId}/members`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    },
  );
}

export function updateFarmMember(
  farmId: string,
  userId: string,
  data: UpdateFarmMemberRequest,
): Promise<FarmMember> {
  return apiRequest<FarmMember>(
    `/api/v1/farms/${farmId}/members/${userId}`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    },
  );
}

export function removeFarmMember(
  farmId: string,
  userId: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/farms/${farmId}/members/${userId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
}