"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser } from "@/src/lib/auth-api";
import type { User } from "@/src/types/auth";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token =
      sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    getCurrentUser(token)
      .then(setUser)
      .catch(() => {
        sessionStorage.clear();
        router.replace("/login");
      });
  }, [router]);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

          <p className="text-sm font-medium text-slate-500">
            Loading AgriCore...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
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
              className="hidden rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:block"
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

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                {user.first_name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        {/* Welcome Section */}
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
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <span className="text-lg leading-none">+</span>
            Add Farm
          </button>
        </section>

        {/* KPI Cards */}
        <section
          aria-label="Farm statistics"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {/* Farms */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Farms
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  0
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

          {/* Fields */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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

          {/* Crops */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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

          {/* Health */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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

        {/* Main Dashboard Grid */}
        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Farm Overview */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Farm Overview
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Your farms and current operational status
                </p>
              </div>

              <button
                type="button"
                className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
              >
                View all
              </button>
            </div>

            {/* Empty State */}
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

              <button
                type="button"
                className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                Add your first farm
              </button>
            </div>
          </div>

          {/* Quick Actions */}
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
              <button
                type="button"
                className="flex w-full items-center gap-4 rounded-xl p-3 text-left transition hover:bg-slate-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-lg">
                  🌱
                </span>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Add a farm
                  </p>

                  <p className="text-xs text-slate-500">
                    Register a new farm
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-4 rounded-xl p-3 text-left transition hover:bg-slate-50"
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

              <button
                type="button"
                className="flex w-full items-center gap-4 rounded-xl p-3 text-left transition hover:bg-slate-50"
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

              <button
                type="button"
                className="flex w-full items-center gap-4 rounded-xl p-3 text-left transition hover:bg-slate-50"
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

        {/* Activity */}
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