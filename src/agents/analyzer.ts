import { getLLM } from '../config.js';
import { runAllChecks } from '../tools/seoChecks.js';
import type { SEOAnalysis } from '../types.js';
import type { SEOGraphState } from '../graph/state.js';

/**
 * SEO Analyzer Agent Node - runs all SEO checks and generates LLM recommendations.
 */
export async function analyzerNode(
  state: SEOGraphState
): Promise<Partial<SEOGraphState>> {
  if (!state.crawlData) {
    return { errors: ['Analyzer: Keine Crawl-Daten vorhanden'] };
  }

  try {
    const { scores, issues } = runAllChecks(state.crawlData);

    // Calculate overall score
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const overallScore = Math.round(totalScore / scores.length);

    // Identify strengths
    const strengths = scores
      .filter((s) => s.score >= 80)
      .map((s) => `${s.category}: ${s.score}/100`);

    // Build analysis
    const analysis: SEOAnalysis = {
      overallScore,
      scores,
      issues,
      strengths,
      summary: '',
      llmRecommendations: '',
    };

    // Generate LLM recommendations
    try {
      const llm = await getLLM();
      const issuesSummary = issues
        .filter((i) => i.severity === 'critical' || i.severity === 'warning')
        .map((i) => `- [${i.severity.toUpperCase()}] ${i.title}: ${i.description}`)
        .join('\n');

      const prompt = `Du bist ein SEO-Experte. Analysiere folgende SEO-Probleme einer Webseite und gib konkrete, priorisierte Handlungsempfehlungen auf Deutsch.

URL: ${state.url}
Gesamt-Score: ${overallScore}/100
Woerter auf der Seite: ${state.crawlData.pageInfo.wordCount}
Title: ${state.crawlData.meta.title}

Gefundene Probleme:
${issuesSummary || 'Keine kritischen Probleme gefunden.'}

Gib maximal 5 priorisierte Empfehlungen mit konkreten Massnahmen.`;

      const response = await llm.invoke(prompt);
      analysis.llmRecommendations =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
    } catch {
      analysis.llmRecommendations =
        'LLM nicht verfuegbar - Empfehlungen basieren auf den regelbasierten Checks.';
    }

    analysis.summary = `SEO-Score: ${overallScore}/100 | ${issues.filter((i) => i.severity === 'critical').length} kritische, ${issues.filter((i) => i.severity === 'warning').length} Warnungen, ${issues.filter((i) => i.severity === 'info').length} Hinweise`;

    return { seoAnalysis: analysis };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { errors: [`Analyzer Fehler: ${msg}`] };
  }
}
