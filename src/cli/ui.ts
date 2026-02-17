import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import Table from 'cli-table3';
import boxen from 'boxen';
import { showScoreBar, showSeverityBadge, COOL_GRADIENT } from './banner.js';
import type {
  SEOAnalysis,
  CompetitorData,
  KeywordData,
  CrawlData,
} from '../types.js';

// ─── Spinner Management ──────────────────────────────────────

const spinnerFrames = ['◐', '◓', '◑', '◒'];

export function createSpinner(text: string): Ora {
  return ora({
    text,
    spinner: { interval: 100, frames: spinnerFrames },
    color: 'cyan',
  });
}

export function createAgentSpinner(agentName: string, task: string): Ora {
  const icons: Record<string, string> = {
    crawl: '🔍',
    analyze: '📊',
    competitor: '🏆',
    keyword: '🔑',
    report: '📝',
  };
  const icon = icons[agentName] || '⚡';
  return createSpinner(`${icon} ${chalk.bold(agentName.toUpperCase())} ${chalk.dim('|')} ${task}`);
}

// ─── Progress Display ────────────────────────────────────────

export function showPhaseHeader(phase: string): void {
  console.log('');
  console.log(
    chalk.gray('  ') +
    COOL_GRADIENT(`▸ ${phase}`) +
    chalk.gray(' ' + '·'.repeat(Math.max(0, 55 - phase.length)))
  );
  console.log('');
}

// ─── Crawl Results ───────────────────────────────────────────

export function displayCrawlResults(crawl: CrawlData): void {
  const table = new Table({
    chars: {
      top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼',
      right: '│', 'right-mid': '┤', middle: '│',
    },
    style: { head: ['cyan'], border: ['gray'] },
  });

  table.push(
    [chalk.bold('URL'), crawl.pageInfo.finalUrl || crawl.pageInfo.url],
    [chalk.bold('Status'), crawl.pageInfo.statusCode === 200 ? chalk.green('200 OK') : chalk.red(String(crawl.pageInfo.statusCode))],
    [chalk.bold('Ladezeit'), `${crawl.pageInfo.responseTimeMs}ms`],
    [chalk.bold('Woerter'), String(crawl.pageInfo.wordCount)],
    [chalk.bold('Title'), crawl.meta.title || chalk.red('Fehlt')],
    [chalk.bold('Description'), (crawl.meta.description || chalk.red('Fehlt')).slice(0, 60) + '...'],
    [chalk.bold('HTTPS'), crawl.pageInfo.hasHttps ? chalk.green('Ja') : chalk.red('Nein')],
    [chalk.bold('Robots.txt'), crawl.pageInfo.hasRobotsTxt ? chalk.green('Ja') : chalk.yellow('Nein')],
    [chalk.bold('Sitemap'), crawl.pageInfo.hasSitemap ? chalk.green('Ja') : chalk.yellow('Nein')],
    [chalk.bold('Bilder'), `${crawl.images.length} (${crawl.images.filter(i => i.hasAlt).length} mit Alt)`],
    [chalk.bold('Links'), `${crawl.links.filter(l => l.isInternal).length} intern, ${crawl.links.filter(l => !l.isInternal).length} extern`],
    [chalk.bold('Headings'), `H1: ${crawl.headings.filter(h => h.level === 1).length}, H2: ${crawl.headings.filter(h => h.level === 2).length}, H3: ${crawl.headings.filter(h => h.level === 3).length}`],
    [chalk.bold('Strukt. Daten'), crawl.structuredData.length > 0 ? chalk.green(`${crawl.structuredData.length} gefunden`) : chalk.yellow('Keine')],
  );

  console.log(table.toString());
}

// ─── SEO Score Display ───────────────────────────────────────

export function displaySEOScores(analysis: SEOAnalysis): void {
  // Overall score box
  const scoreColor =
    analysis.overallScore >= 80 ? chalk.green :
    analysis.overallScore >= 60 ? chalk.yellow :
    chalk.red;

  const scoreBox = boxen(
    `${scoreColor.bold(`  ${analysis.overallScore}`)}${chalk.dim('/100')}\n${chalk.dim('  SEO Score')}`,
    {
      padding: 1,
      margin: { top: 0, bottom: 0, left: 2, right: 0 },
      borderStyle: 'round',
      borderColor: analysis.overallScore >= 80 ? 'green' : analysis.overallScore >= 60 ? 'yellow' : 'red',
    }
  );
  console.log(scoreBox);

  // Category scores
  const table = new Table({
    head: [chalk.bold('Kategorie'), chalk.bold('Score'), chalk.bold('Balken')],
    style: { head: ['cyan'], border: ['gray'] },
    colWidths: [20, 10, 40],
  });

  for (const score of analysis.scores) {
    table.push([
      score.category,
      `${score.score}/${score.maxScore}`,
      showScoreBar(score.score),
    ]);
  }

  console.log(table.toString());
}

