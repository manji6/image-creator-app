# CODEX.md

This repository uses `AGENTS.md` as the canonical rule set for coding agents.

## ドキュメント構造

- 全ての重要ロジック（Provider APIの挙動など）は `docs/PROVIDER_INTEGRATION.md` に記載があるべきです。
- 新しい環境変数や設定値を追加した際は、即座に `README.md` の「プロバイダ設定」セクションを更新してください。

## メンテナンス・ルール

- `docs/` 以下のファイルは、単なるメモではなく「正解の仕様」として扱います。
- コードを変更してドキュメントを更新しない行為は、このプロジェクトでは「バグ」とみなされます。

## Required startup steps

1. Read `AGENTS.md` first.
2. Read `docs/DEVELOPMENT_GUIDE.md`.
3. Read domain-specific docs based on task scope:
   - Provider work: `docs/PROVIDER_INTEGRATION.md`
   - Security/data work: `docs/SECURITY_POLICY.md`
   - Product behavior work: `docs/PRODUCT_SPEC.md`

When behavior changes, update both tests and docs before completion.
