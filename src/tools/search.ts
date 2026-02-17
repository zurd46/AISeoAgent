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

  // Search for top keywords
  const searchKeywords = keywords.slice(0, 5);

  for (const kw of searchKeywords) {
    const results = await duckduckgoSearch(kw, maxResults);

    for (const r of results) {
      let domain: string;
      try {
        domain = new URL(r.url).hostname.replace('www.', '');
      } catch {
        continue;
      }

      // Skip own domain
      if (domain === targetDomain || !domain) continue;

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
    // German
    'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'in', 'von',
    'zu', 'mit', 'auf', 'an', 'fuer', 'ist', 'sind', 'war', 'hat', 'haben',
    'wird', 'werden', 'kann', 'nicht', 'auch', 'als', 'nach', 'bei', 'aus',
    'wie', 'wenn', 'den', 'dem', 'des', 'sich', 'es', 'ich', 'wir', 'sie',
    'er', 'ihr', 'uns', 'was', 'noch', 'nur', 'so', 'da', 'ueber', 'vor',
    'bis', 'durch', 'unter', 'ohne', 'dass', 'diese', 'dieser', 'dieses',
    'einem', 'einen', 'einer', 'zum', 'zur', 'im', 'am', 'vom', 'mehr',
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