// ─── Issues Display ──────────────────────────────────────────

export function displayIssues(analysis: SEOAnalysis): void {
  if (analysis.issues.length === 0) {
    console.log(chalk.green('  Keine Probleme gefunden!'));
    return;
  }

  // Sort: critical first
  const sorted = [...analysis.issues].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, info: 2, good: 3 };
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  });

  const table = new Table({
    head: [
      chalk.bold('Severity'),
      chalk.bold('Kategorie'),
      chalk.bold('Problem'),
      chalk.bold('Ist'),
      chalk.bold('Soll'),
    ],
    style: { head: ['cyan'], border: ['gray'] },
    colWidths: [12, 14, 30, 18, 18],
    wordWrap: true,
  });

  for (const issue of sorted) {
    table.push([
      showSeverityBadge(issue.severity),
      issue.category,
      issue.title,
      issue.currentValue || chalk.dim('-'),
      issue.idealValue || chalk.dim('-'),
    ]);
  }

  console.log(table.toString());
}

// ─── Competitor Display ──────────────────────────────────────

export function displayCompetitors(data: CompetitorData, targetCrawl?: CrawlData): void {
  if (data.competitors.length === 0) {
    console.log(chalk.yellow('  Keine Konkurrenten gefunden.'));
    return;
  }

  // Basis-Tabelle
  const table = new Table({
    head: [
      chalk.bold('#'),
      chalk.bold('Domain'),
      chalk.bold('Title'),
      chalk.bold('Keyword-Overlap'),
    ],
    style: { head: ['cyan'], border: ['gray'] },
    colWidths: [5, 25, 30, 30],
    wordWrap: true,
  });

  data.competitors.slice(0, 8).forEach((comp, i) => {
    table.push([
      String(i + 1),
      chalk.bold(comp.domain),
      comp.title.slice(0, 28),
      comp.keywordOverlap.join(', ').slice(0, 28),
    ]);
  });

  console.log(table.toString());

  // SEO-Vergleichstabelle fuer gecrawlte Konkurrenten
  const crawledComps = data.competitors.filter((c) => c.seo);
  if (crawledComps.length > 0) {
    console.log('');
    console.log(chalk.bold(COOL_GRADIENT('  SEO-Vergleich mit Top-Konkurrenten')));

    const compTable = new Table({
      head: [
        chalk.bold('Metrik'),
        chalk.bold('Ziel-Seite'),
        ...crawledComps.slice(0, 3).map((c) => chalk.bold(c.domain.slice(0, 15))),
      ],
      style: { head: ['cyan'], border: ['gray'] },
      wordWrap: true,
    });

    // Target site SEO values for comparison
    const targetSEO = targetCrawl ? {
      wordCount: targetCrawl.pageInfo.wordCount,
      titleLength: targetCrawl.meta.titleLength,
      descriptionLength: targetCrawl.meta.descriptionLength,
      responseTimeMs: targetCrawl.pageInfo.responseTimeMs,
      imageCount: targetCrawl.images.length,
      internalLinks: targetCrawl.links.filter((l) => l.isInternal).length,
      hasStructuredData: targetCrawl.structuredData.length > 0,
      hasOgTags: !!targetCrawl.meta.ogTitle,
      hasTwitterCard: !!targetCrawl.meta.twitterCard,
    } : null;

    const metrics = [
      { label: 'Woerter', key: 'wordCount' as const },
      { label: 'Title (Zeichen)', key: 'titleLength' as const },
      { label: 'Description (Z.)', key: 'descriptionLength' as const },
      { label: 'Ladezeit (ms)', key: 'responseTimeMs' as const },
      { label: 'Bilder', key: 'imageCount' as const },
      { label: 'Interne Links', key: 'internalLinks' as const },
    ];

    for (const m of metrics) {
      const targetVal = targetSEO ? String(targetSEO[m.key]) : chalk.dim('-');
      compTable.push([
        m.label,
        chalk.bold(targetVal),
        ...crawledComps.slice(0, 3).map((c) => String(c.seo?.[m.key] ?? '-')),
      ]);
    }

    // Boolean metrics
    const boolMetrics = [
      { label: 'Schema.org', key: 'hasStructuredData' as const },
      { label: 'Open Graph', key: 'hasOgTags' as const },
      { label: 'Twitter Card', key: 'hasTwitterCard' as const },
    ];

    const yes = chalk.green('✓');
    const no = chalk.red('✗');

    for (const m of boolMetrics) {
      const targetVal = targetSEO ? (targetSEO[m.key] ? yes : no) : chalk.dim('-');
      compTable.push([
        m.label,
        targetVal,
        ...crawledComps.slice(0, 3).map((c) => c.seo?.[m.key] ? yes : no),
      ]);
    }

    console.log(compTable.toString());

    // Staerken/Schwaechen der Konkurrenten
    for (const comp of crawledComps.slice(0, 3)) {
      if (comp.strengths.length > 0 || comp.weaknesses.length > 0) {
        console.log(`\n  ${chalk.bold(comp.domain)}:`);
        for (const s of comp.strengths) console.log(`    ${chalk.red('↑')} ${s}`);
        for (const w of comp.weaknesses) console.log(`    ${chalk.green('↓')} ${w}`);
      }
    }
  }

  // Vorteile / Luecken
  if (data.competitiveAdvantages.length > 0) {
    console.log(`\n  ${chalk.bold.green('Ihre Vorteile:')}`);
    data.competitiveAdvantages.forEach((a) => console.log(`    ${chalk.green('+')} ${a}`));
  }
  if (data.competitiveGaps.length > 0) {
    console.log(`\n  ${chalk.bold.red('Ihre Luecken:')}`);
    data.competitiveGaps.forEach((g) => console.log(`    ${chalk.red('-')} ${g}`));
  }
}

