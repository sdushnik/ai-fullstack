import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";

const tokenKey = "replay.api.token.v1";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("real Replay API client", () => {
  it("stores the sign-in bearer token and sends it with subsequent requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "user-1",
            email: "reader@example.com",
            createdAt: "2026-01-01T00:00:00Z",
          }),
          {
            status: 200,
            headers: {
              Authorization: "Bearer session-token",
              "Content-Type": "application/json",
            },
          },
        ),
      )
      .mockResolvedValueOnce(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await api.auth.signIn({ email: "reader@example.com", password: "password123" });
    expect(localStorage.getItem(tokenKey)).toBe("session-token");

    await api.movies.list();
    const [, request] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(new Headers(request.headers).get("Authorization")).toBe("Bearer session-token");
    expect(request.credentials).toBe("include");
  });

  it("maps API validation errors to ApiError with field errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "VALIDATION",
            message: "Invalid movie entry.",
            fieldErrors: { rating: "Rating must be between 1 and 5." },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(api.movies.list()).rejects.toMatchObject({
      name: "ApiError",
      code: "VALIDATION",
      fieldErrors: { rating: "Rating must be between 1 and 5." },
    });
  });

  it("clears the stored token after signing out", async () => {
    localStorage.setItem(tokenKey, "session-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await api.auth.signOut();

    expect(localStorage.getItem(tokenKey)).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/signout",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
