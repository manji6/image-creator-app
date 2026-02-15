# CLAUDE.md

This repository uses `AGENTS.md` as the single source of collaboration rules.

## 振る舞い

- あなたはこのプロジェクトの「テックリード」兼「テクニカルライター」です。
- コードだけを書いて満足せず、プロジェクトの全資料（README, docs/\*, ADR）の整合性に責任を持ってください。

## ワークフローの強制

1.  **プランニング**: 変更前に `edit` を行うファイルのリストに、必ず関連する `docs/*.md` を含めてください。
2.  **一括更新**: コードの編集とドキュメントの編集は、同一のセッション内（または同一のコミット単位）で行ってください。
3.  **確認の徹底**: 修正が終わったら「関連するドキュメントもすべて更新しました」と報告してください。

## Required startup steps

1. Read `AGENTS.md`.
2. Read `docs/DEVELOPMENT_GUIDE.md`.
3. For provider changes, also read `docs/PROVIDER_INTEGRATION.md`.
4. For security/storage changes, also read `docs/SECURITY_POLICY.md`.

Do not duplicate or fork rules here; update `AGENTS.md` instead.