// ─── Keyword Display ─────────────────────────────────────────

export function displayKeywords(data: KeywordData): void {
  const allKeywords = [...data.primaryKeywords, ...data.secondaryKeywords];

  if (allKeywords.length === 0) {
    console.log(chalk.yellow('  Keine Keywords analysiert.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('Keyword'),
      chalk.bold('Anzahl'),
      chalk.bold('Dichte'),
      chalk.bold('Title'),
      chalk.bold('H1'),
      chalk.bold('URL'),
      chalk.bold('Score'),
    ],
    style: { head: ['cyan'], border: ['gray'] },
    colWidths: [18, 8, 8, 8, 8, 8, 10],
  });

  for (const kw of allKeywords.slice(0, 15)) {
    const yes = chalk.green('✓');
    const no = chalk.red('✗');
    table.push([
      chalk.bold(kw.keyword),
      String(kw.count),
      `${kw.density}%`,
      kw.inTitle ? yes : no,
      kw.inH1 ? yes : no,
      kw.inUrl ? yes : no,
      showScoreBar(kw.prominenceScore, 6),
    ]);
  }

  console.log(table.toString());
}

// ─── LLM Recommendations ────────────────────────────────────

export function displayLLMRecommendations(title: string, text: string): void {
  if (!text) return;

  const box = boxen(text, {
    title: chalk.bold(title),
    padding: 1,
    margin: { top: 1, bottom: 1, left: 2, right: 2 },
    borderStyle: 'round',
    borderColor: 'cyan',
  });

  console.log(box);
}

// ─── Final Summary ───────────────────────────────────────────

export function displayFinalSummary(reportPath: string, duration: number): void {
  console.log('');
  console.log(chalk.gray('  ' + '═'.repeat(60)));
  console.log('');

  const summary = [
    `${chalk.bold('Report gespeichert:')} ${chalk.underline(reportPath)}`,
    `${chalk.bold('Dauer:')} ${(duration / 1000).toFixed(1)}s`,
    '',
    chalk.dim('Oeffne den HTML-Report im Browser fuer die vollstaendige Analyse.'),
  ].join('\n');

  const box = boxen(summary, {
    title: COOL_GRADIENT(' SEO Analyse abgeschlossen '),
    padding: 1,
    margin: { top: 0, bottom: 1, left: 2, right: 2 },
    borderStyle: 'double',
    borderColor: 'green',
  });

  console.log(box);
}
