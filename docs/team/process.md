# Specification-Driven Development Process

Replay uses Specification-Driven Development (SDD): define user needs and
checkable acceptance criteria before implementation, then verify the delivered
behavior against those criteria. The
[product specification](../spec.md) and
[OpenAPI contract](../../openapi.yaml) are shared references for the team.

## Iterative lifecycle

Work proceeds through these stages, with feedback and clarification carried
forward between stages:

1. **Frontend Mock Prototype** — build and review a frontend prototype against
   mocked service data. Use it to make the intended screens and user flows
   tangible before committing to backend behavior. The mock is a prototyping
   tool, not the production data source.
2. **OpenAPI contract** — define the production REST API paths, operations,
   request and response schemas, and error behavior in `openapi.yaml`. Agree on
   this boundary before independently implementing frontend integration and
   backend behavior.
3. **FastAPI Backend** — implement the specified operations and validation in
   FastAPI, and test the API behavior against the OpenAPI contract.
4. **SQLite (SQLAlchemy)** — persist application data using SQLAlchemy ORM with
   SQLite as the current database. Keep persistence logic database-agnostic by
   using portable ORM behavior rather than SQLite-specific application logic.
5. **Integration** — connect the frontend to the production API, verify
   end-to-end behavior against the acceptance criteria, run frontend and
   backend tests, and resolve integration defects before declaring the work
   complete.

Frontend and backend responsibilities remain decoupled by the API contract.
Changes to the contract are coordinated and reflected in both implementations
and their tests.

## Roles and responsibilities

### Product Manager — Grooming

Groom the request before implementation. Structure the requirements as Goal,
Acceptance Criteria, Out of Scope, and Constraints. Acceptance criteria must be
observable and checkable. Record moved work as linked follow-up issues rather
than silently dropping it. The Product Manager does not write code.

See [pm.md](./pm.md).

### Software Engineer — Implementation and Tests

Implement the agreed acceptance criteria and constraints, following the
OpenAPI contract and existing architecture. Add or update tests for the
implemented behavior, run relevant checks, and commit regularly after
meaningful verified changes.

See [software-engineer.md](./software-engineer.md).

### QA Engineer — Verification

Verify the completed work against every acceptance criterion using the running
application and relevant tests. Report an explicit PASS or FAIL verdict with
test commands and results. QA does not modify application code.

See [qa-engineer.md](./qa-engineer.md).

## Bug tracking

Track defects and follow-up work in GitHub Issues. Include observed and
expected behavior, reproducible steps, and relevant acceptance criteria or
contract references so the issue can be groomed, implemented, and verified.
