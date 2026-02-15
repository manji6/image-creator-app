# Image Creator

ローカルファーストで複数プロンプトを一括画像生成する静的Webアプリです。

## 特徴
- 共通プロンプト + 行ごとのプロンプトで一括生成
- Light / Advanced モード切替
- Advancedモードで `{{item}}` テンプレート展開（`${item}` / `{$item}` 互換）
- カードごとの「プロンプトプレビュー」モーダル
- カードごとにプロバイダ・モデルを個別選択可能（コンパクト表示 + クリック展開で変更）
- カード内で共通プロンプトをインラインプレビュー
- 生成後の設定変更を「設定変更あり」バッジで可視化
- 生成結果カードごとにプロンプト編集と生成
- 生成画像クリックでフルスクリーンプレビュー（プロバイダ・モデル情報表示）
- 生成結果カードごとに個別ダウンロード
- 全カード一括ダウンロード（ZIP、未対応環境は個別DLフォールバック）
- 保存ファイル名は `hash_プロンプト要約.ext`
- PNGは可能な場合に `iTXt` メタデータとしてプロンプトを埋め込み
- `fal.ai` / `Google AI Studio` / `Adobe Firefly` を切替可能
- fal.ai / Google はモデル一覧取得に対応（手入力フォールバックあり）
- fal.ai の一部モデルで参照画像入力要件を自動判定
- 設定エクスポート/インポート（JSON形式で作業コンテキスト切替可能）
- ユーザーデータは `IndexedDB` のみ保存（サーバーDBなし）
- Fireflyは **Proxy URL** または **Client ID + Access Token** のどちらかで利用可能

## ビルドシステム

