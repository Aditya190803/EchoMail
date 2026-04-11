import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "../constants";
import { getCookie } from "../utils";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const csrfToken = getCookie(CSRF_TOKEN_NAME);

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(
      error.error || `Request failed with status ${response.status}`,
    );
  }

  return response.json();
}
