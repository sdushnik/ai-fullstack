from __future__ import annotations

import re
from datetime import date, datetime
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator


Genre = Literal[
    "Action",
    "Animation",
    "Comedy",
    "Documentary",
    "Drama",
    "Fantasy",
    "Horror",
    "Musical",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "Thriller",
    "Western",
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Credentials(StrictModel):
    email: str
    password: str = Field(min_length=8)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        email = value.strip().lower()
        if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            raise ValueError("Enter a valid email.")
        return email


class User(StrictModel):
    id: str
    email: str
    createdAt: datetime


class MovieInput(StrictModel):
    title: str = Field(min_length=1, max_length=200)
    posterUrl: str | None
    releaseYear: int | None = Field(ge=1888)
    genre: Genre | None
    watchedAt: date
    rating: int = Field(ge=1, le=5)
    review: str | None = Field(max_length=5000)
    quotes: list[str]

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Title is required.")
        return value.strip()

    @field_validator("posterUrl")
    @classmethod
    def validate_poster_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Poster URL must be an HTTP or HTTPS URL.")
        return value

    @field_validator("releaseYear")
    @classmethod
    def validate_release_year(cls, value: int | None) -> int | None:
        if value is not None and value > date.today().year + 5:
            raise ValueError("Release year cannot be more than five years in the future.")
        return value

    @field_validator("quotes")
    @classmethod
    def validate_quotes(cls, values: list[str]) -> list[str]:
        if any(len(value) > 500 for value in values):
            raise ValueError("Quotes must be 500 characters or fewer.")
        return values


class MovieQuote(StrictModel):
    id: str
    movieEntryId: str
    text: str
    createdAt: datetime


class MovieEntry(StrictModel):
    id: str
    userId: str
    title: str
    posterUrl: str | None
    releaseYear: int | None
    genre: Genre | None
    watchedAt: date
    rating: int
    review: str | None
    quotes: list[MovieQuote]
    createdAt: datetime
    updatedAt: datetime


class ApiError(StrictModel):
    code: Literal[
        "UNAUTHORIZED",
        "NOT_FOUND",
        "VALIDATION",
        "CONFLICT",
        "INVALID_CREDENTIALS",
        "UNKNOWN",
    ]
    message: str
    fieldErrors: dict[str, str] | None = None
