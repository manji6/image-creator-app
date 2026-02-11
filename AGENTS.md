# AGENTS.md

Canonical collaboration rules for AI/dev agents in this repository.

## 1. Read Order (Mandatory)

Before changing code, read in this order:
1. `README.md`
2. `docs/PRODUCT_SPEC.md`
3. `docs/ARCHITECTURE.md`
4. `docs/PROVIDER_INTEGRATION.md`
5. `docs/SECURITY_POLICY.md`
6. `docs/DEVELOPMENT_GUIDE.md`

If docs and code diverge, treat code as runtime truth and update docs in the same change.

## 2. Product Invariants (Do Not Break)

- Local-first architecture must remain.
- No server-side user DB for prompts/settings/cards.
- Firefly is optional:
  - app must still work with fal/google only.
- Firefly Access Token must remain session-only (not persisted on save).
- Card action buttons (`再生成`, `プロンプトプレビュー`, `DL`, `削除`) must be visible by default.
- Global generation flow must keep `カードを全て生成` as primary bulk execution path.

## 3. Architecture Guardrails

- Keep provider logic in `src/providers/`.
- Keep generic parsing/normalization in shared modules (`src/utils.js`, `src/model-catalog.js`, etc.).
- Prefer extracting reusable logic from `src/main.js` when complexity grows.
- Do not embed provider-specific branching deep in rendering modules.

## 4. UI/UX Guardrails

- Use Tailwind utility classes for component-level styling.
- Avoid CSS overrides that fight Tailwind classes for action buttons.
- Preserve existing key element IDs/classes used by tests and JS wiring.
- When changing UI contract, update `tests/ui-contract.test.js` in the same PR.

## 5. Security Guardrails

- Never hardcode API keys/secrets in repository.
- Do not persist newly added secret fields without explicit decision.
- Keep Firefly proxy token optional but supported.
- Update `docs/SECURITY_POLICY.md` for any trust-boundary change.

## 6. Testing Requirement

Minimum before completion:

```bash
npm test
```

If behavior changes are not test-covered, add/adjust tests under `tests/`.

## 7. Documentation Requirement

Any of the following must trigger doc updates:
- New feature or mode behavior
- Provider request/response contract changes
- Storage/security policy changes
- Deployment changes

Update at least:
- `README.md`
- relevant file(s) in `docs/`

## 8. Commit/Handoff Quality Bar

Every completion message should include:
- Changed files
- Behavior impact
- Tests executed and results
- Remaining risks or follow-ups

## 9. Multi-Agent Parallel Work Recommendation

Suggested split:
- Agent A: provider/API integration
- Agent B: UI/workflow
- Agent C: tests/contracts
- Agent D: docs/security/deploy

Always merge through updated tests and docs; avoid undocumented behavior drift.
