import { apiRequest } from "./api";
import { getAccessToken } from "./auth_storage";

import type {
  FarmOverviewReport,
  ReportDateFilters,
} from "@/src/types/report";

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Authentication is required.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function reportPath(farmId: string): string {
  return `/api/v1/farms/${encodeURIComponent(farmId)}/reports/overview`;
}

function buildQuery(filters: ReportDateFilters): string {
  const params = new URLSearchParams();

  if (filters.start_date) {
    params.set("start_date", filters.start_date);
  }

  if (filters.end_date) {
    params.set("end_date", filters.end_date);
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

export function getFarmOverviewReport(
  farmId: string,
  filters: ReportDateFilters = {},
): Promise<FarmOverviewReport> {
  if (
    filters.start_date &&
    filters.end_date &&
    filters.start_date > filters.end_date
  ) {
    return Promise.reject(
      new Error("Start date must not be after end date."),
    );
  }

  return apiRequest<FarmOverviewReport>(
    `${reportPath(farmId)}${buildQuery(filters)}`,
    {
      headers: getAuthHeaders(),
    },
  );
}