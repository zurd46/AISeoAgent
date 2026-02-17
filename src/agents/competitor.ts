import { getLLM } from '../config.js';
import { searchCompetitors } from '../tools/search.js';
import { extractKeywordsFromText } from '../tools/search.js';
import type { CompetitorData } from '../types.js';
import type { SEOGraphState } from '../graph/state.js';

/**
 * Competitor Agent Node - finds and analyzes competitor websites.
 */
export async function competitorNode(
  state: SEOGraphState
): Promise<Partial<SEOGraphState>> {
  if (!state.crawlData) {
    return { errors: ['Competitor: Keine Crawl-Daten vorhanden'] };
  }

  try {
    // Extract keywords from page content for competitor search
    const topKeywords = extractKeywordsFromText(state.crawlData.textContent, 10);
    const keywordStrings = topKeywords.map((k) => k.word);

    // Also use title and meta keywords
    if (state.crawlData.meta.title) {
      keywordStrings.unshift(state.crawlData.meta.title);
    }

    // Search for competitors
    const competitors = await searchCompetitors(state.url, keywordStrings);

    const competitorData: CompetitorData = {
      targetUrl: state.url,
      competitors,
      marketSummary: '',
      competitiveAdvantages: [],
      competitiveGaps: [],
      llmAnalysis: '',
    };

    // LLM analysis of competitive landscape
    if (competitors.length > 0) {
      try {
        const llm = await getLLM();
        const competitorList = competitors
          .slice(0, 5)
          .map(
            (c) =>
              `- ${c.domain}: "${c.title}" (Keywords: ${c.keywordOverlap.join(', ')})`
          )
          .join('\n');

        const prompt = `Du bist ein SEO- und Wettbewerbsanalyst. Analysiere die Wettbewerbssituation auf Deutsch.

Ziel-Webseite: ${state.url}
Title: ${state.crawlData.meta.title}
Haupt-Keywords: ${keywordStrings.slice(0, 5).join(', ')}

Gefundene Konkurrenten:
${competitorList}

Erstelle eine kurze Wettbewerbsanalyse mit:
1. Ueberblick der Wettbewerbssituation
2. Moegliche Wettbewerbsvorteile der Ziel-Webseite
3. Luecken/Chancen die genutzt werden koennten
4. Top 3 Empfehlungen zur Verbesserung der Wettbewerbsposition`;

        const response = await llm.invoke(prompt);
        competitorData.llmAnalysis =
          typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);
      } catch {
        competitorData.llmAnalysis =
          'LLM nicht verfuegbar fuer Wettbewerbsanalyse.';
      }
    }

    competitorData.marketSummary = `${competitors.length} Konkurrenten gefunden fuer ${keywordStrings.slice(0, 3).join(', ')}`;

    return { competitorData };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { errors: [`Competitor Fehler: ${msg}`] };
  }
}
