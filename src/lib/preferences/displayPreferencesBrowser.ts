import {
  displayPreferencesStorageKey,
  formatDistance,
  formatDistanceRange,
  formatElevation,
  formatWeight,
  getDefaultDisplayPreferences,
  parseDisplayPreferences,
  type DisplayPreferences,
} from "./displayPreferences.ts";

export const displayPreferencesChangeEvent = "pct:display-preferences-change";

function browserLocale(): string {
  return navigator.languages[0] ?? navigator.language ?? "fr-FR";
}

export function readDisplayPreferences(): DisplayPreferences {
  try {
    return parseDisplayPreferences(
      window.localStorage.getItem(displayPreferencesStorageKey),
      browserLocale(),
    );
  } catch {
    return getDefaultDisplayPreferences(browserLocale());
  }
}

function formatUnitElement(
  element: HTMLElement,
  preferences: DisplayPreferences,
): void {
  const prefix = element.dataset.pctPrefix ?? "";
  const suffix = element.dataset.pctSuffix ?? "";
  const maximumFractionDigits = element.dataset.pctMaximumFractionDigits
    ? Number(element.dataset.pctMaximumFractionDigits)
    : undefined;
  const weightGrams = Number(element.dataset.pctWeightGrams);
  const elevationMeters = Number(element.dataset.pctElevationMeters);
  const distanceMiles = Number(element.dataset.pctDistanceMiles);
  const distanceEndMiles = Number(element.dataset.pctDistanceEndMiles);
  let value: string | undefined;

  if (Number.isFinite(weightGrams)) {
    value = formatWeight(weightGrams, preferences.weightUnit, {
      maximumFractionDigits,
    });
  } else if (Number.isFinite(elevationMeters)) {
    value = formatElevation(elevationMeters, preferences.distanceUnit, {
      maximumFractionDigits,
    });
  } else if (
    Number.isFinite(distanceMiles) &&
    Number.isFinite(distanceEndMiles)
  ) {
    value = formatDistanceRange(
      distanceMiles,
      distanceEndMiles,
      preferences.distanceUnit,
      { maximumFractionDigits },
    );
  } else if (Number.isFinite(distanceMiles)) {
    value = formatDistance(distanceMiles, preferences.distanceUnit, {
      maximumFractionDigits,
      unitDisplay: element.dataset.pctUnitDisplay === "long" ? "long" : "short",
    });
  }

  if (value !== undefined) {
    const nextText = `${prefix}${value}${suffix}`;
    if (element.textContent !== nextText) element.textContent = nextText;
  }
}

function formatDistanceAriaLabel(
  element: HTMLElement,
  preferences: DisplayPreferences,
): void {
  const miles = Number(element.dataset.pctDistanceAriaMiles);
  if (!Number.isFinite(miles)) return;

  element.setAttribute(
    "aria-valuetext",
    `${element.dataset.pctAriaPrefix ?? ""}${formatDistance(
      miles,
      preferences.distanceUnit,
    )}`,
  );
}

function applyPreferenceAttributes(
  documentRoot: Document,
  preferences: DisplayPreferences,
): void {
  const root = documentRoot.documentElement;
  root.dataset.distanceUnit = preferences.distanceUnit;
  root.dataset.weightUnit = preferences.weightUnit;
}

export function applyDisplayPreferences(
  documentRoot: Document,
  preferences = readDisplayPreferences(),
): void {
  applyPreferenceAttributes(documentRoot, preferences);
  documentRoot
    .querySelectorAll<HTMLElement>("[data-pct-unit-value]")
    .forEach((element) => formatUnitElement(element, preferences));
  documentRoot
    .querySelectorAll<HTMLElement>("[data-pct-distance-aria-miles]")
    .forEach((element) => formatDistanceAriaLabel(element, preferences));
}

export function writeDisplayPreferences(preferences: DisplayPreferences): void {
  try {
    window.localStorage.setItem(
      displayPreferencesStorageKey,
      JSON.stringify(preferences),
    );
  } catch {
    // The preference still applies to the current document when storage is blocked.
  }

  applyDisplayPreferences(document, preferences);
  window.dispatchEvent(
    new CustomEvent(displayPreferencesChangeEvent, { detail: preferences }),
  );
}

let configured = false;

export function configureDisplayPreferences(documentRoot: Document): void {
  applyDisplayPreferences(documentRoot);
  if (configured) return;
  configured = true;

  const observer = new MutationObserver((mutations) => {
    if (
      mutations.some(
        ({ type, attributeName }) =>
          type === "childList" ||
          attributeName?.startsWith("data-pct-") === true,
      )
    ) {
      applyDisplayPreferences(documentRoot);
    }
  });
  observer.observe(documentRoot.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "data-pct-distance-miles",
      "data-pct-distance-end-miles",
      "data-pct-weight-grams",
      "data-pct-elevation-meters",
      "data-pct-distance-aria-miles",
    ],
  });

  window.addEventListener("storage", (event) => {
    if (event.key === displayPreferencesStorageKey) {
      applyDisplayPreferences(documentRoot);
    }
  });
}
