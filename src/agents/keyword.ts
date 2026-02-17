import { getLLM } from '../config.js';
import { extractKeywordsFromText, searchKeywordRankings } from '../tools/search.js';
import type { KeywordData, KeywordInfo } from '../types.js';
import type { SEOGraphState } from '../graph/state.js';

/**
 * Keyword Agent Node - analyzes keyword usage and rankings.
 */
export async function keywordNode(
  state: SEOGraphState
): Promise<Partial<SEOGraphState>> {
  if (!state.crawlData) {
    return { errors: ['Keyword: Keine Crawl-Daten vorhanden'] };
  }

  try {
    const { meta, headings, textContent, pageInfo } = state.crawlData;
    const totalWords = pageInfo.wordCount || 1;

    // Extract keywords from content
    const topKeywords = extractKeywordsFromText(textContent, 20);
    const titleLower = meta.title.toLowerCase();
    const descLower = meta.description.toLowerCase();
    const urlLower = state.url.toLowerCase();
    const h1Texts = headings
      .filter((h) => h.level === 1)
      .map((h) => h.text.toLowerCase());
    const allHeadingTexts = headings.map((h) => h.text.toLowerCase());

    // Build keyword info objects
    const buildKeywordInfo = (word: string, count: number): KeywordInfo => {
      const density = (count / totalWords) * 100;
      const inTitle = titleLower.includes(word);
      const inDescription = descLower.includes(word);
      const inH1 = h1Texts.some((t) => t.includes(word));
      const inHeadings = allHeadingTexts.some((t) => t.includes(word));
      const inUrl = urlLower.includes(word);

      // Calculate prominence score
      let prominenceScore = 0;
      if (inTitle) prominenceScore += 30;
      if (inDescription) prominenceScore += 20;
      if (inH1) prominenceScore += 25;
      if (inHeadings) prominenceScore += 10;
      if (inUrl) prominenceScore += 15;

      return {
        keyword: word,
        density: Math.round(density * 100) / 100,
        count,
        inTitle,
        inDescription,
        inH1,
        inHeadings,
        inUrl,
        prominenceScore,
      };
    };

    const allKeywordInfos = topKeywords.map((k) =>
      buildKeywordInfo(k.word, k.count)
    );

    // Split into primary (high prominence) and secondary
    const primary = allKeywordInfos
      .filter((k) => k.prominenceScore >= 30)
      .slice(0, 10);
    const secondary = allKeywordInfos
      .filter((k) => k.prominenceScore < 30)
      .slice(0, 10);

    // Check keyword rankings via DuckDuckGo
    const topKeywordsForRanking = allKeywordInfos
      .slice(0, 5)
      .map((k) => k.keyword);
    const rankings = await searchKeywordRankings(state.url, topKeywordsForRanking);

    // Add ranking info to keyword descriptions
    for (const kw of [...primary, ...secondary]) {
      const rank = rankings.get(kw.keyword);
      if (rank !== undefined && rank !== null) {
        kw.prominenceScore = Math.min(100, kw.prominenceScore + (21 - rank));
      }
    }

    const keywordData: KeywordData = {
      targetUrl: state.url,
      primaryKeywords: primary,
      secondaryKeywords: secondary,
      missingKeywords: [],
      keywordSuggestions: [],
      contentGaps: [],
      llmAnalysis: '',
    };

    // LLM keyword analysis
    try {
      const llm = await getLLM();
      const kwList = allKeywordInfos
        .slice(0, 10)
        .map(
          (k) =>
            `- "${k.keyword}": ${k.count}x (Dichte: ${k.density}%, Title: ${k.inTitle ? 'Ja' : 'Nein'}, H1: ${k.inH1 ? 'Ja' : 'Nein'})`
        )
        .join('\n');

      const rankingInfo = [...rankings.entries()]
        .map(([kw, pos]) => `- "${kw}": ${pos ? `Position ${pos}` : 'Nicht gefunden'}`)
        .join('\n');

      const prompt = `Du bist ein SEO-Keyword-Experte. Analysiere die Keyword-Nutzung dieser Webseite auf Deutsch.

URL: ${state.url}
Title: ${meta.title}
Woerter gesamt: ${totalWords}

Top Keywords auf der Seite:
${kwList}

DuckDuckGo Ranking-Positionen:
${rankingInfo || 'Keine Rankings ermittelt'}

Gib konkrete Empfehlungen:
1. Welche Keywords sind gut positioniert?
2. Welche Keywords fehlen oder sollten staerker eingesetzt werden?
3. Keyword-Vorschlaege fuer besseres Ranking
4. Content-Luecken die geschlossen werden sollten`;

      const response = await llm.invoke(prompt);
      keywordData.llmAnalysis =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
    } catch {
      keywordData.llmAnalysis = 'LLM nicht verfuegbar fuer Keyword-Analyse.';
    }

    return { keywordData };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { errors: [`Keyword Fehler: ${msg}`] };
  }
}
