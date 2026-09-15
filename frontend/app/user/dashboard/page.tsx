"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { getCurrentUser } from "@/src/lib/auth-api";
import { getAccessToken, clearTokens } from "@/src/lib/auth_storage";
import { getFarms } from "@/src/lib/farm-api";

import type { User } from "@/src/types/auth";
import type { Farm } from "@/src/types/farm";

export default function DashboardPage() {
  const router = useRouter();

  // ============================================================
  // STATE
  // ============================================================

  const [user, setUser] = useState<User | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // LOAD DASHBOARD DATA
  // ============================================================

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        // ------------------------------------------------------
        // Check authentication
        // ------------------------------------------------------

        const token = getAccessToken();

        if (!token) {
          router.replace("/login");
          return;
        }

        // ------------------------------------------------------
        // Load user and farms concurrently
        // ------------------------------------------------------

        const [currentUser, userFarms] = await Promise.all([
          getCurrentUser(token),
          getFarms(),
        ]);

        // ------------------------------------------------------
        // Prevent state updates if component was unmounted
        // ------------------------------------------------------

        if (!isMounted) {
          return;
        }

        setUser(currentUser);
        setFarms(userFarms);
      } catch (error) {
        console.error("Failed to load dashboard:", error);

        if (!isMounted) {
          return;
        }

        /*
         * Authentication/API failure.
         *
         * Clear only AgriCore authentication tokens.
         */
        clearTokens();

        router.replace("/login");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    // ----------------------------------------------------------
    // Cleanup
    // ----------------------------------------------------------

    return () => {
      isMounted = false;
    };
  }, [router]);

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4
              border-emerald-100 border-t-emerald-600"
          />

          <p className="text-sm font-medium text-slate-500">
            Loading AgriCore...
          </p>
        </div>
      </main>
    );
  }

  // ============================================================
  // AUTHENTICATION GUARD
  // ============================================================

  if (!user) {
    return null;
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ========================================================
          TOP NAVIGATION
      ========================================================= */}

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6 lg:px-8">
          {/* Brand */}

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white shadow-sm">
              A
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">
                AgriCore
              </p>

              <p className="hidden text-xs text-slate-500 sm:block">
                Farm Management
              </p>
            </div>
          </div>

          {/* Header Actions */}

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="hidden rounded-lg border border-slate-200
                bg-white px-4 py-2 text-sm font-medium text-slate-700
                transition hover:bg-slate-50 sm:block"
            >
              Help
            </button>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  {user.first_name} {user.last_name}
                </p>

                <p className="text-xs text-slate-500">
                  Farm Manager
                </p>
              </div>

              <div
                className="flex h-9 w-9 items-center justify-center
                  rounded-full bg-emerald-100 text-sm font-bold
                  text-emerald-700"
              >
                {user.first_name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          MAIN CONTENT
      ========================================================= */}

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        {/* ======================================================
            WELCOME SECTION
        ======================================================= */}

        <section className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-600">
              Farm overview
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Good day, {user.first_name}.
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Monitor your farms, fields, and agricultural
              operations from one place.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex w-fit items-center justify-center
              gap-2 rounded-xl bg-emerald-600 px-5 py-3
              text-sm font-semibold text-white shadow-sm
              transition hover:bg-emerald-700 hover:shadow-md
              focus:outline-none focus:ring-2
              focus:ring-emerald-500 focus:ring-offset-2"
          >
            <span className="text-lg leading-none">+</span>
            Add Farm
          </button>
        </section>

        {/* ======================================================
            KPI CARDS
        ======================================================= */}

        <section
          aria-label="Farm statistics"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {/* Total Farms */}

          <div
            className="group rounded-2xl border border-slate-200
              bg-white p-5 shadow-sm transition
              hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Farms
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {farms.length}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                🌱
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Farms under management
            </p>
          </div>

          {/* Total Fields */}

          <div
            className="group rounded-2xl border border-slate-200
              bg-white p-5 shadow-sm transition
              hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Fields
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  0
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                ◫
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Registered production fields
            </p>
          </div>

          {/* Active Crops */}

          <div
            className="group rounded-2xl border border-slate-200
              bg-white p-5 shadow-sm transition
              hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Active Crops
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  0
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl">
                🌾
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Currently active crops
            </p>
          </div>

          {/* Farm Health */}

          <div
            className="group rounded-2xl border border-slate-200
              bg-white p-5 shadow-sm transition
              hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Farm Health
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  —
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-xl">
                ✓
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Awaiting farm data
            </p>
          </div>
        </section>

        {/* ======================================================
            MAIN DASHBOARD GRID
        ======================================================= */}

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* ====================================================
              FARM OVERVIEW
          ===================================================== */}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            {/* Header */}

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Farm Overview
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Your farms and current operational status
                </p>
              </div>

              {/* Manage Farms */}

              <Link
                href="/user/farms"
                className="inline-flex rounded-lg border border-slate-200
                  px-4 py-2 text-sm font-medium text-slate-700
                  transition hover:bg-slate-50
                  focus:outline-none focus:ring-2
                  focus:ring-emerald-500 focus:ring-offset-2"
              >
                Manage farms
              </Link>
            </div>

            {/* Empty State */}

            {farms.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                  🌿
                </div>

                <h3 className="font-semibold text-slate-900">
                  No farms registered yet
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Add your first farm to begin tracking fields,
                  crops, and agricultural operations.
                </p>

                <Link
                  href="/user/farms"
                  className="mt-5 inline-flex rounded-xl border
                    border-emerald-200 bg-emerald-50 px-4 py-2.5
                    text-sm font-semibold text-emerald-700
                    transition hover:bg-emerald-100
                    focus:outline-none focus:ring-2
                    focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Manage your farms
                </Link>
              </div>
            ) : (
              /* Farm List */

              <div className="divide-y divide-slate-100">
                {farms.map((farm) => (
                  <div
                    key={farm.id}
                    className="flex items-center justify-between
                      px-6 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                        🌱
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {farm.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {farm.location || "Location not specified"}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ====================================================
              QUICK ACTIONS
          ===================================================== */}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-900">
                Quick Actions
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Common farm management tasks
              </p>
            </div>

            <div className="space-y-2 p-4">
              {/* Add Farm */}

              <Link
                href="/user/farms/farmId/members"
                className="flex w-full items-center gap-4 rounded-xl
                  p-3 text-left transition hover:bg-slate-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-lg">
                  🌱
                </span>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Add a member
                  </p>

                  <p className="text-xs text-slate-500">
                    Register a new farm
                  </p>
                </div>
              </Link>

              {/* Manage Fields */}

              <button
                type="button"
                className="flex w-full items-center gap-4 rounded-xl
                  p-3 text-left transition hover:bg-slate-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-lg">
                  ◫
                </span>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Manage fields
                  </p>

                  <p className="text-xs text-slate-500">
                    View and manage farm fields
                  </p>
                </div>
              </button>

              {/* Manage Crops */}

              <button
                type="button"
                className="flex w-full items-center gap-4 rounded-xl
                  p-3 text-left transition hover:bg-slate-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-lg">
                  🌾
                </span>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Manage crops
                  </p>

                  <p className="text-xs text-slate-500">
                    Track active crops
                  </p>
                </div>
              </button>

              {/* Reports */}

              <button
                type="button"
                className="flex w-full items-center gap-4 rounded-xl
                  p-3 text-left transition hover:bg-slate-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg">
                  📊
                </span>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    View reports
                  </p>

                  <p className="text-xs text-slate-500">
                    Analyze farm performance
                  </p>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================
            RECENT ACTIVITY
        ======================================================= */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-semibold text-slate-900">
              Recent Activity
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Recent changes and events across your farms
            </p>
          </div>

          <div className="flex min-h-32 items-center justify-center px-6 py-8 text-center">
            <p className="text-sm text-slate-400">
              No recent activity to display.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
