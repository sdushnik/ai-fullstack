import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/journal" });
  },
  head: () => ({
    meta: [
      { title: "Replay — Your personal movie journal" },
      { name: "description", content: "Log films, rate them, keep your favourite quotes." },
      { property: "og:title", content: "Replay — Your personal movie journal" },
      { property: "og:description", content: "Log films, rate them, keep your favourite quotes." },
    ],
  }),
});
