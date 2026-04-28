# Data Model (Stub)

## Primary entities
- `Project`
- `SourceDocument`
- `ExtractionJob`
- `CalculationRun`
- `Report`

## Example relationships
- A `Project` has many `SourceDocument`.
- A `SourceDocument` can produce many `ExtractionJob` records.
- A `CalculationRun` references extracted entities and assumptions.
- A `Report` references one or more `CalculationRun` outputs.

## Design principles
- Immutable calculation outputs for auditability.
- Explicit unit metadata on numeric values.
- Traceability between source inputs and report conclusions.
