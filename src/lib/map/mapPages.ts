import type { Day } from "../content/schemas.ts";

export function buildMapStaticPaths(days: readonly Day[]) {
  return days
    .filter((day) => day.kind === "trail" && day.published)
    .map((day) => ({
      params: { dayId: day.id },
      props: { dayId: day.id },
    }));
}
