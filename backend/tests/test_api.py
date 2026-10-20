from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.main import create_app
from app.store import QuoteEntity


def make_client(*, seed: bool = False, database_url: str = "sqlite://") -> TestClient:
    return TestClient(create_app(database_url=database_url, seed_demo=seed))


def signup(client: TestClient, email: str = "reader@example.com") -> tuple[dict, str]:
    response = client.post(
        "/api/auth/signup", json={"email": email, "password": "password123"}
    )
    assert response.status_code == 201
    return response.json(), response.headers["authorization"].removeprefix("Bearer ")


def movie_input(**overrides: object) -> dict:
    data: dict = {
        "title": "Arrival",
        "posterUrl": None,
        "releaseYear": 2016,
        "genre": "Sci-Fi",
        "watchedAt": "2025-01-14",
        "rating": 5,
        "review": "A beautiful film.",
        "quotes": ["Would you change things?"],
    }
    data.update(overrides)
    return data


def test_demo_account_is_seeded_with_movies() -> None:
    client = make_client(seed=True)
    response = client.post(
        "/api/auth/signin",
        json={"email": "demo@replay.app", "password": "password123"},
    )
    assert response.status_code == 200

    movies = client.get(
        "/api/movies", headers={"Authorization": response.headers["authorization"]}
    )
    assert movies.status_code == 200
    assert len(movies.json()) == 7
    assert movies.json()[0]["title"] == "In the Mood for Love"


def test_signup_returns_hashed_session_and_supports_bearer_auth() -> None:
    client = make_client()
    response = client.post(
        "/api/auth/signup",
        json={"email": "reader@example.com", "password": "password123"},
    )
    user = response.json()
    token = response.headers["authorization"].removeprefix("Bearer ")

    assert response.status_code == 201
    assert "password" not in user
    assert token
    assert "httponly" in response.headers["set-cookie"].lower()
    assert client.cookies.get("replay_session") == token
    account = client.app.state.store.authenticate("reader@example.com", "password123")
    assert account.password_salt
    assert account.password_digest != b"password123"
    assert client.get(
        "/api/movies", headers={"Authorization": f"Bearer {token}"}
    ).status_code == 200
    assert client.get("/api/auth/me").json()["id"] == user["id"]


def test_database_url_environment_variable_persists_accounts(
    tmp_path, monkeypatch
) -> None:
    database_url = f"sqlite:///{tmp_path / 'replay.db'}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    first_client = TestClient(create_app(seed_demo=False))
    user, token = signup(first_client)
    created = first_client.post(
        "/api/movies",
        json=movie_input(quotes=["First quote", "Second quote"]),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert created.status_code == 201

    second_client = TestClient(create_app(seed_demo=False))
    response = second_client.post(
        "/api/auth/signin",
        json={"email": "reader@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    headers = {"Authorization": response.headers["authorization"]}
    assert second_client.get(
        "/api/auth/me", headers={"Authorization": response.headers["authorization"]}
    ).json() == user
    movies = second_client.get("/api/movies", headers=headers)
    assert movies.status_code == 200
    assert movies.json() == [created.json()]


def test_signup_rejects_duplicate_and_invalid_credentials() -> None:
    client = make_client()
    signup(client)

    duplicate = client.post(
        "/api/auth/signup",
        json={"email": "reader@example.com", "password": "password123"},
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "CONFLICT"

    invalid = client.post(
        "/api/auth/signup", json={"email": "not-an-email", "password": "short"}
    )
    assert invalid.status_code == 400
    assert invalid.json()["code"] == "VALIDATION"
    assert {"email", "password"} <= invalid.json()["fieldErrors"].keys()


def test_signin_rejects_wrong_password() -> None:
    client = make_client()
    signup(client)
    response = client.post(
        "/api/auth/signin",
        json={"email": "reader@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_CREDENTIALS"


def test_movie_crud_validation_ownership_and_quote_cascade() -> None:
    client = make_client()
    _, token = signup(client)
    headers = {"Authorization": f"Bearer {token}"}

    created = client.post("/api/movies", json=movie_input(), headers=headers)
    assert created.status_code == 201
    movie = created.json()
    movie_id = movie["id"]
    assert movie["quotes"][0]["movieEntryId"] == movie_id

    assert client.get(f"/api/movies/{movie_id}", headers=headers).json() == movie

    updated = client.put(
        f"/api/movies/{movie_id}",
        json=movie_input(title="Arrival (rewatch)", quotes=["New quote"]),
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Arrival (rewatch)"
    assert updated.json()["quotes"][0]["text"] == "New quote"

    invalid = client.post(
        "/api/movies", json=movie_input(rating=6), headers=headers
    )
    assert invalid.status_code == 400
    assert invalid.json()["code"] == "VALIDATION"

    outsider, outsider_token = signup(client, "other@example.com")
    assert outsider["id"] != movie["userId"]
    outsider_headers = {"Authorization": f"Bearer {outsider_token}"}
    hidden = client.get(f"/api/movies/{movie_id}", headers=outsider_headers)
    assert hidden.status_code == 404
    assert hidden.json()["code"] == "NOT_FOUND"

    deleted = client.delete(f"/api/movies/{movie_id}", headers=headers)
    assert deleted.status_code == 204
    assert client.get(f"/api/movies/{movie_id}", headers=headers).status_code == 404
    with client.app.state.store.session_factory() as session:
        assert session.scalar(select(func.count()).select_from(QuoteEntity)) == 0


def test_auth_required_for_movies_and_signout_revokes_token() -> None:
    client = make_client()
    assert client.get("/api/movies").status_code == 401
    _, token = signup(client)
    headers = {"Authorization": f"Bearer {token}"}

    signout = client.post("/api/auth/signout", headers=headers)
    assert signout.status_code == 204
    assert client.get("/api/movies", headers=headers).status_code == 401
    assert client.get("/api/auth/me").json() is None
