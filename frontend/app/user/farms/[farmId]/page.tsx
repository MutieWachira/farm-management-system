"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { getCurrentUser } from "@/src/lib/auth-api";

type Farm = {
  id: string;
  name: string;
  location: string;
  area_hectares: number;
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
};

type CurrentUser = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

type ApiError = {
  detail?: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const ACCESS_TOKEN_KEY = "access_token";

type FarmSection = {
  title: string;
  description: string;
  href: string;
  icon: string;
  available: boolean;
};

export default function FarmDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const farmId = String(params.farmId);

  const [farm, setFarm] = useState<Farm | null>(null);
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get the currently stored access token.
   *
   * sessionStorage is intentionally used because that is
   * the authentication storage mechanism already used by
   * the AgriCore frontend.
   */
  function getAccessToken(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Make an authenticated API request.
   *
   * The backend remains responsible for authorization.
   * This helper only attaches the user's access token.
   */
  async function apiRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = getAccessToken();

    if (!token) {
      throw new Error(
        "Your session has expired. Please log in again.",
      );
    }

    const headers = new Headers(options.headers);

    headers.set("Authorization", `Bearer ${token}`);

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  }

  /**
   * Load the requested farm.
   *
   * Important:
   * We do NOT determine authorization from the frontend.
   * The backend must verify that the authenticated user
   * has access to this farm.
   */
  async function loadFarm(): Promise<Farm> {
    const response = await apiRequest(
      `/api/v1/farms/${encodeURIComponent(farmId)}`,
    );

    if (response.status === 401) {
      router.replace("/login");

      throw new Error("Your session has expired.");
    }

    if (response.status === 403) {
      throw new Error(
        "You do not have permission to access this farm.",
      );
    }

    if (response.status === 404) {
      throw new Error("Farm not found.");
    }

    if (!response.ok) {
      let message = "Unable to load farm details.";

      try {
        const data: ApiError = await response.json();

        if (data.detail) {
          message = data.detail;
        }
      } catch {
        // Keep the default error message.
      }

      throw new Error(message);
    }

    return response.json();
  }

  /**
   * Load all data required by the farm overview.
   *
   * We deliberately keep this request sequence small.
   *
   * We are NOT loading:
   * - fields
   * - crops
   * - livestock
   * - expenses
   * - members
   *
   * on this page.
   *
   * Each module can load its own data when the user
   * actually opens that module.
   */
  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        setLoading(true);
        setError(null);

        const accessToken = getAccessToken();

        if (!accessToken) {
          router.replace("/login");
          return;
        }

        /**
         * getCurrentUser requires the access token.
         */
        const user = await getCurrentUser(accessToken);

        if (!mounted) {
          return;
        }

        /**
         * IMPORTANT:
         * Store the authenticated user in state.
         *
         * Without this, currentUser remains null and
         * the owner check cannot work.
         */
        setCurrentUser(user);

        /**
         * Load the requested farm.
         *
         * The backend must independently check whether
         * this authenticated user can access the farm.
         */
        const farmData = await loadFarm();

        if (!mounted) {
          return;
        }

        setFarm(farmData);
      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error(
          "Failed to load farm details:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading the farm.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      mounted = false;
    };
  }, [farmId, router]);

  /**
   * Farm modules.
   *
   * Only modules whose backend/frontend implementation
   * currently exists are enabled.
   */
  const farmSections: FarmSection[] = useMemo(
    () => [
      {
        title: "Fields",
        description:
          "Manage fields, sizes, boundaries, and field information.",
        href: `/dashboard/farms/${farmId}/fields`,
        icon: "▦",
        available: false,
      },
      {
        title: "Crops",
        description:
          "Track crops, planting activities, harvests, and crop performance.",
        href: `/dashboard/farms/${farmId}/crops`,
        icon: "🌱",
        available: false,
      },
      {
        title: "Livestock",
        description:
          "Manage livestock records, health information, and production.",
        href: `/dashboard/farms/${farmId}/livestock`,
        icon: "◉",
        available: false,
      },
      {
        title: "Expenses",
        description:
          "Track farm expenses and monitor financial activity.",
        href: `/dashboard/farms/${farmId}/expenses`,
        icon: "KSh",
        available: false,
      },
      {
        title: "Members",
        description:
          "View and manage users who have access to this farm.",
        href: `/dashboard/farms/${farmId}/members`,
        icon: "♙",
        available: true,
      },
      {
        title: "Settings",
        description:
          "Manage farm configuration and farm-level settings.",
        href: `/dashboard/farms/${farmId}/settings`,
        icon: "⚙",
        available: false,
      },
    ],
    [farmId],
  );

  /**
   * Loading state.
   */
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="animate-pulse space-y-5">
              <div className="h-4 w-32 rounded bg-slate-200" />

              <div className="h-9 w-72 rounded bg-slate-200" />

              <div className="h-5 w-96 max-w-full rounded bg-slate-200" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  /**
   * Error state.
   */
  if (error || !farm) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              !
            </div>

            <h1 className="text-xl font-bold text-slate-900">
              Unable to open farm
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error ??
                "The requested farm could not be loaded."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Go back
              </button>

              <Link
                href="/dashboard/farms"
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                View my farms
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /**
   * Frontend owner check.
   *
   * This is ONLY for UI behavior.
   *
   * It must never replace backend authorization.
   */
  const isOwner =
    currentUser?.id !== undefined &&
    farm.owner_id !== undefined &&
    currentUser.id === farm.owner_id;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* =========================================================
            HEADER
        ========================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Link
                  href="/dashboard/farms"
                  className="inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-900"
                >
                  ← Back to farms
                </Link>

                <div className="mt-5 flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-2xl">
                    🌾
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        {farm.name}
                      </h1>

                      {isOwner && (
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                          OWNER
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      Farm ID: {farm.id}
                    </p>

                    {farm.location && (
                      <p className="mt-1 text-sm text-slate-600">
                        📍 {farm.location}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/dashboard/farms/${farm.id}/members`}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Manage members
                </Link>

                {isOwner && (
                  <Link
                    href={`/dashboard/farms/${farm.id}/settings`}
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Farm settings
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            FARM SUMMARY
        ========================================================= */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Farm area
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {farm.area_hectares}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              hectares
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Location
            </p>

            <p className="mt-2 truncate text-lg font-bold text-slate-900">
              {farm.location || "Not specified"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Farm location
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Farm ID
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              #{farm.id}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Internal identifier
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Your access
            </p>

            <p className="mt-2 text-lg font-bold text-slate-900">
              {isOwner ? "Owner" : "Farm member"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Based on farm membership
            </p>
          </div>
        </section>

        {/* =========================================================
            FARM MANAGEMENT
        ========================================================= */}

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Farm management
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage the different areas of {farm.name}.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {farmSections.map((section) => {
              if (!section.available) {
                return (
                  <div
                    key={section.title}
                    className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="absolute right-5 top-5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                        Coming soon
                      </span>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                      {section.icon}
                    </div>

                    <h3 className="mt-5 text-base font-semibold text-slate-900">
                      {section.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {section.description}
                    </p>
                  </div>
                );
              }

              return (
                <Link
                  key={section.title}
                  href={section.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-sm font-bold text-green-700">
                      {section.icon}
                    </div>

                    <span className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700">
                      →
                    </span>
                  </div>

                  <h3 className="mt-5 text-base font-semibold text-slate-900">
                    {section.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {section.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            FARM INFORMATION
        ========================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Farm information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Basic information stored for this farm.
            </p>
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Farm name
              </p>

              <p className="mt-2 text-sm font-medium text-slate-900">
                {farm.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Location
              </p>

              <p className="mt-2 text-sm font-medium text-slate-900">
                {farm.location || "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Area
              </p>

              <p className="mt-2 text-sm font-medium text-slate-900">
                {farm.area_hectares} hectares
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Farm ID
              </p>

              <p className="mt-2 font-mono text-sm font-medium text-slate-900">
                {farm.id}
              </p>
            </div>

            {farm.created_at && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Created
                </p>

                <p className="mt-2 text-sm font-medium text-slate-900">
                  {new Date(
                    farm.created_at,
                  ).toLocaleDateString()}
                </p>
              </div>
            )}

            {farm.updated_at && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Last updated
                </p>

                <p className="mt-2 text-sm font-medium text-slate-900">
                  {new Date(
                    farm.updated_at,
                  ).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================
            SECURITY NOTICE
        ========================================================= */}

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              i
            </div>

            <div>
              <h3 className="text-sm font-semibold text-blue-900">
                Access controlled
              </h3>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Farm access is controlled by your authenticated
                account and farm membership. The interface may hide
                management options based on your role, but the
                backend remains responsible for enforcing
                permissions.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}