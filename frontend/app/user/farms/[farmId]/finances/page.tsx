
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useParams } from "next/navigation";

import {
  createFinancialTransaction,
  getFinancialSummary,
  getFinancialTransactions,
} from "@/src/lib/financial-api";

import type {
  CreateFinancialTransactionRequest,
  FinancialCategory,
  FinancialSummaryItem,
  FinancialTransaction,
  TransactionType,
} from "@/src/types/financial-transaction";

type TransactionForm = {
  transaction_type: TransactionType;
  category: FinancialCategory;
  amount: string;
  currency_code: string;
  transaction_date: string;
  description: string;
  reference: string;
};

const INCOME_CATEGORIES: {
  value: FinancialCategory;
  label: string;
}[] = [
  { value: "crop_sales", label: "Crop sales" },
  { value: "livestock_sales", label: "Livestock sales" },
  { value: "milk_sales", label: "Milk sales" },
  { value: "egg_sales", label: "Egg sales" },
  { value: "other_income", label: "Other income" },
];

const EXPENSE_CATEGORIES: {
  value: FinancialCategory;
  label: string;
}[] = [
  { value: "seeds", label: "Seeds" },
  { value: "fertilizer", label: "Fertilizer" },
  { value: "pesticides", label: "Pesticides" },
  { value: "animal_feed", label: "Animal feed" },
  { value: "labour", label: "Labour" },
  { value: "equipment", label: "Equipment" },
  { value: "transport", label: "Transport" },
  { value: "veterinary", label: "Veterinary" },
  { value: "irrigation", label: "Irrigation" },
  { value: "other_expense", label: "Other expense" },
];

