# ADR 0002: Firefly Direct Token + Optional Proxy Dual Mode

- Status: Accepted
- Date: 2026-02-11

## Context
Adobe Firefly often requires credential handling patterns different from other providers. Some users can run only browser-based flows, while others prefer secure secret isolation through their own proxy.

## Decision
Support both connection modes:
1. Direct token mode:
   - User supplies Client ID + Access Token.
   - Browser calls Firefly API directly.
   - Access Token is session-only (not persisted).
2. Proxy mode:
   - User supplies proxy URL (and optional proxy token).
   - Proxy handles Firefly secret-based token issuance and request forwarding.

## Consequences

### Positive
- Lower onboarding friction for users who cannot deploy proxy.
- Secure path available for users requiring secret isolation.
- Firefly remains optional; app still works with fal/google.

### Negative
- Direct mode places more credential handling responsibility on end users.
- Two execution modes increase test matrix and documentation requirements.

### Follow-up
- Consider helper scripts/docs for easy personal proxy setup.
- Evaluate adding per-session warning banner when direct mode is active.
