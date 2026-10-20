# Replay brainstorming

[Open the original brainstorming conversation](https://chatgpt.com/share/6ad723ce-7a50-83ed-9022-de119cddd6fb).

## Initial concept

Replay is a personal movie journal: a place to preserve what someone has
watched and their reactions to each film, rather than just maintaining a
watchlist of movies they might watch in the future. The journal should make it
easy to revisit memories, personal ratings, reviews, and favorite quotes.

## Feature planning

The initial MVP planning centers on a private journal for each user:

- Account registration and sign-in, with each user's entries kept private.
- Create, view, edit, and delete movie entries with a title, watched date,
  rating, and optional poster, release year, genre, review, and quotes.
- Browse entries in a responsive poster-card collection and open individual
  movie detail pages.
- Search by title; filter by genre and rating; sort by watched date or rating.
- Show journal statistics such as the number of movies logged, average rating,
  most logged genre, monthly activity, and top-rated movies.
- Provide useful validation, empty states, and a consistent poster placeholder
  when artwork is unavailable.

The MVP is focused on personal record-keeping and reflection. Streaming,
social features, recommendations, external movie metadata lookups, and native
mobile apps are outside its initial scope. See the
[product specification](./spec.md) for the full requirements.
