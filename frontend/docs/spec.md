# Replay — Product Specification (MVP)

**Document status:** Draft MVP specification  
**Project type:** Full-stack web application  
**Product category:** Personal movie journal  
**Primary goal:** Build a polished, achievable first full-stack app that users can use to record and reflect on the movies they watch.

---

## 1. Product Overview

Replay is a personal movie journal where users can record movies they have watched, assign ratings, write reviews, save memorable quotes, and explore their movie-watching history through simple statistics.

Unlike a traditional watchlist that mainly helps people decide what to watch next, Replay focuses on preserving personal reactions and creating a lasting record of a user's cinematic journey.

## 2. Problem Statement

People may forget which movies they watched, when they watched them, what they thought about them, or why a film was memorable. General watchlists often prioritize tracking titles over personal reflection.

Replay provides one place to keep movie details and personal responses, then presents that information in a visually engaging journal and statistics dashboard.

## 3. Target Users

Movie lovers who want to:
- Keep a record of movies they have watched.
- Rate movies and write personal reviews.
- Save memorable quotes from films.
- Find past entries quickly.
- See simple summaries of their viewing habits.

## 4. Product Goals

### Goals
- Deliver a complete, usable MVP with a clear visual identity.
- Demonstrate core full-stack development skills.
- Make it easy to add, view, edit, search, and organize movie entries.
- Provide useful statistics based on the user's own data.
- Work well on desktop and mobile browsers.

### Non-goals for the MVP
- Streaming or playing movies.
- Social feeds, comments, likes, or following other users.
- AI-generated reviews or recommendations.
- Ticket booking or streaming-service availability.
- Automatic movie metadata lookup through an external API.
- Native iOS or Android apps.

## 5. MVP Features

### 5.1 Authentication
Users can:
- Create an account with email and password.
- Log in and log out.
- Access only their own private journal entries.

Requirements:
- Passwords must never be stored as plain text.
- Protected pages and server operations must verify the authenticated user.
- A user must not be able to read, edit, or delete another user's private movie entries by changing a URL or request.

### 5.2 Movie Journal Entries
A signed-in user can create, view, edit, and delete a movie entry.

Each entry contains:
- **Title** — required text.
- **Poster image URL** — optional.
- **Release year** — optional.
- **Genre** — optional; a single genre is sufficient for the MVP.
- **Date watched** — required.
- **Personal rating** — required, from 1 to 5 stars.
- **Review** — optional text.
- **Favorite quotes** — optional; users may save multiple short quotes.

Requirements:
- Show clear validation messages for missing or invalid required fields.
- A rating must be between 1 and 5.
- The watched date cannot be an invalid date.
- Users must be able to cancel editing without unintentionally saving changes.
- Ask for confirmation before permanently deleting an entry.
- If a poster URL is missing or fails to load, display a consistent placeholder.

### 5.3 Movie Collection
Users can browse all entries in their own journal.

Requirements:
- Display movies in a responsive poster-card grid.
- Each card should show the poster or placeholder, title, personal rating, and watched date.
- Selecting a card opens the movie's detail page.
- Provide an empty state that explains how to add the first movie.
- Keep the collection usable on narrow mobile screens.

### 5.4 Search and Filtering
Users can:
- Search entries by movie title.
- Filter entries by genre.
- Filter entries by personal rating.
- Sort entries by watched date or rating.

Requirements:
- Search and filters must work together.
- Users can clear filters and return to the full collection.
- Show a helpful message when no entries match the current search or filters.

### 5.5 Movie Detail Page
Each movie has a page showing:
- Title, poster, and optional release year.
- Genre, watched date, and rating.
- Personal review, if provided.
- Saved quotes, if provided.
- Actions to edit or delete the entry.

### 5.6 Cinematic Statistics Dashboard
Replay provides a dashboard calculated from the signed-in user's journal entries.

MVP statistics:
- Total movies logged.
- Average personal rating.
- Most frequently logged genre.
- Number of movies logged each month.
- Top-rated movies.

Requirements:
- Statistics must be calculated from the user's saved entries rather than hard-coded values.
- Empty or insufficient data must be handled gracefully.
- When there are no entries, show an empty state rather than misleading statistics.
- Updating or deleting a movie must update the relevant statistics.

### 5.7 Responsive Design
The application must support modern desktop and mobile browsers.

Requirements:
- Collection cards, forms, navigation, and charts adapt to smaller screens.
- All controls have clear labels and usable touch targets.
- Text and interface elements remain readable at different viewport sizes.

## 6. Main Pages

1. **Login / Sign-up** — account access and registration.
2. **My Journal** — movie collection, search, filters, and sorting.
3. **Add / Edit Movie** — form for creating or updating an entry.
4. **Movie Details** — complete information and personal notes for one movie.
5. **Statistics** — personal viewing summary and charts.
6. **Account / Logout** — basic account information and sign-out action.

For the MVP, a separate landing page is optional. After logging in, users can go directly to My Journal.

## 7. Key User Flows

### Flow A: Add a movie
1. User logs in.
2. User opens **Add Movie**.
3. User enters the title, watched date, rating, and any optional information.
4. User submits the form.
5. The app validates and saves the entry.
6. The new movie appears in My Journal and contributes to the statistics.

