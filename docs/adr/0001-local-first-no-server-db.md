# ADR 0001: Local-First Storage, No Server-Side User DB

- Status: Accepted
- Date: 2026-02-11

## Context
The product requirement is to avoid collecting and storing user data on an application backend while still supporting iterative prompt/image work.

## Decision
Store app settings and cards in browser IndexedDB only. Do not introduce server-side persistence for user prompts, generated card history, or API credentials.

## Consequences

### Positive
- Clear privacy boundary.
- Simple static hosting (GitHub Pages).
- Lower backend operational cost.

### Negative
- No cross-device sync by default.
- Data can be lost if browser storage is cleared.
- User is responsible for local credential hygiene.

### Follow-up
- Consider optional encrypted export/import in future.
