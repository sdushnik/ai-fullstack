import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Poster } from "@/components/replay/Poster";
import { Stars } from "@/components/replay/StarRating";
import { GENRES } from "@/lib/validation";
import {
  applyFilters,
  DEFAULT_FILTERS,
  isFiltered,
  type JournalFilters,
  type SortKey,
} from "@/lib/journal";
import { moviesQuery } from "@/services";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "My Journal — Replay" },
      { name: "description", content: "Browse, search and filter every movie you've logged." },
      { property: "og:title", content: "My Journal — Replay" },
      {
        property: "og:description",
        content: "Browse, search and filter every movie you've logged.",
      },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const { data, isPending, isError, refetch } = useQuery(moviesQuery());
  const [f, setF] = useState<JournalFilters>(DEFAULT_FILTERS);
  const results = useMemo(() => applyFilters(data ?? [], f), [data, f]);

  return (
    <div>
      <p className="eyebrow">My journal</p>
      <h1 className="mt-1 text-5xl sm:text-6xl">The reel so far</h1>

      {data && data.length > 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Search by title"
              placeholder="Search titles…"
              className="h-10 pl-9"
              value={f.search}
              onChange={(e) => setF({ ...f, search: e.target.value })}
            />
          </div>
          <Select value={f.genre} onValueChange={(genre) => setF({ ...f, genre })}>
            <SelectTrigger aria-label="Filter by genre" className="h-10 lg:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genres</SelectItem>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={f.rating} onValueChange={(rating) => setF({ ...f, rating })}>
            <SelectTrigger aria-label="Filter by rating" className="h-10 lg:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any rating</SelectItem>
              {[5, 4, 3, 2, 1].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} star{n > 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={f.sort} onValueChange={(sort) => setF({ ...f, sort: sort as SortKey })}>
            <SelectTrigger aria-label="Sort" className="h-10 lg:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="watched-desc">Recently watched</SelectItem>
              <SelectItem value="watched-asc">Oldest watched</SelectItem>
              <SelectItem value="rating-desc">Highest rated</SelectItem>
              <SelectItem value="rating-asc">Lowest rated</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            className="h-10"
            disabled={!isFiltered(f) && f.sort === DEFAULT_FILTERS.sort}
            onClick={() => setF(DEFAULT_FILTERS)}
          >
            Clear
          </Button>
        </div>
      )}

      <section className="mt-10" aria-live="polite">
        {isPending ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="aspect-[2/3]" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-lg border p-10 text-center">
            <p>We couldn't load your journal.</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <h2 className="text-3xl">Your journal is empty</h2>
            <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
              Log the last film you watched — a title, the date, and a star rating is all it takes.
            </p>
            <Button asChild className="mt-6">
              <Link to="/movies/new">Add your first movie</Link>
            </Button>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p>No movies match these filters.</p>
            <Button variant="outline" className="mt-4" onClick={() => setF(DEFAULT_FILTERS)}>
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} of {data.length} films
            </p>
            <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {results.map((m) => (
                <li key={m.id}>
                  <Link to="/movies/$id" params={{ id: m.id }} className="group block rounded-md">
                    <Poster
                      url={m.posterUrl}
                      title={m.title}
                      className="transition-transform duration-300 group-hover:-translate-y-1"
                    />
                    <h3 className="mt-3 font-sans text-sm font-medium leading-snug group-hover:text-primary">
                      {m.title}
                    </h3>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <Stars value={m.rating} />
                      <time dateTime={m.watchedAt} className="text-xs text-muted-foreground">
                        {format(parseISO(m.watchedAt), "d MMM yyyy")}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
