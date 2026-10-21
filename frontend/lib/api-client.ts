const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://techxetra-backend.ppriyankuu.workers.dev";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  request_id?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
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

  if (!response.ok) {
    throw new ApiError(
      result?.error?.message || `Request failed (${response.status})`,
      response.status,
      result?.error?.code,
    );
  }

  if (!result || result.success !== true) {
    throw new ApiError(
      result?.error?.message || "Invalid API response",
      response.status,
      result?.error?.code,
    );
  }

  return result.data;
}