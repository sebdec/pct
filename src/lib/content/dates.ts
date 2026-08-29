const frenchDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
});

export function parseLocalIsoDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new RangeError(`Invalid ISO date: ${value}`);
  }

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    throw new RangeError(`Invalid ISO date: ${value}`);
  }

  return parsed;
}

export function formatFrenchDate(value: string): string {
  return frenchDateFormatter.format(parseLocalIsoDate(value));
}
