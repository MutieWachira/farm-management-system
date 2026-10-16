
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";

import {
  createInventoryItem,
  createInventoryTransaction,
  deactivateInventoryItem,
  getInventoryItems,
  getInventoryTransactions,
} from "@/src/lib/inventory-api";

import type {
  CreateInventoryItemRequest,
  CreateInventoryTransactionRequest,
  InventoryItem,
  InventoryMovementType,
  InventoryTransaction,
} from "@/src/types/inventory";

type ItemForm = {
  name: string;
  category: string;
  sku: string;
  unit: string;
  reorder_level: string;
  description: string;
};

type MovementForm = {
  movement_type: InventoryMovementType;
  quantity: string;
  unit_cost: string;
  transaction_date: string;
  reference: string;
  notes: string;
};

const INITIAL_ITEM_FORM: ItemForm = {
  name: "",
  category: "",
  sku: "",
  unit: "",
  reorder_level: "0",
  description: "",
};

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createInitialMovementForm(): MovementForm {
  return {
    movement_type: "RECEIVED",
    quantity: "",
    unit_cost: "",
    transaction_date: getToday(),
    reference: "",
    notes: "",
  };
}

const MOVEMENT_OPTIONS: {
  value: InventoryMovementType;
  label: string;
  description: string;
}[] = [
  {
    value: "RECEIVED",
    label: "Stock received",
    description: "New stock received from a supplier or another source.",
  },
  {
    value: "USED",
    label: "Stock used",
    description: "Stock consumed by farm operations.",
  },
  {
    value: "ADJUSTMENT_IN",
    label: "Positive adjustment",
    description: "Increase stock to correct a verified discrepancy.",
  },
  {
    value: "ADJUSTMENT_OUT",
    label: "Negative adjustment",
    description: "Decrease stock to correct a verified discrepancy.",
  },
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function formatQuantity(value: number | string): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 3,
  }).format(number);
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

function formatMoney(value: number | string | null): string {
  if (value === null) {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);
}

function movementLabel(type: InventoryMovementType): string {
  return (
    MOVEMENT_OPTIONS.find((option) => option.value === type)?.label ??
    type.replaceAll("_", " ")
  );
}

