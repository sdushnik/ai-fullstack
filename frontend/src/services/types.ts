// Contract between the UI and the backend. Implement `ReplayApi` against your
// real server and swap it in `src/services/index.ts` — no UI changes needed.

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface MovieQuote {
  id: string;
  movieEntryId: string;
  text: string;
  createdAt: string;
}

export interface MovieEntry {
  id: string;
  userId: string;
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  genre: string | null;
  /** ISO date, YYYY-MM-DD */
  watchedAt: string;
  /** Integer 1–5 */
  rating: number;
  review: string | null;
  quotes: MovieQuote[];
  createdAt: string;
  updatedAt: string;
}

/** Payload for create/update. Quotes are sent as plain strings. */
export interface MovieInput {
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  genre: string | null;
  watchedAt: string;
  rating: number;
  review: string | null;
  quotes: string[];
}

export interface Credentials {
  email: string;
  password: string;
}

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "INVALID_CREDENTIALS"
  | "UNKNOWN";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface AuthService {
  signUp(c: Credentials): Promise<User>;
  signIn(c: Credentials): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}

export interface MoviesService {
  list(): Promise<MovieEntry[]>;
  get(id: string): Promise<MovieEntry>;
  create(input: MovieInput): Promise<MovieEntry>;
  update(id: string, input: MovieInput): Promise<MovieEntry>;
  remove(id: string): Promise<void>;
}

export interface ReplayApi {
  auth: AuthService;
  movies: MoviesService;
}
