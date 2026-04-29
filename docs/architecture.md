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

## Document upload

The API now supports local development uploads for PDF/image files to project-scoped document records. Files are written to `storage/uploads/` with generated unique stored filenames, while metadata is tracked in the document model and served through `/documents` endpoints. This implementation is intentionally local-only for development and should move to managed object storage later. No AI extraction, OCR, or content parsing is performed in this stage.

## AI extraction pipeline

The first extraction pipeline is synchronous and runs inside `apps/api`:
1. Client calls `POST /extractions` with `projectId` and `documentId`.
2. API loads document metadata and verifies the uploaded file exists.
3. API invokes an `ExtractionService` (`mock` by default, `openai` when configured).
4. Candidate `EngineeringValue` records are stored with `needs_review`/`ai_extracted` status only.
5. Approved values are never overwritten by extraction writes.

No background jobs, OCR pipeline, or report generation side effects are included in this phase.

## Extraction error handling

Extraction uses typed normalized errors with codes, retryable flags, safe details, and timestamps. API endpoints map extraction errors to stable HTTP status codes and never crash the server. Failed extraction attempts are tracked in-memory at service/repository level (`pending|succeeded|failed`) with provider, project/document IDs, and safe error messages to support UI history and future PostgreSQL migration.
