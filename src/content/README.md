# Content workspace

Localized editorial content lives here. Language-neutral trail facts and source metadata live in `src/data`.

## Directory rules

- `journal/{locale}/day-NNN.md`: journal prose with localized frontmatter.
- `pages/{locale}/*.md`: introduction, analysis, gear, people, after-terminus and closing prose.
- `glossary/{locale}.json`: all localized terms and definitions for 1 language.
- `gear/{locale}.json`: all localized gear names and details for 1 language.
- `media/{locale}.json`: all localized alternative text and captions for 1 language.

French (`fr`) is required for every published neutral entity. English (`en`) can be added incrementally while retaining the same neutral IDs.

Do not add the Word source or full-resolution photographs. Every imported record must retain its source reference and every editorial correction must be recorded separately in `src/data/source/corrections.json`.

The committed content and data are the publication sources of truth. Update them through focused, reviewed changes and run `pnpm content:validate` after every edit.

Photo placement IDs are scoped to their associated content. `photo-074001` is the first photo of `day-074`. Placements outside the journal use the supporting page ID, for example `photo-introduction-001`. The independent `order` field preserves global Word source order.

## Review and corrections

Inspect representative entries from all 5 regions plus the 3 post-trail entries after a broad content change. Run `pnpm verify` before opening a pull request.

To propose a correction, add a `proposed` record to `src/data/source/corrections.json` with the exact entity, field, source value, corrected value, reason and Word block reference. Do not alter source-derived prose or facts until that correction has explicit approval. Rejected proposals remain in the ledger as source history.
