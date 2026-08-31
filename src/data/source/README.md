# Imported content provenance

The French journal and its initial structured data were imported on 2026-08-29. The normalized files in `src/content` and `src/data` are now the publication sources of truth. The retired Word document is not required to build or validate the site.

## Original source

- Filename: `PCT 2026 - Sebdec.docx`
- SHA-256: `f57f19abb6360609f7f517ea53c1acbd824ef6a69faed3b599911800fd81eb4d`
- Size: 109,513,518 bytes
- Structure: 993 body blocks, 795 paragraphs, 198 tables and 1 document section
- Imported records: 97 trail entries, 3 post-trail entries, 66 gear items, 39 glossary concepts, 344 photo placements and 342 media assets

## Historical mapping

The initial extraction is preserved in commit [`c34fbf8`](https://github.com/sebdec/pct/tree/c34fbf8f037ad5a1e6a7066e76f78734c03fdce5). The final version containing the per-entry Word block mappings is preserved in commit [`a877da5`](https://github.com/sebdec/pct/tree/a877da5).

Per-entry extraction metadata and the one-shot extraction report were removed after the import pipeline was retired. Use Git history when that historical mapping is needed. Do not reintroduce extraction metadata into active content.
