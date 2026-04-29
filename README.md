# Ommatidia: Engineering Design Assistant

This repository is a **TypeScript monorepo scaffold** for an engineering design assistant platform.

> Current scope: repository structure, package boundaries, shared schemas, deterministic calculations, a basic API layer, and a basic manual-entry web UI.
>
> Explicitly out of scope for this iteration:
> - AI model/provider integration
> - Authentication and authorization

## Quick start (beginner-friendly)

### With Make (recommended for Codespaces/Linux/macOS)

```bash
make setup
make start
```

Useful follow-up commands:

```bash
make check
make test
make clean
make reset-local
```

### If `make` is unavailable (npm-only)

```bash
npm run setup
npm run start
npm run check
npm run test
npm run clean
npm run reset-local
```

### OPENAI_API_KEY check (without printing secret)

```bash
test -n "$OPENAI_API_KEY" && echo "OPENAI_API_KEY is set" || echo "OPENAI_API_KEY is missing"
```

Notes:
- `setup` installs dependencies, creates `.env` from `.env.example` only when `.env` is missing, and prepares `storage/uploads/`.
- `start` launches API and web together for local development.
- Default local URLs: Web `http://localhost:3000` (opening this URL shows the Projects page by default). The web app proxies same-origin `/api/*` requests to the API server at `http://127.0.0.1:3001/*`.
- `reset-local` deletes local development uploads in `storage/uploads` and recreates the folder; it does not delete `.env`.
- In GitHub Codespaces, `OPENAI_API_KEY` can be provided via Codespaces/repository secrets or environment variables.
- The default extraction provider is `mock`, so real OpenAI credentials are not required for basic local startup.
- If the web UI appears blank, open the browser developer console and check for JavaScript errors.
- In GitHub Codespaces, opening forwarded port `3000` is enough for normal app use because browser API calls go to same-origin `/api` and are proxied by the web server to the internal API process on port `3001`.
- Header status badge shows OpenAI/extraction mode from backend `/api/system/status`; it only checks server configuration and does not display or validate the actual API key.
- "OpenAI connected" means the server has an API key configured; it is not a full extraction health check.
- Use "Test OpenAI" in the header to run a tiny live connectivity/configuration request that sends no user document content.
- Header includes an extraction provider switch (Mock/OpenAI) that updates runtime server mode via `/api/system/extraction-provider` without restart.
- Mock mode is safe for testing and does not call OpenAI.
- OpenAI mode may use API credits when extraction is run.
- API keys remain server-side only; the UI never stores or displays keys.


### Troubleshooting web/API connection in Codespaces

- Web UI runs on port **3000** (forward/open this port in browser).
- API process still runs on port **3001** internally.
- Browser requests now use same-origin `/api` on port 3000, and the web server proxies to `http://127.0.0.1:3001`.
- If the Projects page shows `Failed to fetch`, verify both dev processes are running (`make start`), then refresh.
- You should not need to forward port 3001 for normal app usage.

## Repository layout

