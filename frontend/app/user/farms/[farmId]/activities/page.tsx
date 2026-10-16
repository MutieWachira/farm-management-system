"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { getCrops } from "@/src/lib/crop-api";
import { getFields } from "@/src/lib/field-api";
import {
  createFarmActivity,
  deleteFarmActivity,
  getFarmActivities,
  updateFarmActivity,
} from "@/src/lib/farm-activity-api";

import type {
  ActivityType,
  CreateFarmActivityRequest,
  FarmActivity,
} from "@/src/types/farm-activity";
import type { Crop } from "@/src/types/crop";
import type { Field } from "@/src/types/field";

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "PLANTING", label: "Planting" },
  { value: "IRRIGATION", label: "Irrigation" },
  { value: "FERTILIZATION", label: "Fertilization" },
  { value: "SPRAYING", label: "Spraying" },
  { value: "WEEDING", label: "Weeding" },
  { value: "PEST_CONTROL", label: "Pest control" },
  { value: "HARVESTING", label: "Harvesting" },
  { value: "LAND_PREPARATION", label: "Land preparation" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
];

type ActivityForm = {
  title: string;
  activity_type: ActivityType;
  activity_date: string;
  field_id: string;
  crop_id: string;
  description: string;
  quantity: string;
  unit: string;
  cost: string;
};

const INITIAL_FORM: ActivityForm = {
  title: "",
  activity_type: "PLANTING",
  activity_date: new Date().toLocaleDateString("en-CA"),
  field_id: "",
  crop_id: "",
  description: "",
  quantity: "",
  unit: "",
  cost: "",
};

