import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={cn("h-3.5 w-3.5", n <= value ? "fill-star text-star" : "text-star-empty")} />
      ))}
    </span>
  );
}

export function StarInput({
  value,
  onChange,
  invalid,
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  invalid?: boolean;
  id?: string;
}) {
  return (
    <div role="radiogroup" id={id} aria-label="Rating" aria-invalid={invalid} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className="rounded p-1.5 transition-transform hover:scale-110"
        >
          <Star className={cn("h-7 w-7", n <= value ? "fill-star text-star" : "text-star-empty")} aria-hidden />
        </button>
      ))}
    </div>
  );
}
