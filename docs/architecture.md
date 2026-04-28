# Architecture (Stub)

## Monorepo shape
- Apps: runtime entrypoints (`apps/web`, `apps/api`)
- Packages: reusable domain modules (`packages/*`)

## Initial module responsibilities
- `shared`: common types/constants and cross-cutting contracts
- `calculations`: deterministic engineering math and validation helpers
- `extraction`: extraction pipeline interfaces and normalization contracts
- `reports`: report assembly contracts and format adapters

## Runtime direction
- `apps/api` orchestrates extraction, calculations, and reporting workflows.
- `apps/web` consumes API contracts and presents project/report state.

## API layer
- `apps/api` now exposes a basic HTTP JSON API for projects, documents, components, engineering values, and engineering modules.
- Request validation is performed with schemas from `packages/shared` before data is accepted.
- Persistence currently uses an in-memory repository/service layer abstraction to keep data access isolated.
- This in-memory storage is intentionally temporary and is designed to be replaced by PostgreSQL in a later iteration without rewriting route handlers.
- A calculation endpoint is included for `hydraulicPowerKw`, delegating deterministic computation to `packages/calculations`.

## Deferred architecture concerns
- AI service abstraction and model routing
- AuthN/AuthZ boundaries
- Deployment topology
