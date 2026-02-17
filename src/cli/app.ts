import chalk from 'chalk';
import { showBanner, COOL_GRADIENT } from './banner.js';
import {
  createAgentSpinner,
  showPhaseHeader,
  displayCrawlResults,
  displaySEOScores,
  displayIssues,
  displayCompetitors,
  displayKeywords,
  displayLLMRecommendations,
  displayFinalSummary,
} from './ui.js';
import { fetchPage, fetchPageLight } from '../tools/scraper.js';
import { runAllChecks } from '../tools/seoChecks.js';
import { searchCompetitors, extractKeywordsFromText, searchKeywordRankings } from '../tools/search.js';
import { buildSEOWorkflow } from '../graph/workflow.js';
import { generateHtmlReport } from '../reports/generator.js';
import { getLLM } from '../config.js';
import type { CrawlData, SEOAnalysis, CompetitorData, CompetitorSEO, KeywordData, SEOReport } from '../types.js';

/**
 * Run a full SEO analysis via the animated CLI.
 */
export async function runFullAnalysis(url: string): Promise<void> {
  showBanner();

  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  console.log(chalk.gray('  ') + chalk.bold('Ziel: ') + chalk.underline(COOL_GRADIENT(normalizedUrl)));
  console.log('');

  const startTime = Date.now();
  let crawlData: CrawlData | null = null;
  let seoAnalysis: SEOAnalysis | null = null;
  let competitorData: CompetitorData | null = null;
  let keywordData: KeywordData | null = null;

  // ═══ PHASE 1: Crawling ═══════════════════════════════════

  showPhaseHeader('Phase 1: Website Crawling');

  const crawlSpinner = createAgentSpinner('crawl', 'Lade und parse Webseite...');
  crawlSpinner.start();

  try {
    crawlData = await fetchPage(normalizedUrl);
    crawlSpinner.succeed(chalk.green('Website erfolgreich gecrawlt'));
  } catch (error) {
    crawlSpinner.fail(chalk.red(`Crawling fehlgeschlagen: ${error instanceof Error ? error.message : error}`));
    return;
  }

  displayCrawlResults(crawlData);

  // ═══ PHASE 2: Parallel Analysis ══════════════════════════

  showPhaseHeader('Phase 2: Parallele Agent-Analyse');

  // Start all three analyses in parallel
  const analyzeSpinner = createAgentSpinner('analyze', 'Fuehre SEO-Checks durch...');
  const competitorSpinner = createAgentSpinner('competitor', 'Suche Konkurrenten...');
  const keywordSpinner = createAgentSpinner('keyword', 'Analysiere Keywords...');

  analyzeSpinner.start();

  // SEO Analysis (runs immediately)
  const analyzePromise = (async () => {
    try {
      const { scores, issues } = runAllChecks(crawlData!);
      const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
      const overallScore = Math.round(totalScore / scores.length);

      const strengths = scores
        .filter((s) => s.score >= 80)
        .map((s) => `${s.category}: ${s.score}/100`);

      const analysis: SEOAnalysis = {
        overallScore,
        scores,
        issues,
        strengths,
        summary: `SEO-Score: ${overallScore}/100`,
        llmRecommendations: '',
      };

      // LLM enhancement
      try {
        const llm = await getLLM();
        const issuesSummary = issues
          .filter((i) => i.severity === 'critical' || i.severity === 'warning')
          .map((i) => `- [${i.severity.toUpperCase()}] ${i.title}: ${i.description}`)
          .join('\n');

        const response = await llm.invoke(
          `Du bist ein SEO-Experte. Analysiere folgende SEO-Probleme und gib 5 priorisierte Empfehlungen auf Deutsch.\n\nURL: ${normalizedUrl}\nScore: ${overallScore}/100\nTitle: ${crawlData!.meta.title}\n\nProbleme:\n${issuesSummary || 'Keine kritischen Probleme.'}`
        );
        analysis.llmRecommendations =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      } catch {
        analysis.llmRecommendations = 'LLM nicht verfuegbar - Empfehlungen basieren auf regelbasierten Checks.';
      }

      analyzeSpinner.succeed(chalk.green(`SEO-Analyse abgeschlossen (Score: ${overallScore}/100)`));
      return analysis;
    } catch (error) {
      analyzeSpinner.fail(chalk.red(`Analyse fehlgeschlagen: ${error}`));
      return null;
    }
  })();

  competitorSpinner.start();

  // Competitor Analysis - mit echtem SEO-Crawling der Top-Konkurrenten
  const competitorPromise = (async () => {
    try {
      const topKeywords = extractKeywordsFromText(crawlData!.textContent, 15);
      const keywordStrings = topKeywords.map((k) => k.word);

      const competitors = await searchCompetitors(normalizedUrl, keywordStrings);

      // Top 3 Konkurrenten tatsaechlich crawlen fuer SEO-Vergleich
      const crawlPromises = competitors.slice(0, 3).map(async (comp) => {
        try {
          const compCrawl = await fetchPageLight(comp.url);
          const seo: CompetitorSEO = {
            titleLength: compCrawl.meta.titleLength,
            descriptionLength: compCrawl.meta.descriptionLength,
            h1Count: compCrawl.headings.filter((h) => h.level === 1).length,
            wordCount: compCrawl.pageInfo.wordCount,
            hasHttps: compCrawl.pageInfo.hasHttps,
            hasStructuredData: compCrawl.structuredData.length > 0,
            structuredDataTypes: compCrawl.structuredData.map((s) => s.type),
            imageCount: compCrawl.images.length,
            imagesWithAlt: compCrawl.images.filter((i) => i.hasAlt).length,
            internalLinks: compCrawl.links.filter((l) => l.isInternal).length,
            externalLinks: compCrawl.links.filter((l) => !l.isInternal).length,
            responseTimeMs: compCrawl.pageInfo.responseTimeMs,
            hasOgTags: !!compCrawl.meta.ogTitle,
            hasTwitterCard: !!compCrawl.meta.twitterCard,
          };
          comp.seo = seo;
          comp.title = compCrawl.meta.title || comp.title;
          comp.description = compCrawl.meta.description || comp.description;

          // Staerken/Schwaechen im Vergleich zur Ziel-URL
          if (seo.wordCount > crawlData!.pageInfo.wordCount * 1.5) comp.strengths.push(`Mehr Content (${seo.wordCount} Woerter)`);
          if (seo.wordCount < crawlData!.pageInfo.wordCount * 0.5) comp.weaknesses.push(`Weniger Content (${seo.wordCount} Woerter)`);
          if (seo.hasStructuredData && crawlData!.structuredData.length === 0) comp.strengths.push('Hat strukturierte Daten');
          if (!seo.hasStructuredData && crawlData!.structuredData.length > 0) comp.weaknesses.push('Keine strukturierten Daten');
          if (seo.hasOgTags && !crawlData!.meta.ogTitle) comp.strengths.push('Hat Open Graph Tags');
          if (seo.internalLinks > crawlData!.links.filter((l) => l.isInternal).length * 1.5) comp.strengths.push('Staerkere interne Verlinkung');
          if (seo.responseTimeMs < crawlData!.pageInfo.responseTimeMs * 0.5) comp.strengths.push(`Schnellere Ladezeit (${seo.responseTimeMs}ms)`);
          if (seo.responseTimeMs > crawlData!.pageInfo.responseTimeMs * 2) comp.weaknesses.push(`Langsamere Ladezeit (${seo.responseTimeMs}ms)`);
        } catch {
          // Konnte Konkurrent nicht crawlen
        }
      });
      await Promise.all(crawlPromises);

      const data: CompetitorData = {
        targetUrl: normalizedUrl,
        competitors,
        marketSummary: `${competitors.length} Konkurrenten gefunden, Top ${Math.min(3, competitors.length)} im Detail analysiert`,
        competitiveAdvantages: [],
        competitiveGaps: [],
        llmAnalysis: '',
      };

      // Vorteile und Luecken ableiten
      const crawledComps = competitors.filter((c) => c.seo);
      if (crawledComps.length > 0) {
        const avgWordCount = Math.round(crawledComps.reduce((s, c) => s + (c.seo?.wordCount || 0), 0) / crawledComps.length);
        if (crawlData!.pageInfo.wordCount > avgWordCount * 1.2) data.competitiveAdvantages.push(`Mehr Content als Durchschnitt (${crawlData!.pageInfo.wordCount} vs. ${avgWordCount})`);
        if (crawlData!.pageInfo.wordCount < avgWordCount * 0.8) data.competitiveGaps.push(`Weniger Content als Durchschnitt (${crawlData!.pageInfo.wordCount} vs. ${avgWordCount})`);

        const compsWithSD = crawledComps.filter((c) => c.seo?.hasStructuredData).length;
        if (crawlData!.structuredData.length > 0 && compsWithSD < crawledComps.length / 2) data.competitiveAdvantages.push('Strukturierte Daten (Mehrheit der Konkurrenten hat keine)');
        if (crawlData!.structuredData.length === 0 && compsWithSD > crawledComps.length / 2) data.competitiveGaps.push('Keine strukturierten Daten (Mehrheit der Konkurrenten hat welche)');
      }

      // LLM-Analyse mit echten SEO-Daten der Konkurrenten
      if (competitors.length > 0) {
        try {
          const llm = await getLLM();

          const compDetails = competitors.slice(0, 5).map((c) => {
            const seoInfo = c.seo
              ? `\n    Woerter: ${c.seo.wordCount}, Title: ${c.seo.titleLength}Z, Ladezeit: ${c.seo.responseTimeMs}ms, Schema: ${c.seo.structuredDataTypes.join(', ') || 'Keine'}, OG: ${c.seo.hasOgTags ? 'Ja' : 'Nein'}`
              : '';
            return `- ${c.domain}: "${c.title}" (Keyword-Overlap: ${c.keywordOverlap.join(', ')})${seoInfo}${c.strengths.length ? `\n    Staerken vs. Ziel: ${c.strengths.join(', ')}` : ''}${c.weaknesses.length ? `\n    Schwaechen vs. Ziel: ${c.weaknesses.join(', ')}` : ''}`;
          }).join('\n');

          const targetInfo = `URL: ${normalizedUrl}\nTitle: "${crawlData!.meta.title}" (${crawlData!.meta.titleLength}Z)\nDescription: ${crawlData!.meta.descriptionLength}Z\nWoerter: ${crawlData!.pageInfo.wordCount}\nLadezeit: ${crawlData!.pageInfo.responseTimeMs}ms\nStrukt. Daten: ${crawlData!.structuredData.map((s) => s.type).join(', ') || 'Keine'}\nOG-Tags: ${crawlData!.meta.ogTitle ? 'Ja' : 'Nein'}`;

          const prompt = `Du bist ein erfahrener SEO- und Wettbewerbsanalyst. Vergleiche die Ziel-Webseite mit ihren Konkurrenten und erstelle eine detaillierte Analyse auf Deutsch.

ZIEL-WEBSEITE:
${targetInfo}

KONKURRENTEN (mit SEO-Daten):
${compDetails}

${data.competitiveAdvantages.length ? `Ermittelte Vorteile: ${data.competitiveAdvantages.join(', ')}` : ''}
${data.competitiveGaps.length ? `Ermittelte Luecken: ${data.competitiveGaps.join(', ')}` : ''}

Erstelle eine strukturierte Analyse mit:
1. WETTBEWERBSUEBERBLICK - Wie ist die Position der Ziel-Webseite im Vergleich?
2. STAERKEN - Was macht die Ziel-Webseite besser als die Konkurrenz?
3. SCHWAECHEN - Wo ist die Konkurrenz besser?
4. CHANCEN - Welche SEO-Massnahmen wuerden den groessten Wettbewerbsvorteil bringen?
5. TOP 5 MASSNAHMEN - Priorisierte, konkrete Handlungsempfehlungen`;

          const response = await llm.invoke(prompt);
          data.llmAnalysis = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        } catch {
          data.llmAnalysis = 'LLM nicht verfuegbar fuer Wettbewerbsanalyse.';
        }
      }

      competitorSpinner.succeed(chalk.green(`${competitors.length} Konkurrenten gefunden, ${crawledComps.length} im Detail analysiert`));
      return data;
    } catch (error) {
      competitorSpinner.fail(chalk.red(`Konkurrenzanalyse fehlgeschlagen: ${error}`));
      return null;
    }
  })();

  keywordSpinner.start();

  // Keyword Analysis
  const keywordPromise = (async () => {
    try {
      const topKeywords = extractKeywordsFromText(crawlData!.textContent, 20);
      const totalWords = crawlData!.pageInfo.wordCount || 1;
      const titleLower = crawlData!.meta.title.toLowerCase();
      const descLower = crawlData!.meta.description.toLowerCase();
      const urlLower = normalizedUrl.toLowerCase();
      const h1Texts = crawlData!.headings.filter((h) => h.level === 1).map((h) => h.text.toLowerCase());
      const allHeadingTexts = crawlData!.headings.map((h) => h.text.toLowerCase());

      const keywordInfos = topKeywords.map(({ word, count }) => {
        const density = Math.round((count / totalWords) * 10000) / 100;
        const inTitle = titleLower.includes(word);
        const inDescription = descLower.includes(word);
        const inH1 = h1Texts.some((t) => t.includes(word));
        const inHeadings = allHeadingTexts.some((t) => t.includes(word));
        const inUrl = urlLower.includes(word);

        let prominenceScore = 0;
        if (inTitle) prominenceScore += 30;
        if (inDescription) prominenceScore += 20;
        if (inH1) prominenceScore += 25;
        if (inHeadings) prominenceScore += 10;
        if (inUrl) prominenceScore += 15;

        return { keyword: word, density, count, inTitle, inDescription, inH1, inHeadings, inUrl, prominenceScore };
      });

      // Check rankings
      const topForRanking = keywordInfos.slice(0, 5).map((k) => k.keyword);
      const rankings = await searchKeywordRankings(normalizedUrl, topForRanking);

      for (const kw of keywordInfos) {
        const rank = rankings.get(kw.keyword);
        if (rank != null) {
          kw.prominenceScore = Math.min(100, kw.prominenceScore + (21 - rank));
        }
      }

      const primary = keywordInfos.filter((k) => k.prominenceScore >= 30).slice(0, 10);
      const secondary = keywordInfos.filter((k) => k.prominenceScore < 30).slice(0, 10);

      const data: KeywordData = {
        targetUrl: normalizedUrl,
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
        const kwList = keywordInfos.slice(0, 10)
          .map((k) => `- "${k.keyword}": ${k.count}x, Dichte ${k.density}%, Title: ${k.inTitle ? 'Ja' : 'Nein'}`)
          .join('\n');

        const response = await llm.invoke(
          `Du bist ein Keyword-Experte. Analysiere auf Deutsch:\n\nURL: ${normalizedUrl}\nTitle: ${crawlData!.meta.title}\n\nKeywords:\n${kwList}\n\nGib: 1) Gut positionierte Keywords 2) Fehlende Keywords 3) Vorschlaege 4) Content-Luecken`
        );
        data.llmAnalysis =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      } catch {
        data.llmAnalysis = 'LLM nicht verfuegbar.';
      }

      keywordSpinner.succeed(chalk.green(`${keywordInfos.length} Keywords analysiert`));
      return data;
    } catch (error) {
      keywordSpinner.fail(chalk.red(`Keyword-Analyse fehlgeschlagen: ${error}`));
      return null;
    }
  })();

  // Wait for all parallel analyses
  [seoAnalysis, competitorData, keywordData] = await Promise.all([
    analyzePromise,
    competitorPromise,
    keywordPromise,
  ]);

  // ═══ PHASE 3: Results ════════════════════════════════════

  showPhaseHeader('Phase 3: Ergebnisse');

  if (seoAnalysis) {
    console.log(chalk.bold(COOL_GRADIENT('  SEO Scores')));
    displaySEOScores(seoAnalysis);

    console.log('');
    console.log(chalk.bold(COOL_GRADIENT('  Gefundene Probleme')));
    displayIssues(seoAnalysis);

    if (seoAnalysis.llmRecommendations) {
      displayLLMRecommendations('AI Empfehlungen', seoAnalysis.llmRecommendations);
    }
  }

  if (competitorData) {
    console.log('');
    console.log(chalk.bold(COOL_GRADIENT('  Konkurrenz-Analyse')));
    displayCompetitors(competitorData, crawlData!);

    if (competitorData.llmAnalysis) {
      displayLLMRecommendations('Wettbewerbs-Analyse', competitorData.llmAnalysis);
    }
  }

  if (keywordData) {
    console.log('');
    console.log(chalk.bold(COOL_GRADIENT('  Keyword-Analyse')));
    displayKeywords(keywordData);

    if (keywordData.llmAnalysis) {
      displayLLMRecommendations('Keyword-Empfehlungen', keywordData.llmAnalysis);
    }
  }

  // ═══ PHASE 4: Report Generation ══════════════════════════

  showPhaseHeader('Phase 4: Report-Generierung');

  const reportSpinner = createAgentSpinner('report', 'Generiere HTML-Report...');
  reportSpinner.start();

  try {
    // Generate executive summary
    let executiveSummary = '';
    try {
      const llm = await getLLM();
      const response = await llm.invoke(
        `Erstelle eine Executive Summary auf Deutsch (3-5 Saetze) fuer einen SEO-Bericht.\nURL: ${normalizedUrl}\nScore: ${seoAnalysis?.overallScore || 'N/A'}/100\nKritische Probleme: ${seoAnalysis?.issues.filter(i => i.severity === 'critical').length || 0}\nKonkurrenten: ${competitorData?.competitors.length || 0}`
      );
      executiveSummary = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } catch {
      executiveSummary = `SEO-Analyse fuer ${normalizedUrl} abgeschlossen. Score: ${seoAnalysis?.overallScore || 'N/A'}/100.`;
    }

    const report: SEOReport = {
      url: normalizedUrl,
      timestamp: new Date().toISOString(),
      crawlData,
      seoAnalysis,
      competitorData,
      keywordData,
      executiveSummary,
      reportHtmlPath: '',
    };

    const reportPath = generateHtmlReport(report);
    reportSpinner.succeed(chalk.green(`HTML-Report generiert: ${reportPath}`));

    const duration = Date.now() - startTime;
    displayFinalSummary(reportPath, duration);

    // Open report in browser
    try {
      const { default: open } = await import('open');
      await open(reportPath);
    } catch {
      // Could not open browser
    }
  } catch (error) {
    reportSpinner.fail(chalk.red(`Report-Generierung fehlgeschlagen: ${error}`));
  }
}

/**
 * Quick crawl-only mode.
 */
export async function runQuickCrawl(url: string): Promise<void> {
  showBanner();

  const spinner = createAgentSpinner('crawl', 'Lade Webseite...');
  spinner.start();

  try {
    const crawlData = await fetchPage(url);
    spinner.succeed(chalk.green('Crawling abgeschlossen'));
    displayCrawlResults(crawlData);
  } catch (error) {
    spinner.fail(chalk.red(`Fehler: ${error instanceof Error ? error.message : error}`));
  }
}
