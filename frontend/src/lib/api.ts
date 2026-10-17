const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

interface ApiError {
  detail?: unknown;
}

function getErrorMessage(detail: unknown): string | null {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail.flatMap((issue: unknown) => {
      if (!issue || typeof issue !== "object") {
        return [];
      }

      const validationIssue = issue as {
        loc?: unknown;
        msg?: unknown;
      };

      if (typeof validationIssue.msg !== "string") {
        return [];
      }

      const location = Array.isArray(validationIssue.loc)
        ? validationIssue.loc
            .filter(
              (part): part is string =>
                typeof part === "string" && part !== "body",
            )
            .join(".")
        : "";

      return [
        location
          ? `${location}: ${validationIssue.msg}`
          : validationIssue.msg,
      ];
    });

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  return null;
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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}