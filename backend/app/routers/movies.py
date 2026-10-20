from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import get_store, require_user
from ..models import MovieEntry, MovieInput, MovieQuote
from ..store import Account, DatabaseStore, MovieRecord, StoreError

router = APIRouter(prefix="/api/movies", tags=["Movies"])


def public_movie(movie: MovieRecord) -> MovieEntry:
    return MovieEntry(
        id=movie.id,
        userId=movie.user_id,
        title=movie.title,
        posterUrl=movie.poster_url,
        releaseYear=movie.release_year,
        genre=movie.genre,
        watchedAt=movie.watched_at,
        rating=movie.rating,
        review=movie.review,
        quotes=[
            MovieQuote(
                id=quote.id,
                movieEntryId=quote.movie_entry_id,
                text=quote.text,
                createdAt=quote.created_at,
            )
            for quote in movie.quotes
        ],
        createdAt=movie.created_at,
        updatedAt=movie.updated_at,
    )


def raise_store_error(error: StoreError) -> None:
    raise HTTPException(
        status_code=error.status_code,
        detail={"code": error.code, "message": str(error)},
    ) from error


@router.get("", response_model=list[MovieEntry])
def list_movies(
    user: Account = Depends(require_user),
    store: DatabaseStore = Depends(get_store),
) -> list[MovieEntry]:
    return [public_movie(movie) for movie in store.list_movies(user.id)]


@router.post("", response_model=MovieEntry, status_code=status.HTTP_201_CREATED)
def create_movie(
    data: MovieInput,
    user: Account = Depends(require_user),
    store: DatabaseStore = Depends(get_store),
) -> MovieEntry:
    return public_movie(store.create_movie(user.id, data))


@router.get("/{movie_id}", response_model=MovieEntry)
def get_movie(
    movie_id: str,
    user: Account = Depends(require_user),
    store: DatabaseStore = Depends(get_store),
) -> MovieEntry:
    try:
        return public_movie(store.get_movie(user.id, movie_id))
    except StoreError as error:
        raise_store_error(error)


@router.put("/{movie_id}", response_model=MovieEntry)
def update_movie(
    movie_id: str,
    data: MovieInput,
    user: Account = Depends(require_user),
    store: DatabaseStore = Depends(get_store),
) -> MovieEntry:
    try:
        return public_movie(store.update_movie(user.id, movie_id, data))
    except StoreError as error:
        raise_store_error(error)


@router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_movie(
    movie_id: str,
    user: Account = Depends(require_user),
    store: DatabaseStore = Depends(get_store),
) -> None:
    try:
        store.delete_movie(user.id, movie_id)
    except StoreError as error:
        raise_store_error(error)
