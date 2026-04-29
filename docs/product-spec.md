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
