# AGENTS.md

This file is the durable operating guide for humans and coding agents working on `sebdec/pct`. Update it in the same pull request whenever a new convention becomes necessary. Prefer enforceable rules over narrative guidance.

## Sources of truth

1. The approved Notion issue defines product scope and acceptance criteria.
2. This file defines repository-wide engineering conventions.
3. The implementation and automated checks must enforce both.

Do not expand an issue's scope silently. Record material product or architecture decisions in the Notion issue before implementing them.

## Runtime and commands

- Use Node.js 24 as pinned in `.node-version` and `package.json`.
- Use the exact pnpm version declared in `packageManager`.
- Install dependencies with `pnpm install --frozen-lockfile` outside intentional dependency updates.
- Run `pnpm verify` before every pull request handoff.
- `pnpm verify` is the canonical gate. CI must call it instead of recreating its steps.

## Task synchronization

- Before starting or resuming any task, run `git fetch origin` and rebase the task branch onto the latest `origin/main` before editing.
- If the working tree is not clean, preserve tracked and untracked changes before the rebase and restore them afterward.
- Resolve rebase conflicts before continuing. Rerun `pnpm verify` after the rebase and before the pull request handoff.

## Architecture

- Keep the site static by default. Adding a server runtime or Vercel adapter requires an approved architecture decision.
- Use `.astro` components for layouts, navigation, typography, journal pages and other static editorial UI.
- Use React only for isolated interactions that need client state or browser APIs, initially the map and mile controls.
- Every React component rendered by Astro must use the narrowest valid `client:*` directive. Avoid hydrating components on initial load without a demonstrated need.
- Do not add TanStack or another application framework until a concrete requirement justifies it.
- Keep framework-independent logic in `src/lib` so it can be tested without a browser.

## Project structure

- `src/components`: reusable Astro and interactive UI components.
- `src/layouts`: page-level document shells.
- `src/lib`: framework-independent TypeScript and content utilities.
- `src/pages`: route entrypoints only. Move reusable UI and logic elsewhere.
- `src/styles`: design tokens and global styles.
- `public`: immutable public assets that Astro should not transform.

Keep content areas aligned with `src/content.config.ts` and the contracts in `src/lib/content/schemas.ts`. A schema change requires an approved issue and matching validator tests.

## TypeScript and code style

- Keep Astro's strict TypeScript preset enabled.
- Avoid `any`. Narrow unknown input at its boundary.
- Prefer small named exports and immutable data.
- Use PascalCase for components and camelCase for TypeScript modules and variables.
- Keep component props typed in the component frontmatter.
- Use semantic HTML first. Add ARIA only when native semantics are insufficient.
- Respect reduced-motion preferences and visible keyboard focus.
- Format with Prettier and lint with ESLint. Do not bypass a rule without documenting why.

## Styling and visual direction

- Treat `src/styles/tokens.css` as the only source for palette, typography, spacing and radius values.
- Give design tokens semantic names. Components must not duplicate approved raw color values.
- Tailwind theme aliases must point to CSS custom properties.
- Build every route with the existing shared page layout that matches its content. Do not instantiate `BaseLayout` directly or redefine the page background, content width or H1 scale when `EditorialPageLayout` or `ReadingPageLayout` already provides them.
- Render authored inline editorial links with `TextLink`. Wrap rendered Markdown in `editorial-rich-text` so its native anchors inherit the same shared rules from `src/styles/text-link.css`. Do not create route-specific link colors, hover states or focus treatments.
- Before introducing a new page-level style, compare the route with at least 2 existing pages. Move any repeated background, width, heading or link rule into the shared layout or component instead of copying it into the route.
- Every top-level public content route must have an explicit navigation entry and active state unless an approved issue records why it should remain outside the primary navigation.
- Keep the visual language dark, editorial, restrained and deliberately detailed.
- Use the text wordmark only. Do not commit an official or modified PCT logo until its dedicated usage decision is approved.
- Trail marks and illustrations must be original and consistent with the approved visual system. Do not trace protected artwork.
- Test responsive behavior at desktop, 736 px and 360 px. Horizontal overflow is a release blocker.

## Astro and React boundary

Choose Astro unless the component needs at least 1 of these capabilities:

- persistent client-side state
- a browser API after page load
- direct manipulation tied to pointer, keyboard or map events
- a third-party library that requires React

Passing static data through React is not enough reason to hydrate it. Keep the journal readable with JavaScript disabled.

## Tests and delivery

