import { Link } from "@tanstack/react-router";
import { BarChart3, Clapperboard, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/journal", label: "Journal", icon: Clapperboard },
  { to: "/stats", label: "Statistics", icon: BarChart3 },
  { to: "/account", label: "Account", icon: UserRound },
] as const;

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/journal" className="font-display text-3xl text-foreground">
          Re<span className="text-primary italic">play</span>
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex h-10 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground bg-secondary" }}
              aria-label={label}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          <Button asChild size="sm" className="ml-2">
            <Link to="/movies/new">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add movie</span>
              <span className="sr-only sm:hidden">Add movie</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
