export type TransactionType = "income" | "expense";

export type IncomeCategory =
  | "crop_sales"
  | "livestock_sales"
  | "milk_sales"
  | "egg_sales"
  | "other_income";

export type ExpenseCategory =
  | "seeds"
  | "fertilizer"
  | "pesticides"
  | "animal_feed"
  | "labour"
  | "equipment"
  | "transport"
  | "veterinary"
  | "irrigation"
  | "other_expense";

export type FinancialCategory = IncomeCategory | ExpenseCategory;

/**
 * Monetary values can be returned as strings by the backend
 * because SQLAlchemy Decimal values are serialized as decimals.
 */
export type MonetaryAmount = number | string;

export interface FinancialTransaction {
  id: string;
  farm_id: string;
  created_by_id: string;
  transaction_type: TransactionType;
  category: FinancialCategory;
  amount: MonetaryAmount;
  currency_code: string;
  transaction_date: string;
  description: string | null;
  reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFinancialTransactionRequest {
  transaction_type: TransactionType;
  category: FinancialCategory;
  amount: number;
  currency_code?: string;
  transaction_date?: string;
  description?: string | null;
  reference?: string | null;
}

export interface UpdateFinancialTransactionRequest {
  transaction_type?: TransactionType;
  category?: FinancialCategory;
  amount?: number;
  currency_code?: string;
  transaction_date?: string;
  description?: string | null;
  reference?: string | null;
}

export interface FinancialTransactionFilters {
  transaction_type?: TransactionType;
  category?: FinancialCategory;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface FinancialSummaryItem {
  transaction_type: TransactionType;
  currency_code: string;
  total: MonetaryAmount;
}

