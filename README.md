# Pacific Crest Trail 2026

Static-first interactive journal for a 2026 Pacific Crest Trail thru-hike.

This repository contains the technical and visual foundations plus the approved build-time content contracts. Real journal entries and the original photo library are intentionally excluded.

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

It checks formatting, lint rules, Astro and TypeScript diagnostics, unit tests and the static production build.

Individual commands are also available:

```sh
pnpm format
pnpm lint
pnpm check
pnpm content:validate
pnpm test
pnpm build
pnpm preview
```

## Architecture

- Astro renders layouts and editorial UI statically.
- React is installed for future interactive islands such as the map and mile controls. It must not be used for static content.
- Tailwind CSS 4 is integrated through its Vite plugin.
- Design decisions live in named CSS custom properties in `src/styles/tokens.css`. Tailwind consumes those variables rather than duplicating values.
- Vitest covers framework-independent TypeScript behavior.
- Astro content collections validate each entry at build time. A separate validator enforces references, chronology, mileage continuity and required French copy across collections.

See `AGENTS.md` for the complete project conventions.

## Content architecture

`src/content.config.ts` defines the Astro collections and their Zod schemas. The data is deliberately split into 2 layers:

- `src/data`: language-neutral facts such as regions, sections, days, canonical mile bounds, gear weights, photo metadata and corrections.
- `src/content`: localized editorial copy such as journal prose, page content, glossary definitions, gear labels, alternative text and captions.

French is the required initial locale. English entries reuse the same neutral entity IDs and can be added incrementally. Public routes will use stable locale prefixes and neutral slugs such as `/fr/journal/day-001` and `/en/journal/day-001`.

Miles are the distance source of truth. Daily distance, cumulative distance and kilometers are derived in `src/lib/content/metrics.ts`.

Run the cross-collection validation directly with:

```sh
pnpm content:validate
```

See `src/content/README.md` for directory and editing rules.

## Content sources and media

Real journal entries and original photos will be introduced through dedicated issues. Do not commit private exports, unoptimized source photos or credentials.

Imported entities keep references to their source blocks in the Word document. Approved editorial changes live in `src/data/source/corrections.json` instead of overwriting source history silently.

## Vercel preparation

The project uses Astro's static output and needs no Vercel adapter. Once deployment is approved, import `sebdec/pct` in Vercel and keep the detected Astro defaults:

- Build command: `pnpm build`
- Output directory: `dist`
- Install command: `pnpm install --frozen-lockfile`

The Vercel project and `pct.sebdec.com` domain are deliberately outside the foundation scope.