export default function InventoryPage() {
  const params = useParams<{ farmId: string }>();
  const farmId = params.farmId;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] =
    useState<ItemForm>(INITIAL_ITEM_FORM);

  const [movementItem, setMovementItem] =
    useState<InventoryItem | null>(null);
  const [movementForm, setMovementForm] =
    useState<MovementForm>(createInitialMovementForm);

  const [historyItem, setHistoryItem] =
    useState<InventoryItem | null>(null);
  const [transactions, setTransactions] =
    useState<InventoryTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const loadItems = useCallback(async () => {
    if (!farmId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getInventoryItems(farmId, {
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        is_active: true,
        low_stock_only: lowStockOnly || undefined,
        limit: 100,
        offset: 0,
      });

      setItems(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [farmId, search, categoryFilter, lowStockOnly]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function updateItemForm<K extends keyof ItemForm>(
    key: K,
    value: ItemForm[K],
  ) {
    setItemForm((current) => ({ ...current, [key]: value }));
  }

  function updateMovementForm<K extends keyof MovementForm>(
    key: K,
    value: MovementForm[K],
  ) {
    setMovementForm((current) => ({ ...current, [key]: value }));
  }

  function openItemForm() {
    setItemForm(INITIAL_ITEM_FORM);
    setMovementItem(null);
    setError("");
    setSuccess("");
    setShowItemForm(true);
  }

  function closeItemForm() {
    setShowItemForm(false);
    setItemForm(INITIAL_ITEM_FORM);
  }

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!farmId) {
      setError("The farm ID is missing from the page URL.");
      return;
    }

    const reorderLevel = Number(itemForm.reorder_level);

    if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
      setError("The reorder level must be zero or greater.");
      return;
    }

    const payload: CreateInventoryItemRequest = {
      name: itemForm.name.trim(),
      category: itemForm.category.trim(),
      sku: itemForm.sku.trim() || null,
      unit: itemForm.unit.trim(),
      reorder_level: reorderLevel,
      description: itemForm.description.trim() || null,
    };

    setSavingItem(true);

    try {
      await createInventoryItem(farmId, payload);
      setSuccess(
        "Inventory item created. Record a stock receipt to add its opening stock.",
      );
      closeItemForm();
      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingItem(false);
    }
  }

  function openMovementForm(item: InventoryItem) {
    setMovementItem(item);
    setMovementForm(createInitialMovementForm());
    setHistoryItem(null);
    setTransactions([]);
    setError("");
    setSuccess("");
  }

  function closeMovementForm() {
    setMovementItem(null);
    setMovementForm(createInitialMovementForm());
  }

  async function handleCreateMovement(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!farmId || !movementItem) {
      setError("Select an inventory item first.");
      return;
    }

    const quantity = Number(movementForm.quantity);
    const unitCost =
      movementForm.unit_cost.trim() === ""
        ? undefined
        : Number(movementForm.unit_cost);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (
      unitCost !== undefined &&
      (!Number.isFinite(unitCost) || unitCost < 0)
    ) {
      setError("Unit cost must be zero or greater.");
      return;
    }

    if (!movementForm.transaction_date) {
      setError("Select the transaction date.");
      return;
    }

    const payload: CreateInventoryTransactionRequest = {
      movement_type: movementForm.movement_type,
      quantity,
      unit_cost: unitCost,
      transaction_date: movementForm.transaction_date,
      reference: movementForm.reference.trim() || null,
      notes: movementForm.notes.trim() || null,
    };

    setSavingMovement(true);

    try {
      await createInventoryTransaction(
        farmId,
        movementItem.id,
        payload,
      );

      const itemName = movementItem.name;

      setSuccess(
        `Stock movement recorded for ${itemName}. The stock balance has been refreshed.`,
      );

      closeMovementForm();
      await loadItems();

      if (historyItem?.id === movementItem.id) {
        await openHistory(movementItem);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingMovement(false);
    }
  }

  async function handleDeactivate(item: InventoryItem) {
    const confirmed = window.confirm(
      `Deactivate "${item.name}"? It will no longer appear in the active inventory list.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(item.id);

    try {
      await deactivateInventoryItem(farmId, item.id);

      setItems((current) =>
        current.filter((existing) => existing.id !== item.id),
      );

      if (historyItem?.id === item.id) {
        setHistoryItem(null);
        setTransactions([]);
      }

      if (movementItem?.id === item.id) {
        closeMovementForm();
      }

      setSuccess(`"${item.name}" has been deactivated.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function openHistory(item: InventoryItem) {
    if (!farmId) {
      return;
    }

    setHistoryItem(item);
    setTransactions([]);
    setHistoryError("");
    setHistoryLoading(true);

    try {
      const result = await getInventoryTransactions(
        farmId,
        item.id,
        { limit: 100, offset: 0 },
      );

      setTransactions(result);
    } catch (err) {
      setHistoryError(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  }

  const lowStockCount = items.filter(
    (item) => Number(item.current_stock) <= Number(item.reorder_level),
  ).length;

  const categories = Array.from(
    new Set(items.map((item) => item.category).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const movementDescription =
    MOVEMENT_OPTIONS.find(
      (option) => option.value === movementForm.movement_type,
    )?.description ?? "";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Farm management
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Inventory
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Track farm supplies, monitor reorder levels, and maintain
              a reliable record of stock movements.
            </p>
          </div>

          <button
            type="button"
            onClick={openItemForm}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            <span className="mr-2 text-lg" aria-hidden="true">+</span>
            Add inventory item
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <div className="flex items-start justify-between gap-3">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                className="font-semibold"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {success}
          </div>
        )}

        <section
          aria-label="Inventory summary"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Active items shown
            </p>
            <p className="mt-3 text-3xl font-bold">
              {loading ? "—" : items.length}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Matching your current filters
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Items at or below reorder level
            </p>
            <p className="mt-3 text-3xl font-bold">
              {loading ? "—" : lowStockCount}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Review these items before the next farm operation
            </p>
          </div>
        </section>

        {showItemForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Add inventory item</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Define the item and its low-stock threshold.
                  Opening stock is recorded separately.
                </p>
              </div>
              <button
                type="button"
                onClick={closeItemForm}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="item-name" className="mb-2 block text-sm font-medium text-slate-700">
                    Item name *
                  </label>
                  <input
                    id="item-name"
                    required
                    minLength={2}
                    maxLength={150}
                    value={itemForm.name}
                    onChange={(event) => updateItemForm("name", event.target.value)}
                    placeholder="e.g. Maize seeds"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label htmlFor="item-category" className="mb-2 block text-sm font-medium text-slate-700">
                    Category *
                  </label>
                  <input
                    id="item-category"
                    required
                    maxLength={100}
                    value={itemForm.category}
                    onChange={(event) => updateItemForm("category", event.target.value)}
                    placeholder="e.g. Seeds, fertilizer, tools"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label htmlFor="item-sku" className="mb-2 block text-sm font-medium text-slate-700">
                    SKU / item code
                  </label>
                  <input
                    id="item-sku"
                    maxLength={100}
                    value={itemForm.sku}
                    onChange={(event) => updateItemForm("sku", event.target.value)}
                    placeholder="Optional unique code"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label htmlFor="item-unit" className="mb-2 block text-sm font-medium text-slate-700">
                    Unit *
                  </label>
                  <input
                    id="item-unit"
                    required
                    maxLength={30}
                    value={itemForm.unit}
                    onChange={(event) => updateItemForm("unit", event.target.value)}
                    placeholder="e.g. kg, litres, bags, pieces"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label htmlFor="reorder-level" className="mb-2 block text-sm font-medium text-slate-700">
                    Reorder level *
                  </label>
                  <input
                    id="reorder-level"
                    type="number"
                    min="0"
                    step="0.001"
                    required
                    value={itemForm.reorder_level}
                    onChange={(event) => updateItemForm("reorder_level", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="item-description" className="mb-2 block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    id="item-description"
                    rows={3}
                    maxLength={1000}
                    value={itemForm.description}
                    onChange={(event) => updateItemForm("description", event.target.value)}
                    placeholder="Optional notes about this item"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={savingItem}
                  className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingItem ? "Saving item…" : "Save item"}
                </button>
                <button
                  type="button"
                  onClick={closeItemForm}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {movementItem && (
          <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-emerald-700">
                  Inventory transaction
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  Record movement: {movementItem.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Current stock: {formatQuantity(movementItem.current_stock)}{" "}
                  {movementItem.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMovementForm}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateMovement} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="movement-type" className="mb-2 block text-sm font-medium text-slate-700">
                    Movement type *
                  </label>
                  <select
                    id="movement-type"
                    required
                    value={movementForm.movement_type}
                    onChange={(event) =>
                      updateMovementForm(
                        "movement_type",
                        event.target.value as InventoryMovementType,
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    {MOVEMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    {movementDescription}
                  </p>
                </div>

                <div>
                  <label htmlFor="movement-quantity" className="mb-2 block text-sm font-medium text-slate-700">
                    Quantity ({movementItem.unit}) *
                  </label>
                  <input
                    id="movement-quantity"
                    type="number"
                    required
                    min="0.001"
                    max="99999999999.999"
                    step="0.001"
                    value={movementForm.quantity}
                    onChange={(event) => updateMovementForm("quantity", event.target.value)}
                    placeholder="Enter a positive quantity"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label htmlFor="movement-cost" className="mb-2 block text-sm font-medium text-slate-700">
                    Unit cost (KES)
                  </label>
                  <input
                    id="movement-cost"
                    type="number"
                    min="0"
                    max="9999999999.99"
                    step="0.01"
                    value={movementForm.unit_cost}
                    onChange={(event) => updateMovementForm("unit_cost", event.target.value)}
                    placeholder="Optional cost per unit"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label htmlFor="movement-date" className="mb-2 block text-sm font-medium text-slate-700">
                    Transaction date *
                  </label>
                  <input
                    id="movement-date"
                    type="date"
                    required
                    value={movementForm.transaction_date}
                    onChange={(event) => updateMovementForm("transaction_date", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label htmlFor="movement-reference" className="mb-2 block text-sm font-medium text-slate-700">
                    Reference
                  </label>
                  <input
                    id="movement-reference"
                    maxLength={150}
                    value={movementForm.reference}
                    onChange={(event) => updateMovementForm("reference", event.target.value)}
                    placeholder="e.g. invoice or receipt number"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label htmlFor="movement-notes" className="mb-2 block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <input
                    id="movement-notes"
                    maxLength={1000}
                    value={movementForm.notes}
                    onChange={(event) => updateMovementForm("notes", event.target.value)}
                    placeholder="Optional transaction notes"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Stock movements are recorded in the transaction ledger.
                The backend validates the resulting stock balance.
              </div>

              <button
                type="submit"
                disabled={savingMovement}
                className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingMovement ? "Recording movement…" : "Record movement"}
              </button>
            </form>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Stock on hand</h2>
            <p className="mt-1 text-sm text-slate-500">
              Search your active inventory and manage individual items.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label htmlFor="inventory-search" className="mb-2 block text-sm font-medium text-slate-700">
                Search
              </label>
              <input
                id="inventory-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or SKU"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label htmlFor="inventory-category" className="mb-2 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                id="inventory-category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(event) => setLowStockOnly(event.target.checked)}
                  className="h-4 w-4 accent-emerald-700"
                />
                Low stock only
              </label>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading inventory…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
              <h3 className="font-semibold text-slate-800">
                No inventory items found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Try changing your filters or add your first inventory item.
              </p>
              <button
                type="button"
                onClick={openItemForm}
                className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Add inventory item
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 font-semibold">Item</th>
                    <th className="px-3 py-3 font-semibold">Category</th>
                    <th className="px-3 py-3 font-semibold">On hand</th>
                    <th className="px-3 py-3 font-semibold">Reorder at</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isLow =
                      Number(item.current_stock) <= Number(item.reorder_level);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-3 py-4">
                          <p className="font-semibold text-slate-900">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.sku || "No SKU"} · {item.unit}
                          </p>
                        </td>
                        <td className="px-3 py-4 text-slate-600">
                          {item.category}
                        </td>
                        <td className="px-3 py-4">
                          <span className="font-semibold">
                            {formatQuantity(item.current_stock)}
                          </span>{" "}
                          <span className="text-slate-500">{item.unit}</span>
                        </td>
                        <td className="px-3 py-4 text-slate-600">
                          {formatQuantity(item.reorder_level)} {item.unit}
                        </td>
                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isLow
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isLow ? "Low stock" : "In stock"}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openMovementForm(item)}
                              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                            >
                              Record movement
                            </button>
                            <button
                              type="button"
                              onClick={() => void openHistory(item)}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              History
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === item.id}
                              onClick={() => void handleDeactivate(item)}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingId === item.id ? "Working…" : "Deactivate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {historyItem && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">
                  Transaction ledger
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {historyItem.name} history
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Current balance: {formatQuantity(historyItem.current_stock)}{" "}
                  {historyItem.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistoryItem(null);
                  setTransactions([]);
                  setHistoryError("");
                }}
                className="self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close history
              </button>
            </div>

            {historyLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Loading transaction history…
              </p>
            ) : historyError ? (
              <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                {historyError}
              </div>
            ) : transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No transactions have been recorded for this item.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3 font-semibold">Date</th>
                      <th className="px-3 py-3 font-semibold">Movement</th>
                      <th className="px-3 py-3 font-semibold">Quantity</th>
                      <th className="px-3 py-3 font-semibold">Unit cost</th>
                      <th className="px-3 py-3 font-semibold">Reference / notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-3 py-4 text-slate-600">
                          {formatDate(transaction.transaction_date)}
                        </td>
                        <td className="px-3 py-4 font-medium">
                          {movementLabel(transaction.movement_type)}
                        </td>
                        <td className="px-3 py-4">
                          {formatQuantity(transaction.quantity)} {historyItem.unit}
                        </td>
                        <td className="px-3 py-4 text-slate-600">
                          {formatMoney(transaction.unit_cost)}
                        </td>
                        <td className="px-3 py-4 text-slate-600">
                          <p>{transaction.reference || "—"}</p>
                          {transaction.notes && (
                            <p className="mt-1 max-w-xs text-xs text-slate-500">
                              {transaction.notes}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
