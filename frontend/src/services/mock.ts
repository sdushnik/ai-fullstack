// Mock backend: persists to localStorage and mimics the server's rules
// (auth, ownership, validation, cascading quote deletes).
import {
  ApiError,
  type Credentials,
  type MovieEntry,
  type MovieInput,
  type MovieQuote,
  type ReplayApi,
  type User,
} from "./types";
import { isValidIsoDate } from "@/lib/validation";

interface StoredUser extends User {
  passwordHash: string;
}
type StoredEntry = Omit<MovieEntry, "quotes">;
interface DB {
  users: StoredUser[];
  entries: StoredEntry[];
  quotes: MovieQuote[];
}

export interface MockOptions {
  storage?: Storage;
  latencyMs?: number;
  seed?: boolean;
}

const DB_KEY = "replay.mock.db.v1";
const SESSION_KEY = "replay.mock.session.v1";

const demoPosterUrls: Record<string, string> = {
  "In the Mood for Love": "https://image.tmdb.org/t/p/w500/8BgGbbWiLNhPtkMkN0gGTnbtvBv.jpg",
  Arrival: "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
  "Paddington 2": "https://image.tmdb.org/t/p/w500/1OJ9vkD5xPt3skC6KguyXAgagRZ.jpg",
  Heat: "https://image.tmdb.org/t/p/w500/uVM0D7Q6U9H6xMSZmMdfwECih5h.jpg",
  "Spirited Away": "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
  "The Lighthouse": "https://image.tmdb.org/t/p/w500/3nk9UoepYmv1G9oP18q6JJCeYwN.jpg",
  "Past Lives": "https://image.tmdb.org/t/p/w500/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function hash(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`replay:${pw}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

function serverValidate(input: MovieInput) {
  const e: Partial<Record<"title" | "watchedAt" | "rating", string>> = {};
  if (!input.title?.trim()) e.title = "Title is required.";
  if (!isValidIsoDate(input.watchedAt)) e.watchedAt = "Enter a valid date.";
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
    e.rating = "Rating must be between 1 and 5.";
  if (Object.keys(e).length)
    throw new ApiError("VALIDATION", "Invalid movie entry.", e as Record<string, string>);
}

function backfillDemoPosters(db: DB, demoUserId: string): boolean {
  let changed = false;
  for (const entry of db.entries) {
    const posterUrl = demoPosterUrls[entry.title];
    if (entry.userId === demoUserId && entry.posterUrl === null && posterUrl) {
      entry.posterUrl = posterUrl;
      changed = true;
    }
  }
  return changed;
}

function seedEntries(): (MovieInput & { createdOffset: number })[] {
  const m = (n: number, d: number) => {
    const t = new Date();
    t.setMonth(t.getMonth() - n, d);
    return t.toISOString().slice(0, 10);
  };
  return [
    {
      title: "In the Mood for Love",
      releaseYear: 2000,
      genre: "Romance",
      watchedAt: m(0, 3),
      rating: 5,
      review:
        "Every frame aches. The corridor, the rain, the cheongsams — longing as architecture.",
      quotes: [
        "It is a restless moment.",
        "That era has passed. Nothing that belonged to it exists any more.",
      ],
      posterUrl: demoPosterUrls["In the Mood for Love"],
      createdOffset: 1,
    },
    {
      title: "Arrival",
      releaseYear: 2016,
      genre: "Sci-Fi",
      watchedAt: m(1, 14),
      rating: 5,
      review: "A first-contact film that is secretly about grief and choice.",
      quotes: ["If you could see your whole life from start to finish, would you change things?"],
      posterUrl: demoPosterUrls.Arrival,
      createdOffset: 2,
    },
    {
      title: "Paddington 2",
      releaseYear: 2017,
      genre: "Comedy",
      watchedAt: m(1, 2),
      rating: 4,
      review: "Pure kindness, perfectly engineered.",
      quotes: ["If we're kind and polite, the world will be right."],
      posterUrl: demoPosterUrls["Paddington 2"],
      createdOffset: 3,
    },
    {
      title: "Heat",
      releaseYear: 1995,
      genre: "Thriller",
      watchedAt: m(3, 20),
      rating: 4,
      review: null,
      quotes: [],
      posterUrl: demoPosterUrls.Heat,
      createdOffset: 4,
    },
    {
      title: "Spirited Away",
      releaseYear: 2001,
      genre: "Animation",
      watchedAt: m(5, 9),
      rating: 5,
      review: "Still the gold standard of wonder.",
      quotes: ["Once you've met someone you never really forget them."],
      posterUrl: demoPosterUrls["Spirited Away"],
      createdOffset: 5,
    },
    {
      title: "The Lighthouse",
      releaseYear: 2019,
      genre: "Horror",
      watchedAt: m(7, 27),
      rating: 3,
      review: "Admired more than enjoyed.",
      quotes: [],
      posterUrl: demoPosterUrls["The Lighthouse"],
      createdOffset: 6,
    },
    {
      title: "Past Lives",
      releaseYear: 2023,
      genre: "Drama",
      watchedAt: m(8, 11),
      rating: 4,
      review: "Quiet, devastating, generous.",
      quotes: [],
      posterUrl: demoPosterUrls["Past Lives"],
      createdOffset: 7,
    },
  ];
}

export function createMockApi(opts: MockOptions = {}): ReplayApi {
  const storage =
    opts.storage ?? (typeof window !== "undefined" ? window.localStorage : memoryStorage());
  const latency = opts.latencyMs ?? 250;
  const wait = () => new Promise((r) => setTimeout(r, latency));

  const load = (): DB => {
    const raw = storage.getItem(DB_KEY);
    return raw ? (JSON.parse(raw) as DB) : { users: [], entries: [], quotes: [] };
  };
  const save = (db: DB) => storage.setItem(DB_KEY, JSON.stringify(db));
  const toPublic = ({ passwordHash: _p, ...u }: StoredUser): User => u;

  const requireUser = (db: DB): StoredUser => {
    const id = storage.getItem(SESSION_KEY);
    const user = id ? db.users.find((u) => u.id === id) : undefined;
    if (!user) throw new ApiError("UNAUTHORIZED", "Please sign in to continue.");
    return user;
  };
  const hydrate = (db: DB, e: StoredEntry): MovieEntry => ({
    ...e,
    quotes: db.quotes.filter((q) => q.movieEntryId === e.id),
  });
  // Ownership check: other users' entries are reported as not found.
  const findOwned = (db: DB, userId: string, id: string) => {
    const e = db.entries.find((x) => x.id === id && x.userId === userId);
    if (!e) throw new ApiError("NOT_FOUND", "This movie isn't in your journal.");
    return e;
  };
  const writeQuotes = (db: DB, entryId: string, quotes: string[]) => {
    db.quotes = db.quotes.filter((q) => q.movieEntryId !== entryId);
    const now = new Date().toISOString();
    for (const text of quotes)
      db.quotes.push({ id: uid(), movieEntryId: entryId, text, createdAt: now });
  };
  const normEmail = (e: string) => e.trim().toLowerCase();

  async function ensureDemo() {
    if (opts.seed === false) return;
    const db = load();
    const demoUser = db.users.find((u) => u.email === "demo@replay.app");
    if (demoUser) {
      if (backfillDemoPosters(db, demoUser.id)) save(db);
      return;
    }
    const user: StoredUser = {
      id: uid(),
      email: "demo@replay.app",
      passwordHash: await hash("password123"),
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    for (const { createdOffset: _c, quotes, ...s } of seedEntries()) {
      const now = new Date().toISOString();
      const id = uid();
      db.entries.push({ ...s, id, userId: user.id, createdAt: now, updatedAt: now });
      writeQuotes(db, id, quotes);
    }
    save(db);
  }

  return {
    auth: {
      async signUp({ email, password }: Credentials) {
        await wait();
        await ensureDemo();
        const db = load();
        const e = normEmail(email);
        if (!/^\S+@\S+\.\S+$/.test(e))
          throw new ApiError("VALIDATION", "Enter a valid email.", {
            email: "Enter a valid email.",
          });
        if (password.length < 8)
          throw new ApiError("VALIDATION", "Password must be at least 8 characters.", {
            password: "Password must be at least 8 characters.",
          });
        if (db.users.some((u) => u.email === e))
          throw new ApiError("CONFLICT", "An account with this email already exists.");
        const user: StoredUser = {
          id: uid(),
          email: e,
          passwordHash: await hash(password),
          createdAt: new Date().toISOString(),
        };
        db.users.push(user);
        save(db);
        storage.setItem(SESSION_KEY, user.id);
        return toPublic(user);
      },
      async signIn({ email, password }: Credentials) {
        await wait();
        await ensureDemo();
        const db = load();
        const user = db.users.find((u) => u.email === normEmail(email));
        if (!user || user.passwordHash !== (await hash(password)))
          throw new ApiError("INVALID_CREDENTIALS", "Incorrect email or password.");
        storage.setItem(SESSION_KEY, user.id);
        return toPublic(user);
      },
      async signOut() {
        await wait();
        storage.removeItem(SESSION_KEY);
      },
      async getCurrentUser() {
        const db = load();
        const id = storage.getItem(SESSION_KEY);
        const u = id ? db.users.find((x) => x.id === id) : undefined;
        return u ? toPublic(u) : null;
      },
    },
    movies: {
      async list() {
        await wait();
        const db = load();
        const user = requireUser(db);
        if (user.email === "demo@replay.app" && backfillDemoPosters(db, user.id)) save(db);
        return db.entries.filter((e) => e.userId === user.id).map((e) => hydrate(db, e));
      },
      async get(id) {
        await wait();
        const db = load();
        const user = requireUser(db);
        return hydrate(db, findOwned(db, user.id, id));
      },
      async create(input) {
        await wait();
        const db = load();
        const user = requireUser(db);
        serverValidate(input);
        const now = new Date().toISOString();
        const { quotes, ...rest } = input;
        const entry: StoredEntry = {
          ...rest,
          id: uid(),
          userId: user.id,
          createdAt: now,
          updatedAt: now,
        };
        db.entries.push(entry);
        writeQuotes(db, entry.id, quotes);
        save(db);
        return hydrate(db, entry);
      },
      async update(id, input) {
        await wait();
        const db = load();
        const user = requireUser(db);
        const existing = findOwned(db, user.id, id);
        serverValidate(input);
        const { quotes, ...rest } = input;
        Object.assign(existing, rest, { updatedAt: new Date().toISOString() });
        writeQuotes(db, id, quotes);
        save(db);
        return hydrate(db, existing);
      },
      async remove(id) {
        await wait();
        const db = load();
        const user = requireUser(db);
        findOwned(db, user.id, id);
        db.entries = db.entries.filter((e) => e.id !== id);
        db.quotes = db.quotes.filter((q) => q.movieEntryId !== id); // cascade
        save(db);
      },
    },
  };
}
