"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getCurrentUser } from "@/src/lib/auth-api";
import { clearTokens, getAccessToken } from "@/src/lib/auth_storage";
import { getCrops } from "@/src/lib/crop-api";
import { getFarmActivities } from "@/src/lib/farm-activity-api";
import { getFarms } from "@/src/lib/farm-api";
import { formatAcres } from "@/src/lib/area";
import { getFields } from "@/src/lib/field-api";

import type { User } from "@/src/types/auth";
import type { FarmActivity } from "@/src/types/farm-activity";
import type { Farm } from "@/src/types/farm";

type IconName =
  | "activity"
  | "arrow"
  | "chevron"
  | "fields"
  | "farms"
  | "leaf"
  | "location"
  | "logout"
  | "plus";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const sharedProps = {
    "aria-hidden": true as const,
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.7,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "activity":
      return (
        <svg {...sharedProps}>
          <path d="M3 12h4l3-8 4 16 3-8h4" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...sharedProps}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...sharedProps}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case "fields":
      return (
        <svg {...sharedProps}>
          <path d="M4 20V5l8-2 8 2v15M4 10l8 2 8-2M12 7v13" />
        </svg>
      );
    case "farms":
      return (
        <svg {...sharedProps}>
          <path d="M3 20c7-1 12-5 15-12M8 16c-1-4 1-7 5-9 2-1 4-3 4-5 3 2 5 5 4 9-1 5-5 8-13 10" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...sharedProps}>
          <path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-7 8-16Z" />
          <path d="M4 21c2-5 6-9 12-12" />
        </svg>
      );
    case "location":
      return (
        <svg {...sharedProps}>
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "logout":
      return (
        <svg {...sharedProps}>
          <path d="M10 17l5-5-5-5M15 12H3" />
          <path d="M12 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...sharedProps}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFields, setTotalFields] = useState<number | null>(null);
  const [activeCrops, setActiveCrops] = useState<number | null>(null);
  const [recentActivities, setRecentActivities] = useState<
    FarmActivity[] | null
  >(null);
  const [activityLoading, setActivityLoading] = useState(true);

  const handleLogout = () => {
    clearTokens();
    router.replace("/login");
  };

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const token = getAccessToken();

        if (!token) {
          router.replace("/login");
          return;
        }

        const [currentUser, userFarms] = await Promise.all([
          getCurrentUser(token),
          getFarms(),
        ]);

        if (!isMounted) {
          return;
        }

        setUser(currentUser);
        setFarms(userFarms);

        void (async () => {
          try {
            const activitiesByFarm = await Promise.all(
              userFarms.map((farm) => getFarmActivities(farm.id)),
            );
            const latestActivities = activitiesByFarm
              .flat()
              .sort(
                (first, second) =>
                  second.activity_date.localeCompare(first.activity_date) ||
                  second.created_at.localeCompare(first.created_at),
              )
              .slice(0, 20);

            if (isMounted) {
              setRecentActivities(latestActivities);
            }
          } catch (error) {
            console.error("Failed to load recent farm activity:", error);

            if (isMounted) {
              setRecentActivities(null);
            }
          } finally {
            if (isMounted) {
              setActivityLoading(false);
            }
          }
        })();

        try {
          const fieldsByFarm = await Promise.all(
            userFarms.map((farm) => getFields(farm.id)),
          );
          const allFields = fieldsByFarm.flat();
          const cropsByField = await Promise.all(
            allFields.map((field) => getCrops(field.id)),
          );
          const allCrops = cropsByField.flat();

          if (!isMounted) {
            return;
          }

          setTotalFields(allFields.length);
          setActiveCrops(
            allCrops.filter(
              (crop) =>
                crop.status === "PLANTED" || crop.status === "GROWING",
            ).length,
          );
        } catch (error) {
          console.error(
            "Failed to load field and crop statistics:",
            error,
          );

          if (!isMounted) {
            return;
          }

          setTotalFields(null);
          setActiveCrops(null);
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);

        if (!isMounted) {
          return;
        }

        clearTokens();
        router.replace("/login");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main
        aria-busy="true"
        className="flex min-h-screen items-center justify-center bg-[#f6f8f5] px-6"
      >
        <div className="w-full max-w-sm" role="status">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white">
              <Icon name="leaf" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              AgriCore
            </span>
          </div>
          <div className="space-y-3 motion-safe:animate-pulse">
            <div className="h-7 w-2/3 rounded-lg bg-slate-200" />
            <div className="h-4 w-full rounded-md bg-slate-200" />
            <div className="h-4 w-4/5 rounded-md bg-slate-200" />
          </div>
          <p className="mt-5 text-sm text-slate-500">
            Loading your farm workspace…
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const totalArea = farms.reduce(
    (total, farm) => total + (farm.area_hectares ?? 0),
    0,
  );
  const hasRecordedArea = farms.some(
    (farm) => farm.area_hectares !== null,
  );
  const stats = [
    {
      label: "Total farms",
      value: farms.length.toLocaleString(),
      detail: "Across your workspace",
      icon: "farms" as const,
      iconClass: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Total fields",
      value: totalFields?.toLocaleString() ?? "—",
      detail:
        totalFields === null ? "Field data unavailable" : "In your farms",
      icon: "fields" as const,
      iconClass: "bg-sky-50 text-sky-700",
    },
    {
      label: "Active crops",
      value: activeCrops?.toLocaleString() ?? "—",
      detail:
        activeCrops === null
          ? "Crop data unavailable"
          : "Planted or growing",
      icon: "leaf" as const,
      iconClass: "bg-amber-50 text-amber-700",
    },
    {
      label: "Land area",
      value: hasRecordedArea
        ? formatAcres(totalArea)
        : "—",
      detail: hasRecordedArea ? "Recorded farm area" : "No area recorded",
      icon: "location" as const,
      iconClass: "bg-violet-50 text-violet-700",
    },
  ];

  const visibleFarms = farms.slice(0, 5);
  const farmNames = new Map(farms.map((farm) => [farm.id, farm.name]));

  return (
    <div className="h-dvh overflow-hidden bg-[#f6f8f5] text-slate-900">
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-800 focus:shadow-lg"
      >
        Skip to dashboard content
      </a>

      <div className="grid h-full min-h-0 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden h-full min-h-0 border-r border-emerald-950/10 bg-[#173b2b] text-white lg:flex lg:flex-col">
          <Link
            href="/user/dashboard"
            className="flex h-[84px] items-center gap-3 border-b border-white/10 px-7"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-emerald-950 shadow-sm">
              <Icon name="leaf" className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">
                AgriCore
              </span>
              <span className="block text-xs text-emerald-100/65">
                Farm management
              </span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="flex-1 px-4 py-8">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100/50">
              Workspace
            </p>
            <Link
              href="/user/dashboard"
              aria-current="page"
              className="flex items-center gap-3 rounded-xl bg-white/12 px-3 py-3 text-sm font-medium text-white ring-1 ring-inset ring-white/10 transition hover:bg-white/15"
            >
              <Icon name="fields" className="h-[19px] w-[19px]" />
              Dashboard
            </Link>
            <Link
              href="/user/farms"
              className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-emerald-50/75 transition hover:bg-white/8 hover:text-white"
            >
              <Icon name="farms" className="h-[19px] w-[19px]" />
              My farms
              <span className="ml-auto rounded-md bg-white/10 px-2 py-0.5 text-xs text-emerald-50/70">
                {farms.length}
              </span>
            </Link>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200">
                <Icon name="activity" className="h-[18px] w-[18px]" />
              </span>
              <p className="text-sm font-medium text-white">
                A little progress, every day
              </p>
              <p className="mt-1.5 text-xs leading-5 text-emerald-50/60">
                Keep your farm records organized and your operation moving.
              </p>
            </div>
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-200/15 text-sm font-semibold text-emerald-100">
                {user.first_name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-white">
                  {user.first_name} {user.last_name}
                </span>
                <span className="block text-xs text-emerald-50/55">
                  Farm manager
                </span>
              </span>
            </div>
          </div>
        </aside>

        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <header className="z-20 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-7 lg:px-10">
              <Link
                href="/user/dashboard"
                className="flex items-center gap-2.5 lg:hidden"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
                  <Icon name="leaf" className="h-5 w-5" />
                </span>
                <span className="text-base font-semibold tracking-tight text-slate-900">
                  AgriCore
                </span>
              </Link>

              <div className="hidden items-center gap-2 text-sm text-slate-500 lg:flex">
                <span>Workspace</span>
                <Icon
                  name="chevron"
                  className="h-4 w-4 text-slate-400"
                />
                <span className="font-medium text-slate-800">
                  Dashboard
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:px-4"
                >
                  <Icon name="logout" className="h-[18px] w-[18px]" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </header>

          <main
            id="dashboard-content"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
            <section className="relative isolate overflow-hidden rounded-[26px] bg-[#1d4935] px-6 py-7 text-white shadow-[0_18px_45px_-24px_rgba(20,62,42,0.5)] sm:px-9 sm:py-9 lg:px-11 lg:py-10">
              <div
                aria-hidden="true"
                className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/[0.08] sm:-right-8 sm:-top-44 sm:h-[420px] sm:w-[420px]"
              />
              <div
                aria-hidden="true"
                className="absolute -right-8 top-10 -z-10 h-52 w-52 rounded-full border border-white/[0.08] sm:right-20 sm:top-0 sm:h-72 sm:w-72"
              />
              <div className="absolute bottom-0 right-0 -z-10 h-24 w-full bg-gradient-to-t from-emerald-950/20 to-transparent" />

              <div className="max-w-2xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100/15 bg-white/[0.07] px-3 py-1.5 text-xs font-medium tracking-wide text-emerald-50/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
                  YOUR FARM WORKSPACE
                </p>
                <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
                  Welcome back, {user.first_name}.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/75 sm:text-base">
                  A clear view of your operation starts here. Check your farms,
                  keep an eye on crop activity, and plan what comes next.
                </p>
                <Link
                  href="/user/farms"
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d6efac] px-4 text-sm font-semibold text-[#183a29] transition hover:bg-[#e1f5c2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d4935]"
                >
                  Explore your farms
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 right-8 hidden h-40 w-44 items-end justify-center opacity-70 md:flex lg:right-20"
              >
                <svg viewBox="0 0 180 150" fill="none" className="h-full w-full">
                  <path
                    d="M18 150c18-44 45-66 81-66 28 0 51 15 68 45v21H18Z"
                    fill="#A6C77B"
                    fillOpacity=".16"
                  />
                  <path
                    d="M53 150c8-34 24-52 47-52 23 0 39 18 47 52H53Z"
                    fill="#C9E59F"
                    fillOpacity=".22"
                  />
                  <path
                    d="M96 139c-1-25 1-48 6-69m-5 48c-13-13-23-17-34-18m40 5c10-14 20-20 32-22m-38 43c-9-7-17-9-27-9m34-12c8-8 16-12 25-13"
                    stroke="#D9F0B7"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                  <path
                    d="M63 99c-1-9 4-15 13-17 1 9-4 15-13 17Zm38 7c1-10 7-15 17-15-1 9-7 15-17 15Zm-6 18c-1-9 3-15 12-17 1 9-3 15-12 17Z"
                    fill="#D9F0B7"
                  />
                </svg>
              </div>
            </section>

            <section aria-label="Farm statistics" className="mt-6">
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Your operation
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    A snapshot of your farm portfolio
                  </p>
                </div>
                <span className="hidden text-xs text-slate-400 sm:block">
                  Live workspace totals
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <article
                    key={stat.label}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_12px_-8px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_25px_-16px_rgba(15,23,42,0.25)]"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-medium text-slate-500">
                        {stat.label}
                      </p>
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconClass}`}
                      >
                        <Icon name={stat.icon} className="h-5 w-5" />
                      </span>
                    </div>
                    <p
                      className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.04em] text-slate-900"
                      aria-live="polite"
                    >
                      {stat.value}
                    </p>
                    <p className="mt-2.5 text-xs text-slate-500">
                      {stat.detail}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_12px_-8px_rgba(15,23,42,0.18)]">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-semibold tracking-tight text-slate-900">
                        Farm portfolio
                      </h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {farms.length}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Your farms and their locations
                    </p>
                  </div>
                  {farms.length > 0 && (
                    <Link
                      href="/user/farms"
                      className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      View all
                      <Icon name="arrow" className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>

                {farms.length === 0 ? (
                  <div className="flex min-h-[270px] flex-col items-center justify-center px-6 py-10 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <Icon name="farms" className="h-7 w-7" />
                    </span>
                    <h3 className="mt-4 text-sm font-semibold text-slate-900">
                      Start with your first farm
                    </h3>
                    <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">
                      Add a farm to bring your fields, crops, and day-to-day
                      operations together.
                    </p>
                    <Link
                      href="/user/farms"
                      className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                    >
                      <Icon name="plus" className="h-4 w-4" />
                      Add a farm
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {visibleFarms.map((farm) => (
                      <Link
                        key={farm.id}
                        href={`/user/farms/${encodeURIComponent(farm.id)}`}
                        className="group flex min-h-[76px] items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-[#fafcf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 sm:px-6"
                      >
                        <span className="flex min-w-0 items-center gap-3.5">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
                            <Icon name="farms" className="h-[19px] w-[19px]" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                              {farm.name}
                            </span>
                            <span className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                              <Icon
                                name="location"
                                className="h-3.5 w-3.5 shrink-0 text-slate-400"
                              />
                              {farm.location || "Location not specified"}
                            </span>
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-500 transition group-hover:text-emerald-800">
                          <span className="hidden sm:inline">Open farm</span>
                          <Icon
                            name="chevron"
                            className="h-4 w-4 transition group-hover:translate-x-0.5"
                          />
                        </span>
                      </Link>
                    ))}
                    {farms.length > visibleFarms.length && (
                      <p className="px-6 py-3 text-center text-xs text-slate-500">
                        Showing {visibleFarms.length} of {farms.length} farms
                      </p>
                    )}
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_12px_-8px_rgba(15,23,42,0.18)]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-slate-900">
                      Recent activity
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      What’s happening across your farms
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon name="activity" className="h-[18px] w-[18px]" />
                  </span>
                </div>

                {activityLoading ? (
                  <div
                    aria-label="Loading recent activity"
                    className="space-y-5 p-5 sm:p-6"
                  >
                    {[0, 1, 2].map((item) => (
                      <div
                        key={item}
                        className="flex animate-pulse items-start gap-3"
                      >
                        <span className="h-9 w-9 shrink-0 rounded-xl bg-slate-100" />
                        <span className="flex-1 space-y-2 pt-1">
                          <span className="block h-3.5 w-4/5 rounded bg-slate-100" />
                          <span className="block h-3 w-3/5 rounded bg-slate-100" />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : recentActivities === null ? (
                  <div className="flex min-h-52 flex-col items-center justify-center px-6 py-8 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                      <Icon name="activity" className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-medium text-slate-800">
                      Activity is temporarily unavailable
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Your farm data is still available. Try again later.
                    </p>
                  </div>
                ) : recentActivities.length === 0 ? (
                  <div className="flex min-h-52 flex-col items-center justify-center px-6 py-8 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Icon name="leaf" className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-medium text-slate-800">
                      No activity recorded yet
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Farm operations will appear here when they’re recorded.
                    </p>
                  </div>
                ) : (
                  <div
                    aria-label="Recent farm activities"
                    className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto overscroll-contain"
                    role="region"
                    tabIndex={0}
                  >
                    {recentActivities.map((activity) => {
                      const activityType = activity.activity_type
                        .replaceAll("_", " ")
                        .toLocaleLowerCase();
                      const activityDate = new Date(
                        `${activity.activity_date.slice(0, 10)}T00:00:00`,
                      );
                      const formattedDate = Number.isNaN(
                        activityDate.getTime(),
                      )
                        ? activity.activity_date
                        : activityDate.toLocaleDateString("en-KE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          });

                      return (
                        <Link
                          key={activity.id}
                          href={`/user/farms/${encodeURIComponent(activity.farm_id)}/activities`}
                          className="group flex gap-3 px-5 py-4 transition hover:bg-[#fafcf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 sm:px-6"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Icon
                              name="activity"
                              className="h-[18px] w-[18px]"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                              {activity.title}
                            </span>
                            <span className="mt-1 block truncate text-xs capitalize text-slate-500">
                              {farmNames.get(activity.farm_id) ??
                                "Farm"}{" "}
                              <span aria-hidden="true">·</span>{" "}
                              {activityType}
                            </span>
                            {activity.description && (
                              <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">
                                {activity.description}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 pt-0.5 text-[11px] text-slate-400">
                            {formattedDate}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <footer className="mt-8 flex flex-col gap-1 border-t border-slate-200/80 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>AgriCore · Farm management workspace</span>
              <span>Farm data is kept in your account workspace.</span>
            </footer>
            </div>
          </main>
        </div>
      </div>
    </div> );
}
