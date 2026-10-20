from __future__ import annotations

import hashlib
import hmac
import secrets
import threading
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from .models import MovieInput

PASSWORD_ITERATIONS = 310_000


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _password_digest(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)


@dataclass
class Account:
    id: str
    email: str
    created_at: datetime
    password_salt: bytes
    password_digest: bytes


@dataclass
class QuoteRecord:
    id: str
    movie_entry_id: str
    text: str
    created_at: datetime


@dataclass
class MovieRecord:
    id: str
    user_id: str
    title: str
    poster_url: str | None
    release_year: int | None
    genre: str | None
    watched_at: date
    rating: int
    review: str | None
    quotes: list[QuoteRecord]
    created_at: datetime
    updated_at: datetime


class StoreError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code


class InMemoryStore:
    def __init__(self, seed_demo: bool = True) -> None:
        self._lock = threading.RLock()
        self._users: dict[str, Account] = {}
        self._users_by_id: dict[str, Account] = {}
        self._sessions: dict[str, str] = {}
        self._movies: dict[str, MovieRecord] = {}
        if seed_demo:
            self._seed_demo()

    def create_user(self, email: str, password: str) -> Account:
        with self._lock:
            if email in self._users:
                raise StoreError(409, "CONFLICT", "An account with this email already exists.")
            account = self._new_account(email, password)
            self._users[email] = account
            self._users_by_id[account.id] = account
            return account

    def authenticate(self, email: str, password: str) -> Account:
        with self._lock:
            account = self._users.get(email)
            candidate = (
                _password_digest(password, account.password_salt)
                if account
                else _password_digest(password, b"replay-invalid-account-salt")
            )
            if account is None or not hmac.compare_digest(candidate, account.password_digest):
                raise StoreError(401, "INVALID_CREDENTIALS", "Incorrect email or password.")
            return account

    def create_session(self, user_id: str) -> str:
        with self._lock:
            token = secrets.token_urlsafe(32)
            self._sessions[token] = user_id
            return token

    def user_for_session(self, token: str | None) -> Account | None:
        if not token:
            return None
        with self._lock:
            user_id = self._sessions.get(token)
            return self._users_by_id.get(user_id) if user_id else None

    def revoke_session(self, token: str | None) -> None:
        if token:
            with self._lock:
                self._sessions.pop(token, None)

    def list_movies(self, user_id: str) -> list[MovieRecord]:
        with self._lock:
            return [movie for movie in self._movies.values() if movie.user_id == user_id]

    def get_movie(self, user_id: str, movie_id: str) -> MovieRecord:
        with self._lock:
            movie = self._movies.get(movie_id)
            if movie is None or movie.user_id != user_id:
                raise StoreError(404, "NOT_FOUND", "This movie isn't in your journal.")
            return movie

    def create_movie(self, user_id: str, data: MovieInput) -> MovieRecord:
        with self._lock:
            now = utc_now()
            movie_id = str(uuid4())
            movie = MovieRecord(
                id=movie_id,
                user_id=user_id,
                title=data.title,
                poster_url=data.posterUrl,
                release_year=data.releaseYear,
                genre=data.genre,
                watched_at=data.watchedAt,
                rating=data.rating,
                review=data.review,
                quotes=self._new_quotes(movie_id, data.quotes, now),
                created_at=now,
                updated_at=now,
            )
            self._movies[movie_id] = movie
            return movie

    def update_movie(self, user_id: str, movie_id: str, data: MovieInput) -> MovieRecord:
        with self._lock:
            movie = self.get_movie(user_id, movie_id)
            movie.title = data.title
            movie.poster_url = data.posterUrl
            movie.release_year = data.releaseYear
            movie.genre = data.genre
            movie.watched_at = data.watchedAt
            movie.rating = data.rating
            movie.review = data.review
            movie.quotes = self._new_quotes(movie_id, data.quotes, utc_now())
            movie.updated_at = utc_now()
            return movie

    def delete_movie(self, user_id: str, movie_id: str) -> None:
        with self._lock:
            self.get_movie(user_id, movie_id)
            del self._movies[movie_id]

    def _new_account(self, email: str, password: str) -> Account:
        salt = secrets.token_bytes(16)
        return Account(
            id=str(uuid4()),
            email=email,
            created_at=utc_now(),
            password_salt=salt,
            password_digest=_password_digest(password, salt),
        )

    def _seed_demo(self) -> None:
        account = self._new_account("demo@replay.app", "password123")
        self._users[account.email] = account
        self._users_by_id[account.id] = account

        entries = [
            (
                "In the Mood for Love",
                2000,
                "Romance",
                3,
                5,
                "Every frame aches. The corridor, the rain, the cheongsams — longing as architecture.",
                [
                    "It is a restless moment.",
                    "That era has passed. Nothing that belonged to it exists any more.",
                ],
            ),
            (
                "Arrival",
                2016,
                "Sci-Fi",
                45,
                5,
                "A first-contact film that is secretly about grief and choice.",
                [
                    "If you could see your whole life from start to finish, would you change things?"
                ],
            ),
            (
                "Paddington 2",
                2017,
                "Comedy",
                60,
                4,
                "Pure kindness, perfectly engineered.",
                ["If we're kind and polite, the world will be right."],
            ),
            ("Heat", 1995, "Thriller", 110, 4, None, []),
            (
                "Spirited Away",
                2001,
                "Animation",
                170,
                5,
                "Still the gold standard of wonder.",
                ["Once you've met someone you never really forget them."],
            ),
            ("The Lighthouse", 2019, "Horror", 230, 3, "Admired more than enjoyed.", []),
            ("Past Lives", 2023, "Drama", 265, 4, "Quiet, devastating, generous.", []),
        ]
        today = date.today()
        for title, year, genre, days_ago, rating, review, quotes in entries:
            now = utc_now()
            movie_id = str(uuid4())
            self._movies[movie_id] = MovieRecord(
                id=movie_id,
                user_id=account.id,
                title=title,
                poster_url=None,
                release_year=year,
                genre=genre,
                watched_at=today - timedelta(days=days_ago),
                rating=rating,
                review=review,
                quotes=self._new_quotes(movie_id, quotes, now),
                created_at=now,
                updated_at=now,
            )

    @staticmethod
    def _new_quotes(movie_id: str, texts: list[str], created_at: datetime) -> list[QuoteRecord]:
        return [
            QuoteRecord(str(uuid4()), movie_id, text, created_at) for text in texts
        ]
