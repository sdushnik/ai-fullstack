import { queryOptions } from "@tanstack/react-query";
import { api } from "./api";

export const keys = {
  me: ["me"] as const,
  movies: ["movies"] as const,
  movie: (id: string) => ["movies", id] as const,
};

export const meQuery = () => queryOptions({ queryKey: keys.me, queryFn: () => api.auth.getCurrentUser() });
export const moviesQuery = () => queryOptions({ queryKey: keys.movies, queryFn: () => api.movies.list() });
export const movieQuery = (id: string) =>
  queryOptions({ queryKey: keys.movie(id), queryFn: () => api.movies.get(id), retry: false });
