from __future__ import annotations

import logging
import os
from collections.abc import Sequence

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .models import ApiError
from .routers import auth, movies
from .store import InMemoryStore

logger = logging.getLogger(__name__)


def create_app(store: InMemoryStore | None = None) -> FastAPI:
    app = FastAPI(title="Replay API", version="1.0.0")
    app.state.store = store if store is not None else InMemoryStore()

    origins = [
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=["Authorization"],
    )

    @app.exception_handler(RequestValidationError)
    async def validation_error(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        field_errors: dict[str, str] = {}
        for issue in error.errors():
            location: Sequence[str | int] = issue["loc"]
            field = ".".join(str(part) for part in location if part != "body")
            field_errors.setdefault(field or "request", issue["msg"])
        message = (
            "Invalid movie entry."
            if request.url.path.startswith("/api/movies")
            else "Invalid request."
        )
        payload = ApiError(
            code="VALIDATION", message=message, fieldErrors=field_errors
        )
        return JSONResponse(status_code=400, content=payload.model_dump(exclude_none=True))

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, error: Exception) -> JSONResponse:
        logger.exception("Unexpected API error", exc_info=error)
        return JSONResponse(
            status_code=500,
            content={"code": "UNKNOWN", "message": "An unexpected error occurred."},
        )

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, error: HTTPException) -> JSONResponse:
        detail = error.detail
        payload = (
            detail
            if isinstance(detail, dict) and {"code", "message"} <= detail.keys()
            else {"code": "UNKNOWN", "message": str(detail)}
        )
        return JSONResponse(
            status_code=error.status_code,
            content=payload,
            headers=error.headers,
        )

    @app.exception_handler(404)
    async def not_found(request: Request, error: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"code": "NOT_FOUND", "message": "This movie isn't in your journal."},
        )

    @app.exception_handler(405)
    async def method_not_allowed(request: Request, error: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=405,
            content={"code": "UNKNOWN", "message": "Method not allowed."},
        )

    app.include_router(auth.router)
    app.include_router(movies.router)
    return app


app = create_app()
