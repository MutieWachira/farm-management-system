
export type InventoryMovementType =
  | "RECEIVED"
  | "USED"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT";

/**
 * Decimal values may arrive from the API as numbers or strings.
 * Convert them with Number(value) when performing calculations.
 */
export type InventoryQuantity = number | string;

export interface InventoryItem {
  id: string;
  farm_id: string;
  name: string;
  category: string;
  sku: string | null;
  unit: string;
  current_stock: InventoryQuantity;
  reorder_level: InventoryQuantity;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemRequest {
  name: string;
  category: string;
  sku?: string | null;
  unit: string;
  reorder_level?: number;
  description?: string | null;
}

export interface UpdateInventoryItemRequest {
  name?: string;
  category?: string;
  sku?: string | null;
  unit?: string;
  reorder_level?: number;
  description?: string | null;
  is_active?: boolean;
}

export interface InventoryTransaction {
  id: string;
  farm_id: string;
  item_id: string;
  movement_type: InventoryMovementType;
  quantity: InventoryQuantity;
  unit_cost: InventoryQuantity | null;
  transaction_date: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryTransactionRequest {
  movement_type: InventoryMovementType;
  quantity: number;
  unit_cost?: number | null;
  transaction_date?: string;
  reference?: string | null;
  notes?: string | null;
}

export interface InventoryItemFilters {
  search?: string;
  category?: string;
  is_active?: boolean | null;
  low_stock_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface InventoryTransactionFilters {
  movement_type?: InventoryMovementType;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}
