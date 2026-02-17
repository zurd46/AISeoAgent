import type { CrawlData, SEOIssue, SEOScore, Severity } from '../types.js';

type CheckResult = { score: SEOScore; issues: SEOIssue[] };

export function checkTitle(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const { title, titleLength } = crawl.meta;

  if (!title) {
    score = 0;
    issues.push({
      category: 'Meta Tags',
      title: 'Fehlender Title-Tag',
      description: 'Die Seite hat keinen Title-Tag.',
      severity: 'critical',
      recommendation: 'Einen einzigartigen, beschreibenden Title-Tag mit 50-60 Zeichen hinzufuegen.',
      currentValue: 'Kein Title',
      idealValue: '50-60 Zeichen',
    });
  } else {
    if (titleLength < 30) {
      score -= 30;
      issues.push({
        category: 'Meta Tags',
        title: 'Title zu kurz',
        description: `Title hat nur ${titleLength} Zeichen.`,
        severity: 'warning',
        recommendation: 'Title auf 50-60 Zeichen erweitern.',
        currentValue: `${titleLength} Zeichen`,
        idealValue: '50-60 Zeichen',
      });
    } else if (titleLength > 60) {
      score -= 15;
      issues.push({
        category: 'Meta Tags',
        title: 'Title zu lang',
        description: `Title hat ${titleLength} Zeichen und wird abgeschnitten.`,
        severity: 'warning',
        recommendation: 'Title auf max. 60 Zeichen kuerzen.',
        currentValue: `${titleLength} Zeichen`,
        idealValue: '50-60 Zeichen',
      });
    }
  }

  return {
    score: { category: 'Title Tag', score: Math.max(score, 0), maxScore: 100, details: title },
    issues,
  };
}

export function checkMetaDescription(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const { description, descriptionLength } = crawl.meta;

  if (!description) {
    score = 0;
    issues.push({
      category: 'Meta Tags',
      title: 'Fehlende Meta-Description',
      description: 'Keine Meta-Description vorhanden.',
      severity: 'critical',
      recommendation: 'Eine einzigartige Meta-Description mit 150-160 Zeichen hinzufuegen.',
      currentValue: 'Keine Description',
      idealValue: '150-160 Zeichen',
    });
  } else {
    if (descriptionLength < 120) {
      score -= 25;
      issues.push({
        category: 'Meta Tags',
        title: 'Meta-Description zu kurz',
        description: `Description hat nur ${descriptionLength} Zeichen.`,
        severity: 'warning',
        recommendation: 'Description auf 150-160 Zeichen erweitern.',
        currentValue: `${descriptionLength} Zeichen`,
        idealValue: '150-160 Zeichen',
      });
    } else if (descriptionLength > 160) {
      score -= 10;
      issues.push({
        category: 'Meta Tags',
        title: 'Meta-Description zu lang',
        description: `Description hat ${descriptionLength} Zeichen.`,
        severity: 'info',
        recommendation: 'Description auf max. 160 Zeichen kuerzen.',
        currentValue: `${descriptionLength} Zeichen`,
        idealValue: '150-160 Zeichen',
      });
    }
  }

  return {
    score: { category: 'Meta Description', score: Math.max(score, 0), maxScore: 100, details: description.slice(0, 100) },
    issues,
  };
}

export function checkHeadings(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  const h1Tags = crawl.headings.filter((h) => h.level === 1);
  const h2Tags = crawl.headings.filter((h) => h.level === 2);

  if (h1Tags.length === 0) {
    score -= 40;
    issues.push({
      category: 'Headings',
      title: 'Kein H1-Tag',
      description: 'Die Seite hat keinen H1-Tag.',
      severity: 'critical',
      recommendation: 'Genau einen H1-Tag mit dem Haupt-Keyword hinzufuegen.',
      currentValue: '0 H1-Tags',
      idealValue: '1 H1-Tag',
    });
  } else if (h1Tags.length > 1) {
    score -= 20;
    issues.push({
      category: 'Headings',
      title: 'Mehrere H1-Tags',
      description: `Die Seite hat ${h1Tags.length} H1-Tags.`,
      severity: 'warning',
      recommendation: 'Nur einen H1-Tag pro Seite verwenden.',
      currentValue: `${h1Tags.length} H1-Tags`,
      idealValue: '1 H1-Tag',
    });
  }

  if (h2Tags.length === 0) {
    score -= 15;
    issues.push({
      category: 'Headings',
      title: 'Keine H2-Tags',
      description: 'Keine H2-Tags zur Strukturierung vorhanden.',
      severity: 'warning',
      recommendation: 'H2-Tags zur inhaltlichen Gliederung verwenden.',
      currentValue: '0 H2-Tags',
      idealValue: '2-5 H2-Tags',
    });
  }

  // Check hierarchy
  const levels = crawl.headings.map((h) => h.level);
  for (let i = 1; i < levels.length; i++) {
    if (levels[i]! > levels[i - 1]! + 1) {
      score -= 5;
      issues.push({
        category: 'Headings',
        title: 'Heading-Hierarchie gebrochen',
        description: `Sprung von H${levels[i - 1]} zu H${levels[i]}.`,
        severity: 'info',
        recommendation: 'Heading-Hierarchie einhalten (H1 > H2 > H3).',
        currentValue: `H${levels[i - 1]} -> H${levels[i]}`,
        idealValue: 'Logische Reihenfolge',
      });
      break;
    }
  }

  return {
    score: { category: 'Headings', score: Math.max(score, 0), maxScore: 100, details: '' },
    issues,
  };
}

