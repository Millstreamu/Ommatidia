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
- [ ] Model candidates missing system metadata are normalized safely before validation/save.
- [ ] Dropped candidates show safe, specific reasons in API/UI warnings.
- [ ] Source-reference variants normalize safely without dropping valid candidates.
- [ ] Extraction uses only selected document content per attempt (no stale payload reuse).
- [ ] Image-only/no-text PDFs return clear OCR/vision warning and avoid unrelated guesses.
- [ ] PDF internals/metadata-heavy extraction is detected and blocked from OpenAI payloads.
- [ ] Extraction diagnostics include extracted/useful text character counts, timeoutMs, and model-call flag.


### Extraction fixtures and replay (Task 17B/17C)
- [ ] User can save a successful extraction result as a test fixture.
- [ ] Fixture list shows name, filename, value count, and created date.
- [ ] Fixture list state machine shows exactly one state: loading, empty, error, or list.
- [ ] Fixture save sanitizes secret-like fields and excludes full raw document text by default.
- [ ] Fixture list/get/delete API routes work without OpenAI calls.
- [ ] Fixture replay requires selected fixture in Fixture provider mode.
- [ ] Fixture replay creates `needs_review` values for selected document/component.
- [ ] Fixture attempt row clearly indicates `provider: fixture` and `OpenAI not called`.

### Extraction provider switching
- [ ] User can switch extraction provider between mock and OpenAI from header controls.
- [ ] OpenAI selection is blocked when server key is missing.
- [ ] Header warns that OpenAI extraction may use API credits.
- [ ] Switching provider updates extraction status display immediately.

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
- [ ] Update command safely stops local dev API process, refuses pull on dirty tree, then pulls/builds/checks without deleting `.env`, uploads, or fixtures.
- [ ] Clean command removes build outputs without deleting `.env` or uploads.
- [ ] Reset-local command (if used) clearly warns and only clears local dev upload data.



### UI usability and workflow clarity
- [ ] Root web route (`/`) opens the main Projects UI without requiring a custom path.
- [ ] Projects page shows empty/loading/error states with clear create/open affordances.
- [ ] Projects page shows API base URL debug line as `/api` in development/Codespaces.
- [ ] Project details are grouped into workflow sections (overview, components, values, documents, extraction, calculations, report, export).
- [ ] Engineering value statuses are visually explicit, with clear approve/reject actions.
- [ ] Header status badge shows OpenAI connected/key missing, mock mode, or unavailable state based on `/api/system/status`.
- [ ] Document extraction surfaces loading/success/friendly error/retry cues.
- [ ] Project create failure resets busy state and re-enables create button.
- [ ] Hydraulic calculation UI labels expected units and presents readable results.
- [ ] Report section edit/save flow and Word export action/status remain clear and functional.
- [ ] Engineering values are grouped by component cards with clear Approved data / Needs review / Rejected subsections.
- [ ] Approved and user_entered values do not show Approve/Reject actions.
- [ ] needs_review and ai_extracted values show Approve/Reject actions and move sections after status updates.
- [ ] Rejected values appear only in Rejected subsection.
- [ ] Unassigned extracted values are rendered separately and can be assigned to a component from UI.
- [ ] Component promotion form allows custom library name, tags, and optional description.
- [ ] Promotion count includes only approved/user_entered values and disables confirm at zero.
- [ ] Component library section shows loading/empty/error/result states clearly.
- [ ] Component library search finds by name/type/tag (and manufacturer/model when available).
- [ ] Library list shows tags and approved value counts for each item.

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
| Browser API calls use same-origin `/api` and web server strips `/api` when proxying to API on 3001 | Covered by UI/web proxy tests |
| Projects empty/list rendering states | Covered by UI test |
| Project details workflow section headings | Covered by UI test |
| Engineering status badge rendering | Covered by UI test |
| System status badge states (openai connected/missing, mock, unavailable) | Covered by API + UI tests |
| Extraction provider switch endpoint and runtime state updates | Covered by API tests |
| Header provider switch rendering, key-missing disable, credit warning | Covered by UI tests |
| Calculation result readability labels | Covered by UI test |
| Report edit/save representation + export trigger helper | Covered by UI test |
| Uploaded files not committed to Git | Manual only (repo hygiene check) |
| Mock extraction without API key | Covered by unit test + API test |
| OpenAI extraction key from server env | Covered by unit test |
| Extracted values stored as needs_review/ai_extracted | Covered by API test |
| Approved values not overwritten on rerun | Covered by API test |
| Missing extraction file error | Covered by API test |
| Invalid AI responses not saved | Covered by unit test |
| Source-reference variants normalize safely without dropping valid candidates | Covered by extraction unit test |
| Extraction uses only selected document content per attempt (no stale payload reuse) | Covered by extraction unit test |
| Image-only/no-text PDFs return OCR/vision-required warning and avoid unrelated guesses | Covered by extraction unit test |
| PDF internals/metadata-heavy extraction blocked from OpenAI payloads | Covered by extraction unit test |
| Extraction diagnostics include useful/extracted char counts and warning visibility in UI | Covered by extraction + UI tests |
| missing_api_key error | Covered by unit test |
| request_timeout error includes timeoutMs + retry guidance | Covered by unit test |
| retryable rate limit/provider failure | Covered by extraction unit tests with provider stubs |
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
| One-command update (`update`) safely stops/pulls/builds/checks and preserves `.env`, uploads, and fixtures | Covered by script behavior review + manual command verification |
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

