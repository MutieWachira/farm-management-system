
"use client";

/**
 * AgriCore — Farm Reports Page
 *
 * Responsibilities:
 * - Load the selected farm and its overview report.
 * - Filter activities, irrigation and finances by date.
 * - Display field, activity, irrigation and financial summaries.
 * - Provide loading, error and empty states.
 *
 * Security:
 * - Uses the existing authenticated API client.
 * - Backend authorization remains authoritative.
 *
 * Maintainability:
 * - Report types and API requests live in shared modules.
 * - Formatting helpers remain local to this presentation page.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { getFarms } from "@/src/lib/farm-api";
import { getFarmOverviewReport } from "@/src/lib/report-api";

import type { Farm } from "@/src/types/farm";
import type {
  FarmOverviewReport,
  ReportDateFilters,
} from "@/src/types/report";

type DateFilters = {
  start_date: string;
  end_date: string;
};

const EMPTY_FILTERS: DateFilters = {
  start_date: "",
  end_date: "",
};

function formatNumber(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits,
  });
}

function formatArea(value: number): string {
  return `${formatNumber(value)} ha`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(
  value: string | number,
  currencyCode: string,
): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${formatNumber(amount)}`;
  }
}

function formatActivityType(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {detail && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {detail}
            </p>
          )}
        </div>

        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl"
        >
          {icon}
        </span>
      </div>
    </article>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function ReportsPage() {
  const params = useParams();
  const rawFarmId = params.farmId;

  const farmId = Array.isArray(rawFarmId)
    ? rawFarmId[0]
    : rawFarmId;

  const [farm, setFarm] = useState<Farm | null>(null);
  const [report, setReport] = useState<FarmOverviewReport | null>(null);

  const [filters, setFilters] = useState<DateFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<DateFilters>(EMPTY_FILTERS);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);



  useEffect(() => {
    let active = true;

    async function fetchReport() {
      if (!farmId) {
        setError("The farm identifier is missing or invalid.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const requestFilters: ReportDateFilters = {};

        if (appliedFilters.start_date) {
          requestFilters.start_date = appliedFilters.start_date;
        }

        if (appliedFilters.end_date) {
          requestFilters.end_date = appliedFilters.end_date;
        }

        const [farms, reportData] = await Promise.all([
          getFarms(),
          getFarmOverviewReport(farmId, requestFilters),
        ]);

        if (!active) {
          return;
        }

        const currentFarm =
          farms.find((item) => item.id === farmId) ?? null;

        if (!currentFarm) {
          throw new Error("The requested farm could not be found.");
        }

        setFarm(currentFarm);
        setReport(reportData);
      } catch (err) {
        if (!active) {
          return;
        }

        console.error("Failed to load farm report:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the farm report. Please try again.",
        );

        setReport(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchReport();

    return () => {
      active = false;
    };
  }, [farmId, appliedFilters, retryCount]);

  const handleApplyFilters = () => {
    if (
      filters.start_date &&
      filters.end_date &&
      filters.start_date > filters.end_date
    ) {
      setFilterError("Start date must not be after end date.");
      return;
    }

    setFilterError(null);
    setAppliedFilters({ ...filters });
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setFilterError(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error || !farm || !report) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl text-red-600">
              !
            </div>

            <h1 className="text-xl font-bold text-slate-900">
              Unable to load farm reports
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error ?? "The requested farm report could not be loaded."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Try again
              </button>

              <Link
                href={farmId ? `/user/farms/${farmId}` : "/user/farms"}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to farm
              </Link>

              <Link
                href="/user/farms"
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                My farms
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const activityEntries = Object.entries(
    report.activities.activities_by_type,
  ).sort((a, b) => b[1] - a[1]);

  const maximumActivityCount = Math.max(
    1,
    ...activityEntries.map(([, count]) => count),
  );

  const hasNoReportData =
    report.fields.total_fields === 0 &&
    report.activities.total_activities === 0 &&
    report.irrigation.total_sessions === 0 &&
    report.finances.length === 0;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 sm:p-8">
            <Link
              href={`/user/farms/${farm.id}`}
              className="inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              ← Back to farm
            </Link>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                  📊
                </div>

                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    FARM ANALYTICS
                  </p>

                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Farm reports
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    An overview of fields, activities, irrigation and finances
                    for{" "}
                    <span className="font-semibold text-slate-700">
                      {farm.name}
                    </span>
                    .
                  </p>
                </div>
              </div>

              <span className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                Live report
              </span>
            </div>

            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Farm location
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {farm.location || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Farm area
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {farm.area_hectares == null
                    ? "Not specified"
                    : formatArea(Number(farm.area_hectares))}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Farm created
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(farm.created_at)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Date filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Report period"
            description="Filter activities, irrigation sessions and financial transactions by date. Field statistics show the current state of the farm."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
            <div>
              <label
                htmlFor="report-start-date"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Start date
              </label>

              <input
                id="report-start-date"
                type="date"
                value={filters.start_date}
                max={filters.end_date || undefined}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    start_date: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="report-end-date"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                End date
              </label>

              <input
                id="report-end-date"
                type="date"
                value={filters.end_date}
                min={filters.start_date || undefined}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    end_date: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <button
              type="button"
              onClick={handleApplyFilters}
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Apply filters
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear dates
            </button>
          </div>

          {filterError && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {filterError}
            </p>
          )}

          <p className="mt-4 text-xs leading-5 text-slate-500">
            {appliedFilters.start_date || appliedFilters.end_date
              ? `Applied period: ${appliedFilters.start_date || "Earliest available"} to ${appliedFilters.end_date || "Latest available"}`
              : "Showing the full available reporting period."}
          </p>
        </section>

        {hasNoReportData && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-amber-900">
              No report data available yet
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              This farm has no fields, activities, irrigation sessions or
              financial summaries to display for the selected period. Add
              records as your farm operations progress.
            </p>
          </section>
        )}

        {/* Field summary */}
        <section>
          <SectionHeading
            title="Field overview"
            description="Current field counts and registered field area."
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total fields"
              value={formatNumber(report.fields.total_fields, 0)}
              detail="All registered fields"
              icon="🌱"
            />

            <MetricCard
              label="Active fields"
              value={formatNumber(report.fields.active_fields, 0)}
              detail="Fields marked active"
              icon="🟢"
            />

            <MetricCard
              label="Fallow fields"
              value={formatNumber(report.fields.fallow_fields, 0)}
              detail="Fields resting between growing cycles"
              icon="🌾"
            />

            <MetricCard
              label="Registered field area"
              value={formatArea(report.fields.total_field_area_hectares)}
              detail={`${formatNumber(report.fields.inactive_fields, 0)} inactive fields`}
              icon="📐"
            />
          </div>
        </section>

        {/* Activity and irrigation summaries */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              title="Farm activities"
              description="Recorded activities within the selected period."
            />

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-800">
                Total activities
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-950">
                {formatNumber(report.activities.total_activities, 0)}
              </p>
            </div>

            <div className="mt-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-800">
                Activity breakdown
              </h3>

              {activityEntries.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No activities recorded for this period.
                </p>
              ) : (
                <div className="space-y-4">
                  {activityEntries.map(([type, count]) => (
                    <div key={type}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">
                          {formatActivityType(type)}
                        </span>
                        <span className="font-semibold tabular-nums text-slate-900">
                          {formatNumber(count, 0)}
                        </span>
                      </div>

                      <div
                        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-label={`${formatActivityType(type)} activity share`}
                        aria-valuemin={0}
                        aria-valuemax={maximumActivityCount}
                        aria-valuenow={count}
                      >
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all"
                          style={{
                            width: `${Math.min(100, (count / maximumActivityCount) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              title="Irrigation"
              description="Water usage and irrigation sessions within the selected period."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Irrigation sessions"
                value={formatNumber(report.irrigation.total_sessions, 0)}
                detail="Recorded sessions"
                icon="💧"
              />

              <MetricCard
                label="Total duration"
                value={formatNumber(report.irrigation.total_duration_minutes, 0)}
                detail="Minutes of irrigation"
                icon="⏱️"
              />
            </div>

            <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-5">
              <p className="text-sm font-medium text-sky-800">
                Total water volume
              </p>
              <p className="mt-2 text-2xl font-bold text-sky-950">
                {formatNumber(
                  report.irrigation.total_water_volume_liters,
                )}{" "}
                L
              </p>
              <p className="mt-2 text-xs leading-5 text-sky-800">
                Based on recorded irrigation volumes. Missing source records
                may affect this total.
              </p>
            </div>
          </section>
        </div>

        {/* Financial summaries */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Financial overview"
            description="Income, expenses and net balance for each currency. Currency totals are kept separate."
          />

          {report.finances.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <div className="text-3xl" aria-hidden="true">
                💰
              </div>
              <h3 className="mt-3 font-semibold text-slate-800">
                No financial records
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                No financial summaries are available for the selected period.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {report.finances.map((finance) => {
                const balance = Number(finance.net_balance);
                const isNegative =
                  Number.isFinite(balance) && balance < 0;

                return (
                  <article
                    key={finance.currency_code}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-bold text-slate-900">
                        {finance.currency_code} summary
                      </h3>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {finance.currency_code}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Total income
                        </p>
                        <p className="mt-2 break-words text-lg font-bold text-emerald-700">
                          {formatCurrency(
                            finance.total_income,
                            finance.currency_code,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Total expenses
                        </p>
                        <p className="mt-2 break-words text-lg font-bold text-red-600">
                          {formatCurrency(
                            finance.total_expenses,
                            finance.currency_code,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Net balance
                        </p>
                        <p
                          className={`mt-2 break-words text-lg font-bold ${
                            isNegative
                              ? "text-red-600"
                              : "text-slate-900"
                          }`}
                        >
                          {formatCurrency(
                            finance.net_balance,
                            finance.currency_code,
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className="mt-5 text-xs leading-5 text-slate-500">
            A positive net balance means recorded income exceeds recorded
            expenses. A negative balance means recorded expenses exceed
            recorded income. These summaries reflect stored transactions,
            not necessarily the farm&apos;s complete financial position.
          </p>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-2 border-t border-slate-200 py-4 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            AgriCore Farm Management System · Reports
          </p>
          <p>
            Report data is based on records available to your account.
          </p>
        </footer>
      </div>
    </main>
  );
}
