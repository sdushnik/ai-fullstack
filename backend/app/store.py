from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    create_engine,
    event,
    select,
)
from sqlalchemy.engine.interfaces import DBAPIConnection, Dialect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    selectinload,
    sessionmaker,
)
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import TypeDecorator

from .models import MovieInput

PASSWORD_ITERATIONS = 310_000

DEMO_POSTER_URLS = {
    "In the Mood for Love": "https://image.tmdb.org/t/p/w500/8BgGbbWiLNhPtkMkN0gGTnbtvBv.jpg",
    "Arrival": "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
    "Paddington 2": "https://image.tmdb.org/t/p/w500/1OJ9vkD5xPt3skC6KguyXAgagRZ.jpg",
    "Heat": "https://image.tmdb.org/t/p/w500/uVM0D7Q6U9H6xMSZmMdfwECih5h.jpg",
    "Spirited Away": "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    "The Lighthouse": "https://image.tmdb.org/t/p/w500/3nk9UoepYmv1G9oP18q6JJCeYwN.jpg",
    "Past Lives": "https://image.tmdb.org/t/p/w500/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _password_digest(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )


class UTCDateTime(TypeDecorator[datetime]):
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(
        self, value: datetime | None, dialect: Dialect
    ) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def process_result_value(
        self, value: datetime | None, dialect: Dialect
    ) -> datetime | None:
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value


class Base(DeclarativeBase):
    pass


class UserEntity(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime())
    password_salt: Mapped[bytes] = mapped_column(LargeBinary)
    password_digest: Mapped[bytes] = mapped_column(LargeBinary)
    movies: Mapped[list[MovieEntity]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    sessions: Mapped[list[SessionEntity]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )


class SessionEntity(Base):
    __tablename__ = "sessions"

    token: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    user: Mapped[UserEntity] = relationship(back_populates="sessions")


class MovieEntity(Base):
    __tablename__ = "movies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    poster_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    release_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    genre: Mapped[str | None] = mapped_column(String(32), nullable=True)
    watched_at: Mapped[date] = mapped_column(Date)
    rating: Mapped[int] = mapped_column(Integer)
    review: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime())
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime())
    user: Mapped[UserEntity] = relationship(back_populates="movies")
    quotes: Mapped[list[QuoteEntity]] = relationship(
        back_populates="movie",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="QuoteEntity.position",
    )


