# Development Guide

- Document version: 1.0
- Last updated: 2026-02-11

## 1. Purpose
This guide defines how to continue development consistently across environments (Codex, Claude Code, local editor/terminal).

## 2. Prerequisites

- Node.js 20+ (ESM support required)
- npm
- Modern browser with IndexedDB

## 3. Local Commands

```bash
npm run serve
```
- Starts local static server at `http://127.0.0.1:4173` by default.

```bash
npm test
```
- Runs Node built-in test suite (`node --test`).

## 4. Repository Layout

- `index.html`: UI skeleton and Tailwind utility classes.
- `styles.css`: minimal custom styles and motion/background.
- `src/main.js`: application orchestration and event binding.
- `src/providers/`: provider-specific API logic.
- `src/*`: modular domain logic (template, model catalog, download, etc.).
- `tests/`: unit + contract tests.
- `workers/firefly-proxy/`: optional Cloudflare Worker for Firefly proxy mode.
- `docs/`: product/architecture/security/development docs.

## 5. Daily Development Workflow

1. Pull latest `main`.
2. Create branch with `codex/` prefix (recommended for AI-assisted work).
3. Implement change in smallest module first, then wire into `main.js`.
4. Update or add tests in `tests/`.
5. Run `npm test`.
6. Update docs when behavior or constraints changed.
7. Commit with focused message.

## 6. Coding Conventions

- Keep provider-specific code in `src/providers/`.
- Keep reusable logic out of `main.js` when complexity grows.
- Prefer explicit naming over compact abstractions.
- Keep UI contract stable:
  - do not remove key IDs/classes without updating tests.
- Follow local-first policy:
  - avoid introducing server-side dependencies for core workflows.

## 7. UI Contract Checklist

When changing `index.html`:
- Verify IDs used in `src/main.js` still exist.
- Verify `tests/ui-contract.test.js` expectations still match.
- Ensure key action buttons remain visible and accessible by default.
- Keep Tailwind utility class strategy for action button styling.

## 8. Provider Change Checklist

When changing provider behavior:
- Update `src/constants.js` defaults if needed.
- Update `src/providers/index.js` configured checks and hints.
- Add/adjust tests:
  - `tests/providers-index.test.js`
  - `tests/utils.test.js` for payload extraction changes
  - provider-specific normalization tests where applicable.
- Update `docs/PROVIDER_INTEGRATION.md` and README.

## 9. Storage & Security Checklist

- Any persistent settings change must pass through `saveSettings` flow.
- Do not persist fields that must be session-only.
- Re-check `src/session-settings.js` if security-sensitive fields are added.
- Update `docs/SECURITY_POLICY.md` when trust boundaries change.

## 10. Test Strategy

Current suite focus:
- Prompt/template behavior
- Model requirement inference
- Provider configured logic
- Download naming + PNG metadata embedding
- UI contract assertions for required controls/classes

Gap to consider in future:
- Browser-level integration tests (Playwright/Cypress)
- Provider mock server tests for async polling paths

## 11. Deployment

### 11.1 Web App (GitHub Pages)
- Workflow: `.github/workflows/deploy-pages.yml`
- Trigger: push to `main` or manual dispatch.

### 11.2 Firefly Proxy Worker (Optional)
- Workflow: `.github/workflows/deploy-firefly-worker.yml`
- Required GitHub secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`

## 12. Handoff Standard for AI/Developers

Before ending a change set, provide:
- What changed (files + behavior).
- What tests were run and result.
- Any unresolved risk/assumption.
- Required follow-up (if any).
