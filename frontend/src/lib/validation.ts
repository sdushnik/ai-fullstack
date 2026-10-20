import { isValid, parseISO } from "date-fns";
import type { MovieInput } from "@/services/types";

export const GENRES = [
  "Action",
  "Animation",
  "Comedy",
  "Documentary",
  "Drama",
  "Fantasy",
  "Horror",
  "Musical",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "Western",
] as const;

export interface MovieFormValues {
  title: string;
  posterUrl: string;
  releaseYear: string;
  genre: string;
  watchedAt: string;
  rating: number;
  review: string;
  quotes: string[];
}

export type FieldErrors = Partial<Record<keyof MovieFormValues, string>>;

export type ValidationResult =
  | { ok: true; value: MovieInput }
  | { ok: false; errors: FieldErrors };

export function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseISO(s);
  return isValid(d) && d.toISOString().slice(0, 10) === s;
}

export function validateMovieInput(v: MovieFormValues, now = new Date()): ValidationResult {
  const errors: FieldErrors = {};
  const title = v.title.trim();
  if (!title) errors.title = "Title is required.";
  else if (title.length > 200) errors.title = "Title must be 200 characters or fewer.";

  const posterUrl = v.posterUrl.trim();
  if (posterUrl && !/^https?:\/\/\S+$/i.test(posterUrl))
    errors.posterUrl = "Poster must be a valid http(s) URL.";

  let releaseYear: number | null = null;
  if (v.releaseYear.trim()) {
    const y = Number(v.releaseYear);
    if (!Number.isInteger(y) || y < 1888 || y > now.getFullYear() + 5)
      errors.releaseYear = `Enter a year between 1888 and ${now.getFullYear() + 5}.`;
    else releaseYear = y;
  }

  if (!v.watchedAt) errors.watchedAt = "Date watched is required.";
  else if (!isValidIsoDate(v.watchedAt)) errors.watchedAt = "Enter a valid date.";

  if (!Number.isInteger(v.rating) || v.rating < 1 || v.rating > 5)
    errors.rating = "Choose a rating from 1 to 5 stars.";

  if (v.review.length > 5000) errors.review = "Review must be 5000 characters or fewer.";

  const quotes = v.quotes.map((q) => q.trim()).filter(Boolean);
  if (quotes.some((q) => q.length > 500)) errors.quotes = "Each quote must be 500 characters or fewer.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      posterUrl: posterUrl || null,
      releaseYear,
      genre: v.genre || null,
      watchedAt: v.watchedAt,
      rating: v.rating,
      review: v.review.trim() || null,
      quotes,
    },
  };
}
