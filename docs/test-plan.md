# Test Plan

## Purpose
This test plan defines acceptance criteria and validation strategy for existing engineering design assistant capabilities. It ensures AI output remains reviewable candidate data, deterministic calculations remain code-driven, and critical workflows are verified through automated and manual tests.

## Test levels
- **Unit tests**: schema validation, deterministic calculations, extraction normalization/parsing, report generation/export utilities.
- **API tests**: end-to-end route workflows for projects, components, engineering values, extraction attempts, report sections, and DOCX export.
- **UI tests**: rendering and interaction helpers for forms, document lists, report section editing, and export triggers.
- **Manual smoke tests**: full user journeys and UX/error-message checks that are hard to assert in current lightweight test harness.

## Core feature acceptance checklist

### Project management
- [ ] User can create a project.
- [ ] User can list projects.
- [ ] User can open project details.
- [ ] User can update and delete a project if supported.

### Component management
- [ ] User can add a component to a project.
- [ ] User can list project components.
- [ ] User can add engineering values to a component.
- [ ] User can approve or reject engineering values.

### Deterministic calculations
- [ ] Hydraulic power calculation works.
- [ ] Pump flow calculation works.
- [ ] Motor torque calculation works.
- [ ] Winch line pull calculation works.
- [ ] Rope speed calculation works.
- [ ] Invalid inputs fail clearly.
- [ ] AI is not used for deterministic calculations.

### Document upload
- [ ] User can upload supported PDF/image files.
- [ ] Unsupported files are rejected.
- [ ] Oversized files are rejected if size limit is implemented.
- [ ] Uploaded document metadata is listed.
- [ ] Uploaded files are not committed to Git.

### AI extraction
- [ ] Mock extraction works without an API key.
- [ ] OpenAI extraction reads API key only from server environment.
- [ ] Extracted values are saved as `needs_review` or `ai_extracted`.
- [ ] Extracted values do not overwrite approved values.
- [ ] Missing files return clear errors.
- [ ] Invalid AI responses are not saved.

### Extraction error handling
- [ ] Missing API key returns `missing_api_key` when OpenAI provider is selected.
- [ ] Timeout returns `request_timeout`.
- [ ] Rate limit/provider failure is retryable.
- [ ] Invalid JSON/model output is rejected.
- [ ] Failed attempts are tracked.
- [ ] UI shows friendly error messages.

### Report sections
- [ ] Report generation includes approved values.
- [ ] Report generation includes user_entered values.
- [ ] Report generation excludes unapproved AI values by default.
- [ ] Report sections can be generated, listed, edited, saved, and deleted.
- [ ] Report sections are deterministic and do not call OpenAI.

### Word export
- [ ] User can export selected report sections to `.docx`.
- [ ] Export includes project title and selected sections.
- [ ] Export preserves selected section order.
- [ ] Export can include source references.
- [ ] Export rejects missing projectId.
- [ ] Export rejects empty section selection.
- [ ] Export rejects sections from another project.

### Developer commands / local operations
- [ ] One-command setup installs dependencies and prepares local environment.
- [ ] Setup creates `.env` from `.env.example` only when `.env` is missing.
- [ ] Setup prepares `storage/uploads` for local development uploads.
- [ ] One command starts API + web together for development.
- [ ] One command runs typecheck + tests.
- [ ] Clean command removes build outputs without deleting `.env` or uploads.
- [ ] Reset-local command (if used) clearly warns and only clears local dev upload data.



### UI usability and workflow clarity
- [ ] Root web route (`/`) opens the main Projects UI without requiring a custom path.
- [ ] Projects page shows empty/loading/error states with clear create/open affordances.
- [ ] Project details are grouped into workflow sections (overview, components, values, documents, extraction, calculations, report, export).
- [ ] Engineering value statuses are visually explicit, with clear approve/reject actions.
- [ ] Document extraction surfaces loading/success/friendly error/retry cues.
- [ ] Hydraulic calculation UI labels expected units and presents readable results.
- [ ] Report section edit/save flow and Word export action/status remain clear and functional.

## Manual smoke test checklist
1. Create project, component, and engineering values in the web app.
2. Upload valid PDF and image files and verify document metadata appears.
3. Trigger extraction in mock mode and review statuses.
4. Approve/reject extracted values from UI.
5. Generate report sections and confirm content filter behavior for approved/user-entered only defaults.
6. Edit and save a report section.
7. Export selected sections and open resulting `.docx` in Word/LibreOffice.
8. Validate extraction failures show friendly UI errors for missing API key, timeout, and malformed response.

