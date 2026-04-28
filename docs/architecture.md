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

## Deferred architecture concerns
- AI service abstraction and model routing
- AuthN/AuthZ boundaries
- Deployment topology
