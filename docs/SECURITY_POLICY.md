# Security & Data Policy

- Document version: 1.0
- Last updated: 2026-02-11

## 1. Security Objectives

- Keep the app usable without server-side user data storage.
- Minimize secret persistence and blast radius.
- Keep provider integration optional and user-controlled.
- Make responsibility boundaries explicit between app operator and browser user.

## 2. Trust Boundaries

- Static app host (GitHub Pages): serves HTML/CSS/JS only.
- Browser runtime: stores settings/cards in IndexedDB; executes API calls.
- External providers: fal.ai / Google AI Studio / Adobe Firefly.
- Optional user-managed proxy (Cloudflare Worker): holds Firefly client secret.

## 3. Data Classification

| Data | Example | Stored By App | Persistence | Owner/Controller |
| --- | --- | --- | --- | --- |
| Prompt cards | input lines, generated prompt text | Yes | IndexedDB | Browser user |
| Provider API keys | fal / Google key | Yes | IndexedDB | Browser user |
| Firefly access token | bearer token | Yes (runtime) | Session only (not saved) | Browser user |
| Generated image URLs | provider output URL or data URL | Yes | IndexedDB (as card field) | Browser user |
| Firefly client secret | secret value | No (unless user puts it in custom proxy) | N/A in app | Proxy operator/user |

## 4. Responsibility Split

### 4.1 App Operator (this repository deployment)
- Provides static assets and client code.
- Does not maintain server DB for user data.
- Must document that browser user is responsible for key/token handling.
- Should keep dependencies and hosted assets reviewed.

### 4.2 Browser User
- Inputs and stores API keys locally.
- Decides whether to use Direct Firefly token mode or own proxy.
- Protects local machine/browser profile from compromise.

### 4.3 Proxy Operator (if using proxy mode)
- Stores Firefly client credentials securely.
- Restricts access (proxy token, allowed origin, rate limits).
- Monitors abuse and rotates secrets.

## 5. Current Security Controls

- Local-only storage via IndexedDB.
- No server-side user profile/session in this app.
- Firefly Access Token is stripped from persistent save.
- Preflight validation blocks invalid execution paths.
- Optional proxy token (`x-proxy-token`) for worker endpoint.
- Optional CORS origin restriction for worker (`ALLOWED_ORIGIN`).

## 6. Known Risks and Mitigations

| Risk | Description | Current Mitigation | Recommended Hardening |
| --- | --- | --- | --- |
| Browser compromise | Malware/extensions can exfiltrate keys from local storage | None at app layer | Use dedicated browser profile; avoid untrusted extensions |
| Token leakage via screenshots/logs | User may leak copied keys/tokens | UI keeps token fields password-type | Add user warning labels and rotation playbook |
| CDN supply-chain risk | Tailwind CDN / JSZip CDN could be replaced | None | Self-host pinned assets + SRI + CSP |
| Exposed proxy endpoint abuse | Public proxy URL can be abused | Optional proxy token + CORS | Add auth gateway, rate limit, IP filtering |
| Long-lived secrets in IndexedDB | fal/google keys persist | user-controlled | add optional session-only toggle for all keys |

## 7. Prohibited Patterns

- Do not introduce server-side storage of user prompts/keys without explicit product decision.
- Do not persist Firefly access token in IndexedDB/localStorage.
- Do not hardcode API keys or secrets in repository.
- Do not remove preflight checks that block misconfigured generation.

## 8. Operational Guidance

- If publishing publicly, include clear disclaimer:
  - data is local browser state,
  - user is responsible for credential hygiene.
- Rotate compromised provider keys immediately.
- For proxy deployments:
  - set `PROXY_TOKEN`
  - set `ALLOWED_ORIGIN`
  - monitor error logs and request volume.

## 9. Future Security Roadmap

- Add CSP policy with strict script sources.
- Add optional encrypted local export/import for cards/settings.
- Add per-provider session-only storage option.
- Add threat model review checklist to release process.
