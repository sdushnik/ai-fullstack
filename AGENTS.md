# Replay Agent Guidance

Follow Specification-Driven Development: use the product requirements and
checkable acceptance criteria as the source of truth. The development lifecycle
and team responsibilities are described in
[`docs/team/process.md`](./docs/team/process.md).

## CLI commands

Run these commands from the repository root unless the command itself changes
directories:

```sh
make run
make test
cd frontend && npm run dev
cd frontend && npm test -- --run
```

## Dependency management

For this repository, use `make setup` to create the root `.venv` and install
backend dependencies from `backend/requirements.txt`. Run backend Python tools
through that virtual environment or its corresponding `make` target; do not
install project dependencies globally or mix package managers for the same
environment.

If the backend is migrated to a `uv` project with a committed `pyproject.toml`
and lockfile, use `uv sync` to install dependencies and `uv add <PACKAGE>` to
add them. Keep the manifest and lockfile in sync. Until then, do not use `uv
sync` for this repository.

Run npm commands from `frontend/`, or use the documented root-level Makefile
targets where available.

## Database and persistence

Use SQLAlchemy ORM for persistence, with SQLite as the current database
configuration. Keep application data access database-agnostic: use ORM models,
expressions, relationships, and transactions rather than embedding
SQLite-specific SQL or relying on SQLite-only behavior. Prefer portable column
types and constraints so another SQLAlchemy-supported database can be used
without rewriting application logic. Keep database configuration separate
from domain behavior.

## Change and commit discipline

Make focused changes that satisfy the specification and its acceptance
criteria. Add or update tests for behavior changes, and update related
documentation when behavior or workflow changes. Commit regularly after
meaningful, verified changes; keep commits focused and do not include
unrelated worktree changes.
