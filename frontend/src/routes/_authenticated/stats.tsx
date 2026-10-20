import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Stars } from "@/components/replay/StarRating";
import { computeStats } from "@/lib/journal";
import { moviesQuery } from "@/services";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — Replay" },
      {
        name: "description",
        content: "Your viewing habits: totals, ratings, genres and monthly activity.",
      },
      { property: "og:title", content: "Statistics — Replay" },
      {
        property: "og:description",
        content: "Your viewing habits: totals, ratings, genres and monthly activity.",
      },
    ],
  }),
  component: StatsPage,
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-display text-5xl">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StatsPage() {
  const { data, isPending, isError, refetch } = useQuery(moviesQuery());
  const s = useMemo(() => (data ? computeStats(data) : null), [data]);

  return (
    <div>
      <p className="eyebrow">Statistics</p>
      <h1 className="mt-1 text-5xl sm:text-6xl">Your year in the dark</h1>
      {isPending ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : isError || !s ? (
        <div className="mt-10 rounded-lg border p-10 text-center">
          <p>We couldn't load your statistics.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : s.total === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-3xl">No statistics yet</h2>
          <p className="mt-2 text-muted-foreground">
            Log a few movies and your viewing summary will appear here.
          </p>
          <Button asChild className="mt-6">
            <Link to="/movies/new">Add a movie</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Stat label="Movies logged" value={String(s.total)} />
            <Stat
              label="Average rating"
              value={s.averageRating!.toFixed(1)}
              hint="out of 5 stars"
            />
            <Stat
              label="Top genre"
              value={s.topGenre?.genre ?? "—"}
              hint={
                s.topGenre
                  ? `${s.topGenre.count} film${s.topGenre.count > 1 ? "s" : ""}`
                  : "Add genres to your entries"
              }
            />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-lg border bg-card p-6">
              <h2 className="text-2xl">Movies per month</h2>
              <p className="text-sm text-muted-foreground">Last 12 months</p>
              {(() => {
                const max = Math.max(1, ...s.monthly.map((m) => m.count));
                return (
                  <ol
                    className="mt-6 flex h-48 items-end gap-1.5 sm:gap-3"
                    aria-label="Movies logged per month"
                  >
                    {s.monthly.map((m) => (
                      <li
                        key={m.key}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                        aria-label={`${m.label}: ${m.count}`}
                      >
                        <span className="text-xs text-muted-foreground">{m.count || ""}</span>
                        <div
                          className="w-full rounded-t-sm bg-primary/85 transition-all"
                          style={{
                            height: `${(m.count / max) * 100}%`,
                            minHeight: m.count ? 4 : 1,
                          }}
                        />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {m.label}
                        </span>
                      </li>
                    ))}
                  </ol>
                );
              })()}
            </section>
            <section className="rounded-lg border bg-card p-6">
              <h2 className="text-2xl">Top rated</h2>
              <ol className="mt-4 divide-y">
                {s.topRated.map((m, i) => (
                  <li key={m.id}>
                    <Link
                      to="/movies/$id"
                      params={{ id: m.id }}
                      className="flex items-center gap-4 py-3 hover:text-primary"
                    >
                      <span className="w-5 font-display text-2xl text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-sm">{m.title}</span>
                      <Stars value={m.rating} />
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
