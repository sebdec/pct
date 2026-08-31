import {
  defaultLocale,
  publishedLocales,
  type Locale,
} from "../content/locales.ts";
import { switchLocaleUrl } from "../content/urls.ts";

interface LocalizedLink {
  locale: Locale | "x-default";
  path: string;
}

export function getLocalizedLinks(
  pathname: string,
  currentLocale: Locale,
): LocalizedLink[] {
  const links = publishedLocales.map((locale) => ({
    locale,
    path: switchLocaleUrl(pathname, locale),
  }));

  const current = links.find(({ locale }) => locale === currentLocale);
  if (!current) throw new Error(`Missing localized link for ${currentLocale}.`);

  return [
    ...links,
    {
      locale: "x-default",
      path: switchLocaleUrl(pathname, defaultLocale),
    },
  ];
}
