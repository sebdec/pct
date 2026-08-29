# Content workspace

Localized editorial content lives here. Language-neutral trail facts and source metadata live in `src/data`.

## Directory rules

- `journal/{locale}/day-NNN.md`: journal prose with localized frontmatter.
- `pages/{locale}/*.md`: introduction, analysis, gear, people, after-terminus and closing prose.
- `glossary/{locale}/*.json`: localized terms and definitions.
- `gear/{locale}/*.json`: localized gear names and details.
- `media/{locale}/*.json`: localized alternative text and captions.

French (`fr`) is required for every published neutral entity. English (`en`) can be added incrementally while retaining the same neutral IDs.

Do not add the Word source or full-resolution photographs. Every imported record must retain its source reference and every editorial correction must be recorded separately in `src/data/source/corrections.json`.

## Regeneration

Run the deterministic extractor with the approved source outside Git:

```sh
pnpm content:extract -- --input "/absolute/path/to/PCT 2026 - Sebdec.docx"
pnpm content:validate
```

The source hash and verified structural counts are fixed in the approved extractor contract. A different or modified DOCX fails before generated paths are replaced. The Word file and its embedded image binaries are never copied into this repository.

Generated outputs include 100 journal Markdown files, 5 supporting pages, neutral trail data, 66 gear records, 39 glossary records, 344 photo placements, the source manifest and the extraction report. Do not edit these files directly because regeneration replaces them.

## Faithful serialization

The extractor preserves source paragraph order, punctuation, accents, apostrophes, emphasis and hyperlinks. It applies only these presentation-independent serializations:

- trims layout-only whitespace at the start and end of each Word paragraph
- converts Word emphasis, hyperlinks and list paragraphs to Markdown
- converts paragraph breaks inside table cells to `<br>`
- excludes daily metadata labels and the presentation-only calendar emoji from journal bodies
- stores miles as the canonical distance and validates displayed kilometers without storing them

## Review and corrections

After extraction, inspect `src/data/source/word-extraction-report.json` and representative entries from all 5 regions plus the 3 post-trail entries. Run `pnpm verify` before opening a pull request.

To propose a correction, add a `proposed` record to `src/data/source/corrections.json` with the exact entity, field, source value, corrected value, reason and Word block reference. Do not alter generated prose or facts until that correction and any extractor application logic have explicit approval. Rejected proposals remain in the ledger as source history.