function toRequest(form: ActivityForm): CreateFarmActivityRequest {
  return {
    title: form.title.trim(),
    activity_type: form.activity_type,
    activity_date: form.activity_date,
    field_id: form.field_id.trim() || null,
    crop_id: form.crop_id.trim() || null,
    description: form.description.trim() || null,
    quantity: form.quantity === "" ? null : Number(form.quantity),
    unit: form.unit.trim() || null,
    cost: form.cost === "" ? null : Number(form.cost),
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function formatActivityType(type: ActivityType): string {
  return (
    ACTIVITY_TYPES.find((activity) => activity.value === type)?.label ??
    type.replaceAll("_", " ")
  );
}

function formatDate(date: string): string {
  const parsedDate = new Date(`${date.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(cost: number | null): string {
  if (cost === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(cost);
}

function getFormFromActivity(activity: FarmActivity): ActivityForm {
  return {
    title: activity.title,
    activity_type: activity.activity_type,
    activity_date: activity.activity_date.slice(0, 10),
    field_id: activity.field_id ?? "",
    crop_id: activity.crop_id ?? "",
    description: activity.description ?? "",
    quantity: activity.quantity?.toString() ?? "",
    unit: activity.unit ?? "",
    cost: activity.cost?.toString() ?? "",
  };
}

export default function FarmActivitiesPage() {
  const params = useParams<{ farmId: string }>();
  const farmId = params.farmId;

  const [activities, setActivities] = useState<FarmActivity[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [form, setForm] = useState<ActivityForm>(INITIAL_FORM);
  const [editingActivity, setEditingActivity] =
    useState<FarmActivity | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);

  const loadRelatedRecords = useCallback(async () => {
    if (!farmId) {
      setFields([]);
      setCrops([]);
      setLoadingOptions(false);
      return;
    }

    setLoadingOptions(true);
    setOptionsError("");

    try {
      const farmFields = await getFields(farmId);
      const cropLists = await Promise.all(
        farmFields.map((field) => getCrops(field.id)),
      );

      setFields(farmFields);
      setCrops(cropLists.flat());
    } catch (err) {
      setFields([]);
      setCrops([]);
      setOptionsError(getErrorMessage(err));
    } finally {
      setLoadingOptions(false);
    }
  }, [farmId]);

  const loadActivities = useCallback(async () => {
    if (!farmId) {
      return;
    }

    void loadRelatedRecords();
    setLoading(true);
    setError("");

    try {
      const result = await getFarmActivities(farmId);
      setActivities(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [farmId, loadRelatedRecords]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  function updateForm<K extends keyof ActivityForm>(
    key: K,
    value: ActivityForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateForm() {
    setEditingActivity(null);
    setForm({
      ...INITIAL_FORM,
      activity_date: new Date().toLocaleDateString("en-CA"),
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(activity: FarmActivity) {
    setEditingActivity(activity);
    setForm(getFormFromActivity(activity));
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingActivity(null);
    setForm(INITIAL_FORM);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!farmId) {
      setError("The farm ID is missing from the page URL.");
      return;
    }

    if (form.title.trim().length < 2) {
      setError("The activity title must contain at least 2 characters.");
      return;
    }

    if (!form.activity_date) {
      setError("Please select the activity date.");
      return;
    }

    if (form.quantity !== "") {
      const quantity = Number(form.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        setError("Quantity must be a number greater than zero.");
        return;
      }
    }

    if (form.cost !== "") {
      const cost = Number(form.cost);

      if (!Number.isFinite(cost) || cost < 0) {
        setError("Cost must be zero or greater.");
        return;
      }
    }

    setSaving(true);

    try {
      const payload = toRequest(form);

      if (editingActivity) {
        await updateFarmActivity(
          farmId,
          editingActivity.id,
          payload,
        );
        setSuccess("Farm activity updated successfully.");
      } else {
        await createFarmActivity(farmId, payload);
        setSuccess("Farm activity created successfully.");
      }

      closeForm();
      await loadActivities();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(activity: FarmActivity) {
    const confirmed = window.confirm(
      `Delete "${activity.title}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(activity.id);

    try {
      await deleteFarmActivity(farmId, activity.id);

      setActivities((current) =>
        current.filter((item) => item.id !== activity.id),
      );

      setSuccess("Farm activity deleted successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  const totalRecordedCost = activities.reduce(
    (total, activity) => total + (activity.cost ?? 0),
    0,
  );

  const recentActivities = activities.length;
  const availableCrops = form.field_id
    ? crops.filter((crop) => crop.field_id === form.field_id)
    : crops;
  const fieldNames = new Map(
    fields.map((field) => [field.id, field.name]),
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Page header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Farm management
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Farm activities
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Record farm operations, monitor activity costs, and keep
              your farm history organized.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            <span className="mr-2 text-lg" aria-hidden="true">
              +
            </span>
            Record activity
          </button>
        </header>

        {/* Notifications */}
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
                className="font-semibold hover:text-red-950"
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

        {/* Summary cards */}
        <section
          aria-label="Activity summary"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Recorded activities
            </p>
            <p className="mt-3 text-3xl font-bold">
              {loading ? "—" : recentActivities}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Activities recorded for this farm
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total recorded costs
            </p>
            <p className="mt-3 text-3xl font-bold">
              {loading ? "—" : formatMoney(totalRecordedCost)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Sum of costs entered for these activities
            </p>
          </div>
        </section>

        {/* Create / edit form */}
        {showForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  {editingActivity ? "Edit activity" : "Record an activity"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the operation details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="activity-title"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Activity title *
                  </label>
                  <input
                    id="activity-title"
                    required
                    minLength={2}
                    maxLength={150}
                    value={form.title}
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                    placeholder="e.g. Fertilized maize field"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="activity-type"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Activity type *
                  </label>
                  <select
                    id="activity-type"
                    required
                    value={form.activity_type}
                    onChange={(event) =>
                      updateForm(
                        "activity_type",
                        event.target.value as ActivityType,
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    {ACTIVITY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="activity-date"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Activity date *
                  </label>
                  <input
                    id="activity-date"
                    type="date"
                    required
                    value={form.activity_date}
                    onChange={(event) =>
                      updateForm("activity_date", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="activity-cost"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Cost (KES)
                  </label>
                  <input
                    id="activity-cost"
                    type="number"
                    min="0"
                    max="1000000000"
                    step="0.01"
                    value={form.cost}
                    onChange={(event) =>
                      updateForm("cost", event.target.value)
                    }
                    placeholder="e.g. 1500"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="activity-field"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Field (optional)
                  </label>
                  <select
                    id="activity-field"
                    disabled={loadingOptions || Boolean(optionsError)}
                    value={form.field_id}
                    onChange={(event) => {
                      updateForm("field_id", event.target.value);
                      updateForm("crop_id", "");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingOptions
                        ? "Loading fields..."
                        : "No field selected"}
                    </option>
                    {fields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Leave empty if this activity is not linked to a field.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="activity-crop"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Crop (optional)
                  </label>
                  <select
                    id="activity-crop"
                    disabled={loadingOptions || Boolean(optionsError)}
                    value={form.crop_id}
                    onChange={(event) =>
                      updateForm("crop_id", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingOptions
                        ? "Loading crops..."
                        : "No crop selected"}
                    </option>
                    {availableCrops.map((crop) => (
                      <option key={crop.id} value={crop.id}>
                        {crop.variety
                          ? `${crop.name} (${crop.variety})`
                          : crop.name}
                        {!form.field_id &&
                          ` — ${fieldNames.get(crop.field_id) ?? "Unknown field"}`}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    If selected, the crop must belong to this farm and match
                    the selected field when one is supplied.
                  </p>
                  {optionsError && (
                    <p role="alert" className="mt-1 text-xs text-red-700">
                      Unable to load fields and crops: {optionsError}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="activity-quantity"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Quantity (optional)
                  </label>
                  <input
                    id="activity-quantity"
                    type="number"
                    min="0.000001"
                    max="1000000000"
                    step="any"
                    value={form.quantity}
                    onChange={(event) =>
                      updateForm("quantity", event.target.value)
                    }
                    placeholder="e.g. 25"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="activity-unit"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Quantity unit (optional)
                  </label>
                  <input
                    id="activity-unit"
                    maxLength={50}
                    value={form.unit}
                    onChange={(event) =>
                      updateForm("unit", event.target.value)
                    }
                    placeholder="e.g. kg, litres, bags, hours"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="activity-description"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Description (optional)
                </label>
                <textarea
                  id="activity-description"
                  rows={4}
                  maxLength={5000}
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="Add notes about materials used, work completed, or observations..."
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingActivity
                      ? "Save changes"
                      : "Create activity"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Activity history */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-bold">Activity history</h2>
              <p className="mt-1 text-sm text-slate-500">
                A record of the operations carried out on this farm.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadActivities()}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="space-y-4 p-6" aria-label="Loading activities">
              <div className="h-5 w-1/3 animate-pulse rounded bg-slate-100" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : activities.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700"
                aria-hidden="true"
              >
                +
              </div>
              <h3 className="mt-4 text-base font-semibold">
                No activities recorded yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Start building your farm history by recording your first
                activity.
              </p>
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Record your first activity
              </button>
            </div>
          ) : (
            <>
              {/* Mobile layout */}
              <div className="divide-y divide-slate-100 md:hidden">
                {activities.map((activity) => (
                  <article key={activity.id} className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{activity.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(activity.activity_date)}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                        {formatActivityType(activity.activity_type)}
                      </span>
                    </div>

                    {activity.description && (
                      <p className="whitespace-pre-wrap text-sm text-slate-600">
                        {activity.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Quantity</p>
                        <p className="mt-1 font-medium">
                          {activity.quantity === null
                            ? "—"
                            : `${activity.quantity} ${activity.unit ?? ""}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Cost</p>
                        <p className="mt-1 font-medium">
                          {formatMoney(activity.cost)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => openEditForm(activity)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(activity)}
                        disabled={deletingId === activity.id}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === activity.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop layout */}
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Activity",
                        "Type",
                        "Date",
                        "Quantity",
                        "Cost",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {activities.map((activity) => (
                      <tr
                        key={activity.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="max-w-xs px-5 py-4">
                          <p className="font-semibold">{activity.title}</p>
                          {activity.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {activity.description}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                            {formatActivityType(activity.activity_type)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(activity.activity_date)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {activity.quantity === null
                            ? "—"
                            : `${activity.quantity} ${activity.unit ?? ""}`}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                          {formatMoney(activity.cost)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openEditForm(activity)}
                              className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleDelete(activity)}
                              disabled={deletingId === activity.id}
                              className="text-sm font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              {deletingId === activity.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}