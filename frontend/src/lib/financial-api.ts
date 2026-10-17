import { apiRequest } from "@/src/lib/api";
import { getAccessToken } from "@/src/lib/auth_storage";

import type {
  CreateFinancialTransactionRequest,
  FinancialSummaryItem,
  FinancialTransaction,
  FinancialTransactionFilters,
  UpdateFinancialTransactionRequest,
} from "@/src/types/financial-transaction";

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Authentication is required.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function financePath(farmId: string): string {
  return `/api/v1/farms/${encodeURIComponent(farmId)}/finances`;
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

export function getFinancialTransactions(
  farmId: string,
  filters: FinancialTransactionFilters = {},
): Promise<FinancialTransaction[]> {
  return apiRequest<FinancialTransaction[]>(
    `${financePath(farmId)}${buildQuery(filters)}`,
    { headers: getAuthHeaders() },
  );
}

export function getFinancialTransaction(
  farmId: string,
  transactionId: string,
): Promise<FinancialTransaction> {
  return apiRequest<FinancialTransaction>(
    `${financePath(farmId)}/${encodeURIComponent(transactionId)}`,
    { headers: getAuthHeaders() },
  );
}

export function getFinancialSummary(
  farmId: string,
): Promise<FinancialSummaryItem[]> {
  return apiRequest<FinancialSummaryItem[]>(
    `${financePath(farmId)}/summary`,
    { headers: getAuthHeaders() },
  );
}

export function createFinancialTransaction(
  farmId: string,
  data: CreateFinancialTransactionRequest,
): Promise<FinancialTransaction> {
  return apiRequest<FinancialTransaction>(financePath(farmId), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateFinancialTransaction(
  farmId: string,
  transactionId: string,
  data: UpdateFinancialTransactionRequest,
): Promise<FinancialTransaction> {
  return apiRequest<FinancialTransaction>(
    `${financePath(farmId)}/${encodeURIComponent(transactionId)}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
}

export function deleteFinancialTransaction(
  farmId: string,
  transactionId: string,
): Promise<void> {
  return apiRequest<void>(
    `${financePath(farmId)}/${encodeURIComponent(transactionId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );
}