- [x] Task 16: OpenAI extraction zero-value diagnostics visible in API/UI attempts; warnings required when valuesCreatedCount=0.


- [x] Task 16A: OpenAI extraction failures classify auth/permission/rate/timeout/model/bad-request/network errors and expose only safe diagnostics in API logs/UI.
- [x] Task 16B: OpenAI smoke test endpoint + UI button + safe empty-output diagnostics/parsing distinctions (empty vs invalid JSON vs schema invalid vs unsupported shape vs no document content).


- [x] Task 16C: Candidate normalization + safe dropped-candidate diagnostics + UI warning detail for extraction drops.
- [x] Task 16E: PDF visible-text extraction diagnostics + internal-metadata detection + safe OpenAI gating + UI diagnostic summary.

- [ ] Task 16G: suspicious/internal PDF extraction routes to OpenAI vision/file fallback when OpenAI provider is active.
- [ ] Task 16G: mock provider must not call OpenAI fallback.
- [ ] Task 16G: created counts reflect only persisted EngineeringValue rows.
- [ ] Task 16G: unassigned extracted values are visible in UI.

- [x] Task 17A: extraction with componentId saves EngineeringValue records under selected component.
- [x] Task 17A: extraction without componentId keeps values visible in Unassigned extracted values.
- [x] Task 17A: documents can be assigned/reassigned to a component from UI and API.
- [x] Task 17A: candidate review controls support approve/reject/assign actions.
- [x] Task 17A: extraction success refreshes engineering values and attempt details include created candidate keys.

## UI foundation acceptance criteria (Task 19A)
- Root HTML shell links a shared stylesheet (`/styles.css`) and server returns CSS content-type.
- App shell uses a cleaner layout foundation: header block, centered container, card surface styles.
- Reusable rendering helpers exist for badges/alerts and are covered by UI tests.
- Status badges map to status-specific class variants (`approved`, `user_entered`, `needs_review`, `ai_extracted`, `rejected`, `superseded`).
- Alert variants (`info`, `success`, `warning`, `error`) produce predictable class names.
- Existing extraction/provider workflows still pass existing UI tests.

### Settings runtime key management (Task 20)
- [ ] User can open Settings page from header nav.
- [ ] User can save runtime OpenAI key without seeing key in UI or API responses.
- [ ] Runtime key source is shown as runtime/environment/none.
- [ ] Clearing runtime key falls back to environment key when present.
- [ ] Smoke test and extraction use runtime key when present.

## Task 21A drill-down navigation acceptance criteria
- Projects page lists projects and create form.
- Project overview route shows summary stats and compact component cards with counts.
- Component detail route shows component header, status counts, values table, and assigned documents.
- Unassigned extracted values are visible via dedicated warning/link and review view.
- Extraction diagnostics and OpenAI text preview remain collapsed by default.
- Back navigation links are visible on drill-down pages.


## Task 21B-1 document detail shell acceptance criteria
- Document detail route supports `#/projects/:projectId/documents/:documentId`.
- Project overview document rows include an Open link to the document detail route.
- Component detail assigned document rows include an Open document link.
- Document detail shell shows Back to project, filename, document type, file size, upload/processing status, assigned component, and View file link.
- Missing/unknown document id shows friendly Document not found state with Back to project link.
