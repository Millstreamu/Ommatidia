# Data Model

## Modeling intent

The shared domain model establishes typed, runtime-validated entities for projects, documents, components, extracted engineering values, configurable modules, deterministic calculation outputs, and report sections.

AI-extracted values are candidate data only. They must default to review-oriented statuses (for example, `needs_review`) and must not be treated as approved engineering truth unless explicitly approved by users.

## Core entities

### `Project`
Represents an engineering project container.

Key fields:
- `id`
- `name`
- `description` (optional)
- `projectType`
- `createdAt`
- `updatedAt`

### `Document`
Represents a project document used for traceable extraction and review.

Key fields:
- `id`
- `projectId`
- `title`
- `fileName`
- `mimeType`
- `uploadedAt`
- `uploadedBy` (optional)

### `Component`
Represents a project component (for example pump, motor, cooler, winch subassembly).

Key fields:
- `id`
- `projectId`
- `name`
- `type`
- `description` (optional)
- `createdAt`
- `updatedAt`

### `EngineeringValue`
Represents a typed engineering value tied to project/component/document context with explicit status and source traceability.

Key fields:
- `id`
- `projectId`
- `componentId` (optional)
- `documentId` (optional)
- `key`
- `label`
- `value`
- `valueType` (`number | string | boolean | table | list`)
- `unit` (optional)
- `status`
- `sourceReferences`
- `confidence` (optional)
- `notes` (optional)
- `createdAt`
- `updatedAt`

### `SourceReference`
Tracks source evidence for extracted or authored values.

Key fields:
- `documentId`
- `pageNumber` (optional)
- `sectionTitle` (optional)
- `sourceText` (optional)
- `boundingBox` (optional; supports future PDF/image coordinate references)

### `DataStatus`
Enumerates value/report lifecycle statuses:
- `ai_extracted`
- `needs_review`
- `approved`
- `rejected`
- `user_entered`
- `superseded`

### `EngineeringModule`
Defines configurable modules across extraction, summary, comparison, calculation, checklist, and report use-cases.

Key fields:
- `id`
- `name`
- `description`
- `moduleType` (`extraction | summary | comparison | calculation | checklist | report`)
- `applicableProjectTypes`
- `inputs`
- `outputs`
- `validationRules` (optional)
- `calculationMethod` (optional)
- `reportTemplate` (optional)

### `ModuleInput` / `ModuleOutput`
Describes typed module interface contracts.

Key fields:
- `key`
- `label`
- `description` (optional)
- `valueType`
- `unit` (optional)
- `required`

### `CalculationResult`
Captures deterministic module execution output with transparent assumptions and warnings.

Key fields:
- `moduleId`
- `projectId`
- `inputsUsed`
- `outputs`
- `warnings`
- `assumptions`
- `createdAt`

### `ReportSection`
Represents a reviewable report section that retains traceability and explicit status.

Key fields:
- `id`
- `projectId`
- `title`
- `bodyMarkdown`
- `sourceReferences`
- `status`
- `createdAt`
- `updatedAt`

## Validation approach

All entities above are defined as runtime schemas and inferred TypeScript types in `packages/shared`, so consuming packages can both validate external data and use strongly typed model contracts.

## Component library model

Added a shared `ComponentLibraryItem` model containing component metadata, approved engineering values snapshot, source references, origin references, tags, and timestamps.
