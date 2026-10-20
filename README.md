# Replay

Replay is a personal movie log for recording the films you have watched and
remembering what you thought about them. Keep movie details, ratings, reviews,
and memorable quotes together, then browse your journal and explore viewing
statistics.

## Tech stack

- **Frontend:** React, TypeScript, and Vite
- **Backend:** FastAPI
- **Database:** SQLite, accessed with SQLAlchemy ORM
- **API contract:** OpenAPI, defined in [`openapi.yaml`](./openapi.yaml)

## Setup

Requirements: Python 3, Node.js, and npm.

From the repository root, install the backend dependencies and prepare the
frontend dependencies:

```sh
make setup
cd frontend && npm ci
```

## Run

Start the API from the repository root:

```sh
make run
```

In a second terminal, start the frontend:

```sh
make frontend
```

The frontend is served at `http://127.0.0.1:8080` and the API at
`http://127.0.0.1:8000`. The API's interactive documentation is available at
`http://127.0.0.1:8000/docs`. To use a different API port, pass the same
`PORT` value to both commands, for example `make run PORT=8001` and
`make frontend PORT=8001`.

## Test

Run the backend test suite from the repository root:

```sh
make test
```

Run the frontend tests from the `frontend` directory:

```sh
npm test
```

## Product documentation

- [Product specification](./docs/spec.md)
- [Brainstorm and feature planning](./docs/brainstorm_chat.md)
- [Development process](./docs/team/process.md)