### Flow B: Find a movie
1. User opens My Journal.
2. User enters part of a movie title or applies filters.
3. The collection updates to show matching entries.
4. User selects a movie to view its details.

### Flow C: Edit or delete a movie
1. User opens a movie's detail page.
2. User chooses Edit or Delete.
3. For editing, the user changes fields and saves; for deletion, the user confirms the action.
4. The journal and statistics reflect the change.

### Flow D: Review personal statistics
1. User opens Statistics.
2. The app retrieves the user's movie entries.
3. The dashboard displays totals, average rating, genre summary, monthly activity, and top-rated movies.
4. The user adds or edits entries and sees the updated statistics.

## 8. Suggested Data Model

The exact schema depends on the chosen database, but the MVP needs the following entities.

### User
- `id`
- `email`
- `password_hash` (if implementing password authentication directly)
- `created_at`

### MovieEntry
- `id`
- `user_id` — owner of the entry
- `title`
- `poster_url` — nullable
- `release_year` — nullable
- `genre` — nullable
- `watched_at`
- `rating` — integer from 1 to 5
- `review` — nullable
- `created_at`
- `updated_at`

### MovieQuote
- `id`
- `movie_entry_id`
- `text`
- `created_at`

A quote belongs to one movie entry. Deleting a movie entry should also delete its associated quotes. The database must enforce the relationship between each entry and its owner.

## 9. Business Rules

- Every movie entry belongs to exactly one user.
- A user can access only their own entries.
- Title, watched date, and rating are required.
- Ratings use a 1–5 star scale.
- A movie can have zero or more saved quotes.
- Genre, poster URL, release year, and review are optional.
- Statistics use only the signed-in user's entries.
- The average rating is calculated from all of that user's movie-entry ratings.
- “Top-rated movies” are ordered by rating from highest to lowest. For ties, the most recently watched entry appears first.
- Search, filtering, and sorting do not modify saved data.

## 10. Design Direction

### Visual style
- Cinematic and editorial.
- Dark background with restrained accent colors.
- Clear, expressive typography.
- Movie-poster grid as the main visual element.
- Subtle transitions and hover states.
- Consistent spacing, card styles, and form components.

### UX principles
- Make adding a movie quick and straightforward.
- Keep the journal the central destination.
- Make ratings and watched dates easy to scan.
- Provide clear loading, empty, success, and error states.
- Avoid unnecessary animations that make the app feel slow or distracting.
- Ensure sufficient contrast and keyboard accessibility.

## 11. Non-functional Requirements

- **Security:** Enforce authentication and record ownership on the server.
- **Privacy:** Movie journals are private by default.
- **Validation:** Validate input on both client and server.
- **Reliability:** Show helpful errors if saving or loading fails.
- **Performance:** Avoid loading all large poster images at full size where practical.
- **Maintainability:** Keep UI components, server logic, and database access organized.
- **Accessibility:** Use semantic HTML, labeled inputs, keyboard-accessible controls, and visible focus states.

## 12. Suggested Technical Approach

The stack can be selected based on what the developer is learning. A beginner-friendly option is:

- **Frontend:** React with Next.js.
- **Styling:** Tailwind CSS or regular CSS.
- **Backend:** Next.js server actions or API routes.
- **Database:** PostgreSQL.
- **Authentication:** A well-maintained authentication library or managed authentication provider.
- **Charts:** A lightweight charting library for monthly activity.

This is a suggestion, not a requirement. Prefer tools that reduce setup complexity and have clear beginner documentation. Do not build a custom authentication system unless learning authentication internals is a specific goal.

## 13. Acceptance Criteria

The MVP is ready to demonstrate when:

- [ ] A new user can register, log in, and log out.
- [ ] A signed-in user can create a valid movie entry.
- [ ] Required fields and rating limits are validated.
- [ ] A user can view, edit, and delete their own entries.
- [ ] A user cannot access another user's entries.
- [ ] The collection displays entries in a responsive grid.
- [ ] Search, filters, and sorting work correctly together.
- [ ] Movie detail pages display the saved information and quotes.
- [ ] Statistics are derived from saved data and update after changes.
- [ ] Empty states and error states are handled.
- [ ] The app is usable on desktop and mobile browser sizes.

## 14. Future Enhancements (Not MVP)

Consider these only after the MVP is complete:
- Search and import movie details from a public movie database API.
- Automatic poster lookup.
- More than one genre per movie.
- Half-star ratings or a 10-point scale.
- Export journal data.
- A shareable annual recap.
- Themes or accent-color customization.
- Public profiles or shared lists.

## 15. Scope Guardrails

To keep Replay achievable as a first full-stack project:

1. Build authentication and basic movie-entry CRUD first.
2. Use manually entered movie information; do not depend on an external movie API.
3. Add search and filtering after the journal works.
4. Add statistics after the data model is stable.
5. Prioritize a polished, reliable experience over extra features.
6. Do not add social features, recommendations, or streaming integrations to the MVP.

**Definition of success:** A user can sign in, maintain a private movie journal, find past entries, and see a useful summary of their movie-watching history in a polished, responsive application.

Centralize every backend call in one services layer, and create a mock implementation of it so the whole app runs without a real backend.

Add tests.
