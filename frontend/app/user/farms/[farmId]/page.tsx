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

type WeatherSnapshot = {
  location: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  conditionCode: number;
  high: number;
  low: number;
  sunrise: string;
  sunset: string;
  forecast: WeatherDayForecast[];
};

type WeatherDayForecast = {
  date: string;
  condition: string;
  conditionCode: number;
  high: number;
  low: number;
};

type WeatherRecommendations = {
  day: string[];
  week: string[];
  month: string[];
  season: string[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const WEATHER_GEOCODE_URL =
  "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast";

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
  const [weather, setWeather] =
    useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] =
    useState(false);
  const [weatherError, setWeatherError] =
    useState<string | null>(null);
  const [lastUpdated, setLastUpdated] =
    useState<string | null>(null);

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

  function getWeatherConditionLabel(
    code: number,
  ): string {
    switch (code) {
      case 0:
        return "Clear sky";
      case 1:
      case 2:
      case 3:
        return "Partly cloudy";
      case 45:
      case 48:
        return "Foggy";
      case 51:
      case 53:
      case 55:
      case 56:
      case 57:
      case 61:
      case 63:
      case 65:
      case 66:
      case 67:
      case 80:
      case 81:
      case 82:
        return "Rain";
      case 71:
      case 73:
      case 75:
      case 77:
      case 85:
      case 86:
        return "Snow";
      case 95:
      case 96:
      case 99:
        return "Thunderstorm";
      default:
        return "Weather update";
    }
  }

  function getWeatherRecommendations(
    conditionCode: number,
    temperature: number,
    monthNumber: number,
  ): WeatherRecommendations {
    const isRainy =
      conditionCode >= 51 && conditionCode <= 82;
    const isStormy =
      conditionCode >= 95 && conditionCode <= 99;
    const isCold = temperature < 10;
    const isHot = temperature > 28;
    const isDry =
      conditionCode === 0 ||
      (conditionCode >= 1 && conditionCode <= 3);

    const seasonMap: Record<string, number[]> = {
      spring: [3, 4, 5],
      summer: [6, 7, 8],
      autumn: [9, 10, 11],
      winter: [12, 1, 2],
    };

    const season = Object.entries(seasonMap).find(([, months]) =>
      months.includes(monthNumber),
    )?.[0] ?? "spring";

    const day = [
      isRainy
        ? "Carry irrigation cover and keep field paths clear to reduce muddy access."
        : isStormy
          ? "Avoid heavy outdoor work this afternoon and secure any loose equipment."
          : isHot
            ? "Start field work early and plan shaded breaks during peak heat."
            : isCold
              ? "Protect sensitive crops and schedule the heavier tasks later in the day."
              : "Favour a full field activity window with light inspection and crop monitoring.",
      isRainy || isStormy
        ? "Check drainage and root-zone moisture before watering any crop."
        : "Use this weather window to inspect growth, weeds, and nutrient stress.",
    ];

    const week = [
      isRainy
        ? "Plan the next few days around water management and drainage checks."
        : isHot
          ? "Monitor irrigation demand closely and protect young plants from heat stress."
          : "This week is suitable for routine crop checks, weeding, and field maintenance.",
      isDry
        ? "Use the dry spell to complete work that benefits from good soil access."
        : "Keep a close eye on soil moisture and avoid overwatering if rainfall is frequent.",
    ];

    const monthAdvice = [
      isHot
        ? "Adjust harvesting and spraying windows to avoid midday heat and high evaporation."
        : isCold
          ? "Budget for slower crop growth and plan protection for temperature-sensitive crops."
          : "The month looks manageable for steady crop care, maintenance, and continued growth tracking.",
      season === "summer"
        ? "Prioritize irrigation scheduling, mulch retention, and heat-safe field routines."
        : season === "winter"
          ? "Keep machinery and soil structure protected from cold stress and wet conditions."
          : season === "autumn"
            ? "Use this period for soil preparation, residue management, and crop planning."
            : "Focus on active crop monitoring and early preparation for the next growth cycle.",
    ];

    const seasonRecommendations = [
      season === "summer"
        ? "Summer conditions call for strong irrigation discipline, consistent moisture checks, and shade-sensitive crop management."
        : season === "winter"
          ? "Winter planning should prioritise frost protection, drainage, and resilient crop scheduling."
          : season === "autumn"
            ? "Autumn is ideal for soil preparation, field review, and crop rotation planning."
            : "Spring is the right time for active crop monitoring, planting checks, and early fertiliser planning.",
      isRainy
        ? "Rainfall patterns suggest keeping a close eye on drainage, erosion control, and soil saturation."
        : "Dry conditions favour field movement, cultivation, and labour-intensive tasks that depend on accessible ground.",
    ];

    return {
      day,
      week,
      month: monthAdvice,
      season: seasonRecommendations,
    };
  }

  useEffect(() => {
    if (!farm?.location) {
      setWeather(null);
      setWeatherError(null);
      setLastUpdated(null);
      return;
    }

    const farmLocation = farm.location;
    let isMounted = true;

    async function loadWeather() {
      try {
        setWeatherLoading(true);
        setWeatherError(null);

        const geoParams = new URLSearchParams({
          name: farmLocation,
          count: "1",
          language: "en",
          format: "json",
        });

        const geoResponse = await fetch(
          `${WEATHER_GEOCODE_URL}?${geoParams.toString()}`,
        );

        if (!geoResponse.ok) {
          throw new Error(
            "Unable to look up the farm location.",
          );
        }

        const geoData = (await geoResponse.json()) as {
          results?: Array<{
            latitude?: number;
            longitude?: number;
            name?: string;
            country?: string;
          }>;
        };

        const location = geoData.results?.[0];

        if (!location?.latitude || !location?.longitude) {
          throw new Error(
            "No weather data is available for this farm location.",
          );
        }

        const forecastParams = new URLSearchParams({
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          current:
            "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
          daily:
            "temperature_2m_max,temperature_2m_min,sunrise,sunset,weather_code",
          timezone: "auto",
          forecast_days: "7",
        });

        const forecastResponse = await fetch(
          `${WEATHER_FORECAST_URL}?${forecastParams.toString()}`,
        );

        if (!forecastResponse.ok) {
          throw new Error(
            "Unable to load current weather data.",
          );
        }

        const forecastData = (await forecastResponse.json()) as {
          current?: {
            temperature_2m?: number;
            apparent_temperature?: number;
            relative_humidity_2m?: number;
            weather_code?: number;
            wind_speed_10m?: number;
          };
          daily?: {
            temperature_2m_max?: number[];
            temperature_2m_min?: number[];
            sunrise?: string[];
            sunset?: string[];
            time?: string[];
            weather_code?: number[];
          };
          timezone?: string;
        };

        const current = forecastData.current;
        const daily = forecastData.daily;

        if (!current) {
          throw new Error(
            "Weather information is not available right now.",
          );
        }

        const snapshot: WeatherSnapshot = {
          location:
            location.name && location.country
              ? `${location.name}, ${location.country}`
              : farmLocation,
          temperature: current.temperature_2m ?? 0,
          feelsLike: current.apparent_temperature ?? 0,
          humidity: current.relative_humidity_2m ?? 0,
          windSpeed: current.wind_speed_10m ?? 0,
          condition: getWeatherConditionLabel(
            current.weather_code ?? 0,
          ),
          conditionCode: current.weather_code ?? 0,
          high: daily?.temperature_2m_max?.[0] ?? 0,
          low: daily?.temperature_2m_min?.[0] ?? 0,
          sunrise: daily?.sunrise?.[0] ?? "--:--",
          sunset: daily?.sunset?.[0] ?? "--:--",
          forecast: (daily?.time ?? []).map((date, index) => ({
            date,
            conditionCode: daily?.weather_code?.[index] ?? 0,
            condition: getWeatherConditionLabel(
              daily?.weather_code?.[index] ?? 0,
            ),
            high: daily?.temperature_2m_max?.[index] ?? 0,
            low: daily?.temperature_2m_min?.[index] ?? 0,
          })),
        };

        if (isMounted) {
          setWeather(snapshot);
          setLastUpdated(
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          );
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }

        console.error("Failed to load weather data:", err);
        setWeather(null);
        setWeatherError(
          err instanceof Error
            ? err.message
            : "Weather is currently unavailable.",
        );
      } finally {
        if (isMounted) {
          setWeatherLoading(false);
        }
      }
    }

    void loadWeather();

    const refreshInterval = setInterval(() => {
      void loadWeather();
    }, 30 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, [farm?.location]);

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
        href: `/user/farms/${farmId}/fields`,
        icon: "▦",
        available: true,
      },
      {
        title: "Crops",
        description:
          "Track crops, planting activities, harvests, and crop performance.",
        href: `/user/farms/${farmId}/crops`,
        icon: "🌱",
        available: true,
      },
      {
        title: "Irrigation",
        description:
          "Manage irrigation systems and water usage.",
        href: `/dashboard/farms/${farmId}/irrigation`,
        icon: "💧",
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
      {
        title: "Visualize Farm",
        description:
          "View and analyze farm data and performance metrics.",
        href: `/dashboard/farms/${farmId}/visualize`,
        icon: "📊",
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
                href="/user/farms"
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

  const weatherRecommendations =
    weather !== null
      ? getWeatherRecommendations(
          weather.conditionCode,
          weather.temperature,
          new Date().getMonth() + 1,
        )
      : null;

  function getWeatherVisual(conditionCode: number): string {
    if (conditionCode === 0) {
      return "☀️";
    }

    if (conditionCode <= 3) {
      return "⛅";
    }

    if (conditionCode >= 61 && conditionCode <= 82) {
      return "🌧️";
    }

    if (conditionCode >= 95) {
      return "⛈️";
    }

    return "☁️";
  }

  function getWeatherSceneType(conditionCode: number): string {
    if (conditionCode >= 95) {
      return "storm";
    }

    if (conditionCode >= 61 && conditionCode <= 82) {
      return "rain";
    }

    if (conditionCode >= 1 && conditionCode <= 3) {
      return "cloudy";
    }

    return "clear";
  }

  function getWeatherWindClass(windSpeed: number): string {
    if (windSpeed >= 35) {
      return "weather-scene--strong-wind";
    }

    if (windSpeed >= 20) {
      return "weather-scene--windy";
    }

    return "";
  }

  const weatherVisual = weather
    ? getWeatherVisual(weather.conditionCode)
    : "☀️";

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
                  href="/user/farms"
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

        {farm.location && (
          <section className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-emerald-50 p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    Live weather
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-bold text-slate-900">
                  {weather?.location ?? farm.location}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                {weatherLoading && (
                  <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700" />
                    Refreshing...
                  </div>
                )}

                {lastUpdated && (
                  <p className="text-xs font-medium text-slate-500">
                    Updated {lastUpdated}
                  </p>
                )}
              </div>
            </div>

            {weatherError ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {weatherError}
              </div>
            ) : weather ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                  <div
                    aria-hidden="true"
                    className={`weather-scene weather-scene--${getWeatherSceneType(weather.conditionCode)} ${weather.temperature < 10 ? "weather-scene--cold" : ""} ${getWeatherWindClass(weather.windSpeed)} absolute inset-0`}
                  >
                    {(weather.conditionCode === 0 || weather.conditionCode <= 3) && (
                      <div className="weather-scene__sun" />
                    )}

                    {(weather.temperature < 10 || weather.windSpeed >= 20 || weather.conditionCode >= 1 && weather.conditionCode <= 3 || weather.conditionCode >= 45 && weather.conditionCode <= 48 || weather.conditionCode >= 51 && weather.conditionCode <= 57 || weather.conditionCode >= 61 && weather.conditionCode <= 82 || weather.conditionCode >= 95) && (
                      <>
                        <div className="weather-scene__cloud weather-scene__cloud--one" />
                        <div className="weather-scene__cloud weather-scene__cloud--two" />
                      </>
                    )}

                    {(weather.conditionCode >= 51 && weather.conditionCode <= 82 || weather.conditionCode >= 95) && (
                      <div className="weather-scene__rain">
                        {Array.from({ length: 22 }, (_, index) => (
                          <span
                            key={index}
                            style={{
                              left: `${(index * 29) % 105}%`,
                              animationDelay: `${(index % 8) * -0.16}s`,
                              opacity: 0.35 + (index % 4) * 0.12,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">
                        Current conditions
                      </p>

                      <p className="mt-2 text-4xl font-extrabold text-slate-900">
                        {Math.round(weather.temperature)}°C
                      </p>
                    </div>

                    <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-white/65 text-4xl shadow-inner backdrop-blur-sm">
                      <div className="text-4xl">
                        {weatherVisual}
                      </div>

                      {weather.conditionCode >= 61 && weather.conditionCode <= 82 && (
                        <>
                          <span className="absolute -bottom-1 left-3 h-3 w-3 animate-bounce rounded-full bg-sky-400 opacity-75" />
                          <span className="absolute -bottom-2 right-5 h-3 w-3 animate-bounce rounded-full bg-sky-500 opacity-80 [animation-delay:150ms]" />
                        </>
                      )}
                    </div>
                    </div>

                    <p className="mt-3 text-base font-medium text-slate-700">
                      {weather.condition}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="rounded-full bg-white/75 px-2.5 py-1 backdrop-blur-sm">
                        Feels like {Math.round(weather.feelsLike)}°C
                      </span>
                      <span className="rounded-full bg-white/75 px-2.5 py-1 backdrop-blur-sm">
                        Humidity {weather.humidity}%
                      </span>
                      <span className="rounded-full bg-white/75 px-2.5 py-1 backdrop-blur-sm">
                        Wind {Math.round(weather.windSpeed)} km/h
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      High / Low
                    </p>

                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {Math.round(weather.high)}° / {Math.round(weather.low)}°
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Sunrise
                    </p>

                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {new Date(weather.sunrise).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-sm sm:col-span-2 xl:col-span-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Sunset
                    </p>

                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {new Date(weather.sunset).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                </div>

                {weather.forecast.length > 0 && (
                  <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                          Seven-day forecast
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Plan field work around the week ahead.
                        </p>
                      </div>

                      <span className="hidden rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 sm:inline-flex">
                        Live outlook
                      </span>
                    </div>

                    <div className="mt-4 overflow-x-auto pb-1">
                      <div className="grid min-w-[700px] grid-cols-7 gap-2">
                        {weather.forecast.map((day, index) => (
                          <div
                            key={day.date}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center transition hover:border-sky-200 hover:bg-sky-50"
                          >
                            <p className="text-xs font-semibold text-slate-600">
                              {index === 0
                                ? "Today"
                                : new Date(`${day.date}T12:00:00`).toLocaleDateString(
                                    [],
                                    { weekday: "short" },
                                  )}
                            </p>

                            <div className="mt-3 flex h-10 items-center justify-center text-3xl">
                              <span>
                                {getWeatherVisual(day.conditionCode)}
                              </span>
                            </div>

                            <p className="mt-2 truncate text-xs text-slate-500">
                              {day.condition}
                            </p>

                            <p className="mt-3 text-sm font-bold text-slate-900">
                              {Math.round(day.high)}°
                              <span className="ml-1 font-medium text-slate-400">
                                {Math.round(day.low)}°
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {weatherRecommendations && (
              <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Day", items: weatherRecommendations.day },
                  { label: "Week", items: weatherRecommendations.week },
                  { label: "Month", items: weatherRecommendations.month },
                  { label: "Season", items: weatherRecommendations.season },
                ].map((group) => (
                  <div
                    key={group.label}
                    className="rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                      {group.label} guidance
                    </p>

                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                      {group.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

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