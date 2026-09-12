"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import {
createFarm,
getFarms,
} from "@/src/lib/farm-api";

import type { Farm } from "@/src/types/farm";

export default function FarmsPage() {
const [farms, setFarms] = useState<Farm[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const [name, setName] = useState("");
const [location, setLocation] = useState("");
const [area, setArea] = useState("");
const [description, setDescription] = useState("");

const [creating, setCreating] = useState(false);

async function loadFarms() {
try {
setError("");


  const data = await getFarms();

  setFarms(data);
} catch (err) {
  setError(
    err instanceof Error
      ? err.message
      : "Unable to load farms.",
  );
} finally {
  setLoading(false);
}


}

useEffect(() => {
loadFarms();
}, []);

async function handleSubmit(
event: FormEvent<HTMLFormElement>,
) {
event.preventDefault();


setCreating(true);
setError("");

try {
  const farm = await createFarm({
    name: name.trim(),
    location: location.trim(),
    area_hectares: area
      ? Number(area)
      : undefined,
    description: description.trim() || undefined,
  });

  setFarms((current) => [
    farm,
    ...current,
  ]);

  setName("");
  setLocation("");
  setArea("");
  setDescription("");
} catch (err) {
  setError(
    err instanceof Error
      ? err.message
      : "Unable to create farm.",
  );
} finally {
  setCreating(false);
}


}

const totalArea = farms.reduce(
(total, farm) =>
total + (farm.area_hectares ?? 0),
0,
);

return ( <main className="min-h-screen bg-slate-50">
{/* Header */} <header className="border-b border-slate-200 bg-white"> <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8"> <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"> <div> <div className="mb-2 flex items-center gap-2 text-sm text-slate-500"> <Link
               href="/user/dashboard"
               className="transition hover:text-slate-900"
             >
Dashboard </Link>


            <span>/</span>

            <span className="text-slate-700">
              Farms
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My Farms
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Manage your farms, locations, and
            agricultural operations.
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 21c6.5-1 11-4.5 14-10.5M8 17c-1-4 1-7 5-9 2-1 4-3 4-6 3 2 5 5 4 9-1 5-5 8-13 10"
            />
          </svg>
        </div>
      </div>
    </div>
  </header>

  <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    {/* Error */}
    {error && (
      <div
        role="alert"
        className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
      >
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div>
          <p className="font-medium">
            Something went wrong
          </p>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        </div>
      </div>
    )}

    {/* Statistics */}
    <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Total farms
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {loading ? "—" : farms.length}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 21c6.5-1 11-4.5 14-10.5M8 17c-1-4 1-7 5-9 2-1 4-3 4-6 3 2 5 5 4 9-1 5-5 8-13 10"
              />
            </svg>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Farms under your management
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Total land
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {loading
                ? "—"
                : totalArea.toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 2,
                    },
                  )}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7.5L12 3l9 4.5M3 7.5v9L12 21l9-4.5v-9M3 7.5L12 12l9-4.5M12 12v9"
              />
            </svg>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Combined registered area
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Farm management
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              Getting started
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v18M3 12h18"
              />
            </svg>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Add farms to begin managing operations
        </p>
      </div>
    </section>

    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {/* Create Farm */}
      <section className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 5v14M5 12h14"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Add a new farm
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the basic details for your
                farm.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          <div>
            <label
              htmlFor="farm-name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Farm name
            </label>

            <input
              id="farm-name"
              required
              type="text"
              placeholder="e.g. Green Valley Farm"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <div>
            <label
              htmlFor="farm-location"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Location
            </label>

            <input
              id="farm-location"
              required
              type="text"
              placeholder="e.g. Kiambu County"
              value={location}
              onChange={(event) =>
                setLocation(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <div>
            <label
              htmlFor="farm-area"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Farm area
              <span className="ml-1 font-normal text-slate-400">
                (optional)
              </span>
            </label>

            <div className="relative">
              <input
                id="farm-area"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={area}
                onChange={(event) =>
                  setArea(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />

              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-400">
                hectares
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="farm-description"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Description
              <span className="ml-1 font-normal text-slate-400">
                (optional)
              </span>
            </label>

            <textarea
              id="farm-description"
              rows={4}
              placeholder="Tell us a little about this farm..."
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    className="opacity-25"
                    stroke="currentColor"
                    strokeWidth="3"
                  />

                  <path
                    d="M21 12a9 9 0 00-9-9"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>

                Creating farm...
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 5v14M5 12h14"
                  />
                </svg>

                Create farm
              </>
            )}
          </button>
        </form>
      </section>

      {/* Farm List */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Your farms
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select a farm to manage its operations.
            </p>
          </div>

          {!loading && farms.length > 0 && (
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
              {farms.length}{" "}
              {farms.length === 1
                ? "farm"
                : "farms"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className="h-11 w-11 rounded-xl bg-slate-200" />

                  <div className="h-6 w-6 rounded-full bg-slate-200" />
                </div>

                <div className="h-5 w-3/4 rounded bg-slate-200" />

                <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="h-14 rounded-lg bg-slate-100" />
                  <div className="h-14 rounded-lg bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : farms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-8 w-8"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 21c6.5-1 11-4.5 14-10.5M8 17c-1-4 1-7 5-9 2-1 4-3 4-6 3 2 5 5 4 9-1 5-5 8-13 10"
                />
              </svg>
            </div>

            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              No farms yet
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Your farm portfolio is currently
              empty. Create your first farm using
              the form to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {farms.map((farm) => (
              <article
                key={farm.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-100">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 21c6.5-1 11-4.5 14-10.5M8 17c-1-4 1-7 5-9 2-1 4-3 4-6 3 2 5 5 4 9-1 5-5 8-13 10"
                      />
                    </svg>
                  </div>

                  <button
                    type="button"
                    aria-label={`More options for ${farm.name}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <circle
                        cx="5"
                        cy="12"
                        r="1.5"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="1.5"
                      />
                      <circle
                        cx="19"
                        cy="12"
                        r="1.5"
                      />
                    </svg>
                  </button>
                </div>

                <h3 className="truncate text-lg font-bold text-slate-900">
                  {farm.name}
                </h3>

                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 21s7-5.5 7-12a7 7 0 10-14 0c0 6.5 7 12 7 12z"
                    />

                    <circle
                      cx="12"
                      cy="9"
                      r="2.2"
                    />
                  </svg>

                  <span className="truncate">
                    {farm.location}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-400">
                      Area
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {farm.area_hectares !==
                      null
                        ? `${farm.area_hectares.toLocaleString(
                            undefined,
                            {
                              maximumFractionDigits: 2,
                            },
                          )} ha`
                        : "Not set"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-400">
                      Status
                    </p>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />

                      <span className="font-semibold text-slate-800">
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                {farm.description && (
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
                    {farm.description}
                  </p>
                )}

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                  >
                    View farm
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12h14M13 6l6 6-6 6"
                      />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  </div>
</main>


);
}
