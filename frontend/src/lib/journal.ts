import { format, parseISO, subMonths } from "date-fns";
import type { MovieEntry } from "@/services/types";

export type SortKey = "watched-desc" | "watched-asc" | "rating-desc" | "rating-asc";

export interface JournalFilters {
  search: string;
  genre: string; // "all" or a genre
  rating: string; // "all" or "1".."5"
  sort: SortKey;
}

export const DEFAULT_FILTERS: JournalFilters = {
  search: "",
  genre: "all",
  rating: "all",
  sort: "watched-desc",
};

export function isFiltered(f: JournalFilters) {
  return f.search.trim() !== "" || f.genre !== "all" || f.rating !== "all";
}

/** Pure: never mutates the input array. */
export function applyFilters(entries: MovieEntry[], f: JournalFilters): MovieEntry[] {
  const q = f.search.trim().toLowerCase();
  const out = entries.filter(
    (e) =>
      (!q || e.title.toLowerCase().includes(q)) &&
      (f.genre === "all" || e.genre === f.genre) &&
      (f.rating === "all" || e.rating === Number(f.rating)),
  );
  const byWatched = (a: MovieEntry, b: MovieEntry) => a.watchedAt.localeCompare(b.watchedAt);
  out.sort((a, b) => {
    switch (f.sort) {
      case "watched-asc":
        return byWatched(a, b);
      case "rating-desc":
        return b.rating - a.rating || byWatched(b, a);
      case "rating-asc":
        return a.rating - b.rating || byWatched(b, a);
      default:
        return byWatched(b, a);
    }
  });
  return out;
}

export interface JournalStats {
  total: number;
  averageRating: number | null;
  topGenre: { genre: string; count: number } | null;
  monthly: { key: string; label: string; count: number }[];
  topRated: MovieEntry[];
}

export function computeStats(entries: MovieEntry[], now = new Date(), months = 12): JournalStats {
  const total = entries.length;
  const averageRating = total
    ? Math.round((entries.reduce((s, e) => s + e.rating, 0) / total) * 10) / 10
    : null;

  const genreCounts = new Map<string, number>();
  for (const e of entries) if (e.genre) genreCounts.set(e.genre, (genreCounts.get(e.genre) ?? 0) + 1);
  let topGenre: JournalStats["topGenre"] = null;
  for (const [genre, count] of genreCounts)
    if (!topGenre || count > topGenre.count) topGenre = { genre, count };

  const monthly = Array.from({ length: months }, (_, i) => {
    const d = subMonths(now, months - 1 - i);
    return { key: format(d, "yyyy-MM"), label: format(d, "MMM"), count: 0 };
  });
  const idx = new Map(monthly.map((m, i) => [m.key, i]));
  for (const e of entries) {
    const i = idx.get(format(parseISO(e.watchedAt), "yyyy-MM"));
    const slot = i === undefined ? undefined : monthly[i];
    if (slot) slot.count++;
  }

  const topRated = [...entries]
    .sort((a, b) => b.rating - a.rating || b.watchedAt.localeCompare(a.watchedAt))
    .slice(0, 5);

  return { total, averageRating, topGenre, monthly, topRated };
}
