# Module System (Stub)

## Package boundaries
- `apps/*` consume package APIs but should avoid duplicating domain logic.
- `packages/*` expose stable, documented TypeScript interfaces.

## Dependency direction
- `shared` is foundational and can be consumed by all other modules.
- Domain packages (`calculations`, `extraction`, `reports`) may depend on `shared`.
- Apps can depend on all packages.

## Coding conventions
- Prefer explicit interfaces for cross-package contracts.
- Keep packages framework-agnostic until runtime requirements are finalized.
- Keep tests colocated per package.
