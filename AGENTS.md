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
- Every bug fix must include a regression check at the narrowest useful level.
- Keep GitHub Actions permissions read-only unless an approved workflow needs more.
- Never commit `dist`, `.astro`, credentials, local environment files or generated media derivatives that can be reproduced.
- Open focused pull requests ready for human review. Never merge, enable auto-merge or deploy without explicit approval.

## Content and media

- Preserve the author's voice when correcting journal text. Separate editorial corrections from technical migrations.
- Keep French as the initial source language while allowing a future English variant in the content model.
- Store language-neutral facts in `src/data` and localized editorial copy in `src/content/{area}/{locale}`. Never duplicate trail metrics for a translation.
- Keep entity IDs and public slugs locale-neutral. A translated entry must reference the same neutral day, photo, glossary concept or gear item.
- Treat miles as canonical. Derive daily distance, cumulative distance and kilometers through `src/lib/content/metrics.ts`.
- Scope photo placement IDs to their owner. Use `photo-074001` for the first photo of `day-074` and `photo-introduction-001` for the first photo of the introduction page. Keep global source order in the separate `order` field.
- Mark neutral entities as published only when their required French entry exists.
- Retain Word block references on imported entities. Record proposed, approved or rejected editorial changes in `src/data/source/corrections.json`.
- Regenerate Word-derived files only through `pnpm content:extract -- --input <path>`. Do not hand-edit generated journal, page, gear, glossary, trail, photo, source-manifest or extraction-report files.
- Treat the approved source hash and `src/data/source/word-extraction-report.json` as extraction invariants. A source change requires a newly approved issue before updating the hash or structural counts.
- Run `pnpm content:validate` after every content change. Add a focused invalid fixture whenever a new cross-entry invariant is introduced.
- Do not place original full-resolution photos in Git. Commit only approved optimized derivatives with stable names and attribution metadata where needed.
- Never import the Word source or Google Photos export wholesale into this repository.

## Project tracking and making of

- Track issues, decisions and implementation status in the PCT Notion database, not GitHub Issues.
- Prefix agent comments in Notion with `🤖 Codex:`.
- Keep making-of notes in the dedicated Notion content area, outside this repository.
- When work starts, move the issue to `In progress 🤖🧑‍🚀`.
- After verification and pull request creation, add the pull request URL and move the issue to `Code In review 🤖🧑‍🚀`.
- Human review and merge remain explicit gates.
