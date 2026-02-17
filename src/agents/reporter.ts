import { getLLM } from '../config.js';
import { generateHtmlReport } from '../reports/generator.js';
import type { SEOReport } from '../types.js';
import type { SEOGraphState } from '../graph/state.js';

/**
 * Reporter Agent Node - generates the final HTML report.
 */
export async function reporterNode(
  state: SEOGraphState
): Promise<Partial<SEOGraphState>> {
  try {
    const report: SEOReport = {
      url: state.url,
      timestamp: new Date().toISOString(),
      crawlData: state.crawlData || null,
      seoAnalysis: state.seoAnalysis || null,
      competitorData: state.competitorData || null,
      keywordData: state.keywordData || null,
      executiveSummary: '',
      reportHtmlPath: '',
    };

    // Generate executive summary with LLM
    try {
      const llm = await getLLM();

      const scoreInfo = state.seoAnalysis
        ? `Gesamt-Score: ${state.seoAnalysis.overallScore}/100`
        : 'Kein Score verfuegbar';

      const criticalIssues = state.seoAnalysis?.issues
        .filter((i) => i.severity === 'critical')
        .map((i) => `- ${i.title}`)
        .join('\n') || 'Keine';

      const competitorCount = state.competitorData?.competitors.length || 0;
      const topKeywords = state.keywordData?.primaryKeywords
        .slice(0, 5)
        .map((k) => k.keyword)
        .join(', ') || 'Keine ermittelt';

      const prompt = `Du bist ein SEO-Berater. Erstelle eine Executive Summary auf Deutsch fuer folgenden SEO-Bericht.

URL: ${state.url}
${scoreInfo}

Kritische Probleme:
${criticalIssues}

Konkurrenten gefunden: ${competitorCount}
Top Keywords: ${topKeywords}

Schreibe eine kurze, praegnante Zusammenfassung (3-5 Saetze) die die wichtigsten Erkenntnisse und die dringendsten Massnahmen hervorhebt.`;

      const response = await llm.invoke(prompt);
      report.executiveSummary =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
    } catch {
      report.executiveSummary = `SEO-Analyse fuer ${state.url} abgeschlossen. ${
        state.seoAnalysis
          ? `Gesamt-Score: ${state.seoAnalysis.overallScore}/100. ${state.seoAnalysis.issues.filter((i) => i.severity === 'critical').length} kritische Probleme gefunden.`
          : ''
      }`;
    }

    // Generate HTML report
    const htmlPath = generateHtmlReport(report);
    report.reportHtmlPath = htmlPath;

    return {
      reportPath: htmlPath,
      status: 'completed',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { errors: [`Reporter Fehler: ${msg}`] };
  }
}
