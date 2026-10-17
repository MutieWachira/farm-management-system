
import { getAccessToken } from "@/src/lib/auth_storage";

import type {
  FarmLayoutResponse,
  FarmLayoutSave,
} from "@/src/types/farm-layout";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

async function requestLayout<T>(
  farmId: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  if (!token) {
    throw new Error(
      "Your session has expired. Please log in again.",
    );
  }

  const response = await fetch(
    `${API_URL}/api/v1/farms/${encodeURIComponent(farmId)}/layout`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      cache: "no-store",
    },
  );

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }

    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    let message = "Unable to process the farm layout request.";

    try {
      const body: { detail?: unknown } = await response.json();

      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail
          .map((item) =>
            item &&
            typeof item === "object" &&
            "msg" in item
              ? String(item.msg)
              : "Invalid request data",
          )
          .join("; ");
      }
    } catch {
      // Retain the default message when the response is not JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function getFarmLayout(
  farmId: string,
): Promise<FarmLayoutResponse | null> {
  return requestLayout<FarmLayoutResponse | null>(farmId, {
    method: "GET",
  });
}

export async function saveFarmLayout(
  farmId: string,
  payload: FarmLayoutSave,
): Promise<FarmLayoutResponse> {
  return requestLayout<FarmLayoutResponse>(farmId, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
