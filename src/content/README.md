# Content workspace

Localized editorial content lives here. Language-neutral trail facts and source metadata live in `src/data`.

## Directory rules

- `journal/{locale}/day-NNN.md`: journal prose with localized frontmatter.
- `pages/{locale}/*.md`: introduction, analysis, people, after-terminus and closing prose.
- `glossary/{locale}/*.json`: localized terms and definitions.
- `gear/{locale}/*.json`: localized gear names and details.
- `media/{locale}/*.json`: localized alternative text and captions.

French (`fr`) is required for every published neutral entity. English (`en`) can be added incrementally while retaining the same neutral IDs.

Do not add the Word source or full-resolution photographs. Every imported record must retain its source reference and every editorial correction must be recorded separately in `src/data/source/corrections.json`.
