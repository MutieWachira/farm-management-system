"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  createCrop,
  deleteCrop,
  getCrops,
  updateCrop,
} from "@/src/lib/crop-api";
import { getFields } from "@/src/lib/field-api";

import type {
  CreateCropRequest,
  Crop,
  CropStatus,
  UpdateCropRequest,
} from "@/src/types/crop";
import type { Field } from "@/src/types/field";

const CROP_STATUSES: CropStatus[] = [
  "PLANNED",
  "PLANTED",
  "GROWING",
  "HARVESTED",
  "FAILED",
  "CANCELLED",
];

interface CropFormData {
  name: string;
  variety: string;
  planting_date: string;
  expected_harvest_date: string;
  actual_harvest_date: string;
  status: CropStatus;
  area_hectares: string;
  expected_yield: string;
  notes: string;
}

const EMPTY_FORM: CropFormData = {
  name: "",
  variety: "",
  planting_date: "",
  expected_harvest_date: "",
  actual_harvest_date: "",
  status: "PLANNED",
  area_hectares: "",
  expected_yield: "",
  notes: "",
};

function formatDate(date: string | null): string {
  if (!date) {
    return "—";
  }

  const dateOnly = date.slice(0, 10);
  const [year, month, day] = dateOnly.split("-");

  if (!year || !month || !day) {
    return "—";
  }

  return `${day}/${month}/${year}`;
}

function getDateInputValue(date: string | null): string {
  if (!date) {
    return "";
  }

  return date.slice(0, 10);
}

