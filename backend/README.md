# Replay API

From the repository root, install dependencies and start the API with:

```sh
make setup
make run
```

In a second terminal, start the frontend with `make frontend`.

Run the tests from the repository root with `make test`. The server defaults to
`http://127.0.0.1:8000`; override the host or port with `make run HOST=0.0.0.0`
or `make run PORT=8001`. If using a custom backend port, pass the same port to
`make frontend PORT=8001` so its `/api` proxy reaches that backend.

The API is available under `/api`; interactive OpenAPI documentation is at
`/docs`. It uses an in-memory store and resets when the process restarts.

The seeded demo account is `demo@replay.app` / `password123`. Sign-up and
sign-in return the user object, set the `replay_session` HttpOnly cookie, and
include the same opaque token in the `Authorization` response header. Send that
value as `Authorization: Bearer <token>` to authenticate without cookies.

Set `FRONTEND_ORIGINS` to a comma-separated list of allowed browser origins
when the frontend runs on a different origin.
