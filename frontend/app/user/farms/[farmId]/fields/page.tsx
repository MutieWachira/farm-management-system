"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import {
  createField,
  deleteField,
  getFields,
  updateField,
} from "@/src/lib/field-api";

import { getFarms } from "@/src/lib/farm-api";

import type {
  CreateFieldRequest,
  Field,
  FieldStatus,
  UpdateFieldRequest,
} from "@/src/types/field";

import type { Farm } from "@/src/types/farm";

/**
 * AgriCore - Farm Fields Page
 *
 * Responsibilities:
 * - Load the selected farm
 * - Load fields belonging to the farm
 * - Display field information
 * - Create fields
 * - Update fields
 * - Delete fields
 * - Provide loading, empty and error states
 *
 * Security:
 * - Authentication is handled by the existing API layer.
 * - Authorization MUST remain enforced by the backend.
 * - The frontend must never be considered a security boundary.
 *
 * Performance:
 * - useCallback prevents unnecessary recreation of the loader.
 * - useMemo avoids recalculating derived values unnecessarily.
 * - We refresh only after successful mutations.
 *
 * Maintainability:
 * - API communication remains inside fields-api.ts.
 * - This page focuses on UI state and orchestration.
 */

type FormMode = "create" | "edit" | null;

type FieldFormState = {
  name: string;
  area_hectares: string;
  soil_type: string;
  status: FieldStatus;
};

const INITIAL_FORM: FieldFormState = {
  name: "",
  area_hectares: "",
  soil_type: "",
  status: "ACTIVE",
};

const STATUS_OPTIONS: Array<{
  value: FieldStatus;
  label: string;
}> = [
  {
    value: "ACTIVE",
    label: "Active",
  },
  {
    value: "FALLOW",
    label: "Fallow",
  },
];

function getStatusClasses(status: string): string {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";

    case "FALLOW":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";

    default:
      return "bg-slate-100 text-slate-700 ring-slate-600/20";
  }
}

