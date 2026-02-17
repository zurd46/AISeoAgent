import Handlebars from 'handlebars';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';
import { REPORT_TEMPLATE } from './template.js';
import type { SEOReport } from '../types.js';

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper('gte', (a: number, b: number) => a >= b);
Handlebars.registerHelper('lte', (a: number, b: number) => a <= b);
Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
Handlebars.registerHelper('lt', (a: number, b: number) => a < b);

const compiledTemplate = Handlebars.compile(REPORT_TEMPLATE);

function getScoreClass(score: number): string {
  if (score >= 80) return 'good';
  if (score >= 50) return 'ok';
  return 'bad';
}

/**
 * Generate an HTML report file and return the file path.
 */
export function generateHtmlReport(report: SEOReport): string {
  // Prepare template data with computed fields
  const data = {
    ...report,
    formattedDate: new Date(report.timestamp).toLocaleString('de-CH', {
      dateStyle: 'full',
      timeStyle: 'short',
    }),
    scoreClass: report.seoAnalysis
      ? getScoreClass(report.seoAnalysis.overallScore)
      : 'bad',

    // Computed counts
    headingCount: report.crawlData?.headings.length || 0,
    internalLinkCount:
      report.crawlData?.links.filter((l) => l.isInternal).length || 0,
    externalLinkCount:
      report.crawlData?.links.filter((l) => !l.isInternal).length || 0,
    imageCount: report.crawlData?.images.length || 0,
    imagesWithAlt:
      report.crawlData?.images.filter((i) => i.hasAlt).length || 0,

    // Add structuredDataCount
    crawlData: report.crawlData
      ? {
          ...report.crawlData,
          structuredDataCount: report.crawlData.structuredData.length,
          // Limit headings in report
          headings: report.crawlData.headings.slice(0, 20),
        }
      : null,

    // Enrich scores with CSS classes
    seoAnalysis: report.seoAnalysis
      ? {
          ...report.seoAnalysis,
          scores: report.seoAnalysis.scores.map((s) => ({
            ...s,
            scoreClass: getScoreClass(s.score),
          })),
        }
      : null,

    // Add rank numbers to competitors
    competitorData: report.competitorData
      ? {
          ...report.competitorData,
          competitors: report.competitorData.competitors.map((c, i) => ({
            ...c,
            rank: i + 1,
          })),
        }
      : null,
  };

  const html = compiledTemplate(data);

  // Generate filename from URL
  let filename: string;
  try {
    const parsed = new URL(report.url);
    filename = parsed.hostname.replace(/\./g, '_');
  } catch {
    filename = 'report';
  }

  const filepath = join(
    config.reportsDir,
    `seo_report_${filename}_${Date.now()}.html`
  );

  writeFileSync(filepath, html, 'utf-8');
  return filepath;
}
