import { localeLanguageTags, type Locale } from "../content/locales.ts";
import { site } from "../site.ts";

interface StructuredDataInput {
  canonicalUrl: string;
  title: string;
  description: string;
  locale: Locale;
  journal?: {
    headline: string;
    datePublished: string;
  };
}

export function buildStructuredData({
  canonicalUrl,
  title,
  description,
  locale,
  journal,
}: StructuredDataInput) {
  const websiteId = `${site.url}/#website`;
  const authorId = `${site.url}/#author`;
  const webPageId = `${canonicalUrl}#webpage`;
  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: `${site.url}/`,
      name: site.title,
      inLanguage: ["en", "fr"],
    },
    {
      "@type": "Person",
      "@id": authorId,
      name: site.author.name,
      url: `${site.url}/`,
    },
    {
      "@type": "WebPage",
      "@id": webPageId,
      url: canonicalUrl,
      name: title,
      description,
      inLanguage: localeLanguageTags[locale],
      isPartOf: { "@id": websiteId },
    },
  ];

  if (journal) {
    graph.push({
      "@type": "BlogPosting",
      "@id": `${canonicalUrl}#article`,
      headline: journal.headline,
      description,
      datePublished: journal.datePublished,
      inLanguage: localeLanguageTags[locale],
      mainEntityOfPage: { "@id": webPageId },
      isPartOf: { "@id": websiteId },
      author: { "@id": authorId },
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
