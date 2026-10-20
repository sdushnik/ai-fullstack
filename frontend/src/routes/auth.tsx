import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, keys } from "@/services";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Replay" },
      { name: "description", content: "Sign in or create your private Replay movie journal." },
      { property: "og:title", content: "Sign in — Replay" },
      { property: "og:description", content: "Sign in or create your private Replay movie journal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError("Email and password are required.");
    setBusy(true);
    try {
      const user = mode === "signin" ? await api.auth.signIn({ email, password }) : await api.auth.signUp({ email, password });
      qc.clear();
      qc.setQueryData(keys.me, user);
      navigate({ to: "/journal", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="eyebrow">A personal movie journal</p>
        <h1 className="mt-2 text-6xl">
          Re<span className="italic text-primary">play</span>
        </h1>
        <p className="mt-3 text-muted-foreground">Every film you've watched, and what it meant to you.</p>
        <form onSubmit={submit} noValidate className="mt-10 space-y-5">
          <h2 className="text-2xl">{mode === "signin" ? "Sign in" : "Create account"}</h2>
          {error && <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === "signup" && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
          <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}>
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </form>
        <p className="mt-10 border-t pt-4 text-xs text-muted-foreground">
          Demo account: <span className="text-foreground">demo@replay.app</span> / <span className="text-foreground">password123</span>
        </p>
      </div>
    </main>
  );
}
