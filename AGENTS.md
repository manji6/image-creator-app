# AGENTS.md

Canonical collaboration rules for AI/dev agents in this repository.
Always include documentation updates in your initial plan without being asked.

## 完了定義 (Definition of Done)

タスクを完了とする前に、エージェントは必ず以下のチェックリストを遂行すること：

1.  **コード実装**: 要求された機能が正しく動作し、テストが通ること。
2.  **ドキュメント同期**:
    - 機能変更・追加があった場合、`docs/PRODUCT_SPEC.md` を必ず更新する。
    - 内部構造が変わった場合、`docs/ARCHITECTURE.md` を更新する。
    - ユーザー操作に関わる変更の場合、`README.md` を更新する。
3.  **整合性確認**: 既存の `docs/` 内の仕様と、実装されたコードに乖離がないか再確認する。
    - _「仕様を実装に合わせる」か「実装を仕様に合わせる」かを判断し、常に最新の状態を保つこと。_
4.  **ビルドシステム変更時**:
    - ビルドコマンド変更（`npm run` スクリプト追加・削除・名称変更）の場合
      - `README.md` のローカル実行セクションを更新
      - `docs/DEVELOPMENT_GUIDE.md` のコマンド一覧を更新
    - ビルドツール導入（テンプレートエンジン、バンドラー等）の場合
      - 上記に加え、`docs/ARCHITECTURE.md` のRuntime Layersを更新
      - `docs/adr/` に新規ADRを作成（採用理由・代替案・影響範囲を記録）

## 開発の原則

- **ドキュメント・ドリブン**: 複雑な変更を行う前には、まず `docs/` 下のファイルを更新する「プラン」を提示し、承認を得ること。
- **自律的修正**: ドキュメントの不備や、現状の実装との矛盾を発見した場合は、指摘を待たずに修正を提案すること。

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
