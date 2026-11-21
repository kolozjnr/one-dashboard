export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details: Array<{ field?: string; message: string }> = [],
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; message: string }>;
  };
}

let csrfToken: string | null = null;

async function readCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const response = await fetch("/api/backend/auth/csrf", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<{ csrfToken: string }> | null;
  const token = body?.data?.csrfToken;
  if (!response.ok || !token) {
    throw new ApiClientError("Could not start a secure session.", "CSRF_INIT_FAILED", response.status);
  }
  csrfToken = token;
  return token;
}

async function sendRequest(path: string, init: RequestInit, retryCsrf = true): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("x-csrf-token", await readCsrfToken());
  }

  const response = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, {
    ...init,
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (response.status === 403 && retryCsrf) {
    const body = (await response.clone().json().catch(() => null)) as ApiEnvelope<unknown> | null;
    if (body?.error?.code === "CSRF_VALIDATION_FAILED") {
      csrfToken = null;
      await readCsrfToken();
      return sendRequest(path, init, false);
    }
  }
  return response;
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !body?.success) {
    throw new ApiClientError(
      body?.error?.message ?? "The request could not be completed.",
      body?.error?.code ?? "REQUEST_FAILED",
      response.status,
      body?.error?.details ?? [],
    );
  }
  return body.data as T;
}

type ApiRequestInit = Omit<RequestInit, "body"> & { body?: RequestInit["body"] | Record<string, unknown> | unknown[] };

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const value = init.body;
  const isNativeBody = typeof Blob !== "undefined" && value instanceof Blob || typeof FormData !== "undefined" && value instanceof FormData || typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer || typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams || typeof ReadableStream !== "undefined" && value instanceof ReadableStream || ArrayBuffer.isView(value);
  const requestInit: RequestInit = { ...init, body: value && typeof value === "object" && !isNativeBody ? JSON.stringify(value) : value as BodyInit | null | undefined };
  let response = await sendRequest(path, requestInit);
  if (response.status === 401 && path !== "auth/refresh" && path !== "auth/login") {
    try {
      await readResponse(await sendRequest("auth/refresh", { method: "POST" }));
      response = await sendRequest(path, requestInit);
    } catch {
      // Let the original request report its auth error to the page.
    }
  }
  return readResponse(response);
}

export function clearApiCsrfToken(): void {
  csrfToken = null;
}
