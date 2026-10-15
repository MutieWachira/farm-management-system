
"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";
import {
  createLivestock,
  getLivestock,
  updateLivestock,
} from "@/src/lib/livestock-api";

type LivestockStatus = "ACTIVE" | "SOLD" | "DECEASED" | "MISSING";

type Livestock = {
  id: string;
  farm_id: string;
  name: string;
  species: string;
  breed?: string | null;
  tag_number?: string | null;
  quantity: number;
  sex?: string | null;
  birth_date?: string | null;
  acquisition_date?: string | null;
  purpose?: string | null;
  status: LivestockStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

type LivestockForm = {
  name: string;
  species: string;
  breed: string;
  tag_number: string;
  quantity: number;
  sex: string;
  birth_date: string;
  acquisition_date: string;
  purpose: string;
  status: LivestockStatus;
  notes: string;
};

const INITIAL_FORM: LivestockForm = {
  name: "",
  species: "",
  breed: "",
  tag_number: "",
  quantity: 1,
  sex: "",
  birth_date: "",
  acquisition_date: "",
  purpose: "",
  status: "ACTIVE",
  notes: "",
};

const STATUS_OPTIONS: LivestockStatus[] = [
  "ACTIVE",
  "SOLD",
  "DECEASED",
  "MISSING",
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString();
}

function formatStatus(status: LivestockStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getTodayDateValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function statusClasses(status: LivestockStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800";
    case "SOLD":
      return "bg-blue-100 text-blue-800";
    case "DECEASED":
      return "bg-gray-100 text-gray-700";
    case "MISSING":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function toPayload(form: LivestockForm) {
  return {
    name: form.name.trim(),
    species: form.species.trim(),
    breed: form.breed.trim() || null,
    tag_number: form.tag_number.trim() || null,
    quantity: Number(form.quantity),
    sex: form.sex || null,
    birth_date: form.birth_date || null,
    acquisition_date: form.acquisition_date || null,
    purpose: form.purpose.trim() || null,
    status: form.status,
    notes: form.notes.trim() || null,
  };
}

export default function LivestockPage() {
  const params = useParams<{ farmId: string }>();
  const farmId = params.farmId;

  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [form, setForm] = useState<LivestockForm>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const today = getTodayDateValue();

  const loadLivestock = useCallback(async () => {
    if (!farmId) return;

    setLoading(true);
    setError("");

    try {
      const result = await getLivestock(farmId);
      setLivestock(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    void loadLivestock();
  }, [loadLivestock]);

  const speciesOptions = useMemo(
    () =>
      Array.from(
        new Set(
          livestock
            .map((item) => item.species.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [livestock],
  );

  const filteredLivestock = useMemo(() => {
    const query = search.trim().toLowerCase();

    return livestock.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.species.toLowerCase().includes(query) ||
        (item.breed ?? "").toLowerCase().includes(query) ||
        (item.tag_number ?? "").toLowerCase().includes(query);

      const matchesSpecies =
        speciesFilter === "ALL" ||
        item.species === speciesFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        item.status === statusFilter;

      return matchesSearch && matchesSpecies && matchesStatus;
    });
  }, [livestock, search, speciesFilter, statusFilter]);

  const totalAnimals = livestock.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const activeAnimals = livestock
    .filter((item) => item.status === "ACTIVE")
    .reduce((total, item) => total + item.quantity, 0);

  const activeRecords = livestock.filter(
    (item) => item.status === "ACTIVE",
  ).length;

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.species.trim()) {
      setError("Name and species are required.");
      return;
    }

    if (!Number.isInteger(Number(form.quantity)) || form.quantity < 1) {
      setError("Quantity must be a whole number greater than zero.");
      return;
    }

    if (
      (form.birth_date && form.birth_date > today) ||
      (form.acquisition_date && form.acquisition_date > today)
    ) {
      setError("Birth date and acquisition date cannot be in the future.");
      return;
    }

    setSaving(true);

    try {
      const payload = toPayload(form);

      if (editingId) {
        await updateLivestock(farmId, editingId, payload);
        setSuccess("Livestock record updated successfully.");
      } else {
        await createLivestock(farmId, payload);
        setSuccess("Livestock record created successfully.");
      }

      resetForm();
      await loadLivestock();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Livestock) => {
    setForm({
      name: item.name,
      species: item.species,
      breed: item.breed ?? "",
      tag_number: item.tag_number ?? "",
      quantity: item.quantity,
      sex: item.sex ?? "",
      birth_date: item.birth_date?.slice(0, 10) ?? "",
      acquisition_date: item.acquisition_date?.slice(0, 10) ?? "",
      purpose: item.purpose ?? "",
      status: item.status,
      notes: item.notes ?? "",
    });

    setEditingId(item.id);
    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Page heading */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-green-700">
              Farm Management
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
              Livestock Management
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Record animals, manage livestock information, and track their
              current status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setError("");
              setSuccess("");
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            {editingId ? "Cancel editing" : "Clear form"}
          </button>
        </section>

        {/* Notifications */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {success}
          </div>
        )}

        {/* Overview cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard
            label="Total animals"
            value={totalAnimals}
            description="Across all recorded livestock"
          />

          <OverviewCard
            label="Active animals"
            value={activeAnimals}
            description="Animals currently marked active"
          />

          <OverviewCard
            label="Active records"
            value={activeRecords}
            description="Records with active status"
          />

          <OverviewCard
            label="Livestock records"
            value={livestock.length}
            description="Total individual records"
          />
        </section>

        {/* Create and edit form */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingId ? "Edit livestock record" : "Register livestock"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Enter the animal details below. Fields marked with * are
              required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Name *">
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Dairy Cow 01"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Species *">
                <input
                  required
                  maxLength={50}
                  value={form.species}
                  onChange={(event) =>
                    setForm({ ...form, species: event.target.value })
                  }
                  placeholder="e.g. Cattle, Goat, Chicken"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Breed">
                <input
                  maxLength={100}
                  value={form.breed}
                  onChange={(event) =>
                    setForm({ ...form, breed: event.target.value })
                  }
                  placeholder="e.g. Friesian"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Tag / identification number">
                <input
                  maxLength={80}
                  value={form.tag_number}
                  onChange={(event) =>
                    setForm({ ...form, tag_number: event.target.value })
                  }
                  placeholder="e.g. COW-001"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Quantity *">
                <input
                  required
                  type="number"
                  min={1}
                  step={1}
                  value={form.quantity}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      quantity: Number(event.target.value),
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Sex">
                <select
                  value={form.sex}
                  onChange={(event) =>
                    setForm({ ...form, sex: event.target.value })
                  }
                  className={inputClass}
                >
                  <option value="">Not specified</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="MIXED">Mixed</option>
                </select>
              </FormField>

              <FormField label="Birth date">
                <input
                  type="date"
                  max={today}
                  value={form.birth_date}
                  onChange={(event) =>
                    setForm({ ...form, birth_date: event.target.value })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Acquisition date">
                <input
                  type="date"
                  max={today}
                  value={form.acquisition_date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      acquisition_date: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Purpose">
                <select
                  value={form.purpose}
                  onChange={(event) =>
                    setForm({ ...form, purpose: event.target.value })
                  }
                  className={inputClass}
                >
                  <option value="">Not specified</option>
                  <option value="DAIRY">Dairy</option>
                  <option value="MEAT">Meat</option>
                  <option value="BREEDING">Breeding</option>
                  <option value="EGGS">Egg production</option>
                  <option value="WORK">Farm work</option>
                  <option value="OTHER">Other</option>
                </select>
              </FormField>

              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as LivestockStatus,
                    })
                  }
                  className={inputClass}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="sm:col-span-2 lg:col-span-3">
                <FormField label="Notes">
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                    placeholder="Additional information about this livestock..."
                    className={inputClass}
                  />
                </FormField>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Register livestock"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Livestock records */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Livestock records
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Showing {filteredLivestock.length} of {livestock.length}{" "}
                  records
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadLivestock()}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, species, breed, or tag..."
                aria-label="Search livestock"
                className={inputClass}
              />

              <select
                value={speciesFilter}
                onChange={(event) => setSpeciesFilter(event.target.value)}
                aria-label="Filter by species"
                className={inputClass}
              >
                <option value="ALL">All species</option>
                {speciesOptions.map((species) => (
                  <option key={species} value={species}>
                    {species}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by status"
                className={inputClass}
              >
                <option value="ALL">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Loading livestock records...
            </div>
          ) : filteredLivestock.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="font-semibold text-gray-900">
                No livestock records found
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Register livestock above or adjust your search and filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <TableHeading>Livestock</TableHeading>
                    <TableHeading>Identification</TableHeading>
                    <TableHeading>Quantity</TableHeading>
                    <TableHeading>Purpose</TableHeading>
                    <TableHeading>Status</TableHeading>
                    <TableHeading>Acquired</TableHeading>
                    <TableHeading>Actions</TableHeading>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredLivestock.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {item.species}
                          {item.breed ? ` · ${item.breed}` : ""}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                        <p>{item.tag_number || "No tag"}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.sex || "Sex unspecified"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-gray-900">
                        {item.quantity}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                        {item.purpose || "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(item.status)}`}
                        >
                          {formatStatus(item.status)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                        {formatDate(item.acquisition_date)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="rounded-md px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100";

function OverviewCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </div>
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
    <label className="block space-y-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function TableHeading({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
    >
      {children}
    </th>
  );
}
