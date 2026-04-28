# Repository Agent Guidelines

## Scope
These guidelines apply to the entire repository.

## Project intentions
- Keep this repository modular and workspace-driven.
- Preserve a clear boundary between apps and reusable packages.
- Keep early-stage scaffolding simple and well documented.

## Current constraints
- Do not add AI provider SDK integrations yet.
- Do not add authentication flows yet.

## Quality baseline
- Keep root scripts functional (`build`, `typecheck`, `lint`, `test`).
- Ensure each workspace package has a minimal build and test story.
- Update docs in `docs/` when introducing new modules.
