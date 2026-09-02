import { describe, expect, it } from "vitest";

import { createValidContentModel } from "../content/contentFixtures.ts";
import { daySchema } from "../content/schemas.ts";
import { buildMapStaticPaths } from "./mapPages.ts";

describe("map static paths", () => {
  it("keeps published trail order and excludes unpublished or post-trail days", () => {
    const days = createValidContentModel().days.map((day) =>
      daySchema.parse(day),
    );
    const first = days[0]!;
    const second = days[1]!;
    const postTrail = days[2]!;
    const unpublished = daySchema.parse({
      ...second,
      id: "day-004",
      sequence: 4,
      published: false,
    });

    expect(
      buildMapStaticPaths([second, postTrail, unpublished, first]),
    ).toEqual([
      { params: { dayId: "day-002" }, props: { dayId: "day-002" } },
      { params: { dayId: "day-001" }, props: { dayId: "day-001" } },
    ]);
  });
});
