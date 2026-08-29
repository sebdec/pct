# PCTA route pipeline

This pipeline imports a reviewed snapshot of the official 2026 Pacific Crest Trail Association centerline and half-mile markers. It produces the language-neutral route dataset used by the future Explorer without requiring ArcGIS at runtime or during CI.

## Source and license

- Source: [PCTA PCT Data](https://www.pcta.org/discover-the-trail/maps/pct-data/)
- Revision: January 2026
- License: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)
- Required attribution: `Trail data © Pacific Crest Trail Association, CC BY 4.0, 2026`

The route is a public reference geometry. It is not Sébastien's personal GPS trace.

## Import the approved snapshot

```sh
pnpm route:import -- \
  --output "src/data/map/routes.json" \
  --report ".route-workspace/import-report.json"
```

The command:

- verifies the exact approved layer names, geometry types and 2026 edit dates
- paginates the marker service beyond its 2,000-record limit
- requests the centerline with a deterministic `0.00025` degree maximum offset and 6-decimal coordinate precision
- orders the route from the southern to the northern terminus
- projects valid half-mile markers monotonically onto the route
- excludes source markers without coordinates and records them in the ignored report
- adds explicit anchors at mile 0 and official mile 2,655.84
- writes only the normalized snapshot into Git

An annual PCTA update intentionally fails as source drift. Update the pinned revision only through a separately reviewed issue.

## Journal mileage rule

Journal miles remain canonical. The final journal value of 2,656 is an intentional rounded display value and maps to the official 2,655.84-mile northern terminus. No other out-of-range value is clamped.

The zero-distance `day-028` entry maps to a single position at mile 703. The other 96 trail days map to positive route ranges. The 3 post-trail entries have no route range.

## Render a static review image

```sh
pnpm route:preview -- \
  --input "src/data/map/routes.json" \
  --days "src/data/trail/days.json" \
  --output ".route-workspace/pct-route-preview.png"
```

The preview and import report stay in the ignored `.route-workspace` directory. Review the route shape, both termini and representative day endpoints before opening a pull request.

## Recovery

- Source revision mismatch: inspect the PCTA changelog and create a dedicated update issue.
- Unexpected entity count: do not weaken the invariant until the new source contents are reviewed.
- Large projection distance: inspect the relevant source marker and simplification parameters.
- Invalid daily range: correct the journal source through its editorial correction workflow. Do not modify generated day metrics by hand.
