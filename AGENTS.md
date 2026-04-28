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