## Automated test coverage map
| Acceptance item | Coverage |
|---|---|
| Project create/list/get | Covered by API test |
| Project update/delete (if supported) | Missing (routes not implemented) |
| Component create/list | Covered by API test |
| Engineering value create | Covered by API test |
| Engineering value approve/reject | Covered by API test |
| Hydraulic power calculation correctness | Covered by unit test + API test |
| Pump flow/motor torque/winch line pull/rope speed correctness | Covered by unit test |
| Invalid calculation inputs fail clearly | Covered by unit test |
| Deterministic calculations avoid AI | Covered by unit test (package-level deterministic functions) |
| Supported file upload | Covered by API test |
| Unsupported file rejection | Covered by API test |
| Oversized file rejection | Missing (size limit not implemented) |
| Uploaded document metadata listed | Covered by UI test |
| Web root route (`/`) serves Projects UI shell | Covered by UI test |
| Projects empty/list rendering states | Covered by UI test |
| Project details workflow section headings | Covered by UI test |
| Engineering status badge rendering | Covered by UI test |
| Calculation result readability labels | Covered by UI test |
| Report edit/save representation + export trigger helper | Covered by UI test |
| Uploaded files not committed to Git | Manual only (repo hygiene check) |
| Mock extraction without API key | Covered by unit test + API test |
| OpenAI extraction key from server env | Covered by unit test |
| Extracted values stored as needs_review/ai_extracted | Covered by API test |
| Approved values not overwritten on rerun | Covered by API test |
| Missing extraction file error | Covered by API test |
| Invalid AI responses not saved | Covered by unit test |
| missing_api_key error | Covered by unit test |
| request_timeout error | Covered by unit test |
| retryable rate limit/provider failure | Missing (needs provider fault-injection harness) |
| Failed extraction attempts tracked | Covered by API test |
| UI friendly extraction errors | Manual only |
| Report includes approved values | Covered by unit test + API test |
| Report includes user_entered values | Covered by unit test |
| Report excludes unapproved AI values | Covered by unit test + API test |
| Report section CRUD | Covered by API test |
| Report generation deterministic/no OpenAI | Covered by unit test |
| DOCX export selected sections | Covered by API test |
| DOCX export includes project title | Covered by unit test |
| DOCX export preserves section order | Covered by unit test |
| DOCX export source references option | Covered by unit test + API test |
| DOCX export rejects missing projectId | Covered by API test |
| DOCX export rejects empty section selection | Covered by API test |
| DOCX export rejects foreign project sections | Covered by API test |
| One-command setup + safe .env initialization | Covered by manual command verification |
| One-command API+web start for local dev | Covered by manual command verification |
| One-command typecheck+test (`check`) | Covered by manual command verification + existing CI-style commands |
| Clean preserves .env and uploads | Covered by script behavior review + manual command verification |
| Reset-local only clears local uploads and preserves .env | Covered by manual command verification |

## Known gaps
- Project update/delete acceptance is defined but currently unsupported by API routes; leave as planned coverage until implemented.
- Upload size-limit behavior cannot be tested yet because no explicit size cap exists.
- Retryable provider failure mapping (e.g., rate limit/provider unavailable) needs deterministic provider stubs/fault injection in API tests.
- UI-friendly extraction error display is only manually verifiable with current UI test harness.

## Commands to run
From repository root:
- `npm install`
- `npm run typecheck`
- `npm run test`

Package-focused (optional):
- `npm run test --workspace @ommatidia/api`
- `npm run test --workspace @ommatidia/web`
- `npm run test --workspace @ommatidia/calculations`
- `npm run test --workspace @ommatidia/extraction`
- `npm run test --workspace @ommatidia/reports`
- `npm run test --workspace @ommatidia/shared`

## Rules for adding new features
1. Add/extend acceptance criteria in this file before implementing feature behavior.
2. Add or update automated tests that cover each new acceptance criterion at the correct test level.
3. Keep deterministic calculations in `packages/calculations` with unit tests and clear units/validation.
4. Preserve AI extraction safety: no silent overwrite of approved values and explicit review statuses.
5. Run and report `npm run typecheck` and `npm run test` before completion.
6. Report failures honestly and document any justified temporary gaps in **Known gaps**.
