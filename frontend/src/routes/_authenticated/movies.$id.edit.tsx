import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieForm } from "@/components/replay/MovieForm";
import { NotInJournal } from "@/components/replay/NotInJournal";
import { api, keys, movieQuery } from "@/services";

export const Route = createFileRoute("/_authenticated/movies/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit movie — Replay" },
      { name: "description", content: "Update your rating, review and quotes." },
      { property: "og:title", content: "Edit movie — Replay" },
      { property: "og:description", content: "Update your rating, review and quotes." },
    ],
  }),
  component: EditMovie,
});

function EditMovie() {
  const { id } = Route.useParams();
  const { data, isPending, error } = useQuery(movieQuery(id));
  const qc = useQueryClient();
  const navigate = useNavigate();
  const back = () => navigate({ to: "/movies/$id", params: { id } });

  if (isPending) return <Skeleton className="h-96" />;
  if (error || !data) return <NotInJournal message={error?.message} />;
  return (
    <div>
      <p className="eyebrow">Editing</p>
      <h1 className="mb-10 mt-1 text-5xl">{data.title}</h1>
      <MovieForm
        initial={data}
        submitLabel="Save changes"
        onCancel={back}
        onSubmit={async (input) => {
          const m = await api.movies.update(id, input);
          qc.setQueryData(keys.movie(id), m);
          await qc.invalidateQueries({ queryKey: keys.movies });
          toast.success("Changes saved");
          back();
        }}
      />
    </div>
  );
}
