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

## Document-content routing and source reference safety (Task 16D)

- Source references may be normalized from legacy forms (`sourceReference`, string/object `sourceReferences`) into schema-safe `sourceReferences[]`.
- Normalization must never invent engineering values; it may only reshape candidate metadata and retain/drop invalid reference items safely.
- No-text/image-only documents must not produce unrelated guessed candidates; extraction must return a clear OCR/vision-required warning.

## PDF text extraction evidence safety (Task 16E)

- Extraction must not send PDF internals (font tables, encoding metadata, object/xref/trailer stream content) as if they were visible engineering evidence.
- If PDF text diagnostics indicate mostly internal/metadata text, extraction must stop before OpenAI candidate extraction and return a clear warning that useful visible text was not produced.
- When text extraction fails, AI must not invent engineering values and must explicitly recommend OCR/vision extraction.

- Extraction previews must be sanitized and capped (1000 chars max) and must not expose full document text or secrets in UI/logs by default.

## PDF internals and vision fallback safety

- Do not infer engineering values from PDF internals (`/Page`, `/Resources`, object streams, etc.).
- If text extraction is suspicious, use vision/file fallback when available.
- Vision/file extracted values must remain `needs_review` or `ai_extracted` until user approval.