function getStatusClasses(status: CropStatus): string {
  switch (status) {
    case "PLANNED":
      return "bg-slate-100 text-slate-700";

    case "PLANTED":
      return "bg-blue-100 text-blue-700";

    case "GROWING":
      return "bg-emerald-100 text-emerald-700";

    case "HARVESTED":
      return "bg-green-100 text-green-700";

    case "FAILED":
      return "bg-red-100 text-red-700";

    case "CANCELLED":
      return "bg-gray-100 text-gray-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusLabel(status: CropStatus): string {
  return (
    status.charAt(0) +
    status.slice(1).toLowerCase()
  );
}

function validateForm(
  form: CropFormData,
): string | null {
  const name = form.name.trim();

  if (name.length < 2) {
    return "Crop name must contain at least 2 characters.";
  }

  if (name.length > 150) {
    return "Crop name cannot exceed 150 characters.";
  }

  if (form.variety.length > 150) {
    return "Variety cannot exceed 150 characters.";
  }

  if (
    form.area_hectares !== "" &&
    Number(form.area_hectares) <= 0
  ) {
    return "Area must be greater than 0.";
  }

  if (
    form.expected_yield !== "" &&
    Number(form.expected_yield) <= 0
  ) {
    return "Expected yield must be greater than 0.";
  }

  if (
    form.planting_date &&
    form.expected_harvest_date &&
    form.expected_harvest_date < form.planting_date
  ) {
    return "Expected harvest date cannot be before the planting date.";
  }

  if (
    form.planting_date &&
    form.actual_harvest_date &&
    form.actual_harvest_date < form.planting_date
  ) {
    return "Actual harvest date cannot be before the planting date.";
  }

  if (form.notes.length > 5000) {
    return "Notes cannot exceed 5000 characters.";
  }

  return null;
}

function buildCreatePayload(
  form: CropFormData,
): CreateCropRequest {
  const payload: CreateCropRequest = {
    name: form.name.trim(),
    status: form.status,
  };

  if (form.variety.trim()) {
    payload.variety = form.variety.trim();
  }

  if (form.planting_date) {
    payload.planting_date = form.planting_date;
  }

  if (form.expected_harvest_date) {
    payload.expected_harvest_date =
      form.expected_harvest_date;
  }

  if (form.actual_harvest_date) {
    payload.actual_harvest_date =
      form.actual_harvest_date;
  }

  if (form.area_hectares !== "") {
    payload.area_hectares =
      Number(form.area_hectares);
  }

  if (form.expected_yield !== "") {
    payload.expected_yield =
      Number(form.expected_yield);
  }

  if (form.notes.trim()) {
    payload.notes = form.notes.trim();
  }

  return payload;
}

function buildUpdatePayload(
  form: CropFormData,
): UpdateCropRequest {
  return {
    name: form.name.trim(),

    variety:
      form.variety.trim() || null,

    planting_date:
      form.planting_date || null,

    expected_harvest_date:
      form.expected_harvest_date || null,

    actual_harvest_date:
      form.actual_harvest_date || null,

    status: form.status,

    area_hectares:
      form.area_hectares === ""
        ? null
        : Number(form.area_hectares),

    expected_yield:
      form.expected_yield === ""
        ? null
        : Number(form.expected_yield),

    notes:
      form.notes.trim() || null,
  };
}

function cropToForm(crop: Crop): CropFormData {
  return {
    name: crop.name,

    variety:
      crop.variety ?? "",

    planting_date:
      getDateInputValue(
        crop.planting_date,
      ),

    expected_harvest_date:
      getDateInputValue(
        crop.expected_harvest_date,
      ),

    actual_harvest_date:
      getDateInputValue(
        crop.actual_harvest_date,
      ),

    status: crop.status,

    area_hectares:
      crop.area_hectares !== null
        ? String(crop.area_hectares)
        : "",

    expected_yield:
      crop.expected_yield !== null
        ? String(crop.expected_yield)
        : "",

    notes:
      crop.notes ?? "",
  };
}

export default function CropsPage() {
  const params = useParams<{
    farmId?: string;
    fieldId?: string;
  }>();

  const farmId = params?.farmId;
  const fieldId = params?.fieldId;

  const [crops, setCrops] = useState<Crop[]>([]);
  const [availableFields, setAvailableFields] =
    useState<Array<Pick<Field, "id" | "name">>>([]);
  const [selectedFieldId, setSelectedFieldId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] =
    useState(false);

  const [editingCrop, setEditingCrop] =
    useState<Crop | null>(null);

  const [formData, setFormData] =
    useState<CropFormData>(EMPTY_FORM);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [deletingCropId, setDeletingCropId] =
    useState<string | null>(null);

  const activeFieldId = fieldId ?? selectedFieldId;
  const selectedField =
    availableFields.find(
      (field) => field.id === activeFieldId,
    ) ?? null;

  const loadAvailableFields = useCallback(async () => {
    if (!farmId) {
      setAvailableFields([]);
      setSelectedFieldId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fields = await getFields(farmId);
      setAvailableFields(fields);

      if (fields.length === 0) {
        setSelectedFieldId(null);
        setCrops([]);
        setError(
          "This farm does not have any fields yet. Add a field before managing crops.",
        );
        return;
      }

      const nextFieldId =
        fieldId ?? fields[0]?.id ?? null;

      setSelectedFieldId(nextFieldId);
    } catch (err) {
      console.error(
        "Failed to load available fields:",
        err,
      );

      setAvailableFields([]);
      setSelectedFieldId(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load fields for this farm.",
      );
    } finally {
      setLoading(false);
    }
  }, [farmId, fieldId]);

  /*
   * Load crops.
   *
   * We keep this function separate so it can be
   * reused after creating, editing or deleting.
   */
  const loadCrops = useCallback(async () => {
    const targetFieldId = fieldId ?? selectedFieldId;

    if (!targetFieldId) {
      setLoading(false);
      setError(
        "Please select a field to view its crop records.",
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      /*
       * Prevent the interface from remaining in a
       * loading state forever if the request hangs.
       */
      const timeoutPromise =
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                "The request timed out. Please make sure the AgriCore backend is running.",
              ),
            );
          }, 15000);
        });

      const cropPromise = getCrops(targetFieldId);

      const data = await Promise.race([
        cropPromise,
        timeoutPromise,
      ]);

      setCrops(data);
    } catch (err) {
      console.error(
        "Failed to load crops:",
        err,
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to load crops. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [fieldId, selectedFieldId]);

  useEffect(() => {
    if (fieldId) {
      setSelectedFieldId(fieldId);
      return;
    }

    if (!farmId) {
      return;
    }

    void loadAvailableFields();
  }, [farmId, fieldId, loadAvailableFields]);

  useEffect(() => {
    if (!activeFieldId) {
      return;
    }

    void loadCrops();
  }, [activeFieldId, loadCrops]);

  function openCreateForm() {
    setEditingCrop(null);
    setFormData({
      ...EMPTY_FORM,
    });
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEditForm(crop: Crop) {
    setEditingCrop(crop);
    setFormData(
      cropToForm(crop),
    );
    setFormError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setIsFormOpen(false);
    setEditingCrop(null);
    setFormData({
      ...EMPTY_FORM,
    });
    setFormError(null);
  }

  function updateFormField<
    K extends keyof CropFormData,
  >(
    field: K,
    value: CropFormData[K],
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const targetFieldId =
      fieldId ?? selectedFieldId;

    if (!targetFieldId) {
      setFormError(
        "Please choose a field for this crop.",
      );
      return;
    }

    const validationError =
      validateForm(formData);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      if (editingCrop) {
        const payload =
          buildUpdatePayload(formData);

        await updateCrop(
          targetFieldId,
          editingCrop.id,
          payload,
        );
      } else {
        const payload =
          buildCreatePayload(formData);

        await createCrop(
          targetFieldId,
          payload,
        );
      }

      setIsFormOpen(false);
      setEditingCrop(null);
      setFormData({
        ...EMPTY_FORM,
      });

      await loadCrops();
    } catch (err) {
      console.error(
        "Failed to save crop:",
        err,
      );

      setFormError(
        err instanceof Error
          ? err.message
          : "Failed to save crop.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    crop: Crop,
  ) {
    const targetFieldId =
      fieldId ?? selectedFieldId;

    if (!targetFieldId) {
      setError(
        "Please choose a field before deleting a crop.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${crop.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingCropId(crop.id);
      setError(null);

      await deleteCrop(
        targetFieldId,
        crop.id,
      );

      setCrops((current) =>
        current.filter(
          (item) =>
            item.id !== crop.id,
        ),
      );
    } catch (err) {
      console.error(
        "Failed to delete crop:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete crop.",
      );
    } finally {
      setDeletingCropId(null);
    }
  }

  if (!farmId) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-xl font-bold text-red-700">
              Invalid crop URL
            </h1>

            <p className="mt-3 text-sm text-slate-600">
              The farm ID is missing from the current URL.
            </p>

            <Link
              href="/user/farms"
              className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Back to farms
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!activeFieldId && !loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Select a field
            </h1>

            <p className="mt-3 text-sm text-slate-600">
              Choose a field to view its crop records.
            </p>

            {availableFields.length > 0 ? (
              <div className="mt-6 grid gap-3">
                {availableFields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => {
                      setSelectedFieldId(field.id);
                      setError(null);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-white"
                  >
                    {field.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No fields are available for this farm yet.
              </div>
            )}

            <Link
              href={`/user/farms/${farmId}/fields`}
              className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Go to fields
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /*
   * Loading state.
   */
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />

              <div>
                <p className="font-semibold text-slate-900">
                  Loading crops...
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Connecting to the AgriCore API.
                </p>
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

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={`/user/farms/${farmId}/fields`}
              className="mb-3 inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to fields
            </Link>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Crops
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Manage crops planted in this field.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            {availableFields.length > 0 && (
              <div className="w-full sm:w-64">
                <label
                  htmlFor="farm-field-selector"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Field
                </label>

                <select
                  id="farm-field-selector"
                  value={activeFieldId ?? ""}
                  onChange={(event) => {
                    const nextFieldId = event.target.value;
                    if (!nextFieldId) {
                      setSelectedFieldId(null);
                      return;
                    }

                    setSelectedFieldId(nextFieldId);
                    setError(null);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  {availableFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              + Add crop
            </button>
          </div>
        </div>

        {/* API error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex gap-3">
              <div className="mt-0.5 text-red-600">
                ⚠
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-red-800">
                  Unable to load crops
                </h2>

                <p className="mt-1 break-words text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    void loadCrops();
                  }}
                  className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!error && crops.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto max-w-md">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                🌱
              </div>

              <h2 className="text-lg font-semibold text-slate-900">
                No crops yet
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Start managing this field by
                adding its first crop.
              </p>

              <button
                type="button"
                onClick={openCreateForm}
                className="mt-6 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Add first crop
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Summary */}
            {crops.length > 0 && (
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">
                    Total crops
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {crops.length}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">
                    Growing
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {
                      crops.filter(
                        (crop) =>
                          crop.status ===
                          "GROWING",
                      ).length
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">
                    Harvested
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {
                      crops.filter(
                        (crop) =>
                          crop.status ===
                          "HARVESTED",
                      ).length
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Crop cards */}
            {crops.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {crops.map((crop) => (
                  <article
                    key={crop.id}
                    className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          {crop.name}
                        </h2>

                        {crop.variety && (
                          <p className="mt-1 text-sm text-slate-500">
                            {crop.variety}
                          </p>
                        )}
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          crop.status,
                        )}`}
                      >
                        {getStatusLabel(
                          crop.status,
                        )}
                      </span>
                    </div>

                    <dl className="mt-6 space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">
                          Planting date
                        </dt>

                        <dd className="font-medium text-slate-900">
                          {formatDate(
                            crop.planting_date,
                          )}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">
                          Expected harvest
                        </dt>

                        <dd className="font-medium text-slate-900">
                          {formatDate(
                            crop.expected_harvest_date,
                          )}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">
                          Area
                        </dt>

                        <dd className="font-medium text-slate-900">
                          {crop.area_hectares !==
                          null
                            ? `${crop.area_hectares} ha`
                            : "—"}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">
                          Expected yield
                        </dt>

                        <dd className="font-medium text-slate-900">
                          {crop.expected_yield !==
                          null
                            ? `${crop.expected_yield} t`
                            : "—"}
                        </dd>
                      </div>
                    </dl>

                    {crop.notes && (
                      <div className="mt-5 rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Notes
                        </p>

                        <p className="mt-1 text-sm text-slate-700">
                          {crop.notes}
                        </p>
                      </div>
                    )}

                    <div className="mt-6 flex gap-3 border-t border-slate-100 pt-5">
                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(crop)
                        }
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleDelete(
                            crop,
                          )
                        }
                        disabled={
                          deletingCropId ===
                          crop.id
                        }
                        className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingCropId ===
                        crop.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crop-form-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl text-slate-900">

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2
                  id="crop-form-title"
                  className="text-xl font-bold text-slate-900"
                >
                  {editingCrop
                    ? "Edit crop"
                    : "Add crop"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingCrop
                    ? "Update the crop information."
                    : "Add a new crop to this field."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6"
            >
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {availableFields.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label
                    htmlFor="crop-field-select"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Crop field
                  </label>

                  <select
                    id="crop-field-select"
                    value={activeFieldId ?? ""}
                    onChange={(event) => {
                      const nextFieldId = event.target.value;
                      if (!nextFieldId) {
                        return;
                      }

                      setSelectedFieldId(nextFieldId);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    {availableFields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.name}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-slate-500">
                    The crop will be assigned to the selected field in this farm.
                  </p>
                </div>
              )}

              {/* Basic information */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900">
                  Basic information
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="crop-name"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Crop name *
                    </label>

                    <input
                      id="crop-name"
                      type="text"
                      value={formData.name}
                      onChange={(event) =>
                        updateFormField(
                          "name",
                          event.target.value,
                        )
                      }
                      placeholder="e.g. Maize"
                      maxLength={150}
                      required
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="crop-variety"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Variety
                    </label>

                    <input
                      id="crop-variety"
                      type="text"
                      value={formData.variety}
                      onChange={(event) =>
                        updateFormField(
                          "variety",
                          event.target.value,
                        )
                      }
                      placeholder="e.g. H614"
                      maxLength={150}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>
              </section>

              {/* Timeline */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900">
                  Crop timeline
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="planting-date"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Planting date
                    </label>

                    <input
                      id="planting-date"
                      type="date"
                      value={
                        formData.planting_date
                      }
                      onChange={(event) =>
                        updateFormField(
                          "planting_date",
                          event.target.value,
                        )
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="expected-harvest-date"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Expected harvest
                    </label>

                    <input
                      id="expected-harvest-date"
                      type="date"
                      value={
                        formData.expected_harvest_date
                      }
                      onChange={(event) =>
                        updateFormField(
                          "expected_harvest_date",
                          event.target.value,
                        )
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="actual-harvest-date"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Actual harvest
                    </label>

                    <input
                      id="actual-harvest-date"
                      type="date"
                      value={
                        formData.actual_harvest_date
                      }
                      onChange={(event) =>
                        updateFormField(
                          "actual_harvest_date",
                          event.target.value,
                        )
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>
              </section>

              {/* Production */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900">
                  Production details
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="crop-status"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Status
                    </label>

                    <select
                      id="crop-status"
                      value={
                        formData.status
                      }
                      onChange={(event) =>
                        updateFormField(
                          "status",
                          event.target
                            .value as CropStatus,
                        )
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    >
                      {CROP_STATUSES.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {getStatusLabel(
                              status,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="crop-area"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Area (hectares)
                    </label>

                    <input
                      id="crop-area"
                      type="number"
                      min="0.0001"
                      step="0.01"
                      value={
                        formData.area_hectares
                      }
                      onChange={(event) =>
                        updateFormField(
                          "area_hectares",
                          event.target.value,
                        )
                      }
                      placeholder="e.g. 2.5"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="expected-yield"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Expected yield (tonnes)
                    </label>

                    <input
                      id="expected-yield"
                      type="number"
                      min="0.0001"
                      step="0.01"
                      value={
                        formData.expected_yield
                      }
                      onChange={(event) =>
                        updateFormField(
                          "expected_yield",
                          event.target.value,
                        )
                      }
                      placeholder="e.g. 5"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>
              </section>

              {/* Notes */}
              <section>
                <label
                  htmlFor="crop-notes"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Notes
                </label>

                <textarea
                  id="crop-notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(event) =>
                    updateFormField(
                      "notes",
                      event.target.value,
                    )
                  }
                  maxLength={5000}
                  placeholder="Add any useful information about this crop..."
                  className="mt-3 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {formData.notes.length}/5000
                </p>
              </section>

              {/* Buttons */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingCrop
                      ? "Save changes"
                      : "Create crop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}