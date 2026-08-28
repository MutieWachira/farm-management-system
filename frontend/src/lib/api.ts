const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

interface ApiError {
  detail?: string;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    },
  );

  if (!response.ok) {
    let errorMessage = "An unexpected error occurred.";

    try {
      const error =
        (await response.json()) as ApiError;

      if (error.detail) {
        errorMessage = error.detail;
      }
    } catch {
      // Ignore malformed error responses.
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}