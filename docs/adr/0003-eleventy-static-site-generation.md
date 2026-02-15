# ADR 0003: Eleventy Static Site Generation

## Status
Accepted

## Context
The application had 3 HTML files (`index.html`, `help.html`, `guide/firefly-token.html`) with significant duplication:
- 40+ lines of duplicated HEAD content (meta tags, favicons, Tailwind config)
- Duplicated navigation and footer markup
- Manual synchronization required for any change to common elements

This created maintenance burden and increased risk of inconsistencies.

## Decision
Adopt [Eleventy](https://www.11ty.dev/) 2.0.1 static site generator with Nunjucks templating:
- Template source: `src-templates/` (`.njk` files)
- Build output: `_site/` (static HTML)
- Development server: `npm run dev` on port 8080 (hot reload enabled)
- Production build: `npm run build` (generates static files for GitHub Pages)

### Template Structure
- `src-templates/_includes/layouts/base.njk`: Base layout with conditionals for page-specific features
- `src-templates/_includes/partials/`: Reusable components (head, nav, footer)
- `src-templates/_data/site.json`: Global metadata (navigation, site title, etc.)

### Migration Path
1. Keep existing HTML files temporarily during migration
2. Create Nunjucks templates with front matter configuration
3. Validate generated output matches original HTML
4. Update GitHub Actions workflow to run `npm run build`
5. Remove original HTML files after deployment verification

## Alternatives Considered

### 1. PHP Includes (Rejected)
- **Pros**: Simple, widely understood
- **Cons**: Requires PHP runtime (incompatible with GitHub Pages static hosting)

### 2. Server-Side Rendering with Next.js/Nuxt (Rejected)
- **Pros**: Rich ecosystem, component-based
- **Cons**: Heavy dependency footprint, overkill for 3-page static site

### 3. Client-Side Template Rendering (Rejected)
- **Pros**: No build step required
- **Cons**: SEO penalty (content not in initial HTML), flash of unstyled content

### 4. Manual DRY with Web Components (Rejected)
- **Pros**: Native browser feature
- **Cons**: Browser support inconsistencies, complexity for simple shared markup

## Consequences

### Positive
- **DRY**: 120+ lines of duplication eliminated (40 lines × 3 files)
- **Maintainability**: Common changes (navigation, footer, head tags) now single-point edits
- **Future-proof**: Easy to add new pages with consistent layout
- **SEO**: Fully static HTML (no client-side rendering penalty)
- **Deployment**: GitHub Pages compatible (no server-side runtime required)

### Negative
- **Build step**: `npm run build` required before deployment (automated in CI/CD)
- **Learning curve**: Team must understand Nunjucks syntax and Eleventy conventions
- **Debugging**: Template errors show in build output, not directly in HTML files

### Neutral
- **File count**: 3 HTML files → 3 `.njk` files + 4 template partials (net +4 files)
- **Development flow**: Changed from "edit HTML → refresh browser" to "edit template → auto-reload" (`npm run dev`)

## Implementation Timeline
- **Day 1**: Eleventy setup, base layout, partials creation
- **Day 2**: Template migration (help.html → help.njk)
- **Day 3**: Template migration (guide/firefly-token.html → firefly-token.njk)
- **Day 4**: Template migration (index.html → index.njk)
- **Day 5**: GitHub Actions workflow update, deployment verification
- **Day 6**: Legacy HTML removal, documentation updates

**Actual effort**: ~3 days (including workflow debugging and pretty URL fixes)

## References
- Eleventy migration plan: See plan file for detailed implementation steps
- GitHub Pages deployment: [.github/workflows/deploy-pages.yml](../../.github/workflows/deploy-pages.yml)
- Eleventy config: [.eleventy.cjs](../../.eleventy.cjs)