class QuoteEntity(Base):
    __tablename__ = "quotes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    movie_entry_id: Mapped[str] = mapped_column(
        ForeignKey("movies.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime())
    movie: Mapped[MovieEntity] = relationship(back_populates="quotes")


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


class DatabaseStore:
    def __init__(self, database_url: str, seed_demo: bool = True) -> None:
        if database_url in {"sqlite://", "sqlite:///:memory:"}:
            self.engine = create_engine(
                database_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
        elif database_url.startswith("sqlite"):
            self.engine = create_engine(
                database_url, connect_args={"check_same_thread": False}
            )
        else:
            self.engine = create_engine(database_url)
        if self.engine.dialect.name == "sqlite":
            event.listen(self.engine, "connect", self._enable_sqlite_foreign_keys)
        self.session_factory = sessionmaker(self.engine, expire_on_commit=False)
        Base.metadata.create_all(bind=self.engine)
        if seed_demo:
            self._seed_demo()

    @staticmethod
    def _enable_sqlite_foreign_keys(
        connection: DBAPIConnection, record: object
    ) -> None:
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    def create_user(self, email: str, password: str) -> Account:
        salt = secrets.token_bytes(16)
        entity = UserEntity(
            id=str(uuid4()),
            email=email,
            created_at=utc_now(),
            password_salt=salt,
            password_digest=_password_digest(password, salt),
        )
        try:
            with self.session_factory.begin() as session:
                session.add(entity)
                session.flush()
                account = self._account(entity)
        except IntegrityError as error:
            raise StoreError(
                409, "CONFLICT", "An account with this email already exists."
            ) from error
        return account

    def authenticate(self, email: str, password: str) -> Account:
        with self.session_factory() as session:
            entity = session.scalar(select(UserEntity).where(UserEntity.email == email))
            salt = entity.password_salt if entity else b"replay-invalid-account-salt"
            candidate = _password_digest(password, salt)
            if entity is None or not hmac.compare_digest(candidate, entity.password_digest):
                raise StoreError(401, "INVALID_CREDENTIALS", "Incorrect email or password.")
            return self._account(entity)

    def create_session(self, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        with self.session_factory.begin() as session:
            session.add(SessionEntity(token=token, user_id=user_id))
        return token

    def user_for_session(self, token: str | None) -> Account | None:
        if not token:
            return None
        with self.session_factory() as session:
            entity = session.scalar(
                select(UserEntity)
                .join(SessionEntity)
                .where(SessionEntity.token == token)
            )
            return self._account(entity) if entity else None

    def revoke_session(self, token: str | None) -> None:
        if token:
            with self.session_factory.begin() as session:
                entity = session.get(SessionEntity, token)
                if entity is not None:
                    session.delete(entity)

    def list_movies(self, user_id: str) -> list[MovieRecord]:
        with self.session_factory.begin() as session:
            is_demo_user = session.scalar(
                select(UserEntity.id).where(
                    UserEntity.id == user_id,
                    UserEntity.email == "demo@replay.app",
                )
            )
            if is_demo_user is not None:
                self._backfill_demo_posters(session, user_id)
            entities = session.scalars(
                select(MovieEntity)
                .options(selectinload(MovieEntity.quotes))
                .where(MovieEntity.user_id == user_id)
                .order_by(MovieEntity.created_at, MovieEntity.id)
            )
            return [self._movie(entity) for entity in entities]

    def get_movie(self, user_id: str, movie_id: str) -> MovieRecord:
        with self.session_factory() as session:
            entity = session.scalar(
                select(MovieEntity)
                .options(selectinload(MovieEntity.quotes))
                .where(MovieEntity.id == movie_id, MovieEntity.user_id == user_id)
            )
            if entity is None:
                raise StoreError(404, "NOT_FOUND", "This movie isn't in your journal.")
            return self._movie(entity)

    def create_movie(self, user_id: str, data: MovieInput) -> MovieRecord:
        now = utc_now()
        entity = MovieEntity(
            id=str(uuid4()),
            user_id=user_id,
            title=data.title,
            poster_url=data.posterUrl,
            release_year=data.releaseYear,
            genre=data.genre,
            watched_at=data.watchedAt,
            rating=data.rating,
            review=data.review,
            created_at=now,
            updated_at=now,
            quotes=self._new_quotes(data.quotes, now),
        )
        with self.session_factory.begin() as session:
            session.add(entity)
            session.flush()
            record = self._movie(entity)
        return record

    def update_movie(self, user_id: str, movie_id: str, data: MovieInput) -> MovieRecord:
        with self.session_factory.begin() as session:
            entity = session.scalar(
                select(MovieEntity)
                .options(selectinload(MovieEntity.quotes))
                .where(MovieEntity.id == movie_id, MovieEntity.user_id == user_id)
            )
            if entity is None:
                raise StoreError(404, "NOT_FOUND", "This movie isn't in your journal.")
            now = utc_now()
            entity.title = data.title
            entity.poster_url = data.posterUrl
            entity.release_year = data.releaseYear
            entity.genre = data.genre
            entity.watched_at = data.watchedAt
            entity.rating = data.rating
            entity.review = data.review
            entity.updated_at = now
            entity.quotes = self._new_quotes(data.quotes, now)
            session.flush()
            record = self._movie(entity)
        return record

    def delete_movie(self, user_id: str, movie_id: str) -> None:
        with self.session_factory.begin() as session:
            entity = session.scalar(
                select(MovieEntity).where(
                    MovieEntity.id == movie_id, MovieEntity.user_id == user_id
                )
            )
            if entity is None:
                raise StoreError(404, "NOT_FOUND", "This movie isn't in your journal.")
            session.delete(entity)

    @staticmethod
    def _account(entity: UserEntity) -> Account:
        return Account(
            id=entity.id,
            email=entity.email,
            created_at=entity.created_at,
            password_salt=entity.password_salt,
            password_digest=entity.password_digest,
        )

    @staticmethod
    def _movie(entity: MovieEntity) -> MovieRecord:
        return MovieRecord(
            id=entity.id,
            user_id=entity.user_id,
            title=entity.title,
            poster_url=entity.poster_url,
            release_year=entity.release_year,
            genre=entity.genre,
            watched_at=entity.watched_at,
            rating=entity.rating,
            review=entity.review,
            quotes=[
                QuoteRecord(
                    id=quote.id,
                    movie_entry_id=quote.movie_entry_id,
                    text=quote.text,
                    created_at=quote.created_at,
                )
                for quote in entity.quotes
            ],
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )

    @staticmethod
    def _new_quotes(texts: list[str], created_at: datetime) -> list[QuoteEntity]:
        return [
            QuoteEntity(
                id=str(uuid4()),
                position=index,
                text=text,
                created_at=created_at,
            )
            for index, text in enumerate(texts)
        ]

    def _seed_demo(self) -> None:
        with self.session_factory.begin() as session:
            demo_user = session.scalar(
                select(UserEntity).where(UserEntity.email == "demo@replay.app")
            )
            if demo_user is not None:
                self._backfill_demo_posters(session, demo_user.id)
                return

        salt = secrets.token_bytes(16)
        account = UserEntity(
            id=str(uuid4()),
            email="demo@replay.app",
            created_at=utc_now(),
            password_salt=salt,
            password_digest=_password_digest("password123", salt),
        )
        entries = [
            (
                "In the Mood for Love",
                2000,
                "Romance",
                3,
                5,
                (
                    "Every frame aches. The corridor, the rain, the cheongsams — "
                    "longing as architecture."
                ),
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
                    (
                        "If you could see your whole life from start to finish, "
                        "would you change things?"
                    )
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
            (
                "The Lighthouse",
                2019,
                "Horror",
                230,
                3,
                "Admired more than enjoyed.",
                [],
            ),
            ("Past Lives", 2023, "Drama", 265, 4, "Quiet, devastating, generous.", []),
        ]
        today = date.today()
        try:
            with self.session_factory.begin() as session:
                session.add(account)
                for index, entry in enumerate(entries):
                    title, year, genre, days_ago, rating, review, quotes = entry
                    now = utc_now() + timedelta(microseconds=index)
                    account.movies.append(
                        MovieEntity(
                            id=str(uuid4()),
                            title=title,
                            poster_url=DEMO_POSTER_URLS[title],
                            release_year=year,
                            genre=genre,
                            watched_at=today - timedelta(days=days_ago),
                            rating=rating,
                            review=review,
                            created_at=now,
                            updated_at=now,
                            quotes=self._new_quotes(quotes, now),
                        )
                    )
        except IntegrityError:
            with self.session_factory() as session:
                if session.scalar(
                    select(UserEntity.id).where(UserEntity.email == "demo@replay.app")
                ):
                    return
            raise

    @staticmethod
    def _backfill_demo_posters(session: Session, user_id: str) -> None:
        movies = session.scalars(
            select(MovieEntity).where(MovieEntity.user_id == user_id)
        )
        for movie in movies:
            poster_url = DEMO_POSTER_URLS.get(movie.title)
            if movie.poster_url is None and poster_url:
                movie.poster_url = poster_url
