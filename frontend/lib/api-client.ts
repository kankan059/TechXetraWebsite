const RAW_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_API_URL ||
  "http://localhost:4000";

export function getApiBaseUrl(): string {
  let base = RAW_BASE_URL.replace(/\/+$/, "");
  if (!base.endsWith("/api/v1")) {
    if (base.endsWith("/api")) {
      base = base + "/v1";
    } else {
      base = base + "/api/v1";
    }
  }
  return base;
}

export function normalizePath(path: string): string {
  let clean = path.replace(/^\/api\/v1/, "");
  clean = clean.replace(/^\/api/, "");
  if (!clean.startsWith("/")) {
    clean = "/" + clean;
  }
  return clean;
}

type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: {
    requestId?: string;
    [key: string]: unknown;
  };
  request_id?: string;
  error?: {
    code?: string;
    message?: string;
    details?: unknown[];
  };
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown[];
  requestId?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown[],
    requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { headers, body, ...requestOptions } = options;
  const baseUrl = getApiBaseUrl();
  const normalizedPath = normalizePath(path);
  const fullUrl = `${baseUrl}${normalizedPath}`;

  const response = await fetch(fullUrl, {
    ...requestOptions,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const contentType = response.headers.get("content-type") || "";

  let result: ApiResponse<T> | null = null;

  if (contentType.includes("application/json")) {
    result = (await response.json()) as ApiResponse<T>;
  } else if (!response.ok) {
    const message = await response.text();
    throw new ApiError(
      message || `Request failed (${response.status})`,
      response.status,
    );
  }

  const requestId = result?.meta?.requestId || result?.request_id;

  if (!response.ok) {
    throw new ApiError(
      result?.error?.message || `Request failed (${response.status})`,
      response.status,
      result?.error?.code,
      result?.error?.details,
      requestId,
    );
  }

  if (!result || result.success !== true) {
    throw new ApiError(
      result?.error?.message || "Invalid API response",
      response.status,
      result?.error?.code,
      result?.error?.details,
      requestId,
    );
  }

  return result.data;
}