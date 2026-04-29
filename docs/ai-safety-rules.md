# AI Safety Rules (Stub)

> AI integration is intentionally deferred. This document defines guardrails to apply once AI capabilities are introduced.

## Planned safeguards
1. Human-in-the-loop review for all safety-critical recommendations.
2. Clear provenance for generated outputs and assumptions.
3. Strict separation between extracted facts and model inferences.
4. Red-team evaluation scenarios before production use.
5. Configurable policy filters for disallowed outputs.

## Future implementation checklist
- Model policy enforcement layer
- Prompt/version trace logging
- Confidence thresholds and escalation paths
- Safe-failure behavior

## Extraction safety rules (Task 07)

- Extraction must return structured JSON that validates shared schemas.
- Candidate values must keep source references when available and must not fabricate evidence.
- Missing evidence must produce warnings and `missingInformation` entries instead of guesses.
- AI extraction must never mark values as `approved` and must never perform final engineering calculations.
- User-entered/approved values remain authoritative; extraction must not overwrite approved values.
