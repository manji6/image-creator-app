# Product Spec: Image Creator

- Document version: 1.1
- Last updated: 2026-02-15
- Target release track: MVP to incremental extension

## 1. Product Goal
Image generation work should be executable in bulk from one screen, with fast comparison and re-generation loops for prompt tuning.

## 2. Target Users
- Non-engineers who need to generate many candidate images quickly.
- Prompt operators who iteratively refine prompts while comparing multiple outputs.

## 3. Core Value
- Bulk input -> bulk card generation -> bulk execution in one flow.
- Per-card retry and edit without redoing all cards.
- Provider-switchable architecture (fal.ai / Google AI Studio / Adobe Firefly).
- Local-first operation with no application-side user DB.

## 4. Product Scope

### 4.1 In Scope (Current)
- Web app delivered as static assets (GitHub Pages).
- Light Mode:
  - Shared prompt + per-line prompt concatenation.
- Advanced Mode:
  - Shared template expansion with `{{item}}` (`${item}` / `{$item}` compatible).
  - Pre-validation before card creation/generation.
- Prompt batch input (1 line = 1 card).
- Per-card operations:
  - Generate (per-card provider/model で実行)
  - Prompt preview modal
  - Download single image
  - Delete card
  - Per-card provider/model selection (compact display + click-to-expand editor)
  - Inline common prompt preview (collapsible, shows shared prompt portion)
  - Dirty state indicator ("設定変更あり" badge when card settings differ from last generation)
- Global operations:
  - Generate all cards
  - Regenerate failed cards
  - Download all cards (ZIP fallback to multiple downloads)
  - Clear all cards
- Provider integration:
  - fal.ai
  - Google AI Studio
  - Adobe Firefly (Direct token mode or Proxy mode)
- Model list retrieval:
  - fal.ai and Google model catalog fetch + manual model fallback.
- Reference image support (fal.ai only):
  - Model capability inference from OpenAPI schema.
  - Require/block generation when model requires image input.
- Settings export/import:
  - Export current settings (provider, model, common prompt, mode, API keys) to JSON file.
  - Import settings from JSON file for context switching.
  - Firefly Access Token is always stripped on export.
- Local storage:
  - Settings and cards in IndexedDB.
  - Firefly Access Token is session-only (auto-stripped before every auto-save).
- Download naming and metadata:
  - File name format: `<12char_hash>_<prompt_segment>.<ext>`.
  - PNG prompt metadata embedding via `iTXt` chunk when possible.

### 4.2 Out of Scope (Current)
- Server-side user authentication/account management.
- Server-side prompt/image history DB.
- Team collaboration/multi-user shared projects.
- Firefly model auto-catalog fetch.
- Full E2E UI automation (current tests are unit/contract level).

## 5. Functional Requirements

- FR-01: User can register multiple prompt lines in one textarea.
- FR-02: User can convert input lines into cards.
- FR-03: User can generate all cards at once from a single global button.
- FR-04: User can regenerate one specific card independently.
- FR-05: User can regenerate only failed cards in bulk.
- FR-06: User can switch provider and model before generation.
- FR-07: System must block generation when provider configuration is missing.
- FR-08: Advanced mode must validate template syntax and unknown variables before proceeding.
- FR-09: User can open request prompt preview in modal before generation.
- FR-10: User can download image per-card and all cards in batch.
- FR-11: File names must include stable short hash + readable prompt segment.
- FR-12: For PNG downloads, prompt metadata embedding should be attempted.
- FR-13: For fal models with required image input, generation must be blocked until reference image is provided.
- FR-14: Generated image should open in full-screen preview modal on click.
- FR-15: Each card inherits global provider/model at creation and can be changed independently.
- FR-16: Cards track generation metadata (`generatedWith`) to detect dirty state.
- FR-17: Image preview modal displays provider/model alongside the generation prompt.
- FR-18: User can export settings to JSON file and import settings from JSON file.

## 6. Non-Functional Requirements

- NFR-01: Local-first data policy (browser storage only for app data).
- NFR-02: App remains usable when one provider is unconfigured.
- NFR-03: Firefly is optional and must not break fal/google-only usage.
- NFR-04: Batch generation supports bounded concurrency (1 to 4, default 2).
- NFR-05: UI must stay responsive during parallel generation jobs.
- NFR-06: Core logic must be covered by automated tests (`npm test`).

## 7. Data Policy Requirements

- DR-01: No server-side DB for user settings/cards.
- DR-02: Persist settings/cards in IndexedDB only.
- DR-03: Firefly Access Token must not be written to persistent storage.
- DR-04: API keys/tokens are managed by the browser user at their own environment.

## 8. Primary User Flow

1. User opens app and enters API credentials for one or more providers.
2. User selects provider/model and sets shared prompt.
3. User enters multiple line prompts.
4. User creates cards (or directly runs global generation when batch input exists).
5. User reviews outputs.
6. User retries only low-quality cards.
7. User downloads selected images or all images.

## 9. Acceptance Criteria (MVP)

- AC-01: App works with only fal configured.
- AC-02: App works with only Google configured.
- AC-03: App works with Firefly direct token mode without proxy URL.
- AC-04: App works with Firefly proxy mode without direct token.
- AC-05: Advanced mode blocks invalid template before card creation.
- AC-06: Reference image required models block generation when image missing.
- AC-07: All generated cards show visible `生成` button by default.
- AC-08: Multiple card regeneration requests can run in parallel up to concurrency limit.
- AC-09: Batch download produces ZIP when JSZip is available.
- AC-10: `npm test` passes in clean checkout.

## 10. Future Candidate Enhancements

- Multiple template variables beyond `item`.
- Optional self-hosted asset mode (remove CDN dependencies).
- Full project state export/import (settings + cards together).
