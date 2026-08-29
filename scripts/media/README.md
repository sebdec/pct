# Local media pipeline

This pipeline extracts the images embedded in the approved Word journal, verifies their exact associations and generates deterministic web derivatives plus a provider-neutral manifest. The Word source, extracted media, matching reports and generated derivatives stay outside Git.

## Safety model

- Keep the approved Word source outside the repository.
- Extract Word media only under the ignored `.media-workspace` directory.
- Matching never writes approved associations automatically.
- Upload is a dry run unless both `--execute` and `--confirm-upload pct-2026` are present.
- Upload never overwrites or deletes a Blob.
- The static site and CI do not need private photos, the Word file or Blob credentials.

## 1. Extract the embedded Word images

```sh
pnpm media:extract-word -- \
  --word "/absolute/path/to/PCT 2026 - Sebdec.docx" \
  --output ".media-workspace/word-sources"
```

The command verifies the approved Word filename, SHA-256 and count of 342 distinct media assets before replacing the ignored output directory. Extracted filenames use the existing content-addressed `assetKey`.

## 2. Verify exact associations

```sh
pnpm media:match -- \
  --word "/absolute/path/to/PCT 2026 - Sebdec.docx" \
  --sources ".media-workspace/word-sources" \
  --report ".media-workspace/match-report.json"
```

The report contains local filenames, confidence scores and up to 5 candidates per Word asset. Do not commit it. An identical embedded binary is an exact automatic match with a score of `1`. The perceptual scoring path remains available for a future separately approved migration to higher-resolution originals.

## 3. Approve associations

Review the report. The V1 Word sources should produce only exact automatic matches. If a future source migration produces an ambiguous entry, create an ignored decisions file keyed by `assetKey`:

```json
{
  "word-media-0123456789abcdef": "full-source-sha256"
}
```

Then produce the versioned mapping:

```sh
pnpm media:approve -- \
  --report ".media-workspace/match-report.json" \
  --decisions ".media-workspace/manual-decisions.json" \
  --output "src/data/media/approved-matches.json"
```

The committed mapping contains only stable keys, fingerprints, similarity and approval mode. It never contains filenames or personal paths.

## 4. Generate derivatives

```sh
pnpm media:generate -- \
  --matches "src/data/media/approved-matches.json" \
  --sources ".media-workspace/word-sources" \
  --output ".media-workspace/derivatives" \
  --manifest "src/data/media/assets.json"
```

The generator normalizes orientation and color, strips EXIF, IPTC and XMP metadata and produces AVIF and WebP variants at applicable widths among 640, 960, 1440 and 1920 pixels. It never upscales. A source narrower than 640 pixels receives 1 variant per format at its intrinsic width.

## 5. Validate

```sh
pnpm media:validate -- \
  --matches "src/data/media/approved-matches.json" \
  --placements "src/data/media/photos.json" \
  --manifest "src/data/media/assets.json" \
  --output ".media-workspace/derivatives" \
  --report ".media-workspace/media-report.json"
```

Validation checks mappings, dimensions, byte sizes, metadata removal, provisional budgets, placement references and generated files. The report records totals by format and the 10 largest variants.

## 6. Review upload without changing remote state

```sh
pnpm media:upload -- \
  --manifest "src/data/media/assets.json" \
  --output ".media-workspace/derivatives" \
  --selection "src/data/media/upload-selection.json"
```

This is always a dry run. A real upload is a separate authorized operation:

```sh
BLOB_READ_WRITE_TOKEN="..." pnpm media:upload -- \
  --manifest "src/data/media/assets.json" \
  --output ".media-workspace/derivatives" \
  --selection "src/data/media/upload-selection.json" \
  --execute \
  --confirm-upload pct-2026
```

Existing immutable paths are reused only when the remote byte size matches. A conflict stops the command. Partial runs are safe to repeat.

`src/data/media/upload-selection.json` contains only asset IDs explicitly approved for upload. It is empty by default. The official PCT logo and every unreviewed photo remain excluded from both the dry-run plan and real upload.

## Recovery

- If matching is ambiguous, update only the ignored decisions file and rerun approval.
- If an original changes, its fingerprint and every derivative path change. The old Blob is left untouched.
- If generation or validation fails, remove only the affected ignored workspace and rerun. Versioned data remains reviewable in Git.
- Remote deletion is intentionally unsupported.