function getToday(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createInitialForm(): TransactionForm {
  return {
    transaction_type: "expense",
    category: "seeds",
    amount: "",
    currency_code: "KES",
    transaction_date: getToday(),
    description: "",
    reference: "",
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function formatMoney(
  value: number | string,
  currencyCode = "KES",
): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function categoryLabel(category: FinancialCategory): string {
  const allCategories = [
    ...INCOME_CATEGORIES,
    ...EXPENSE_CATEGORIES,
  ];

  return (
    allCategories.find((item) => item.value === category)?.label ??
    category.replaceAll("_", " ")
  );
}

function getCategories(type: TransactionType) {
  return type === "income"
    ? INCOME_CATEGORIES
    : EXPENSE_CATEGORIES;
}

function getBalanceByCurrency(
  summaries: FinancialSummaryItem[],
) {
  const totals = new Map<string, number>();

  for (const item of summaries) {
    const amount = Number(item.total);

    if (!Number.isFinite(amount)) {
      continue;
    }

    const current = totals.get(item.currency_code) ?? 0;

    totals.set(
      item.currency_code,
      current +
        (item.transaction_type === "income" ? amount : -amount),
    );
  }

  return Array.from(totals.entries()).map(
    ([currency_code, total]) => ({
      currency_code,
      total,
    }),
  );
}

export default function FinancialPage() {
  const params = useParams<{ farmId: string }>();
  const farmId = params.farmId;

  const [transactions, setTransactions] = useState<
    FinancialTransaction[]
  >([]);

  const [summaries, setSummaries] = useState<
    FinancialSummaryItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [typeFilter, setTypeFilter] = useState<
    "" | TransactionType
  >("");

  const [categoryFilter, setCategoryFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [form, setForm] = useState<TransactionForm>(
    createInitialForm,
  );

  const loadData = useCallback(async () => {
    if (!farmId) {
      setTransactions([]);
      setSummaries([]);
      setError("The farm ID is missing from the page URL.");
      setLoading(false);
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      setError("The start date cannot be later than the end date.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [transactionResult, summaryResult] =
        await Promise.all([
          getFinancialTransactions(farmId, {
            transaction_type: typeFilter || undefined,
            category:
              (categoryFilter as FinancialCategory) || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            limit: 100,
            offset: 0,
          }),
          getFinancialSummary(farmId),
        ]);

      setTransactions(transactionResult);
      setSummaries(summaryResult);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [
    farmId,
    typeFilter,
    categoryFilter,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function updateForm<K extends keyof TransactionForm>(
    key: K,
    value: TransactionForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleTransactionTypeChange(
    type: TransactionType,
  ) {
    const firstCategory = getCategories(type)[0].value;

    setForm((current) => ({
      ...current,
      transaction_type: type,
      category: firstCategory,
    }));
  }

  function openForm() {
    setForm(createInitialForm());
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(createInitialForm());
  }

  async function handleCreateTransaction(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!farmId) {
      setError("The farm ID is missing from the page URL.");
      return;
    }

    const amount = Number(form.amount);

    if (!form.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(form.amount.trim())) {
      setError("Enter a valid amount with no more than two decimal places.");
      return;
    }

    if (!/^[A-Za-z]{3}$/.test(form.currency_code.trim())) {
      setError("Enter a valid three-letter currency code, such as KES.");
      return;
    }

    if (
      form.transaction_type === "income" &&
      !INCOME_CATEGORIES.some(
        (item) => item.value === form.category,
      )
    ) {
      setError("Select a valid income category.");
      return;
    }

    if (
      form.transaction_type === "expense" &&
      !EXPENSE_CATEGORIES.some(
        (item) => item.value === form.category,
      )
    ) {
      setError("Select a valid expense category.");
      return;
    }

    const payload: CreateFinancialTransactionRequest = {
      transaction_type: form.transaction_type,
      category: form.category,
      amount,
      currency_code: form.currency_code.trim().toUpperCase(),
      transaction_date: form.transaction_date,
      description: form.description.trim() || null,
      reference: form.reference.trim() || null,
    };

    setSaving(true);

    try {
      await createFinancialTransaction(farmId, payload);

      setShowForm(false);
      setForm(createInitialForm());
      setSuccess(
        `${payload.transaction_type === "income" ? "Income" : "Expense"} recorded successfully.`,
      );

      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const incomeSummaries = summaries.filter(
    (item) => item.transaction_type === "income",
  );

  const expenseSummaries = summaries.filter(
    (item) => item.transaction_type === "expense",
  );

  const balances = getBalanceByCurrency(summaries);

  const activeCategories = typeFilter
    ? getCategories(typeFilter)
    : [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Page heading */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Farm management
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Expenses &amp; Income
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Record farm income and expenses, review your transactions,
              and track your financial position.
            </p>
          </div>

          <button
            type="button"
            onClick={openForm}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            <span className="mr-2 text-lg" aria-hidden="true">
              +
            </span>
            Record transaction
          </button>
        </section>

        {/* Notifications */}
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setError("")}
              className="font-semibold hover:text-red-950"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <p>{success}</p>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="font-semibold hover:text-emerald-950"
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        )}

        {/* Financial summary */}
        <section aria-labelledby="summary-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="summary-heading"
              className="text-lg font-bold text-slate-900"
            >
              Financial overview
            </h2>

            <span className="text-xs text-slate-500">
              All recorded transactions
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard
              title="Total income"
              description="Money received from farm activities"
              items={incomeSummaries}
              accent="emerald"
              loading={loading}
            />

            <SummaryCard
              title="Total expenses"
              description="Money spent on farm operations"
              items={expenseSummaries}
              accent="rose"
              loading={loading}
            />

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Net balance
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Income minus expenses
                  </p>
                </div>

                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl text-blue-700">
                  =
                </span>
              </div>

              <div className="mt-5 space-y-2">
                {loading ? (
                  <p className="animate-pulse text-sm text-slate-400">
                    Calculating balance...
                  </p>
                ) : balances.length === 0 ? (
                  <p className="text-2xl font-bold text-slate-900">
                    KES 0.00
                  </p>
                ) : (
                  balances.map((balance) => (
                    <p
                      key={balance.currency_code}
                      className={`text-xl font-bold ${
                        balance.total < 0
                          ? "text-rose-700"
                          : "text-blue-800"
                      }`}
                    >
                      {formatMoney(
                        balance.total,
                        balance.currency_code,
                      )}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* New transaction form */}
        {showForm && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Record a transaction
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter the details of the farm transaction below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <form
              onSubmit={handleCreateTransaction}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Transaction type">
                  <select
                    value={form.transaction_type}
                    onChange={(event) =>
                      handleTransactionTypeChange(
                        event.target.value as TransactionType,
                      )
                    }
                    disabled={saving}
                    className="form-control"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </FormField>

                <FormField label="Category">
                  <select
                    value={form.category}
                    onChange={(event) =>
                      updateForm(
                        "category",
                        event.target.value as FinancialCategory,
                      )
                    }
                    disabled={saving}
                    required
                    className="form-control"
                  >
                    {getCategories(form.transaction_type).map(
                      (category) => (
                        <option
                          key={category.value}
                          value={category.value}
                        >
                          {category.label}
                        </option>
                      ),
                    )}
                  </select>
                </FormField>

                <FormField label="Amount">
                  <input
                    type="number"
                    min="0.01"
                    max="999999999999.99"
                    step="0.01"
                    inputMode="decimal"
                    required
                    value={form.amount}
                    onChange={(event) =>
                      updateForm("amount", event.target.value)
                    }
                    disabled={saving}
                    placeholder="e.g. 2500.00"
                    className="form-control"
                  />
                </FormField>

                <FormField label="Currency">
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={3}
                    pattern="[A-Za-z]{3}"
                    value={form.currency_code}
                    onChange={(event) =>
                      updateForm(
                        "currency_code",
                        event.target.value.toUpperCase(),
                      )
                    }
                    disabled={saving}
                    placeholder="KES"
                    className="form-control uppercase"
                  />
                </FormField>

                <FormField label="Transaction date">
                  <input
                    type="date"
                    required
                    value={form.transaction_date}
                    onChange={(event) =>
                      updateForm(
                        "transaction_date",
                        event.target.value,
                      )
                    }
                    disabled={saving}
                    className="form-control"
                  />
                </FormField>

                <FormField label="Reference (optional)">
                  <input
                    type="text"
                    maxLength={150}
                    value={form.reference}
                    onChange={(event) =>
                      updateForm("reference", event.target.value)
                    }
                    disabled={saving}
                    placeholder="Receipt or invoice number"
                    className="form-control"
                  />
                </FormField>
              </div>

              <FormField label="Description (optional)">
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  disabled={saving}
                  placeholder="Add notes about this transaction..."
                  className="form-control resize-y"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {form.description.length}/2000 characters
                </p>
              </FormField>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="min-h-11 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving transaction..." : "Save transaction"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Transaction list */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Transactions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review and filter your recorded farm finances.
                </p>
              </div>

              <span className="text-sm text-slate-500">
                {transactions.length} displayed
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-1">
                <label
                  htmlFor="type-filter"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Type
                </label>

                <select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(
                      event.target.value as "" | TransactionType,
                    );
                    setCategoryFilter("");
                  }}
                  className="form-control"
                >
                  <option value="">All types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expenses</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="category-filter"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Category
                </label>

                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(event.target.value)
                  }
                  className="form-control"
                >
                  <option value="">All categories</option>

                  {activeCategories.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="start-date"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  From date
                </label>

                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                  className="form-control"
                />
              </div>

              <div>
                <label
                  htmlFor="end-date"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  To date
                </label>

                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) =>
                    setEndDate(event.target.value)
                  }
                  className="form-control"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("");
                    setCategoryFilter("");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-6" aria-live="polite">
              <div className="h-5 w-48 animate-pulse rounded bg-slate-100" />
              <div className="h-12 animate-pulse rounded bg-slate-100" />
              <div className="h-12 animate-pulse rounded bg-slate-100" />
              <div className="h-12 animate-pulse rounded bg-slate-100" />
              <p className="text-sm text-slate-500">
                Loading financial transactions...
              </p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700">
                +
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                No transactions found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Record your first income or expense, or adjust the
                filters to see existing transactions.
              </p>

              <button
                type="button"
                onClick={openForm}
                className="mt-5 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Record your first transaction
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[850px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Type</th>
                    <th className="px-5 py-4 font-semibold">Category</th>
                    <th className="px-5 py-4 font-semibold">Description</th>
                    <th className="px-5 py-4 font-semibold">Reference</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(transaction.transaction_date)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            transaction.transaction_type === "income"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {transaction.transaction_type === "income"
                            ? "Income"
                            : "Expense"}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-800">
                        {categoryLabel(transaction.category)}
                      </td>

                      <td className="max-w-xs px-5 py-4 text-slate-600">
                        <span className="block truncate">
                          {transaction.description || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {transaction.reference || "—"}
                      </td>

                      <td
                        className={`whitespace-nowrap px-5 py-4 text-right font-semibold ${
                          transaction.transaction_type === "income"
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {transaction.transaction_type === "income"
                          ? "+"
                          : "−"}
                        {formatMoney(
                          transaction.amount,
                          transaction.currency_code,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && transactions.length === 100 && (
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              Showing the first 100 matching transactions. Additional
              pagination can be added as the transaction history grows.
            </p>
          )}
        </section>

        <p className="text-center text-xs leading-5 text-slate-500">
          Financial summaries include all recorded transactions, while
          the table filters control which transactions are displayed.
          Balances are calculated separately for each currency.
        </p>
      </div>

      <style jsx>{`
        .form-control {
          display: block;
          width: 100%;
          min-height: 44px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background-color: #ffffff;
          padding: 10px 12px;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        .form-control:focus {
          border-color: #047857;
          box-shadow: 0 0 0 3px rgb(4 120 87 / 12%);
        }

        .form-control:disabled {
          cursor: not-allowed;
          background-color: #f8fafc;
          opacity: 0.7;
        }
      `}</style>
    </main>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function SummaryCard({
  title,
  description,
  items,
  accent,
  loading,
}: {
  title: string;
  description: string;
  items: FinancialSummaryItem[];
  accent: "emerald" | "rose";
  loading: boolean;
}) {
  const colors =
    accent === "emerald"
      ? {
          icon: "bg-emerald-50 text-emerald-700",
          amount: "text-emerald-700",
        }
      : {
          icon: "bg-rose-50 text-rose-700",
          amount: "text-rose-700",
        };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl ${colors.icon}`}
          aria-hidden="true"
        >
          {accent === "emerald" ? "+" : "−"}
        </span>
      </div>

      <div className="mt-5 space-y-2">
        {loading ? (
          <p className="animate-pulse text-sm text-slate-400">
            Calculating...
          </p>
        ) : items.length === 0 ? (
          <p className="text-2xl font-bold text-slate-900">
            KES 0.00
          </p>
        ) : (
          items.map((item) => (
            <p
              key={item.currency_code}
              className={`text-xl font-bold ${colors.amount}`}
            >
              {formatMoney(item.total, item.currency_code)}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
