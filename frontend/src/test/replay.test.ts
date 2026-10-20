import { beforeEach, describe, expect, it } from "vitest";
import { createMockApi } from "@/services/mock";
import { validateMovieInput, type MovieFormValues } from "@/lib/validation";
import { applyFilters, computeStats, DEFAULT_FILTERS } from "@/lib/journal";
import type { MovieEntry, MovieInput } from "@/services/types";

const form = (o: Partial<MovieFormValues> = {}): MovieFormValues => ({
  title: "Heat",
  posterUrl: "",
  releaseYear: "",
  genre: "",
  watchedAt: "2026-01-10",
  rating: 4,
  review: "",
  quotes: [],
  ...o,
});
const entry = (o: Partial<MovieEntry>): MovieEntry => ({
  id: Math.random().toString(),
  userId: "u",
  title: "X",
  posterUrl: null,
  releaseYear: null,
  genre: null,
  watchedAt: "2026-01-01",
  rating: 3,
  review: null,
  quotes: [],
  createdAt: "",
  updatedAt: "",
  ...o,
});
const input = (o: Partial<MovieInput> = {}): MovieInput => ({
  title: "Heat",
  posterUrl: null,
  releaseYear: null,
  genre: null,
  watchedAt: "2026-01-10",
  rating: 4,
  review: null,
  quotes: [],
  ...o,
});

describe("validation", () => {
  it("requires a title", () => expect(validateMovieInput(form({ title: "  " })).ok).toBe(false));
  it("requires a watched date", () =>
    expect(validateMovieInput(form({ watchedAt: "" })).ok).toBe(false));
  it("rejects an impossible date", () =>
    expect(validateMovieInput(form({ watchedAt: "2026-02-30" })).ok).toBe(false));
  it("rejects rating 0 and 6", () => {
    expect(validateMovieInput(form({ rating: 0 })).ok).toBe(false);
    expect(validateMovieInput(form({ rating: 6 })).ok).toBe(false);
  });
  it("accepts ratings 1 and 5", () => {
    expect(validateMovieInput(form({ rating: 1 })).ok).toBe(true);
    expect(validateMovieInput(form({ rating: 5 })).ok).toBe(true);
  });
  it("drops empty quotes and nulls empty optionals", () => {
    const r = validateMovieInput(form({ quotes: ["a", " "] }));
    expect(r.ok && r.value).toMatchObject({
      quotes: ["a"],
      posterUrl: null,
      genre: null,
      review: null,
      releaseYear: null,
    });
  });
});

describe("filters and sorting", () => {
  const list = [
    entry({ id: "a", title: "Arrival", genre: "Sci-Fi", rating: 5, watchedAt: "2026-03-01" }),
    entry({ id: "b", title: "Alien", genre: "Horror", rating: 4, watchedAt: "2026-05-01" }),
    entry({ id: "c", title: "Heat", genre: "Thriller", rating: 4, watchedAt: "2026-04-01" }),
  ];
  it("combines search, genre and rating", () => {
    expect(
      applyFilters(list, { ...DEFAULT_FILTERS, search: "al", genre: "Horror" }).map((e) => e.id),
    ).toEqual(["b"]);
    expect(
      applyFilters(list, { ...DEFAULT_FILTERS, search: "a", rating: "5" }).map((e) => e.id),
    ).toEqual(["a"]);
  });
  it("sorts by watched date and rating", () => {
    expect(applyFilters(list, DEFAULT_FILTERS).map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(
      applyFilters(list, { ...DEFAULT_FILTERS, sort: "rating-desc" }).map((e) => e.id),
    ).toEqual(["a", "b", "c"]);
  });
  it("does not mutate the source list", () => {
    applyFilters(list, { ...DEFAULT_FILTERS, sort: "rating-asc" });
    expect(list.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
});

describe("statistics", () => {
  const now = new Date("2026-10-15");
  it("handles an empty journal", () => {
    const s = computeStats([], now);
    expect(s.total).toBe(0);
    expect(s.averageRating).toBeNull();
    expect(s.topGenre).toBeNull();
  });
  it("computes totals, average, top genre and monthly counts", () => {
    const s = computeStats(
      [
        entry({ rating: 5, genre: "Drama", watchedAt: "2026-10-01" }),
        entry({ rating: 4, genre: "Drama", watchedAt: "2026-10-03" }),
        entry({ rating: 2, genre: "Horror", watchedAt: "2026-09-03" }),
      ],
      now,
    );
    expect(s.total).toBe(3);
    expect(s.averageRating).toBe(3.7);
    expect(s.topGenre).toEqual({ genre: "Drama", count: 2 });
    expect(s.monthly.at(-1)).toMatchObject({ key: "2026-10", count: 2 });
    expect(s.monthly.at(-2)).toMatchObject({ key: "2026-09", count: 1 });
  });
  it("orders top rated by rating, then most recently watched", () => {
    const s = computeStats(
      [
        entry({ id: "old5", rating: 5, watchedAt: "2026-01-01" }),
        entry({ id: "new5", rating: 5, watchedAt: "2026-06-01" }),
        entry({ id: "four", rating: 4, watchedAt: "2026-09-01" }),
      ],
      now,
    );
    expect(s.topRated.map((e) => e.id)).toEqual(["new5", "old5", "four"]);
  });
});

describe("mock backend", () => {
  let api: ReturnType<typeof createMockApi>;
  beforeEach(() => {
    localStorage.clear();
    api = createMockApi({ storage: localStorage, latencyMs: 0, seed: false });
  });

  it("registers, signs out and signs back in", async () => {
    await api.auth.signUp({ email: "a@x.com", password: "password1" });
    expect((await api.auth.getCurrentUser())?.email).toBe("a@x.com");
    await api.auth.signOut();
    expect(await api.auth.getCurrentUser()).toBeNull();
    await expect(
      api.auth.signIn({ email: "a@x.com", password: "wrong-pass" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await api.auth.signIn({ email: "a@x.com", password: "password1" });
    expect(await api.auth.getCurrentUser()).not.toBeNull();
  });

  it("never stores the plain password", async () => {
    await api.auth.signUp({ email: "a@x.com", password: "supersecret" });
    expect(JSON.stringify({ ...localStorage })).not.toContain("supersecret");
  });

  it("rejects calls without a session", async () => {
    await expect(api.movies.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an out-of-range rating on the server", async () => {
    await api.auth.signUp({ email: "a@x.com", password: "password1" });
    await expect(api.movies.create(input({ rating: 6 }))).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("isolates entries between users", async () => {
    await api.auth.signUp({ email: "a@x.com", password: "password1" });
    const mine = await api.movies.create(input());
    await api.auth.signOut();
    await api.auth.signUp({ email: "b@x.com", password: "password1" });
    expect(await api.movies.list()).toEqual([]);
    await expect(api.movies.get(mine.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(api.movies.update(mine.id, input({ title: "hacked" }))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(api.movies.remove(mine.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updates entries and deletes their quotes with them", async () => {
    await api.auth.signUp({ email: "a@x.com", password: "password1" });
    const m = await api.movies.create(input({ quotes: ["one", "two"] }));
    expect(m.quotes).toHaveLength(2);
    const u = await api.movies.update(m.id, input({ title: "Heat (1995)", quotes: ["three"] }));
    expect(u.title).toBe("Heat (1995)");
    expect(u.quotes.map((q) => q.text)).toEqual(["three"]);
    await api.movies.remove(m.id);
    expect(await api.movies.list()).toEqual([]);
    expect(localStorage.getItem("replay.mock.db.v1")).not.toContain("three");
  });
});
