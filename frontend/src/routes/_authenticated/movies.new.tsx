import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MovieForm } from "@/components/replay/MovieForm";
import { api, keys } from "@/services";

export const Route = createFileRoute("/_authenticated/movies/new")({
  head: () => ({
    meta: [
      { title: "Add a movie — Replay" },
      { name: "description", content: "Log a movie you've watched in your Replay journal." },
      { property: "og:title", content: "Add a movie — Replay" },
      { property: "og:description", content: "Log a movie you've watched in your Replay journal." },
    ],
  }),
  component: NewMovie,
});

function NewMovie() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  return (
    <div>
      <p className="eyebrow">New entry</p>
      <h1 className="mb-10 mt-1 text-5xl">Add a movie</h1>
      <MovieForm
        submitLabel="Save to journal"
        onCancel={() => router.history.back()}
        onSubmit={async (input) => {
          const m = await api.movies.create(input);
          await qc.invalidateQueries({ queryKey: keys.movies });
          toast.success(`“${m.title}” added to your journal`);
          navigate({ to: "/movies/$id", params: { id: m.id } });
        }}
      />
    </div>
  );
}
