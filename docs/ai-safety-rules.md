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

## Extraction failure safety

- Invalid AI output (invalid JSON or schema-invalid values) must not be saved as engineering values.
- AI extraction failures must be visible to users through explicit error states.
- Failed extraction must not overwrite approved values.

- OpenAI API keys must remain server-side environment variables only and must never be returned to browsers, logs, or client storage.
- Runtime extraction provider switches must expose only safe status fields (provider + configured boolean), never secret material.

- Extraction visibility: zero-value OpenAI extraction must show explicit warnings and diagnostics in API/UI attempts.

## OpenAI diagnostics safety rules (Task 16A)

- Extraction diagnostics must include only safe metadata (provider, model, status code, retryability, safe message, user action).
- Diagnostics/logs must never include API keys, Authorization headers, full raw provider payloads, or full document text.
- `provider_unavailable` must be used only as a safe fallback when failures cannot be reliably classified.

## Extraction candidate normalization safety rules (Task 16C)

- Candidate normalization may fill system metadata (`id`, `projectId`, `documentId`, timestamps, default `status`, inferred `valueType`, normalized `sourceReferences`) before shared schema validation.
- Normalization must not invent engineering facts or missing engineering values; it only reshapes candidate structure.
- Invalid candidates must remain visible through safe dropped-candidate diagnostics and concise user-facing warnings.
