import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StarInput } from "./StarRating";
import { Poster } from "./Poster";
import {
  GENRES,
  validateMovieInput,
  type FieldErrors,
  type MovieFormValues,
} from "@/lib/validation";
import { ApiError, type MovieEntry, type MovieInput } from "@/services";

function toFormValues(e?: MovieEntry): MovieFormValues {
  return {
    title: e?.title ?? "",
    posterUrl: e?.posterUrl ?? "",
    releaseYear: e?.releaseYear ? String(e.releaseYear) : "",
    genre: e?.genre ?? "",
    watchedAt: e?.watchedAt ?? new Date().toISOString().slice(0, 10),
    rating: e?.rating ?? 0,
    review: e?.review ?? "",
    quotes: e?.quotes.map((q) => q.text) ?? [],
  };
}

function Err({ id, msg }: { id: string; msg?: string | undefined }) {
  return msg ? (
    <p id={id} className="text-sm text-destructive" role="alert">
      {msg}
    </p>
  ) : null;
}

export function MovieForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: MovieEntry;
  submitLabel: string;
  onSubmit: (input: MovieInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<MovieFormValues>(() => toFormValues(initial));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof MovieFormValues>(k: K, val: MovieFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  async function handle(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const r = validateMovieInput(v);
    if (!r.ok) return setErrors(r.errors);
    setErrors({});
    setSaving(true);
    try {
      await onSubmit(r.value);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors as FieldErrors);
      setFormError(err instanceof Error ? err.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const aria = (k: keyof MovieFormValues) => ({
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `${k}-err` : undefined,
  });

  return (
    <form onSubmit={handle} noValidate className="grid gap-8 md:grid-cols-[200px_1fr]">
      <div className="hidden md:block">
        <Poster url={v.posterUrl.trim() || null} title={v.title || "Untitled"} />
      </div>
      <div className="space-y-6">
        {formError && (
          <p
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {formError}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={v.title}
            onChange={(e) => set("title", e.target.value)}
            {...aria("title")}
          />
          <Err id="title-err" msg={errors.title} />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="watchedAt">Date watched *</Label>
            <Input
              id="watchedAt"
              type="date"
              value={v.watchedAt}
              onChange={(e) => set("watchedAt", e.target.value)}
              {...aria("watchedAt")}
            />
            <Err id="watchedAt-err" msg={errors.watchedAt} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rating">Rating *</Label>
            <StarInput
              id="rating"
              value={v.rating}
              onChange={(n) => set("rating", n)}
              invalid={!!errors.rating}
            />
            <Err id="rating-err" msg={errors.rating} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="genre">Genre</Label>
            <Select
              value={v.genre || "none"}
              onValueChange={(g) => set("genre", g === "none" ? "" : g)}
            >
              <SelectTrigger id="genre">
                <SelectValue placeholder="No genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No genre</SelectItem>
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="releaseYear">Release year</Label>
            <Input
              id="releaseYear"
              inputMode="numeric"
              value={v.releaseYear}
              onChange={(e) => set("releaseYear", e.target.value)}
              {...aria("releaseYear")}
            />
            <Err id="releaseYear-err" msg={errors.releaseYear} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="posterUrl">Poster image URL</Label>
          <Input
            id="posterUrl"
            type="url"
            placeholder="https://…"
            value={v.posterUrl}
            onChange={(e) => set("posterUrl", e.target.value)}
            {...aria("posterUrl")}
          />
          <Err id="posterUrl-err" msg={errors.posterUrl} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="review">Review</Label>
          <Textarea
            id="review"
            rows={5}
            value={v.review}
            onChange={(e) => set("review", e.target.value)}
            {...aria("review")}
            placeholder="What stayed with you?"
          />
          <Err id="review-err" msg={errors.review} />
        </div>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Favorite quotes</legend>
          {v.quotes.map((q, i) => (
            <div key={i} className="flex gap-2">
              <Input
                aria-label={`Quote ${i + 1}`}
                value={q}
                onChange={(e) =>
                  set(
                    "quotes",
                    v.quotes.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove quote ${i + 1}`}
                onClick={() =>
                  set(
                    "quotes",
                    v.quotes.filter((_, j) => j !== i),
                  )
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("quotes", [...v.quotes, ""])}
          >
            <Plus className="h-4 w-4" /> Add quote
          </Button>
          <Err id="quotes-err" msg={errors.quotes} />
        </fieldset>
        <div className="flex flex-wrap gap-3 border-t pt-6">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : submitLabel}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
