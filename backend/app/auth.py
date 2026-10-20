from __future__ import annotations

from fastapi import Depends, HTTPException, Request

from .store import Account, InMemoryStore


def get_store(request: Request) -> InMemoryStore:
    return request.app.state.store


def session_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization", "")
    scheme, separator, value = authorization.partition(" ")
    if separator and scheme.lower() == "bearer" and value.strip():
        return value.strip()
    return request.cookies.get("replay_session")


def optional_user(
    request: Request, store: InMemoryStore = Depends(get_store)
) -> Account | None:
    return store.user_for_session(session_token(request))


def require_user(user: Account | None = Depends(optional_user)) -> Account:
    if user is None:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Please sign in to continue.",
            },
        )
    return user
