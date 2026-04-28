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


## Web UI
- `apps/web` provides a basic browser UI for project listing/creation, project details, component creation, engineering value manual entry, and value approval/rejection flows.
- The web client calls API endpoints in `apps/api` through a small reusable API client module; deterministic calculations are executed through the API, not directly in the UI.
- A basic Hydraulic Power module form is included and posts inputs (`flowLpm`, `pressureBar`, `efficiency`) to the hydraulic calculation endpoint.
- This initial UI intentionally supports manual entry only; AI extraction workflows will be added later.
