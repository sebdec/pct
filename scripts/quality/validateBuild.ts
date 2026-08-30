import { readFile } from "node:fs/promises";

import { validateBuild, type QualityBudgets } from "./qualityBudgets.ts";

const budgets = JSON.parse(
  await readFile("quality-budgets.json", "utf8"),
) as QualityBudgets;
const violations = await validateBuild("dist", budgets);

if (violations.length > 0) {
  console.error(
    `Quality validation failed with ${violations.length} violation(s):`,
  );
  for (const violation of violations) {
    console.error(
      `- ${violation.route} [${violation.rule}] ${violation.message}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log("Quality budgets and generated metadata are valid.");
}