export function checkImages(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const total = crawl.images.length;

  if (total === 0) {
    return {
      score: { category: 'Bilder', score: 100, maxScore: 100, details: 'Keine Bilder' },
      issues,
    };
  }

  const withoutAlt = crawl.images.filter((img) => !img.hasAlt);
  const pct = (withoutAlt.length / total) * 100;

  let severity: Severity = 'info';
  if (pct > 50) {
    score -= 40;
    severity = 'critical';
  } else if (pct > 20) {
    score -= 20;
    severity = 'warning';
  } else if (pct > 0) {
    score -= 10;
    severity = 'info';
  } else {
    return {
      score: { category: 'Bilder', score: 100, maxScore: 100, details: `Alle ${total} Bilder haben Alt-Texte` },
      issues,
    };
  }

  issues.push({
    category: 'Bilder',
    title: 'Bilder ohne Alt-Text',
    description: `${withoutAlt.length} von ${total} Bildern haben keinen Alt-Text.`,
    severity,
    recommendation: 'Allen Bildern beschreibende Alt-Texte hinzufuegen.',
    currentValue: `${withoutAlt.length}/${total} ohne Alt`,
    idealValue: '0 ohne Alt-Text',
  });

  return {
    score: { category: 'Bilder', score: Math.max(score, 0), maxScore: 100, details: '' },
    issues,
  };
}

export function checkLinks(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  const internal = crawl.links.filter((l) => l.isInternal);
  const external = crawl.links.filter((l) => !l.isInternal);

  if (internal.length < 3) {
    score -= 20;
    issues.push({
      category: 'Links',
      title: 'Wenige interne Links',
      description: `Nur ${internal.length} interne Links gefunden.`,
      severity: 'warning',
      recommendation: 'Mehr interne Links zu relevanten Seiten setzen.',
      currentValue: `${internal.length} intern`,
      idealValue: '10+ interne Links',
    });
  }

  const emptyAnchor = crawl.links.filter((l) => !l.text.trim());
  if (emptyAnchor.length > 0) {
    score -= 10;
    issues.push({
      category: 'Links',
      title: 'Links ohne Anker-Text',
      description: `${emptyAnchor.length} Links haben keinen Anker-Text.`,
      severity: 'info',
      recommendation: 'Allen Links beschreibende Anker-Texte geben.',
      currentValue: `${emptyAnchor.length} ohne Text`,
      idealValue: '0 ohne Anker-Text',
    });
  }

  return {
    score: {
      category: 'Links',
      score: Math.max(score, 0),
      maxScore: 100,
      details: `${internal.length} intern, ${external.length} extern`,
    },
    issues,
  };
}

