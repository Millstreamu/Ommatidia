# AGENTS.md

## Project purpose

This repository is for an engineering design assistant that helps users upload technical documents, extract structured engineering information, review and approve the data, run deterministic engineering calculations, and generate reusable summaries and report sections.

The system must support different project types such as hydraulic power packs, winches, cooling systems, pump systems, and custom engineering projects.

## Core product principles

- Treat AI output as draft/candidate data, never as automatically approved engineering truth.
- All final calculations must be deterministic and implemented in code or validated formula modules.
- Every extracted engineering value should preserve source traceability where possible:
  - document id
  - page number if available
  - source text or region reference if available
  - confidence
  - extraction timestamp
- User-entered and user-approved values take priority over AI-extracted values.
- Calculations should use approved or user-entered data by default.
- The system should make missing information visible instead of guessing.
- Prefer modular, extensible design over hard-coded project-specific workflows.

## Architecture

Use a modular architecture:

- `apps/web` contains the user interface.
- `apps/api` contains backend API routes.
- `packages/shared` contains shared types and schemas.
- `packages/calculations` contains deterministic engineering calculations.
- `packages/extraction` contains AI extraction prompts, schemas, and parsing logic.
- `packages/reports` contains report and Word export logic.
- `docs` contains product and architecture documentation.

Do not put business logic directly inside UI components.

## Engineering module model

The app should support configurable modules.

A module may be one of:

- extraction module
- summary module
- comparison module
- calculation module
- checklist module
- report module

Modules should define:

- name
- description
- applicable project types
- required inputs
- optional inputs
- outputs
- units
- validation rules
- calculation method if applicable
- report template if applicable

Avoid hard-coding project types such as `hydraulic_power_pack` or `winch` throughout the app. Prefer generic project/module/component relationships.

## AI extraction rules

AI extraction must return structured JSON matching schemas in `packages/shared`.

AI extraction should:

- include source references where possible
- include confidence scores
- mark uncertain values as `needs_review`
- preserve units from the source document
- normalize units only through explicit unit conversion utilities
- avoid inventing missing values
- include a `missing_information` list when required values are not found

AI extraction must not:

- silently overwrite approved values
- perform final engineering calculations
- fabricate page numbers or source references
- assume component ratings without source evidence

## Calculation rules

Calculations must be deterministic.

Each calculation function must:

- have clear input units
- have clear output units
- validate required inputs
- return warnings for questionable inputs
- include unit tests
- avoid hidden assumptions

AI may help draft formulas, but formulas and calculation functions must be reviewed and tested before use.

## Unit handling

All engineering values must store:

- numeric value
- unit
- display label
- source
- status

Do not store important engineering values as plain strings unless unavoidable.

Unit conversion utilities should be centralized.

## Data statuses

Use explicit statuses for extracted and entered data:

- `ai_extracted`
- `needs_review`
- `approved`
- `rejected`
- `user_entered`
- `superseded`

Final reports and calculations should default to `approved` and `user_entered` values only.

## Security

Do not commit API keys, secrets, tokens, private documents, or customer data.

Use environment variables for secrets.

Do not expose OpenAI API keys in frontend code.

Do not add sample files containing confidential engineering or commercial information.

## Testing expectations

When adding calculation logic, add unit tests.

When adding schemas, add validation tests.

When changing API routes, add route tests where practical.

Before finishing a task, run the relevant tests and report what passed or failed.
- When adding or changing features, update `docs/test-plan.md` acceptance criteria and coverage map.
- Add or update automated tests for new/changed acceptance criteria where practical.
- Run `npm run typecheck` and `npm run test` from repo root before completion.
- Report failures honestly; do not claim passing status for unrun or failing checks.

## Code style

- Use clear names.
- Keep functions small.
- Prefer typed data structures.
- Avoid large unstructured JSON blobs when a schema is known.
- Add comments only where they clarify non-obvious engineering or architectural decisions.

## Documentation expectations

When adding a major feature, update the relevant document in `docs`.

Important docs:

- `docs/product-spec.md`
- `docs/architecture.md`
- `docs/data-model.md`
- `docs/module-system.md`
- `docs/ai-safety-rules.md`

## Review guidelines

When reviewing code, check for:

- AI output being treated as final without review
- missing source traceability
- calculations without tests
- hard-coded project assumptions
- unit mismatches
- API keys or secrets in client code
- poor handling of missing data
- unclear data statuses

## Developer workflow

The user is not an experienced coder and often works through GitHub Codespaces.

