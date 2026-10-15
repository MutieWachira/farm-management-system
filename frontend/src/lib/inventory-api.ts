
import { apiRequest } from "@/src/lib/api";
import { getAccessToken } from "@/src/lib/auth_storage";

import type {
  CreateInventoryItemRequest,
  CreateInventoryTransactionRequest,
  InventoryItem,
  InventoryItemFilters,
  InventoryTransaction,
  InventoryTransactionFilters,
  UpdateInventoryItemRequest,
} from "@/src/types/inventory";

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Authentication is required.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function inventoryPath(farmId: string): string {
  return `/api/v1/farms/${encodeURIComponent(farmId)}/inventory`;
}


function buildQuery<T extends object>(filters: T): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      params.set(key, String(value));
    }
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}


export function getInventoryItems(
  farmId: string,
  filters: InventoryItemFilters = {},
): Promise<InventoryItem[]> {
  return apiRequest<InventoryItem[]>(
    `${inventoryPath(farmId)}${buildQuery(filters)}`,
    { headers: getAuthHeaders() },
  );
}

export function getInventoryItem(
  farmId: string,
  itemId: string,
): Promise<InventoryItem> {
  return apiRequest<InventoryItem>(
    `${inventoryPath(farmId)}/${encodeURIComponent(itemId)}`,
    { headers: getAuthHeaders() },
  );
}

export function createInventoryItem(
  farmId: string,
  data: CreateInventoryItemRequest,
): Promise<InventoryItem> {
  return apiRequest<InventoryItem>(inventoryPath(farmId), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
}

export function updateInventoryItem(
  farmId: string,
  itemId: string,
  data: UpdateInventoryItemRequest,
): Promise<InventoryItem> {
  return apiRequest<InventoryItem>(
    `${inventoryPath(farmId)}/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
}

export function deactivateInventoryItem(
  farmId: string,
  itemId: string,
): Promise<InventoryItem> {
  return apiRequest<InventoryItem>(
    `${inventoryPath(farmId)}/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );
}

export function createInventoryTransaction(
  farmId: string,
  itemId: string,
  data: CreateInventoryTransactionRequest,
): Promise<InventoryTransaction> {
  return apiRequest<InventoryTransaction>(
    `${inventoryPath(farmId)}/${encodeURIComponent(itemId)}/transactions`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
}

export function getInventoryTransactions(
  farmId: string,
  itemId: string,
  filters: InventoryTransactionFilters = {},
): Promise<InventoryTransaction[]> {
  return apiRequest<InventoryTransaction[]>(
    `${inventoryPath(farmId)}/${encodeURIComponent(itemId)}/transactions${buildQuery(filters)}`,
    { headers: getAuthHeaders() },
  );
}
