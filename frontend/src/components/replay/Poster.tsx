import { useEffect, useState } from "react";
import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

export function Poster({
  url,
  title,
  className,
}: {
  url: string | null;
  title: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const showImg = url && !failed;
  return (
    <div
      className={cn(
        "relative aspect-[2/3] overflow-hidden rounded-md shadow-poster poster-placeholder",
        className,
      )}
    >
      {showImg ? (
        <img
          src={url}
          alt={`Poster for ${title}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full flex-col justify-between p-4"
          data-testid="poster-placeholder"
          role="img"
          aria-label={`No poster for ${title}`}
        >
          <Film className="h-5 w-5 text-primary/70" aria-hidden />
          <span className="font-display text-xl leading-tight text-foreground/90 line-clamp-4">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
