# Development process

Replay is developed through specification-driven, contract-first iterations.
The product specification and API contract provide a shared reference for
frontend and backend work, while implementation and tests evolve in small
steps.

## Specification-Driven Development

Define the user problem, MVP scope, behaviors, and acceptance criteria before
implementation. Keep product requirements in the
[product specification](../spec.md); use those requirements to guide design,
implementation, and tests. Refine the specification when decisions or
requirements change so it remains a reliable source of truth.

## Frontend/backend decoupling

Develop the React frontend and FastAPI backend as separate parts of the
application. The frontend communicates with the backend through HTTP APIs, not
through backend implementation details. This separation lets the frontend
continue development against a mock service while the API is being implemented,
and allows either side to change internally without changing the other side's
responsibilities.

## OpenAPI contract definition

Define API paths, request and response shapes, and expected behavior in
[`openapi.yaml`](../../openapi.yaml). Treat the contract as the boundary between
the frontend and backend: frontend integration and backend implementation
should agree with it. Update the contract alongside any intentional API change
and verify both sides against the updated definition.

## Iterative data evolution

Evolve data handling in deliberate stages:

1. **Mock:** use a frontend mock service to build and exercise product flows
   before a real API is available.
2. **In-memory:** implement backend behavior against an in-memory store to
   establish and test the API behavior without depending on persistent data.
3. **SQLite ORM:** move to SQLite persistence through SQLAlchemy ORM so journal
   entries survive server restarts.

Keep the API contract and user-facing behavior consistent as storage evolves.

## Bug tracking

Track defects and follow-up work in GitHub Issues. Report a reproducible
problem with its observed behavior, expected behavior, and relevant context;
use issues to prioritize, discuss, and track fixes through verification.
