/** URL shapes for individual offers; does not assert condition, availability or relevance. */
const rules: Record<string, RegExp> = {
  "ricardo.ch": /^\/(?:fr|de|it)\/a\/[^/]+-\d+\/?$/,
  "anibis.ch": /^\/(?:fr|de|it)\/vi\/(?:[^/]+\/)*\d+\/?$/,
  "tutti.ch": /^\/(?:fr|de|it)\/vi\/(?:[^/]+\/)*\d+\/?$/,
  "petitesannonces.ch": /^\/a\/\d+\/?$/,
  "kleinanzeigen.de": /^\/s-anzeige\/[^/]+\/\d+-\d+-\d+\/?$/,
  "ebay.de": /^\/itm\/(?:[^/]+\/)?\d{8,}\/?$/,
  "ebay.com": /^\/itm\/(?:[^/]+\/)?\d{8,}\/?$/,
  "ebay.ch": /^\/itm\/(?:[^/]+\/)?\d{8,}\/?$/,
  "ebay.co.uk": /^\/itm\/(?:[^/]+\/)?\d{8,}\/?$/,
  "ebay.fr": /^\/itm\/(?:[^/]+\/)?\d{8,}\/?$/,
};

export function isMarketplaceOffer(
  value: string,
  title = "",
  snippet = "",
): boolean {
  try {
    // A marketplace may also index office/property rentals. Those are not resale items.
    const text = `${title} ${snippet}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (
      /\b(?:for rent|office space|zu vermieten|à louer|a louer|surface commerciale|local commercial|par mois|per month|pro monat)\b/i.test(
        text,
      )
    )
      return false;
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !/%(?:2f|5c|2e)/i.test(url.pathname) &&
      !/\/(?:immobilier|immobilien|immobili)\//i.test(url.pathname) &&
      Boolean(rules[host]?.test(url.pathname))
    );
  } catch {
    return false;
  }
}

export function marketplaceDomains(source = "All"): string[] | null {
  const names: Record<string, string[]> = {
    all: Object.keys(rules),
    takeover: [],
    ricardo: ["ricardo.ch"],
    anibis: ["anibis.ch"],
    tutti: ["tutti.ch"],
    petitesannonces: ["petitesannonces.ch"],
    kleinanzeigen: ["kleinanzeigen.de"],
    ebay: ["ebay.de", "ebay.com", "ebay.ch", "ebay.co.uk", "ebay.fr"],
  };
  return names[source.trim().toLowerCase()] ?? null;
}

export function matchesMarketplaceSource(url: string, source = "All"): boolean {
  const domains = marketplaceDomains(source);
  try {
    return Boolean(
      domains?.includes(new URL(url).hostname.replace(/^www\./, "")),
    );
  } catch {
    return false;
  }
}

export function marketplaceQuery(query: string, source = "All"): string {
  if (source.trim().toLowerCase() !== "all") {
    const domains = marketplaceDomains(source) ?? [];
    const cleanQuery = query.replace(/-?site:\S+/gi, "").trim();
    return `${cleanQuery} (${domains.map((domain) => `site:${domain}`).join(" OR ")})`;
  }
  // Respect explicit site choices. The result filter remains authoritative.
  if (/\bsite:/i.test(query) || query.split(/\s+/).length > 55) return query;
  return `${query} (site:ricardo.ch OR site:anibis.ch OR site:tutti.ch OR site:petitesannonces.ch OR site:kleinanzeigen.de OR site:ebay.de)`;
}