このプロジェクトは [Eleventy](https://www.11ty.dev/) 静的サイトジェネレーターを使用しています：

- **テンプレートソース**: `src-templates/` （Nunjucks形式）
- **ビルド出力**: `_site/` （GitHub Pagesで公開）
- **レイアウト管理**: `src-templates/_includes/layouts/base.njk`
- **共通パーツ**: `src-templates/_includes/partials/` （head, nav, footer）

開発時の変更:
- `src-templates/` 配下を編集
- `npm run dev` でブラウザに即座に反映（ホットリロード）
- デプロイ時は `npm run build` で `_site/` に静的HTML生成

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
- Firefly Access Token は自動保存時にも永続化されずセッションのみ保持

## ローカル実行

### 開発モード（ホットリロード有効）
```bash
npm run dev
```
- Eleventy開発サーバーが起動: `http://127.0.0.1:8080`
- テンプレート編集時に自動的にブラウザがリロードされます

### ビルド & プレビュー
```bash
npm run build   # 静的ファイルを_site/に生成
npm run serve   # 生成済みファイルをhttp://127.0.0.1:4173で配信
```

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
- Direct方式の `Access Token` は自動保存時にも永続化されず、セッション内のみ保持
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

## Google Tag Manager 設定

アプリは Google Tag Manager (GTM) を使用してユーザー行動を計測します。

### 前提
- GTMコンテナIDは `src/analytics/config.js` の `gtmContainerId` で設定
- GTMスクリプトは動的に読み込まれるため、HTMLファイルの変更は不要
- 18種類のカスタムイベントを送信（カード作成、画像生成、エラー発生など）

### GTMコンテナ設定手順

#### 1. GA4測定IDの取得
1. [Google Analytics](https://analytics.google.com/) でGA4プロパティを作成
2. 「管理」→「データストリーム」→「ウェブ」で測定ID（`G-XXXXXXXXXX`）を取得

#### 2. データレイヤー変数の作成
GTMコンテナで「変数」→「新規」から以下を作成：

| 変数名 | タイプ | データレイヤー変数名 |
|-------|-------|-----------------|
| DLV - Session ID | データレイヤー変数 | `session_id` |
| DLV - Environment | データレイヤー変数 | `environment` |
| DLV - Active Provider | データレイヤー変数 | `active_provider` |
| DLV - Count | データレイヤー変数 | `count` |
| DLV - Queue Length | データレイヤー変数 | `queue_length` |
| DLV - Provider | データレイヤー変数 | `provider` |
| DLV - Model | データレイヤー変数 | `model` |
| DLV - Error Type | データレイヤー変数 | `error_type` |
| DLV - Success Count | データレイヤー変数 | `success_count` |
| DLV - Total | データレイヤー変数 | `total` |
| DLV - Duration MS | データレイヤー変数 | `duration_ms` |

#### 3. トリガーの作成
「トリガー」→「新規」から各イベント用のカスタムイベントトリガーを作成：

| トリガー名 | トリガータイプ | イベント名 |
|----------|------------|----------|
| CE - App Session Start | カスタムイベント | `app_session_start` |
| CE - Card Creation | カスタムイベント | `card_creation` |
| CE - Generation Batch Start | カスタムイベント | `generation_batch_start` |
| CE - Generation Card Success | カスタムイベント | `generation_card_success` |
| CE - Generation Card Failed | カスタムイベント | `generation_card_failed` |
| CE - Generation Batch Complete | カスタムイベント | `generation_batch_complete` |
| CE - Error Occurrence | カスタムイベント | `error_occurrence` |
| CE - Batch Download Start | カスタムイベント | `batch_download_start` |
| CE - Batch Download Complete | カスタムイベント | `batch_download_complete` |
| CE - Provider Switch | カスタムイベント | `provider_switch` |
| CE - Settings Save | カスタムイベント | `settings_save` (※手動保存ボタン廃止につき現在未発火) |

その他のイベント（`card_regenerate`, `card_deletion`, `reference_image_upload`, `modal_open`, `modal_close`）も同様に作成可能。

#### 4. GA4タグの作成

**GA4設定タグ**:
- タグタイプ: `Google アナリティクス: GA4 設定`
- 測定ID: `G-XXXXXXXXXX`（手順1で取得）
- トリガー: `すべてのページ`

**GA4イベントタグ（例: app_session_start）**:
- タグタイプ: `Google アナリティクス: GA4 イベント`
- 設定タグ: 上記のGA4設定タグを選択
- イベント名: `app_session_start`
- トリガー: `CE - App Session Start`
- イベントパラメータ:
  - `session_id`: `{{DLV - Session ID}}`
  - `environment`: `{{DLV - Environment}}`
  - `active_provider`: `{{DLV - Active Provider}}`

他のイベントも同様に作成し、各イベントに応じたパラメータを設定。

#### 5. プレビューモードでテスト
1. GTMで「プレビュー」をクリック
2. アプリのURLを入力して接続
3. Tag Assistant で以下を確認：
   - イベントが発火している（Summaryタブ）
   - データレイヤー変数が取得できている（Variablesタブ）
   - GA4タグが発火している（Tagsタブ）

#### 6. 公開
- 「送信」ボタンでコンテナを公開
- GA4の「リアルタイム」レポートでイベント受信を確認

### 送信されるイベント一覧
`src/analytics/config.js` の `EVENTS` 定数で全18種類のイベントが定義されています：

**必須イベント**:
- `app_session_start`: アプリ起動
- `card_creation`: カード作成
- `generation_batch_start`: 一括生成開始
- `generation_card_success`: 画像生成成功
- `generation_card_failed`: 画像生成失敗
- `generation_batch_complete`: 一括生成完了
- `error_occurrence`: エラー発生

**推奨イベント**:
- `batch_download_start`, `batch_download_complete`: 一括ダウンロード
- `provider_switch`: プロバイダー切り替え
- `settings_save`: 設定保存（※手動保存ボタン廃止により現在未発火）
- `card_regenerate`: 個別再生成

**オプションイベント**:
- `page_view`: モーダル表示（仮想ページビュー）
- `card_deletion`: カード削除
- `reference_image_upload`: 参照画像アップロード
- `modal_open`, `modal_close`: モーダル操作

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