function formatStatus(status: string): string {
  if (!status) {
    return "Unknown";
  }

  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatArea(area: number | string): string {
  const numericArea = Number(area);

  if (!Number.isFinite(numericArea)) {
    return "—";
  }

  return `${numericArea.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} hectares`;
}

export default function FieldsPage() {
  const params = useParams();

  const farmId = Array.isArray(params.farmId)
    ? params.farmId[0]
    : params.farmId;

  const [farm, setFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<Field[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [selectedField, setSelectedField] = useState<Field | null>(null);

  const [form, setForm] =
    useState<FieldFormState>(INITIAL_FORM);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [deletingFieldId, setDeletingFieldId] =
    useState<string | null>(null);

  const [deleteError, setDeleteError] =
    useState<string | null>(null);

  /**
   * Load farm and fields.
   *
   * We load the farm from the existing farms endpoint
   * because the current farms-api.ts does not expose
   * a getFarm(farmId) function.
   */
  const loadPage = useCallback(async () => {
    if (!farmId) {
      setError("Invalid farm identifier.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [farms, fieldData] = await Promise.all([
        getFarms(),
        getFields(farmId),
      ]);

      const currentFarm =
        farms.find((item) => item.id === farmId) ?? null;

      if (!currentFarm) {
        throw new Error(
          "The requested farm could not be found.",
        );
      }

      setFarm(currentFarm);
      setFields(fieldData);
    } catch (err) {
      console.error("Failed to load fields page:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load farm fields.",
      );
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  /**
   * Derived field statistics.
   *
   * Keeping these values derived from the current field
   * list means we do not maintain duplicated state.
   */
  const statistics = useMemo(() => {
    const totalArea = fields.reduce(
      (total, field) =>
        total + Number(field.area_hectares || 0),
      0,
    );

    const activeFields = fields.filter(
      (field) =>
        field.status?.toUpperCase() === "ACTIVE",
    ).length;

    const fallowFields = fields.filter(
      (field) =>
        field.status?.toUpperCase() === "FALLOW",
    ).length;

    return {
      total: fields.length,
      totalArea,
      activeFields,
      fallowFields,
    };
  }, [fields]);

  function openCreateForm() {
    setFormMode("create");
    setSelectedField(null);
    setForm(INITIAL_FORM);
    setFormError(null);
  }

  function openEditForm(field: Field) {
    setFormMode("edit");
    setSelectedField(field);

    setForm({
      name: field.name ?? "",
      area_hectares:
        field.area_hectares !== undefined &&
        field.area_hectares !== null
          ? String(field.area_hectares)
          : "",
      soil_type: field.soil_type ?? "",
      status: field.status ?? "ACTIVE",
    });

    setFormError(null);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setFormMode(null);
    setSelectedField(null);
    setForm(INITIAL_FORM);
    setFormError(null);
  }

  function handleFormChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!farmId) {
      setFormError("Invalid farm identifier.");
      return;
    }

    setFormError(null);

    const trimmedName = form.name.trim();
    const trimmedSoilType = form.soil_type.trim();

    if (!trimmedName) {
      setFormError("Field name is required.");
      return;
    }

    const area = Number(form.area_hectares);

    if (
      !form.area_hectares.trim() ||
      !Number.isFinite(area) ||
      area <= 0
    ) {
      setFormError(
        "Area must be a number greater than zero.",
      );
      return;
    }

    if (!trimmedSoilType) {
      setFormError("Soil type is required.");
      return;
    }

    try {
      setSaving(true);

      if (formMode === "create") {
        const payload: CreateFieldRequest = {
          name: trimmedName,
          area_hectares: area,
          soil_type: trimmedSoilType,
          status: form.status,
        };

        await createField(farmId, payload);
      }

      if (
        formMode === "edit" &&
        selectedField
      ) {
        const payload: UpdateFieldRequest = {
          name: trimmedName,
          area_hectares: area,
          soil_type: trimmedSoilType,
          status: form.status,
        };

        await updateField(
          farmId,
          selectedField.id,
          payload,
        );
      }

      closeForm();

      await loadPage();
    } catch (err) {
      console.error("Failed to save field:", err);

      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to save field.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(field: Field) {
    if (!farmId) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${field.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingFieldId(field.id);
      setDeleteError(null);

      await deleteField(farmId, field.id);

      setFields((current) =>
        current.filter(
          (item) => item.id !== field.id,
        ),
      );
    } catch (err) {
      console.error("Failed to delete field:", err);

      setDeleteError(
        err instanceof Error
          ? err.message
          : "Unable to delete field.",
      );
    } finally {
      setDeletingFieldId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-5 w-32 rounded bg-slate-200" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <div className="h-9 w-64 rounded bg-slate-200" />
                <div className="h-4 w-80 rounded bg-slate-200" />
              </div>

              <div className="h-11 w-32 rounded-xl bg-slate-200" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="h-28 rounded-2xl bg-white shadow-sm" />
              <div className="h-28 rounded-2xl bg-white shadow-sm" />
              <div className="h-28 rounded-2xl bg-white shadow-sm" />
            </div>

            <div className="h-72 rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                !
              </div>

              <div>
                <h1 className="font-semibold text-red-900">
                  Unable to load fields
                </h1>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => void loadPage()}
                  className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6"
        >
          <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <li>
              <Link
                href="/user/dashboard"
                className="transition hover:text-slate-900"
              >
                Dashboard
              </Link>
            </li>

            <li aria-hidden="true">/</li>

            <li>
              <Link
                href="/user/farms"
                className="transition hover:text-slate-900"
              >
                Farms
              </Link>
            </li>

            <li aria-hidden="true">/</li>

            <li className="font-medium text-slate-900">
              {farm?.name ?? "Farm"}
            </li>

            <li aria-hidden="true">/</li>

            <li
              aria-current="page"
              className="font-medium text-slate-900"
            >
              Fields
            </li>
          </ol>
        </nav>

        {/* Page Header */}
        <section className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-600">
                {farm?.name}
              </p>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Farm Fields
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Manage the fields belonging to this farm,
                including their area, soil type and current
                operational status.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <span
                aria-hidden="true"
                className="text-lg leading-none"
              >
                +
              </span>

              Add Field
            </button>
          </div>
        </section>

        {/* Statistics */}
        <section
          aria-label="Field statistics"
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Fields
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-950">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Area
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-950">
              {statistics.totalArea.toLocaleString(
                undefined,
                {
                  maximumFractionDigits: 2,
                },
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              hectares
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Active
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {statistics.activeFields}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Fallow
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-600">
              {statistics.fallowFields}
            </p>
          </div>
        </section>

        {/* Delete Error */}
        {deleteError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {deleteError}
          </div>
        )}

        {/* Field List */}
        <section aria-labelledby="fields-heading">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2
                id="fields-heading"
                className="text-xl font-bold text-slate-950"
              >
                Fields
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {fields.length === 1
                  ? "1 field"
                  : `${fields.length} fields`}
              </p>
            </div>
          </div>

          {fields.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V8l7-5 7 5v13" />
                  <path d="M9 21v-5h6v5" />
                </svg>
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-950">
                No fields yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                This farm does not have any fields
                registered yet. Add your first field to
                start managing its agricultural data.
              </p>

              <button
                type="button"
                onClick={openCreateForm}
                className="mt-6 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Add your first field
              </button>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {fields.map((field) => (
                <article
                  key={field.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold text-slate-950">
                        {field.name}
                      </h3>

                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {formatArea(
                          field.area_hectares,
                        )}
                      </p>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                        field.status,
                      )}`}
                    >
                      {formatStatus(field.status)}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Soil type
                      </p>

                      <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
                        {field.soil_type || "Not specified"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Area
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {formatArea(
                          field.area_hectares,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(field)
                      }
                      className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={
                        deletingFieldId === field.id
                      }
                      onClick={() =>
                        void handleDelete(field)
                      }
                      className="inline-flex flex-1 items-center justify-center rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingFieldId === field.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create / Edit Form */}
      {formMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="field-form-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="field-form-title"
                    className="text-xl font-bold text-slate-950"
                  >
                    {formMode === "create"
                      ? "Add Field"
                      : "Edit Field"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {formMode === "create"
                      ? "Add a new field to this farm."
                      : "Update the details for this field."}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={closeForm}
                  aria-label="Close form"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="field-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Field name
                </label>

                <input
                  id="field-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="e.g. North Field"
                  maxLength={100}
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="field-area"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Area
                </label>

                <div className="relative">
                  <input
                    id="field-area"
                    name="area_hectares"
                    type="number"
                    value={form.area_hectares}
                    onChange={handleFormChange}
                    placeholder="e.g. 5.5"
                    min="0.01"
                    step="0.01"
                    required
                    disabled={saving}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-24 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100"
                  />

                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-400">
                    hectares
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="field-soil-type"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Soil type
                </label>

                <input
                  id="field-soil-type"
                  name="soil_type"
                  type="text"
                  value={form.soil_type}
                  onChange={handleFormChange}
                  placeholder="e.g. Loamy"
                  maxLength={100}
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="field-status"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Status
                </label>

                <select
                  id="field-status"
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100"
                >
                  {STATUS_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeForm}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : formMode === "create"
                      ? "Create Field"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

