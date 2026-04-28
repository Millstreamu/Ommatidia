# Ommatidia: Engineering Design Assistant

This repository is a **TypeScript monorepo scaffold** for an engineering design assistant platform.

> Current scope: repository structure, package boundaries, scripts, and design documentation stubs.
>
> Explicitly out of scope for this initial scaffold:
> - AI model/provider integration
> - Authentication and authorization

## Repository layout

- `apps/web` — future web frontend shell
- `apps/api` — future backend API shell
- `packages/shared` — shared types/constants
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

## Notes

- All packages use workspace-local TypeScript builds.
- Tests are intentionally lightweight scaffold tests to validate package wiring.
- Add real app/runtime frameworks in follow-up iterations.
