import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema.d";

export interface ApiErrorData {
  name: string;
  code: string;
  message: string;
  status: number;
  field?: string;
  request_id?: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly field?: string;
  readonly request_id?: string;

  constructor(data: ApiErrorData) {
    super(data.message);
    this.name = data.name;
    this.code = data.code;
    this.status = data.status;
    this.field = data.field;
    this.request_id = data.request_id;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function getErrorCode(err: unknown): string | undefined {
  return isApiError(err) ? err.code : undefined;
}

const IDEMPOTENT_PATH_PATTERNS = [
  /\/book\b/,
  /\/cancel\b/,
  /\/adjustments\b/,
  /\/approve\b/,
];

function needsIdempotencyKey(url: string): boolean {
  return IDEMPOTENT_PATH_PATTERNS.some((re) => re.test(url));
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.split("=")[1] : undefined;
}

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let csrfFetchPromise: Promise<void> | null = null;

async function ensureCsrfCookie(): Promise<void> {
  if (getCookie("csrftoken")) return;
  if (!csrfFetchPromise) {
    csrfFetchPromise = fetch("/api/v1/auth/csrf/", {
      credentials: "include",
    }).then(
      () => { csrfFetchPromise = null; },
      () => { csrfFetchPromise = null; },
    );
  }
  await csrfFetchPromise;
}

const csrfMiddleware: Middleware = {
  async onRequest({ request }) {
    if (!UNSAFE_METHODS.has(request.method)) return request;
    await ensureCsrfCookie();
    const token = getCookie("csrftoken");
    if (token) {
      const headers = new Headers(request.headers);
      headers.set("X-CSRFToken", token);
      return new Request(request, { headers });
    }
    return request;
  },
};

const idempotencyMiddleware: Middleware = {
  onRequest({ request }) {
    if (request.method !== "POST") return request;
    const url = new URL(request.url);
    if (!needsIdempotencyKey(url.pathname)) return request;
    const headers = new Headers(request.headers);
    if (!headers.has("Idempotency-Key")) {
      headers.set("Idempotency-Key", crypto.randomUUID());
    }
    return new Request(request, { headers });
  },
};

const trailingSlashMiddleware: Middleware = {
  onRequest({ request }) {
    const url = new URL(request.url);
    if (!url.pathname.endsWith("/") && !url.pathname.includes(".")) {
      url.pathname += "/";
      return new Request(url.toString(), request);
    }
    return request;
  },
};

const errorNormalizationMiddleware: Middleware = {
  async onResponse({ response }) {
    let text: string;
    try {
      text = await response.text();
    } catch {
      return response;
    }

    let envelope: { result: unknown; error: ApiErrorData | null } | null = null;
    try {
      envelope = JSON.parse(text);
    } catch {
    }

    if (!response.ok) {
      if (envelope?.error) {
        throw new ApiError({
          ...envelope.error,
          status: envelope.error.status ?? response.status,
        });
      }
      throw new ApiError({
        name: "HttpError",
        code: "HTTP_ERROR",
        message: response.statusText || `HTTP ${response.status}`,
        status: response.status,
      });
    }

    const body = (envelope && "result" in envelope)
      ? JSON.stringify(envelope.result)
      : text;

    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  },
};

export const apiClient = createClient<paths>({
  baseUrl: "/api",
  credentials: "include",
});

apiClient.use(trailingSlashMiddleware);
apiClient.use(csrfMiddleware);
apiClient.use(idempotencyMiddleware);
apiClient.use(errorNormalizationMiddleware);

export { apiClient as client };
export type { paths };