- `apps/web` — future web frontend shell
- `apps/api` — backend API for core CRUD and deterministic calculations
- `packages/shared` — shared types/constants and zod schemas
- `packages/calculations` — deterministic engineering calculations
- `packages/extraction` — document/data extraction contracts
- `packages/reports` — report generation contracts
- `docs` — product and architecture documentation stubs

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
```

## Common commands

Run from repository root:

```bash
npm run build
npm run typecheck
npm run lint
npm run test
```

## Testing

See the full acceptance checklist and coverage map in [`docs/test-plan.md`](docs/test-plan.md).

Core validation commands (run from repository root):

```bash
npm run typecheck
npm run test
```

## API commands

Run from repository root:

```bash
npm run build --workspace @ommatidia/api
npm run test --workspace @ommatidia/api
npm run start --workspace @ommatidia/api
```

## Notes

- The API currently uses an in-memory repository/service layer and does not persist across restarts.
- The in-memory data layer is intentionally temporary and is planned to be replaced by PostgreSQL later.


## Web app commands

Run from repository root:

```bash
npm run build --workspace @ommatidia/web
npm run test --workspace @ommatidia/web
npm run start --workspace @ommatidia/web
```

Notes:
- The web UI currently supports **manual entry only** for projects, components, and engineering values.
- AI extraction and document upload will be added in later tasks.

## Local document uploads

API uploads are stored in `storage/uploads/` for local development only. The folder is gitignored and should be replaced by managed object storage in production. This task only stores raw files + metadata (no OCR/extraction yet).

## AI extraction setup

- Copy `.env.example` to `.env`.
- Set `OPENAI_API_KEY` to use real OpenAI extraction.
- By default, the API uses a deterministic mock extraction service for tests/local development.
- AI extracted values are candidate data only and must be reviewed/approved before final use.

## Extraction environment variables

- `EXTRACTION_PROVIDER` (`mock` or `openai`)
- `OPENAI_API_KEY` (required only for `openai`)
- `EXTRACTION_TIMEOUT_MS` (default `15000`)
- `EXTRACTION_MAX_RETRIES` (default `2`)
- `OPENAI_EXTRACTION_MODEL` (default `gpt-4.1-mini`)

## Run with mock extraction

```bash
EXTRACTION_PROVIDER=mock npm run start --workspace @ommatidia/api
```

## Troubleshooting extraction errors

- `missing_api_key`: set `OPENAI_API_KEY` or switch to `EXTRACTION_PROVIDER=mock`.
- `invalid_api_key`: key is present but rejected by OpenAI; rotate/fix the key.
- `permission_denied`: key/project lacks model access; verify organization/project permissions.
- `model_not_found`: check `OPENAI_EXTRACTION_MODEL` value (or default model availability).
- `bad_request`: request/model configuration invalid; review payload/model settings.
- `request_timeout`: increase `EXTRACTION_TIMEOUT_MS` or retry.
- `rate_limited`: wait and retry; retries are automatic up to `EXTRACTION_MAX_RETRIES`.
- `network_failure`: transient connectivity issue between API server and provider.
- `provider_unavailable`: fallback when failure cannot be classified safely; retry later and inspect provider status.
- `invalid_model_response`: provider returned no parseable output text; check safe diagnostics (model/response id/output item types/status and whether document content was included).
- `invalid_json_response`: model returned text that was not valid JSON.
- `schema_invalid_response`: model returned JSON that failed required extraction schema fields.
- `Dropped candidate failed schema validation`: OpenAI returned candidate data, but one or more candidates did not match required value fields; the app now reports concise safe reasons (for example missing value, invalid valueType, or invalid sourceReferences shape).
- `unsupported_response_shape`: provider response shape was unexpected for configured parsing path.
- `file_not_found` / `unsupported_file_type`: re-upload a supported document.

- Word report export is generated deterministically in `@ommatidia/reports` and returned as `.docx` from the API.

### Troubleshooting: Extraction succeeded but returned 0 values
- Check attempt warnings/diagnostics in the UI (provider, content read/sent, skipped conflicts).
- Common causes: scanned/image-only PDF without OCR, no supported engineering fields, schema-invalid model candidates dropped, or approved-value conflicts skipped.
- Re-upload a text-readable datasheet/manual and retry.

### Troubleshooting: `Invalid field: sourceReferences`
- The extraction layer now normalizes legacy/source-variant shapes (`sourceReference`, string, object, mixed arrays) into `sourceReferences[]` before shared-schema validation.
- Invalid reference entries are dropped item-by-item without dropping otherwise valid candidate values.
- If references are missing entirely, `sourceReferences` defaults to `[]`.

### Troubleshooting: PDF text extraction produced metadata/font information
- If extraction diagnostics show low useful text and warnings about visible text quality, the parser likely encountered PDF internals (font/encoding/xref/stream metadata) instead of human-readable document text.
- In this case extraction returns:
  - `PDF text extraction did not produce useful visible text.`
  - `OCR or vision extraction is required for this document.`
- The API/UI diagnostics now expose extracted text character count and useful text character count to help confirm whether a text-readable PDF was parsed correctly.
- This avoids sending bad PDF internals to OpenAI as evidence and avoids unrelated guessed values.

## Troubleshooting
- If OpenAI reports the file looks like PDF metadata/internal structure, use extraction attempt debug details and extracted text preview to verify what text is sent.
