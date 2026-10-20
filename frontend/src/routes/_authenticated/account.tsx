import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { api } from "@/services";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account — Replay" },
      { name: "description", content: "Your Replay account details." },
      { property: "og:title", content: "Account — Replay" },
      { property: "og:description", content: "Your Replay account details." },
    ],
  }),
  component: Account,
});

function Account() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    await api.auth.signOut();
    qc.clear();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="max-w-lg">
      <p className="eyebrow">Account</p>
      <h1 className="mt-1 text-5xl">Your account</h1>
      <dl className="mt-10 divide-y rounded-lg border bg-card">
        <div className="flex justify-between gap-4 p-5">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="truncate">{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4 p-5">
          <dt className="text-muted-foreground">Member since</dt>
          <dd>{format(parseISO(user.createdAt), "d MMMM yyyy")}</dd>
        </div>
      </dl>
      <Button variant="outline" className="mt-8" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
