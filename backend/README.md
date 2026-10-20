# Replay API

Run the API from this directory:

```sh
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available under `/api`; interactive OpenAPI documentation is at
`/docs`. It uses an in-memory store and resets when the process restarts.

The seeded demo account is `demo@replay.app` / `password123`. Sign-up and
sign-in return the user object, set the `replay_session` HttpOnly cookie, and
include the same opaque token in the `Authorization` response header. Send that
value as `Authorization: Bearer <token>` to authenticate without cookies.

Run tests with `python -m pytest` from this directory. Set `FRONTEND_ORIGINS` to
a comma-separated list of allowed browser origins when the frontend runs on a
different origin.
