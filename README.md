# Ommatidia: Engineering Design Assistant

This repository is a **TypeScript monorepo scaffold** for an engineering design assistant platform.

> Current scope: repository structure, package boundaries, shared schemas, deterministic calculations, a basic API layer, and a basic manual-entry web UI.
>
> Explicitly out of scope for this iteration:
> - AI model/provider integration
> - Authentication and authorization

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