export function checkTechnical(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  if (!crawl.pageInfo.hasHttps) {
    score -= 30;
    issues.push({
      category: 'Technik',
      title: 'Kein HTTPS',
      description: 'Die Seite verwendet kein HTTPS.',
      severity: 'critical',
      recommendation: 'SSL-Zertifikat installieren und auf HTTPS umstellen.',
      currentValue: '', idealValue: '',
    });
  }

  if (crawl.pageInfo.responseTimeMs > 3000) {
    score -= 25;
    issues.push({
      category: 'Technik',
      title: 'Langsame Ladezeit',
      description: `Server-Antwortzeit: ${crawl.pageInfo.responseTimeMs}ms.`,
      severity: 'critical',
      recommendation: 'Server-Performance optimieren. Ziel: unter 500ms.',
      currentValue: `${crawl.pageInfo.responseTimeMs}ms`,
      idealValue: '<500ms',
    });
  } else if (crawl.pageInfo.responseTimeMs > 1000) {
    score -= 10;
    issues.push({
      category: 'Technik',
      title: 'Maessige Ladezeit',
      description: `Server-Antwortzeit: ${crawl.pageInfo.responseTimeMs}ms.`,
      severity: 'warning',
      currentValue: `${crawl.pageInfo.responseTimeMs}ms`,
      idealValue: '<500ms',
      recommendation: '',
    });
  }

  if (!crawl.pageInfo.hasRobotsTxt) {
    score -= 10;
    issues.push({
      category: 'Technik',
      title: 'Keine robots.txt',
      description: 'Keine robots.txt Datei gefunden.',
      severity: 'warning',
      recommendation: 'Eine robots.txt Datei erstellen.',
      currentValue: '', idealValue: '',
    });
  }

  if (!crawl.pageInfo.hasSitemap) {
    score -= 10;
    issues.push({
      category: 'Technik',
      title: 'Keine Sitemap',
      description: 'Keine XML-Sitemap gefunden.',
      severity: 'warning',
      recommendation: 'Eine XML-Sitemap erstellen.',
      currentValue: '', idealValue: '',
    });
  }

  if (!crawl.meta.viewport) {
    score -= 15;
    issues.push({
      category: 'Technik',
      title: 'Kein Viewport-Meta-Tag',
      description: 'Kein viewport Meta-Tag fuer mobile Optimierung.',
      severity: 'critical',
      recommendation: '<meta name="viewport" content="width=device-width, initial-scale=1"> hinzufuegen.',
      currentValue: '', idealValue: '',
    });
  }

  if (!crawl.meta.canonical) {
    score -= 5;
    issues.push({
      category: 'Technik',
      title: 'Kein Canonical-Tag',
      description: 'Kein Canonical-Link-Element gefunden.',
      severity: 'info',
      recommendation: 'Canonical-Tag setzen um Duplicate Content zu vermeiden.',
      currentValue: '', idealValue: '',
    });
  }

  return {
    score: { category: 'Technik', score: Math.max(score, 0), maxScore: 100, details: '' },
    issues,
  };
}

export function checkContent(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const wc = crawl.pageInfo.wordCount;

  if (wc < 300) {
    score -= 40;
    issues.push({
      category: 'Content',
      title: 'Sehr wenig Content',
      description: `Nur ${wc} Woerter auf der Seite.`,
      severity: 'critical',
      recommendation: 'Mindestens 300 Woerter hochwertigen Content hinzufuegen.',
      currentValue: `${wc} Woerter`,
      idealValue: '300+ Woerter',
    });
  } else if (wc < 600) {
    score -= 15;
    issues.push({
      category: 'Content',
      title: 'Wenig Content',
      description: `Nur ${wc} Woerter.`,
      severity: 'warning',
      currentValue: `${wc} Woerter`,
      idealValue: '600+ Woerter',
      recommendation: '',
    });
  }

  if (crawl.structuredData.length === 0) {
    score -= 15;
    issues.push({
      category: 'Content',
      title: 'Keine strukturierten Daten',
      description: 'Keine JSON-LD oder Schema.org Daten gefunden.',
      severity: 'warning',
      recommendation: 'Schema.org Markup (JSON-LD) hinzufuegen.',
      currentValue: '', idealValue: '',
    });
  }

  if (!crawl.meta.ogTitle) {
    score -= 10;
    issues.push({
      category: 'Content',
      title: 'Keine Open Graph Tags',
      description: 'Keine OG-Tags fuer Social Media Sharing.',
      severity: 'info',
      recommendation: 'Open Graph Tags (og:title, og:description, og:image) hinzufuegen.',
      currentValue: '', idealValue: '',
    });
  }

  return {
    score: { category: 'Content', score: Math.max(score, 0), maxScore: 100, details: `${wc} Woerter` },
    issues,
  };
}

export function runAllChecks(crawl: CrawlData): { scores: SEOScore[]; issues: SEOIssue[] } {
  const checks = [
    checkTitle,
    checkMetaDescription,
    checkHeadings,
    checkImages,
    checkLinks,
    checkTechnical,
    checkContent,
  ];

  const allScores: SEOScore[] = [];
  const allIssues: SEOIssue[] = [];

  for (const check of checks) {
    const { score, issues } = check(crawl);
    allScores.push(score);
    allIssues.push(...issues);
  }

  return { scores: allScores, issues: allIssues };
}
