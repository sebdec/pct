# Content workspace

Localized editorial content lives here. Language-neutral trail facts and source metadata live in `src/data`.

## Directory rules

- `journal/{locale}/day-NNN.md`: journal prose with localized frontmatter.
- `pages/{locale}/*.md`: introduction, analysis, gear, people, after-terminus and closing prose.
- `glossary/{locale}.json`: all localized terms and definitions for 1 language.
- `gear/{locale}.json`: all localized gear names and details for 1 language.
- `media/{locale}.json`: all localized alternative text and captions for 1 language.

French (`fr`) remains the source language. French and English (`en`) are both required before a neutral entity can be published. Unpublished translations can be prepared incrementally while retaining the same neutral IDs.

Do not add the Word source or full-resolution photographs. Imported content is normalized publication content. Historical import provenance and Git recovery links live in `src/data/source/README.md`.

The committed content and data are the publication sources of truth. Update them through focused, reviewed changes and run `pnpm content:validate` after every edit.

Photo placement IDs are scoped to their associated content. `photo-074001` is the first photo of `day-074`. Placements outside the journal use the supporting page ID, for example `photo-introduction-001`. Journal entries define display order through their `photoIds` array. Supporting pages are not routed. If they become public, add an explicit ordered photo list instead of inferring presentation order from data storage.

## Review

Inspect representative entries from all 5 regions plus the 3 post-trail entries after a broad content change. Run `pnpm verify` before opening a pull request.

Keep editorial corrections focused and reviewable. Do not mix prose changes with broad technical migrations.