- Prefer beginner-friendly commands and clear terminal output.
- Use the standard workflow commands:
  - `make setup` to prepare the repo
  - `make update` to stop stale processes, pull, install/build/check, and print next steps
  - `make start` to run local web/API services
  - `make check` to run typecheck and tests
- Task completion baseline: `npm run typecheck` and `npm run test` must pass.
- After runtime UI/API changes, assume the user will run `make update`, `make start`, and open forwarded port `3000`.
- Do not require users to manually patch code as part of normal workflows unless unavoidable.

## UI/UX principles

Build a clean engineering/admin dashboard experience, not a marketing page.

Prefer:
- clear headings and concise helper text
- card-based sections and tables for engineering values
- obvious buttons/forms and status badges
- explicit loading, empty, success, and error states
- expandable details for long diagnostics/previews

Avoid:
- long unstructured text dumps in main views
- hidden failures or ambiguous extraction/provider status
- controls that remain disabled after failed actions
- requiring users to guess routes/ports
- exposing secrets or raw API internals

Important workflows must be visible and recoverable: failures should show friendly messages and re-enable controls.

## App layout expectations

Use a consistent app shell with a clear header (including extraction/OpenAI status where relevant), a project list page, and project detail workflow sections.

Preferred project detail section order:
1. Project overview
2. Components
3. Component data review
4. Documents and extraction
5. Extraction fixtures
6. Component library
7. Calculations
8. Report sections

Two-column layouts are acceptable on wide screens; stack sections on small screens.

## Component data review workflow

Group engineering values by component when possible and separate by status:
- **Approved data**: `approved`, `user_entered`
- **Needs review**: `needs_review`, `ai_extracted`
- **Rejected**: `rejected`

Rules:
- Approved/user-entered values are committed data and should not present Approve/Reject as primary actions.
- Needs-review values should provide clear Approve/Reject actions.
- Rejected values must be visually separated from current/approved data.
- Unassigned extracted values must remain visible in a separate section and be assignable.
- AI-extracted values must never be auto-approved.

## Document extraction workflow

Documents can be attached to a project and optionally a component.

- If a document is component-assigned, extracted candidate values should be assigned to that component.
- Extraction attempt rows should show: status, provider/mode, created values count, safe value labels/keys, warnings/errors, OpenAI-called signal when relevant, and fixture name when applicable.
- `created` counts must include only persisted `EngineeringValue` records (not diagnostics, previews, dropped/skipped candidates, or warnings).
- Collapse long diagnostics/text previews by default.

## Fixture workflow

Use fixtures to replay saved extraction results without consuming OpenAI credits.

- Fixture mode must not call OpenAI.
- Fixtures must not store API keys/secrets/authorization headers.
- Avoid storing full raw document text or huge raw model responses by default.
- Fixture UI should show clear states: loading, empty, list, and load-failed.
- Saving fixtures must show explicit success or failure (never silent failure).
- Replayed values should regenerate ids/project/document/component/timestamps, default to `needs_review`, and clearly indicate fixture replay/test origin in attempt details.

## Component library workflow

The component library stores reusable reviewed component data.

- Promote `approved` and `user_entered` values by default.
- Promotion UX should show library name, tags, optional description, and value count.
- If no eligible values exist, disable promotion or show a clear error.
- Support simple search by component name/type/tags and manufacturer/model where practical.
- Library entries should show name, type, tags, approved value count, and origin when available.
- Copying from library must not auto-overwrite project values.

## API and error-handling rules

- Convert API failures into friendly, user-visible messages.
- Never leave the UI stuck in loading after failure.
- Browser calls should use same-origin `/api` proxy by default.
- Do not expose `OPENAI_API_KEY`, auth headers, raw secrets, unnecessary full document contents, or huge raw model responses.
- OpenAI status may show configured/not configured, provider/mode, safe model name, and smoke-test pass/fail.
- Never show full or partial API keys.

## Testing and verification

For feature work, add/update tests for:
- success path
- empty state
- error state
- key safety behavior
- UI state reset after failure

For UI work, test visible labels/buttons/statuses and state transitions where practical.

Before finishing tasks, run and report:
- `npm run typecheck`
- `npm run test`
- `make check`

Report failures honestly and distinguish task regressions from environment issues.

## Documentation expectations

When user-facing behavior changes, update relevant docs:
- `README.md` for operator/developer workflow updates
- `docs/test-plan.md` for acceptance criteria and coverage
- `docs/ai-safety-rules.md` for AI/key/data-safety changes
- `docs/architecture.md` for meaningful architecture changes

Do not churn docs for tiny internal-only edits.

