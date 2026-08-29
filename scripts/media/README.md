# Local media pipeline

This pipeline matches a curated local photo export to the images embedded in the approved Word journal. It then generates deterministic web derivatives and a provider-neutral manifest. Original photos, Word media, matching reports and generated derivatives stay outside Git.

## Safety model

- Keep the curated export outside the repository.
- Use `.media-workspace` or another ignored directory for reports and derivatives.
- Matching never writes approved associations automatically.
- Upload is a dry run unless both `--execute` and `--confirm-upload pct-2026` are present.
- Upload never overwrites or deletes a Blob.
- The static site and CI do not need private photos, the Word file or Blob credentials.

## 1. Match originals

```sh
pnpm media:match -- \
  --word "/absolute/path/to/PCT 2026 - Sebdec.docx" \
  --sources "/absolute/path/to/curated-pct-export" \
  --report ".media-workspace/match-report.json"
```

The report contains local filenames, confidence scores and up to 5 candidates per Word asset. Do not commit it. Automatic matches require a score of at least `0.92` and a clear lead over the second candidate. Lower-confidence candidates remain ambiguous or unmatched.

## 2. Approve associations

Review the report. For ambiguous entries, create an ignored decisions file keyed by `assetKey`:

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

## 3. Generate derivatives

```sh
pnpm media:generate -- \
  --matches "src/data/media/approved-matches.json" \
  --sources "/absolute/path/to/curated-pct-export" \
  --output ".media-workspace/derivatives" \
  --manifest "src/data/media/assets.json"
```

The generator normalizes orientation and color, strips EXIF, IPTC and XMP metadata and produces AVIF and WebP variants at applicable widths among 640, 960, 1440 and 1920 pixels. It never upscales. A source narrower than 640 pixels receives 1 variant per format at its intrinsic width.

## 4. Validate

```sh
pnpm media:validate -- \
  --matches "src/data/media/approved-matches.json" \
  --placements "src/data/media/photos.json" \
  --manifest "src/data/media/assets.json" \
  --output ".media-workspace/derivatives" \
  --report ".media-workspace/media-report.json"
```

Validation checks mappings, dimensions, byte sizes, metadata removal, provisional budgets, placement references and generated files. The report records totals by format and the 10 largest variants.

## 5. Review upload without changing remote state

```sh
pnpm media:upload -- \
  --manifest "src/data/media/assets.json" \
  --output ".media-workspace/derivatives"
```

This is always a dry run. A real upload is a separate authorized operation:

```sh
BLOB_READ_WRITE_TOKEN="..." pnpm media:upload -- \
  --manifest "src/data/media/assets.json" \
  --output ".media-workspace/derivatives" \
  --execute \
  --confirm-upload pct-2026
```

Existing immutable paths are reused only when the remote byte size matches. A conflict stops the command. Partial runs are safe to repeat.

## Recovery

- If matching is ambiguous, update only the ignored decisions file and rerun approval.
- If an original changes, its fingerprint and every derivative path change. The old Blob is left untouched.
- If generation or validation fails, remove only the affected ignored workspace and rerun. Versioned data remains reviewable in Git.
- Remote deletion is intentionally unsupported.
