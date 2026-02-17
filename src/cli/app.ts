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
import { fetchPage } from '../tools/scraper.js';
import { runAllChecks } from '../tools/seoChecks.js';
import { searchCompetitors, extractKeywordsFromText, searchKeywordRankings } from '../tools/search.js';
import { buildSEOWorkflow } from '../graph/workflow.js';
import { generateHtmlReport } from '../reports/generator.js';
import { getLLM } from '../config.js';
import type { CrawlData, SEOAnalysis, CompetitorData, KeywordData, SEOReport } from '../types.js';

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

  // Competitor Analysis
  const competitorPromise = (async () => {
    try {
      const topKeywords = extractKeywordsFromText(crawlData!.textContent, 10);
      const keywordStrings = topKeywords.map((k) => k.word);
      if (crawlData!.meta.title) keywordStrings.unshift(crawlData!.meta.title);

      const competitors = await searchCompetitors(normalizedUrl, keywordStrings);

      const data: CompetitorData = {
        targetUrl: normalizedUrl,
        competitors,
        marketSummary: `${competitors.length} Konkurrenten gefunden`,
        competitiveAdvantages: [],
        competitiveGaps: [],
        llmAnalysis: '',
      };

      // LLM analysis
      if (competitors.length > 0) {
        try {
          const llm = await getLLM();
          const competitorList = competitors.slice(0, 5)
            .map((c) => `- ${c.domain}: "${c.title}" (Keywords: ${c.keywordOverlap.join(', ')})`)
            .join('\n');

          const response = await llm.invoke(
            `Du bist ein Wettbewerbsanalyst. Analysiere auf Deutsch:\n\nZiel: ${normalizedUrl}\nTitle: ${crawlData!.meta.title}\n\nKonkurrenten:\n${competitorList}\n\nGib: 1) Ueberblick 2) Vorteile 3) Luecken 4) Top 3 Empfehlungen`
          );
          data.llmAnalysis =
            typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        } catch {
          data.llmAnalysis = 'LLM nicht verfuegbar.';
        }
      }

      competitorSpinner.succeed(chalk.green(`${competitors.length} Konkurrenten gefunden`));
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
    displayCompetitors(competitorData);

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
