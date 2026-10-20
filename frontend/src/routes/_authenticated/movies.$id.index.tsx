import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Poster } from "@/components/replay/Poster";
import { Stars } from "@/components/replay/StarRating";
import { NotInJournal } from "@/components/replay/NotInJournal";
import { api, keys, movieQuery } from "@/services";

export const Route = createFileRoute("/_authenticated/movies/$id/")({
  head: () => ({
    meta: [
      { title: "Movie details — Replay" },
      { name: "description", content: "Your rating, review and saved quotes for this film." },
      { property: "og:title", content: "Movie details — Replay" },
      {
        property: "og:description",
        content: "Your rating, review and saved quotes for this film.",
      },
    ],
  }),
  component: MovieDetail,
});

function MovieDetail() {
  const { id } = Route.useParams();
  const { data: m, isPending, error } = useQuery(movieQuery(id));
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  if (isPending)
    return (
      <div className="grid gap-10 md:grid-cols-[280px_1fr]">
        <Skeleton className="aspect-[2/3]" />
        <Skeleton className="h-40" />
      </div>
    );
  if (error || !m) return <NotInJournal message={error?.message} />;

  async function remove() {
    setDeleting(true);
    try {
      await api.movies.remove(id);
      qc.removeQueries({ queryKey: keys.movie(id) });
      await qc.invalidateQueries({ queryKey: keys.movies });
      toast.success("Entry deleted");
      navigate({ to: "/journal" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete entry");
      setDeleting(false);
    }
  }

  return (
    <article>
      <Link
        to="/journal"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Journal
      </Link>
      <div className="grid gap-10 md:grid-cols-[280px_1fr]">
        <Poster url={m.posterUrl} title={m.title} className="mx-auto w-full max-w-[280px]" />
        <div>
          <p className="eyebrow">
            {[m.genre, m.releaseYear].filter(Boolean).join(" · ") || "Film"}
          </p>
          <h1 className="mt-2 text-5xl leading-none sm:text-7xl">{m.title}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Stars value={m.rating} className="[&_svg]:h-5 [&_svg]:w-5" />
            <span>
              Watched{" "}
              <time dateTime={m.watchedAt} className="text-foreground">
                {format(parseISO(m.watchedAt), "d MMMM yyyy")}
              </time>
            </span>
          </div>
          <div className="mt-6 flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/movies/$id/edit" params={{ id }}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete “{m.title}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the entry, its review and saved quotes. This can't be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={remove}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete entry
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <section className="mt-12">
            <h2 className="eyebrow font-sans">Review</h2>
            {m.review ? (
              <p className="mt-3 max-w-prose whitespace-pre-line text-lg leading-relaxed">
                {m.review}
              </p>
            ) : (
              <p className="mt-3 text-muted-foreground">No review written.</p>
            )}
          </section>
          {m.quotes.length > 0 && (
            <section className="mt-12">
              <h2 className="eyebrow font-sans">Saved quotes</h2>
              <ul className="mt-4 space-y-5">
                {m.quotes.map((q) => (
                  <li key={q.id}>
                    <blockquote className="border-l-2 border-primary pl-5 font-display text-2xl italic leading-snug">
                      “{q.text}”
                    </blockquote>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
