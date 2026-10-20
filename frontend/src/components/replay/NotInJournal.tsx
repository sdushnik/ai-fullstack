import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function NotInJournal({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <h1 className="text-3xl">Movie not found</h1>
      <p className="mt-2 text-muted-foreground">{message ?? "This movie isn't in your journal."}</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/journal">Back to journal</Link>
      </Button>
    </div>
  );
}
