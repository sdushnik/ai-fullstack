from fastapi import APIRouter, Depends, HTTPException, Request, Response

from ..auth import get_store, optional_user, session_token
from ..models import Credentials, User
from ..store import Account, DatabaseStore, StoreError
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def public_user(account: Account) -> User:
    return User(id=account.id, email=account.email, createdAt=account.created_at)


def start_session(response: Response, store: DatabaseStore, user: Account) -> None:
    token = store.create_session(user.id)
    response.set_cookie(
        key="replay_session",
        value=token,
        httponly=True,
        samesite="lax",
        path="/",
    )
    response.headers["Authorization"] = f"Bearer {token}"


@router.post("/signup", response_model=User, status_code=201)
def sign_up(
    credentials: Credentials,
    response: Response,
    store: DatabaseStore = Depends(get_store),
) -> User:
    try:
        user = store.create_user(credentials.email, credentials.password)
    except StoreError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail={"code": error.code, "message": str(error)},
        ) from error
    start_session(response, store, user)
    return public_user(user)


@router.post("/signin", response_model=User)
def sign_in(
    credentials: Credentials,
    response: Response,
    store: DatabaseStore = Depends(get_store),
) -> User:
    try:
        user = store.authenticate(credentials.email, credentials.password)
    except StoreError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail={"code": error.code, "message": str(error)},
        ) from error
    start_session(response, store, user)
    return public_user(user)


@router.post("/signout", status_code=204)
def sign_out(request: Request, response: Response, store: DatabaseStore = Depends(get_store)) -> None:
    token = session_token(request)
    if store.user_for_session(token) is None:
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHORIZED", "message": "Please sign in to continue."},
        )
    store.revoke_session(token)
    response.delete_cookie(key="replay_session", path="/", httponly=True, samesite="lax")


@router.get("/me", response_model=User | None)
def get_current_user(user: Account | None = Depends(optional_user)) -> User | None:
    return public_user(user) if user else None
