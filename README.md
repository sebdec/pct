# Pacific Crest Trail 2026

Static-first interactive journal for a 2026 Pacific Crest Trail thru-hike.

This repository contains the technical and visual foundations plus the approved French journal extracted from its Word source. The Word document and original photo library remain outside Git.

## Prerequisites

- Node.js 24
- pnpm 11.20.0, pinned through `packageManager`

Use a Node version manager that reads `.node-version` or install Node.js 24 directly. Corepack can install the pinned package manager:

```sh
corepack enable
corepack install
```

## Setup

```sh
pnpm install --frozen-lockfile
```

## Development

Start Astro's local development server:

```sh
pnpm dev
```

Astro prints the local URL, usually `http://localhost:4321`.

## Verification

Run the canonical local and CI quality gate:

```sh
pnpm verify
```

It checks formatting, lint rules, Astro and TypeScript diagnostics, content invariants, unit tests, the static production build, quality budgets, generated metadata and Playwright browser coverage.

Individual commands are also available:

```sh
pnpm format
pnpm lint
pnpm check
pnpm content:validate
pnpm test
pnpm build
pnpm quality:validate
pnpm preview
```

## Architecture

- Astro renders layouts and editorial UI statically.
- React powers the map and journal progress islands. Display preferences use small browser scripts and custom elements. Static editorial UI remains in Astro.
- Tailwind CSS 4 compiles only its shared browser reset through the Vite plugin. The app does not generate Tailwind utilities.
- Design decisions live in named CSS custom properties in `src/styles/tokens.css` and component styles consume them directly.
- Vitest covers framework-independent TypeScript behavior.
- Astro content collections validate each entry at build time. A separate validator enforces references, chronology, mileage continuity and required French copy across collections.

See `AGENTS.md` for the complete project conventions.

## Project structure

- `src/pages`: route entrypoints only.
- `src/layouts`: shared document and page shells.
- `src/components`: reusable Astro UI and isolated React interactions.
- `src/lib`: framework-independent TypeScript, view models and validators.
- `src/content`: localized editorial text managed through Astro content collections.
- `src/data`: language-neutral facts shared by routes and locales.
- `src/styles`: design tokens and global presentation rules.
- `public`: immutable assets served without transformation.
- `scripts`: maintained validation and quality gates used by `pnpm verify`.

Repository-wide engineering rules live in `AGENTS.md`. Run `pnpm verify` before every publication handoff.

## Content architecture

`src/content.config.ts` defines the Astro collections and their Zod schemas. The data is deliberately split into 2 layers:

- `src/data`: language-neutral facts such as regions, sections, days, gear weights and photo metadata. PCT section mile bounds remain optional until verified route geometry is available.
- `src/content`: localized editorial copy such as journal prose, page content, glossary definitions, gear labels, alternative text and captions.

French remains the source language. English entries reuse the same neutral entity IDs. English is served from unprefixed public routes and French from `/fr`, with neutral slugs such as `/journal/day-001` and `/fr/journal/day-001`.

Miles are the distance source of truth. Daily distance and kilometers are derived in `src/lib/content/metrics.ts`. Trail position uses the canonical mile bounds stored for each day.

Run the cross-collection validation directly with:

```sh
pnpm content:validate
```

See `src/content/README.md` for directory and editing rules.

## Publication sources

The French journal and media metadata were imported from the approved `PCT 2026 - Sebdec.docx` source. The normalized content, responsive Blob URLs and PCTA route snapshot are now versioned publication inputs.

The production build is deliberately independent from the Word document, original photos, image processing tools and ArcGIS. Keep those private sources outside the repository.

`src/data/source/README.md` preserves the retired import provenance and links to its historical per-entry mapping. The route manifest preserves the PCTA revision, license and exact attribution. `pnpm content:validate` checks the active publication inputs before publication.

## Quality budgets

`quality-budgets.json` is the versioned source of truth for compressed HTML, JavaScript, CSS and map-data limits plus the maximum generated-image size. `pnpm quality:validate` runs after `pnpm build`, checks every generated HTML route and validates metadata, canonical URLs, language alternates, social tags, JSON-LD, `robots.txt` and `llms.txt`.

The map route and geography live in 1 shared static JSON payload instead of being serialized into every map page. Accessibility coverage uses axe on representative English and French routes at desktop and 360 px. Keyboard and reduced-motion checks cover the primary interactive flows.

Do not increase a budget or disable an accessibility rule without recording the measured reason in the active Notion issue.

## Vercel preparation

The project uses Astro's static output and needs no Vercel adapter. Once deployment is approved, import `sebdec/pct` in Vercel and keep the detected Astro defaults:

- Build command: `pnpm build`
- Output directory: `dist`
- Install command: `pnpm install --frozen-lockfile`

The Vercel project and `pct.sebdec.com` domain are deliberately outside the foundation scope.
