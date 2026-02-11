# Image Batch Studio

ローカルファーストで複数プロンプトを一括画像生成する静的Webアプリです。

## 特徴
- 共通プロンプト + 行ごとのプロンプトで一括生成
- Light / Advanced モード切替
- Advancedモードで `{{item}}` テンプレート展開（`${item}` / `{$item}` 互換）
- カードごとの「プロンプトプレビュー」モーダル
- 生成結果カードごとにプロンプト編集と再生成
- 生成画像クリックでフルスクリーンプレビュー
- 生成結果カードごとに個別ダウンロード
- 全カード一括ダウンロード（ZIP、未対応環境は個別DLフォールバック）
- 保存ファイル名は `hash_プロンプト要約.ext`
- PNGは可能な場合に `iTXt` メタデータとしてプロンプトを埋め込み
- `fal.ai` / `Google AI Studio` / `Adobe Firefly` を切替可能
- fal.ai / Google はモデル一覧取得に対応（手入力フォールバックあり）
- fal.ai の一部モデルで参照画像入力要件を自動判定
- ユーザーデータは `IndexedDB` のみ保存（サーバーDBなし）
- Fireflyは **Proxy URL** または **Client ID + Access Token** のどちらかで利用可能

## ドキュメント

開発継続・引き継ぎ時は以下を参照してください。

- 製品仕様: `docs/PRODUCT_SPEC.md`
- 設計: `docs/ARCHITECTURE.md`
- プロバイダ接続仕様: `docs/PROVIDER_INTEGRATION.md`
- セキュリティ/責任分界: `docs/SECURITY_POLICY.md`
- 開発手順: `docs/DEVELOPMENT_GUIDE.md`
- ADR: `docs/adr/README.md`

## AIエージェント運用

- 共通ルール（正本）: `AGENTS.md`
- Claude向けエントリ: `CLAUDE.md`
- Codex向けエントリ: `CODEX.md`

## データポリシー
- アプリの設定と生成カードはブラウザ内の `IndexedDB` に保存
- GitHub Pages配信のみでサーバー側DBは不要
- APIキーはブラウザローカルに保存（端末利用者が管理）
- Firefly Access Token は保存時に永続化されずセッションのみ保持

## ローカル実行
```bash
npm run serve
```

- 起動後: `http://127.0.0.1:4173`

テスト:
```bash
npm test
```

## プロバイダ設定

### fal.ai
- `fal.ai API Key` を入力
- モデル一覧を取得して Select から選択可能（手入力フォールバックあり）
- モデル既定値は `fal-ai/flux/schnell`
- queue APIを使う場合は `src/constants.js` の `endpointMode` を `queue` に変更

### Google AI Studio
- `Google API Key` を入力
- モデル一覧を取得して Select から選択可能（手入力フォールバックあり）
- モデル既定値は `gemini-2.5-flash-image-preview`

### Adobe Firefly (任意)
- 2つの接続方式を選択可能
  - Direct: `Firefly Client ID` + `Access Token` を手動入力して直接API実行
  - Proxy: `Firefly Proxy URL` (任意で `Proxy Token`) を利用
- Direct方式の `Access Token` は保存時に永続化されず、セッション内のみ保持
- Proxy未設定でも Direct設定があれば Firefly 利用可

## Firefly Proxy (Cloudflare Worker)
`workers/firefly-proxy` にサンプル実装を用意しています。

### 必須シークレット
- `FIREFLY_CLIENT_ID`
- `FIREFLY_CLIENT_SECRET`

### 任意シークレット
- `PROXY_TOKEN` (UI側の `Firefly Proxy Token` と一致させる)
- `ALLOWED_ORIGIN` (CORS制御)
- `FIREFLY_MODEL`
- `FIREFLY_CONTENT_CLASS`

### デプロイ
1. GitHub Secretsに以下を設定
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
2. GitHub Actionsの `Deploy Firefly Worker` を手動実行

## GitHub Pages デプロイ
`.github/workflows/deploy-pages.yml` により `main` pushで公開されます。

### 初期セットアップ
1. GitHub Repository の Pages を `GitHub Actions` ソースで有効化
2. `main` に push
3. Actions完了後、Pages URLが払い出される

## 参考
- [Adobe Firefly Authentication](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/authentication/)
- [Adobe Firefly Credentials](https://developer.adobe.com/firefly-services/docs/firefly-api/getting-started/create-credentials/)
- [Google Gemini API generateContent](https://ai.google.dev/api/generate-content)
- [fal queue API](https://docs.fal.ai/model-apis/model-endpoints/queue)
- [GitHub Pages with Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
