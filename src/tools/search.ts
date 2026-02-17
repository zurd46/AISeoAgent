import * as cheerio from 'cheerio';
import { config } from '../config.js';
import type { CompetitorInfo } from '../types.js';

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

/**
 * Search DuckDuckGo using the HTML lite version (no API key needed).
 */
async function duckduckgoSearch(query: string, maxResults = 10): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const params = new URLSearchParams({ q: query });
    const resp = await fetch(`https://html.duckduckgo.com/html/?${params.toString()}`, {
      headers: {
        'User-Agent': config.http.userAgent,
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });

    const html = await resp.text();
    const $ = cheerio.load(html);

    $('.result').each((i, el) => {
      if (i >= maxResults) return false;

      const titleEl = $(el).find('.result__title a');
      const snippetEl = $(el).find('.result__snippet');

      const title = titleEl.text().trim();
      let url = titleEl.attr('href') || '';

      // DuckDuckGo wraps URLs in redirects
      if (url.includes('uddg=')) {
        try {
          const decoded = decodeURIComponent(
            url.split('uddg=')[1]?.split('&')[0] || ''
          );
          if (decoded) url = decoded;
        } catch {
          // keep original
        }
      }

      const description = snippetEl.text().trim();

      if (title && url && url.startsWith('http')) {
        results.push({ title, url, description });
      }
    });
  } catch {
    // Search failed silently
  }

  return results;
}

// Domains die keine echten Konkurrenten sind (Social Media, Woerterbuecher, etc.)
const EXCLUDED_DOMAINS = new Set([
  // Social Media & Plattformen
  'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'linkedin.com', 'github.com', 'reddit.com', 'pinterest.com', 'tiktok.com',
  'medium.com', 'quora.com', 'stackoverflow.com',
  // E-Commerce
  'amazon.com', 'amazon.de', 'amazon.ch', 'ebay.com', 'ebay.de', 'ebay.ch',
  'aliexpress.com',
  // Suchmaschinen
  'google.com', 'google.de', 'google.ch', 'bing.com', 'yahoo.com',
  // Enzyklopaedien & Woerterbuecher
  'wikipedia.org', 'wiktionary.org', 'wikimedia.org',
  'dict.cc', 'leo.org', 'duden.de', 'dwds.de', 'linguee.com', 'linguee.de',
  'deepl.com', 'translate.google.com', 'pons.com', 'pons.de',
  'collinsdictionary.com', 'dictionary.cambridge.org', 'dictionary.reverso.net',
  'merriam-webster.com', 'thefreedictionary.com', 'wordreference.com',
  'langenscheidt.com', 'en.langenscheidt.com', 'de.langenscheidt.com',
  'bab.la', 'en.bab.la', 'de.bab.la',
  // Tourismus & Reisen
  'myswitzerland.com', 'lonelyplanet.com', 'tripadvisor.com', 'tripadvisor.de',
  'booking.com', 'airbnb.com',
  // Behoerden & Verwaltung
  'admin.ch', 'fedpol.admin.ch', 'ch.ch',
  // Raetsel & Spiele
  'fsolver.fr', 'kreuzwort-raetsel.net',
  // News & Medien
  'spiegel.de', 'bild.de', 'focus.de', 'stern.de', 'zeit.de', 'faz.net',
  'nzz.ch', 'blick.ch', 'tagesanzeiger.ch', '20min.ch', 'srf.ch',
]);

/**
 * Find competitor websites for given keywords.
 */