- Add unit tests for parsing, mapping and other framework-independent behavior.
- Add browser tests when an interactive island is introduced.
- Treat `quality-budgets.json` as the enforced source of truth for generated asset and route budgets. Run `pnpm quality:validate` only after a fresh production build.
- Keep automated axe coverage at WCAG A and AA for representative English and French routes on desktop and 360 px. Fix confirmed violations instead of excluding rules without an approved rationale.
- Keep `robots.txt`, `llms.txt`, social metadata and JSON-LD aligned with canonical public routes. `llms.txt` is a discovery aid, not a crawler directive or an SEO substitute.
- Keep `public/social-card.png` aligned with the approved brand after a reviewed visual change.
- Every bug fix must include a regression check at the narrowest useful level.
- Keep GitHub Actions permissions read-only unless an approved workflow needs more.
- Never commit `dist`, `.astro`, credentials, local environment files or generated media derivatives that can be reproduced.
- Open focused pull requests ready for human review. Never merge, enable auto-merge or deploy without explicit approval.
- Before opening a pull request, present the local diff, verification evidence, risks and remaining human checks in the active Codex task. Keep the branch unpublished until the human explicitly approves creating the pull request.

## Content and media

- Preserve the author's voice when correcting journal text. Separate editorial corrections from technical migrations.
- Keep French as the source language and English translations reviewable beside it in the content model.
- Store language-neutral facts in `src/data` and localized editorial copy in `src/content/{area}/{locale}`. Never duplicate trail metrics for a translation.
- Store short structured gear and glossary translations in 1 keyed JSON file per locale, such as `src/content/gear/fr.json`. Keep long-form journal and supporting pages as separate Markdown files.
- Keep entity IDs and public slugs locale-neutral. A translated entry must reference the same neutral day, photo, glossary concept or gear item.
- Serve English on unprefixed public URLs and French under `/fr`. Keep equivalent route shapes and locale-neutral entity slugs across both languages.
- Never render a localized public route from another language as a fallback. Missing translated content must fail validation or prevent that route from being generated.
- Render date-only values with semantic `time` elements and a deterministic static fallback. Browser-preference formatting may progressively enhance the visible text but must never make content depend on JavaScript.
- Treat miles as canonical. Derive daily distance, cumulative distance and kilometers through `src/lib/content/metrics.ts`.
- Treat grams as the canonical equipment weight unit. Pass canonical miles and grams to the shared `UnitValue` presentation instead of formatting unit strings inside routes or components.
- Keep display preferences versioned and browser-local through `src/lib/preferences`. Keep their controls visually aligned with the existing navigation instead of introducing a separate chip or panel design language.
- Scope photo placement IDs to their owner. Use `photo-074001` for the first photo of `day-074` and `photo-introduction-001` for the first photo of the introduction page. Keep global source order in the separate `order` field.
- Mark neutral entities as published only when their required French entry exists.
- Retain Word block references on imported entities. Record proposed, approved or rejected editorial changes in `src/data/source/corrections.json`.
- Treat committed content and data as the publication sources of truth. Preserve source references and review broad migrations separately from editorial corrections.
- Treat the approved source hash and `src/data/source/word-extraction-report.json` as provenance invariants. A source change requires a newly approved issue before updating the hash or structural counts.
- Run `pnpm content:validate` after every content change. Add a focused invalid fixture whenever a new cross-entry invariant is introduced.
- Do not place original full-resolution photos in Git. Commit only approved optimized derivatives with stable names and attribution metadata where needed.
- Never import the Word source or Google Photos export wholesale into this repository.
- Keep original photos and generated derivatives outside Git. Only approved provider-neutral manifests and localized media copy are versioned.
- Keep media paths immutable and content-addressed. Remote upload, overwrite or deletion always requires explicit authorization.
- Use the committed PCTA January 2026 centerline snapshot under `src/data/map` as the route source.
- Preserve the exact PCTA attribution from the route manifest wherever the route is rendered. The route is a public reference geometry, not the author's personal GPS trace.
- CI and static builds must never depend on ArcGIS availability.
- Treat PCTA source revision changes as a separate reviewed migration. Do not weaken pinned edit dates or structural counts to accept upstream drift silently.
- Keep journal mileage canonical. Only journal mile 2,656 may clamp to the official 2,655.84-mile northern terminus. A zero-distance trail day maps to a point without inventing distance.

## Project tracking and making of

- Track issues, decisions and implementation status in the PCT Notion database, not GitHub Issues.
- Prefix agent comments in Notion with `🤖 Codex:`.
- Keep making-of notes in the dedicated Notion content area, outside this repository.
- When work starts, move the issue to `In progress 🤖🧑‍🚀`.
- After verification and pull request creation, add the pull request URL and move the issue to `Code In review 🤖🧑‍🚀`.
- Human review and merge remain explicit gates.
