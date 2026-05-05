# BeeBot Operator Glossary

Plain-English definitions for BeeBot session and review terms.

- **stood_aside**: BeeBot reviewed conditions and intentionally took no trade action.
- **acted_no_fill**: BeeBot submitted an order/action attempt, but nothing filled/executed.
- **acted_opened**: BeeBot opened a position but did not close it in the same session.
- **acted_round_trip**: BeeBot opened and closed a position within the same session.
- **blocked**: BeeBot could not proceed because of an external/system constraint (tooling, data, exchange, permissions, etc.).
- **refused**: BeeBot intentionally declined an action because rules/safety constraints said not to proceed.
- **active**: The session is currently running and still processing decisions or actions.
- **completed**: The session reached a normal end state and finished its planned flow.
- **stopped_by_operator**: A human operator manually stopped the session before normal completion.
- **entries_submitted**: Count of entry orders/actions sent by BeeBot.
- **entries_executed**: Count of entry orders/actions that actually executed/filled.
- **exits_submitted**: Count of exit orders/actions sent by BeeBot.
- **exits_executed**: Count of exit orders/actions that actually executed/filled.
- **ended_flat**: Session ended with no open position remaining.
- **open_position_remaining**: Session ended while at least one position was still open.
- **readiness**: A pre-flight check that required systems, data, and guardrails are ready for a run.
- **attempt_now**: Immediate one-off run request to execute a session right now (not queued for later).
