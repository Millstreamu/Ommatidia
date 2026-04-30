# Product Spec (Stub)

## Vision
Build an engineering design assistant that helps engineers move from source artifacts to verified design outputs and report packages.

## Users
- Mechanical engineers
- Civil/structural engineers
- Review/approval stakeholders

## Core jobs to be done
1. Ingest engineering inputs (drawings, specs, data files).
2. Extract key entities and assumptions.
3. Run deterministic calculations with audit trails.
4. Generate report-ready outputs.

## Non-goals for current phase
- AI integration details
- Authentication/identity management

## Milestones (initial)
1. Monorepo scaffold and module contracts.
2. Data model finalization.
3. Calculation pipeline MVP.
4. Reporting MVP.

## Editable report sections

Project detail pages include a Report Sections area where users can generate deterministic markdown sections (Component Summary, Calculation Summary, Assumptions and Warnings, Missing Information, Source References), edit title/body, and save draft content through the API.

## Word export for report sections

Users can export saved report sections to a Microsoft Word `.docx` document from the Report Sections area. The export includes report title, project name, generated timestamp, selected sections in user-specified order, and optional source references.

## Reusable component library workflows

- Promote project component data to reusable library entries from approved or user_entered values only.
- Copy library components into projects without overwriting existing project values.
- Compare a library component against a project component with matching/differing/missing/extra buckets.


## User interface principles and primary workflows

- The web UI prioritizes clarity for non-technical users with a stable header, simple navigation, and workflow-oriented sections.
- Project details are grouped into predictable sections: Project overview, Components, Engineering values, Documents, AI extraction, Calculations, Report sections, and Word export.
- Documents in project and component views include an Open action that navigates to a dedicated document detail page with metadata and back navigation.
- Document detail pages include extraction attempt history with collapsed diagnostics so project overviews stay compact while preserving deep troubleshooting context.
- Document detail pages are the primary place for document-specific extraction actions (component assignment, run/retry extraction, fixture replay selection, and save-as-fixture when values exist).
- Project overview document rows stay compact and summary-focused (filename/type/component/latest attempt/Open document) without full extraction controls.
- Engineering values always display explicit status badges (`user_entered`, `approved`, `needs_review`, `ai_extracted`, `rejected`, `superseded`) and keep unapproved values visible for reviewer action.
- AI extraction UX must show loading, success, normalized friendly errors, and retryability where supported.
- Calculations stay deterministic and show formula name, units, assumptions, warnings, and result readability.
- Report sections are clearly marked as editable drafts, with save and Word export feedback that reflects the current saved content.

## UI principles
- **Review-first**: interface must clearly separate candidate AI values from approved/user-entered final values.
- **Component-oriented**: use reusable cards, buttons, badges, alerts, and table-like structures for consistent UI expansion.
- **Clear status communication**: status badges and alerts should make approval state and provider mode obvious at a glance.
- **No hidden AI decisions**: extraction mode and OpenAI readiness are always visible in the header status panel.
- **Fixtures for repeatable testing**: fixture workflows remain visible and unchanged so deterministic replay testing is easy.

## Drill-down project workflow UI

The web app now follows a drill-down navigation model so users see summary-first screens instead of one massive project page. Project overview screens focus on project-level stats and compact module cards; component detail screens focus on one component at a time (review states, assigned documents, and extraction actions). Advanced diagnostics remain available but collapsed by default.
