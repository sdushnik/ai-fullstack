import {
  ApiError,
  type ApiErrorCode,
  type Credentials,
  type MovieEntry,
  type MovieInput,
  type ReplayApi,
  type User,
} from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const SESSION_KEY = "replay.api.token.v1";

type ApiErrorPayload = {
  code?: ApiErrorCode;
  message?: string;
  fieldErrors?: Record<string, string>;
  detail?: ApiErrorPayload;
};

async function throwResponseError(response: Response): Promise<never> {
  let payload: ApiErrorPayload = {};
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    // A non-JSON error response still becomes an explicit API error below.
  }
  const error = payload.detail ?? payload;
  throw new ApiError(
    error.code ?? "UNKNOWN",
    error.message ?? `The API request failed (${response.status}).`,
    error.fieldErrors,
  );
}

async function fetchApi(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch (error) {
    throw new ApiError(
      "UNKNOWN",
      error instanceof Error
        ? `Unable to reach the API: ${error.message}`
        : "Unable to reach the API.",
    );
  }
}

function getToken(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(SESSION_KEY);
}

function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(SESSION_KEY, token);
  else window.localStorage.removeItem(SESSION_KEY);
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetchApi(path, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) await throwResponseError(response);

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function authenticate(
  path: "/auth/signup" | "/auth/signin",
  credentials: Credentials,
): Promise<User> {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  const response = await fetchApi(path, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  if (!response.ok) await throwResponseError(response);

  const authorization = response.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    throw new ApiError("UNKNOWN", "The API did not return an authentication token.");
  }
  setToken(token);
  return (await response.json()) as User;
}

export const api: ReplayApi = {
  auth: {
    signUp: (credentials) => authenticate("/auth/signup", credentials),
    signIn: (credentials) => authenticate("/auth/signin", credentials),
    async signOut() {
      await request<void>("/auth/signout", { method: "POST" });
      setToken(null);
    },
    getCurrentUser: () => request<User | null>("/auth/me"),
  },
  movies: {
    list: () => request<MovieEntry[]>("/movies"),
    get: (id) => request<MovieEntry>(`/movies/${encodeURIComponent(id)}`),
    create: (input: MovieInput) => request<MovieEntry>("/movies", { method: "POST", body: input }),
    update: (id, input) =>
      request<MovieEntry>(`/movies/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: input,
      }),
    remove: (id) => request<void>(`/movies/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },
};
