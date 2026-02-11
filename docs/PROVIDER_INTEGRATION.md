# Provider Integration Guide

- Document version: 1.0
- Last updated: 2026-02-11

## 1. Provider Matrix

| Provider | Required Settings | Optional Settings | Model Catalog Fetch | Notes |
| --- | --- | --- | --- | --- |
| fal.ai | `fal.apiKey` | `fal.model`, `fal.endpointMode` | Yes | Supports dynamic image-input requirement inference |
| Google AI Studio | `google.apiKey` | `google.model` | Yes | Uses `generateContent` endpoint |
| Adobe Firefly (Direct) | `firefly.clientId`, `firefly.accessToken` | `firefly.apiBase`, `firefly.contentClass`, `firefly.model` | No | Access token is session-only in this app |
| Adobe Firefly (Proxy) | `firefly.proxyUrl` | `firefly.proxyToken`, `firefly.model` | No | Proxy manages client secret outside browser |

## 2. fal.ai

### 2.1 Image Generation
- Endpoint:
  - Sync: `https://fal.run/<modelPath>`
  - Queue: `https://queue.fal.run/<modelPath>`
- Header: `Authorization: Key <FAL_API_KEY>`
- Request body:
  - `prompt`
  - plus inferred `providerInput` (reference image field) when required/optional and provided.

### 2.2 Queue Mode
- Submit job and poll `status_url`.
- On `COMPLETED`, fetch `response_url`.
- Timeout if no completion within max attempts.

### 2.3 Model Catalog
- API: `GET https://api.fal.ai/v1/models?limit=200[&cursor=...]`
- Pagination supported up to configured guard (`MAX_FAL_MODEL_PAGES`).
- Models are normalized and deduplicated by `id`.
- Duplicate labels are disambiguated in UI by appending `(id)`.

### 2.4 Model Input Requirement Inference
- API: `GET /v1/models?endpoint_id=<id>&expand=openapi-3.0&limit=1`
- OpenAPI request schema is scanned for image-like fields.
- Output state:
  - `imageSupport = none | optional | required`
  - `preferredField`
  - `unsupportedReason` when multiple required image fields exist.

## 3. Google AI Studio

### 3.1 Image Generation
- Endpoint:
  - `POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`
- Header:
  - `x-goog-api-key: <GOOGLE_API_KEY>`
- Request body includes:
  - user text prompt in `contents.parts`.
  - `generationConfig.responseModalities = ["TEXT", "IMAGE"]`.

### 3.2 Response Handling
- Image is extracted from `candidates[].content.parts[].inlineData` (base64).
- Fallback parser also supports URL-based image payloads.

### 3.3 Model Catalog
- API: `GET https://generativelanguage.googleapis.com/v1beta/models`
- Filters:
  - keep models supporting `generateContent`
  - skip embedding-only models.

## 4. Adobe Firefly

Firefly has two supported connection modes.

### 4.1 Direct Token Mode (Browser -> Firefly API)
- Endpoint:
  - `POST <apiBase>/v3/images/generate-async`
- Headers:
  - `Authorization: Bearer <accessToken>`
  - `x-api-key: <clientId>`
- Body:
  - `prompt`, `numVariations`, `contentClass`, `model`
- Async handling:
  - status URL resolved from payload (`statusUrl` or `status_url`) or `Location` header.
  - polled until image URL appears or failure/timeout.

### 4.2 Proxy Mode (Browser -> User Proxy -> Firefly API)
- App calls `POST <proxyUrl>/generate`.
- Optional header `x-proxy-token` when configured.
- Proxy exchanges secret for Adobe access token and performs Firefly request/polling.
- Browser never needs Firefly client secret in this mode.

### 4.3 Current App Behavior
- Provider is considered configured when:
  - Proxy URL exists, OR
  - Client ID + Access Token exist.
- On save, Firefly Access Token is removed from persisted settings.

## 5. Image URL Extraction Contract

All providers depend on `extractImageUrl(payload)` fallback chain. Supported patterns include:
- `imageUrl`
- `images[0]` and `images[0].url`
- `outputs[0].url`
- `outputs[0].image.url`
- nested `result.*` variants
- Gemini `inlineData` (`data:<mime>;base64,...`)

## 6. Failure Modes and Troubleshooting

- `provider is not configured`
  - Required key/token fields missing.
- `model list empty`
  - Invalid API key, permission issue, or provider-side filter removed all models.
- `Firefly polling timed out`
  - long-running job, or payload path changed and image URL not found.
- `reference image required`
  - fal model requires image field but no file/URL was supplied.
- `download metadata not embedded`
  - non-PNG image or CORS prevents blob fetch/rewrite.

## 7. Extension Rules for New Providers

When adding a new provider:
1. Add default settings in `src/constants.js`.
2. Implement provider module in `src/providers/<name>.js`.
3. Register runtime and configuration checks in `src/providers/index.js`.
4. Add settings form bindings (`index.html` + `src/settings-form.js`).
5. Add tests for:
   - provider configured logic
   - model list normalization (if supported)
   - payload image extraction path
6. Update docs:
   - this file
   - `docs/PRODUCT_SPEC.md`
   - `README.md`