export async function searchCompetitors(
  url: string,
  keywords: string[],
  maxResults = 10
): Promise<CompetitorInfo[]> {
  let targetDomain: string;
  try {
    targetDomain = new URL(url).hostname.replace('www.', '');
  } catch {
    targetDomain = url;
  }

  const competitors = new Map<string, CompetitorInfo>();

  // Keyword-Kombinationen fuer relevante Konkurrenz-Suche erstellen
  // Einzelne Woerter wie "unternehmen" liefern Woerterbuch-Ergebnisse
  // Deshalb 2-3 Keywords kombinieren fuer kontextbezogene Suche
  const topWords = keywords.slice(0, 8);
  const searchKeywords: string[] = [];

  // Kombination von 2 Keywords (z.B. "softwareentwicklung luzern")
  for (let i = 0; i < Math.min(topWords.length, 4); i++) {
    for (let j = i + 1; j < Math.min(topWords.length, 5); j++) {
      searchKeywords.push(`${topWords[i]} ${topWords[j]}`);
      if (searchKeywords.length >= 7) break;
    }
    if (searchKeywords.length >= 7) break;
  }

  for (const kw of searchKeywords) {
    const results = await duckduckgoSearch(kw, maxResults);

    for (const r of results) {
      let domain: string;
      try {
        domain = new URL(r.url).hostname.replace('www.', '');
      } catch {
        continue;
      }

      // Skip eigene Domain, leere und ausgeschlossene Domains
      if (domain === targetDomain || !domain) continue;
      if (EXCLUDED_DOMAINS.has(domain)) continue;
      // Auch Subdomains der Ausschlussliste filtern
      const rootDomain = domain.split('.').slice(-2).join('.');
      if (EXCLUDED_DOMAINS.has(rootDomain)) continue;

      const existing = competitors.get(domain);
      if (existing) {
        if (!existing.keywordOverlap.includes(kw)) {
          existing.keywordOverlap.push(kw);
        }
      } else {
        competitors.set(domain, {
          url: r.url,
          title: r.title,
          description: r.description,
          domain,
          keywordOverlap: [kw],
          strengths: [],
          weaknesses: [],
          seo: null,
        });
      }
    }

    // Small delay between searches
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Sort by keyword overlap count
  const sorted = [...competitors.values()].sort(
    (a, b) => b.keywordOverlap.length - a.keywordOverlap.length
  );

  return sorted.slice(0, 10);
}

/**
 * Check approximate ranking positions for keywords via DuckDuckGo.
 */
export async function searchKeywordRankings(
  url: string,
  keywords: string[],
  maxResults = 20
): Promise<Map<string, number | null>> {
  let targetDomain: string;
  try {
    targetDomain = new URL(url).hostname.replace('www.', '');
  } catch {
    targetDomain = url;
  }

  const rankings = new Map<string, number | null>();

  for (const kw of keywords.slice(0, 10)) {
    const results = await duckduckgoSearch(kw, maxResults);
    let position: number | null = null;

    for (let i = 0; i < results.length; i++) {
      try {
        const domain = new URL(results[i]!.url).hostname.replace('www.', '');
        if (domain === targetDomain) {
          position = i + 1;
          break;
        }
      } catch {
        continue;
      }
    }

    rankings.set(kw, position);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return rankings;
}

/**
 * Extract the most common meaningful words from text.
 */
export function extractKeywordsFromText(
  text: string,
  topN = 20
): Array<{ word: string; count: number }> {
  const stopWords = new Set([
    // German (ASCII + Umlaute)
    'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'in', 'von',
    'zu', 'mit', 'auf', 'an', 'fuer', 'für', 'ist', 'sind', 'war', 'hat', 'haben',
    'wird', 'werden', 'kann', 'nicht', 'auch', 'als', 'nach', 'bei', 'aus',
    'wie', 'wenn', 'den', 'dem', 'des', 'sich', 'es', 'ich', 'wir', 'sie',
    'er', 'ihr', 'uns', 'was', 'noch', 'nur', 'so', 'da', 'ueber', 'über', 'vor',
    'bis', 'durch', 'unter', 'ohne', 'dass', 'daß', 'diese', 'dieser', 'dieses',
    'einem', 'einen', 'einer', 'zum', 'zur', 'im', 'am', 'vom', 'mehr',
    'können', 'müssen', 'würde', 'hätte', 'wäre', 'möchte', 'sollen', 'dürfen',
    'würden', 'könnten', 'hätten', 'wären', 'möchten',
    'unsere', 'unserer', 'unserem', 'unseren', 'ihre', 'ihren', 'ihrem', 'ihrer',
    'seine', 'seinen', 'seinem', 'seiner', 'meine', 'meinen', 'meinem', 'meiner',
    'jede', 'jeder', 'jedem', 'jeden', 'alle', 'allem', 'allen', 'aller', 'alles',
    'welche', 'welcher', 'welchem', 'keine', 'keinen', 'keinem', 'keiner', 'kein',
    'hier', 'dort', 'dann', 'wann', 'immer', 'wieder', 'andere', 'anderer',
    'anderen', 'anderes', 'viel', 'viele', 'vielen', 'sehr', 'ganz',
    'etwas', 'etwa', 'sogar', 'erst', 'seit', 'gegen', 'wegen', 'trotz',
    'schon', 'doch', 'mal', 'bereits', 'außerdem', 'außer', 'nämlich',
    'damit', 'daran', 'dabei', 'dazu', 'darauf', 'darum', 'daher',
    'lassen', 'lässt', 'machen', 'macht', 'geben', 'gibt', 'gehen', 'geht',
    'kommen', 'kommt', 'sagen', 'sagt', 'sehen', 'sieht', 'stehen', 'steht',
    'wissen', 'weiss', 'weiß', 'finden', 'findet', 'nehmen', 'nimmt',
    'zwischen', 'während', 'natürlich',
    // English
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'from',
    'this', 'that', 'with', 'will', 'each', 'make', 'how', 'them', 'then',
    'its', 'over', 'such', 'into', 'than', 'most', 'also', 'some', 'just',
    'about', 'would', 'could', 'should', 'their', 'which', 'when', 'where',
    'what', 'there', 'here', 'other', 'your', 'they', 'very', 'only',
    'does', 'did', 'his', 'him', 'who', 'may', 'new', 'now', 'any',
    'being', 'both', 'between', 'after', 'before', 'because', 'well',
  ]);

  const words = text
    .toLowerCase()
    .match(/\b[a-zA-ZäöüÄÖÜß]{3,}\b/g) || [];

  const filtered = words.filter((w) => !stopWords.has(w));

  const freq = new Map<string, number>();
  for (const w of filtered) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}
