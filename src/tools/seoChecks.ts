import type { CrawlData, SEOIssue, SEOScore, Severity } from '../types.js';

type CheckResult = { score: SEOScore; issues: SEOIssue[] };

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function iss(
  category: string, title: string, description: string, severity: Severity,
  recommendation: string, currentValue: string, idealValue: string
): SEOIssue {
  return { category, title, description, severity, recommendation, currentValue, idealValue };
}

function res(category: string, score: number, issues: SEOIssue[], details: string): CheckResult {
  return { score: { category, score: Math.max(score, 0), maxScore: 100, details }, issues };
}

// ═══════════════════════════════════════════════════════════════
// 1. TITLE TAG
// ═══════════════════════════════════════════════════════════════

export function checkTitle(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const { title, titleLength } = crawl.meta;

  if (!title) {
    return res('Title Tag', 0, [iss('Meta Tags', 'Fehlender Title-Tag',
      'Die Seite hat keinen Title-Tag. Der Title ist der wichtigste On-Page SEO-Faktor und wird als Ueberschrift in den Suchergebnissen angezeigt.', 'critical',
      'Einen einzigartigen, beschreibenden Title-Tag hinzufuegen der das Haupt-Keyword enthaelt und 50-60 Zeichen lang ist. Format: "Haupt-Keyword - Beschreibung | Marke".',
      'Kein Title', '50-60 Zeichen')], '');
  }

  if (titleLength < 30) {
    score -= 30;
    issues.push(iss('Meta Tags', 'Title zu kurz',
      `Der Title hat nur ${titleLength} Zeichen. Suchmaschinen bevorzugen Titles mit 50-60 Zeichen, kurze Titles verschwenden Platz im SERP.`, 'warning',
      'Title mit relevanten Keywords auf 50-60 Zeichen erweitern. Beispiel: "Haupt-Keyword - Beschreibung | Markenname".',
      `${titleLength} Zeichen`, '50-60 Zeichen'));
  } else if (titleLength > 60) {
    score -= 15;
    issues.push(iss('Meta Tags', 'Title zu lang',
      `Der Title hat ${titleLength} Zeichen und wird in den Google-Suchergebnissen abgeschnitten. Wichtige Informationen gehen verloren.`, 'warning',
      'Title auf maximal 60 Zeichen kuerzen. Die wichtigsten Keywords an den Anfang stellen, Markenname ans Ende.',
      `${titleLength} Zeichen`, '50-60 Zeichen'));
  }

  // Title besteht nur aus Domain-Name
  try {
    const domain = new URL(crawl.pageInfo.url).hostname.replace('www.', '');
    if (title.toLowerCase().replace(/[^a-z0-9]/g, '') === domain.replace(/[^a-z0-9.]/g, '').replace(/\./g, '')) {
      score -= 25;
      issues.push(iss('Meta Tags', 'Title ist nur Domain-Name',
        'Der Title besteht nur aus dem Domain-Namen und enthaelt keine beschreibenden Keywords.', 'warning',
        'Einen beschreibenden Title mit dem Haupt-Keyword erstellen. Format: "Haupt-Keyword - Beschreibung | Marke".',
        title, 'Beschreibender Title'));
    }
  } catch { /* ignore */ }

  // Title beginnt mit Trennzeichen
  if (/^[\s|:\-–—]/.test(title)) {
    score -= 10;
    issues.push(iss('Meta Tags', 'Title beginnt mit Trennzeichen',
      'Der Title beginnt mit einem Sonderzeichen statt mit relevanten Keywords. Die ersten Woerter des Titles haben die hoechste SEO-Wirkung.', 'info',
      'Wichtigste Keywords an den Anfang des Titles stellen. Trennzeichen nur zum Absetzen des Markennamens am Ende verwenden.',
      title.slice(0, 20), 'Keywords zuerst'));
  }

  return res('Title Tag', score, issues, title);
}

// ═══════════════════════════════════════════════════════════════
// 2. META DESCRIPTION
// ═══════════════════════════════════════════════════════════════

export function checkMetaDescription(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const { description, descriptionLength } = crawl.meta;

  if (!description) {
    return res('Meta Description', 0, [iss('Meta Tags', 'Fehlende Meta-Description',
      'Keine Meta-Description vorhanden. Google zeigt stattdessen einen zufaelligen Textausschnitt an, der oft nicht optimal ist.', 'critical',
      'Eine einzigartige, ueberzeugende Meta-Description mit 150-160 Zeichen erstellen. Sie sollte das Haupt-Keyword enthalten und einen Call-to-Action haben (z.B. "Jetzt entdecken", "Mehr erfahren").',
      'Keine Description', '150-160 Zeichen')], '');
  }

  if (descriptionLength < 80) {
    score -= 30;
    issues.push(iss('Meta Tags', 'Meta-Description viel zu kurz',
      `Die Description hat nur ${descriptionLength} Zeichen und nutzt den verfuegbaren Platz im SERP nicht aus.`, 'warning',
      'Description auf 150-160 Zeichen erweitern. Keywords, USP und einen Call-to-Action einbauen.',
      `${descriptionLength} Zeichen`, '150-160 Zeichen'));
  } else if (descriptionLength < 120) {
    score -= 15;
    issues.push(iss('Meta Tags', 'Meta-Description etwas kurz',
      `Die Description hat ${descriptionLength} Zeichen. Optimale Laenge: 150-160 Zeichen.`, 'info',
      'Description auf 150-160 Zeichen erweitern fuer maximale Sichtbarkeit in den Suchergebnissen.',
      `${descriptionLength} Zeichen`, '150-160 Zeichen'));
  } else if (descriptionLength > 160) {
    score -= 10;
    issues.push(iss('Meta Tags', 'Meta-Description zu lang',
      `Die Description hat ${descriptionLength} Zeichen und wird in den Suchergebnissen abgeschnitten.`, 'info',
      'Description auf maximal 160 Zeichen kuerzen. Die wichtigste Aussage muss in den ersten 120 Zeichen stehen.',
      `${descriptionLength} Zeichen`, '150-160 Zeichen'));
  }

  // Description identisch mit Title
  if (description.toLowerCase().trim() === crawl.meta.title.toLowerCase().trim() && description.length > 0) {
    score -= 15;
    issues.push(iss('Meta Tags', 'Description identisch mit Title',
      'Meta-Description und Title-Tag sind identisch. Beide sollten unterschiedlichen, sich ergaenzenden Content haben.', 'warning',
      'Eine eigenstaendige Description schreiben, die den Title ergaenzt und mehr Details zum Seiteninhalt gibt.',
      'Identisch mit Title', 'Einzigartiger Text'));
  }

  return res('Meta Description', score, issues, description.slice(0, 100));
}

// ═══════════════════════════════════════════════════════════════
// 3. HEADINGS
// ═══════════════════════════════════════════════════════════════

export function checkHeadings(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  const h1Tags = crawl.headings.filter((h) => h.level === 1);
  const h2Tags = crawl.headings.filter((h) => h.level === 2);

  if (h1Tags.length === 0) {
    score -= 40;
    issues.push(iss('Headings', 'Kein H1-Tag',
      'Die Seite hat keinen H1-Tag. Der H1 ist nach dem Title der wichtigste On-Page SEO-Faktor und signalisiert Suchmaschinen das Hauptthema.', 'critical',
      'Genau einen H1-Tag hinzufuegen, der das Haupt-Keyword der Seite enthaelt und den Seiteninhalt klar beschreibt.',
      '0 H1-Tags', '1 H1-Tag'));
  } else if (h1Tags.length > 1) {
    score -= 20;
    issues.push(iss('Headings', 'Mehrere H1-Tags',
      `Die Seite hat ${h1Tags.length} H1-Tags. Pro Seite sollte nur ein H1 verwendet werden, um das Hauptthema klar zu definieren.`, 'warning',
      'Alle bis auf einen H1-Tag in H2-Tags umwandeln. Der verbleibende H1 sollte die Hauptueberschrift der Seite sein.',
      `${h1Tags.length} H1-Tags`, '1 H1-Tag'));
  } else {
    const h1Text = h1Tags[0]!.text;
    if (h1Text.length > 70) {
      score -= 10;
      issues.push(iss('Headings', 'H1 zu lang',
        `Der H1-Tag hat ${h1Text.length} Zeichen. Zu lange H1-Tags verlieren an SEO-Fokus.`, 'info',
        'H1 auf maximal 70 Zeichen kuerzen und auf das Haupt-Keyword fokussieren.',
        `${h1Text.length} Zeichen`, 'Max. 70 Zeichen'));
    }
    if (h1Text.toLowerCase().trim() === crawl.meta.title.toLowerCase().trim() && h1Text.length > 0) {
      score -= 5;
      issues.push(iss('Headings', 'H1 identisch mit Title',
        'H1-Tag und Title-Tag sind wortgleich. Eine leichte Variation nutzt mehr Keyword-Varianten ab.', 'info',
        'H1 leicht vom Title abwandeln, z.B. ausfuehrlicher formulieren oder eine andere Keyword-Variation verwenden.',
        'Identisch', 'Leicht variiert'));
    }
  }

  if (h2Tags.length === 0 && crawl.pageInfo.wordCount > 100) {
    score -= 15;
    issues.push(iss('Headings', 'Keine H2-Tags',
      'Die Seite hat keine H2-Tags. H2-Tags gliedern den Content und helfen Suchmaschinen die Themenstruktur zu verstehen.', 'warning',
      'H2-Tags verwenden um den Content in logische Abschnitte zu gliedern. Jeder H2 sollte ein relevantes Sub-Keyword enthalten.',
      '0 H2-Tags', '2-8 H2-Tags'));
  }

  // Hierarchie pruefen (Headings in Dokumentreihenfolge!)
  const levels = crawl.headings.map((h) => h.level);
  for (let i = 1; i < levels.length; i++) {
    if (levels[i]! > levels[i - 1]! + 1) {
      score -= 10;
      issues.push(iss('Headings', 'Heading-Hierarchie gebrochen',
        `Sprung von H${levels[i - 1]} direkt zu H${levels[i]}. Dazwischenliegende Ebenen wurden uebersprungen.`, 'warning',
        `Fehlende Heading-Ebene H${levels[i - 1]! + 1} einfuegen. Die Hierarchie muss lueckenlos sein: H1 → H2 → H3.`,
        `H${levels[i - 1]} → H${levels[i]}`, 'Lueckenlose Hierarchie'));
      break;
    }
  }

  // Duplizierte Headings
  const headingTexts = crawl.headings.map((h) => h.text.toLowerCase().trim());
  const duplicates = headingTexts.filter((t, i) => headingTexts.indexOf(t) !== i);
  const uniqueDuplicates = [...new Set(duplicates)];
  if (uniqueDuplicates.length > 0) {
    score -= 10;
    issues.push(iss('Headings', 'Duplizierte Headings',
      `${uniqueDuplicates.length} Heading(s) kommen mehrfach vor: "${uniqueDuplicates[0]}"`, 'info',
      'Jede Ueberschrift sollte einzigartig sein und einen anderen Aspekt des Themas behandeln.',
      `${uniqueDuplicates.length} Duplikate`, '0 Duplikate'));
  }

  return res('Headings', score, issues, `H1: ${h1Tags.length}, H2: ${h2Tags.length}`);
}

// ═══════════════════════════════════════════════════════════════
// 4. BILDER
// ═══════════════════════════════════════════════════════════════

export function checkImages(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const total = crawl.images.length;

  if (total === 0) {
    if (crawl.pageInfo.wordCount > 300) {
      score -= 10;
      issues.push(iss('Bilder', 'Keine Bilder auf der Seite',
        'Die Seite hat keinen visuellen Content. Bilder verbessern die User Experience und bringen Traffic ueber die Google Bildersuche.', 'info',
        'Relevante Bilder mit beschreibenden Alt-Texten und optimierten Dateinamen (z.B. "rotes-sofa-wohnzimmer.jpg") hinzufuegen.',
        '0 Bilder', 'Min. 1 Bild'));
    }
    return res('Bilder', score, issues, 'Keine Bilder');
  }

  const withoutAlt = crawl.images.filter((img) => !img.hasAlt);
  const pctWithout = (withoutAlt.length / total) * 100;

  if (pctWithout > 50) {
    score -= 35;
    issues.push(iss('Bilder', 'Viele Bilder ohne Alt-Text',
      `${withoutAlt.length} von ${total} Bildern (${Math.round(pctWithout)}%) haben keinen Alt-Text. Alt-Texte sind essenziell fuer SEO und Barrierefreiheit.`, 'critical',
      'Allen Bildern beschreibende Alt-Texte hinzufuegen. Der Alt-Text sollte den Bildinhalt beschreiben und wenn passend ein Keyword enthalten (5-15 Woerter).',
      `${withoutAlt.length}/${total} ohne Alt`, '0 ohne Alt-Text'));
  } else if (pctWithout > 20) {
    score -= 20;
    issues.push(iss('Bilder', 'Bilder ohne Alt-Text',
      `${withoutAlt.length} von ${total} Bildern haben keinen Alt-Text.`, 'warning',
      'Fehlende Alt-Texte ergaenzen. Der Alt-Text sollte den Bildinhalt praezise beschreiben.',
      `${withoutAlt.length}/${total} ohne Alt`, '0 ohne Alt-Text'));
  } else if (pctWithout > 0) {
    score -= 8;
    issues.push(iss('Bilder', 'Einzelne Bilder ohne Alt-Text',
      `${withoutAlt.length} von ${total} Bildern haben keinen Alt-Text.`, 'info',
      'Fehlende Alt-Texte ergaenzen.',
      `${withoutAlt.length}/${total} ohne Alt`, '0 ohne Alt-Text'));
  }

  // Generische Alt-Texte
  const genericPatterns = /^(image|img|foto|photo|bild|picture|banner|logo|icon|grafik|graphic|untitled|dsc[_\d]|img[_\d]|screenshot)\s*\d*$/i;
  const genericAlts = crawl.images.filter((img) => img.hasAlt && genericPatterns.test(img.alt.trim()));
  if (genericAlts.length > 0) {
    score -= 10;
    issues.push(iss('Bilder', 'Generische Alt-Texte',
      `${genericAlts.length} Bilder haben nichtssagende Alt-Texte wie "image" oder "foto".`, 'warning',
      'Generische Alt-Texte durch beschreibende ersetzen. Statt "image" z.B. "Rotes Sofa in modernem Wohnzimmer".',
      `${genericAlts.length} generisch`, 'Beschreibende Texte'));
  }

  // Alt-Texte zu lang
  const longAlts = crawl.images.filter((img) => img.alt.length > 125);
  if (longAlts.length > 0) {
    score -= 5;
    issues.push(iss('Bilder', 'Alt-Texte zu lang',
      `${longAlts.length} Bilder haben Alt-Texte mit ueber 125 Zeichen. Screenreader lesen diese komplett vor.`, 'info',
      'Alt-Texte auf maximal 125 Zeichen kuerzen. Praezise und knapp den Bildinhalt beschreiben.',
      `${longAlts.length} zu lang`, 'Max. 125 Zeichen'));
  }

  return res('Bilder', score, issues, `${total} Bilder, ${total - withoutAlt.length} mit Alt`);
}

// ═══════════════════════════════════════════════════════════════
// 5. LINKS
// ═══════════════════════════════════════════════════════════════

export function checkLinks(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  const internal = crawl.links.filter((l) => l.isInternal);
  const external = crawl.links.filter((l) => !l.isInternal);
  const totalLinks = crawl.links.length;

  if (internal.length === 0) {
    score -= 30;
    issues.push(iss('Links', 'Keine internen Links',
      'Die Seite hat keine internen Links. Interne Verlinkung ist entscheidend fuer Crawlbarkeit, Seitenarchitektur und PageRank-Verteilung.', 'critical',
      'Mindestens 3-5 interne Links zu thematisch relevanten Seiten setzen. Beschreibende Anker-Texte mit Keywords verwenden.',
      '0 intern', '10+ interne Links'));
  } else if (internal.length < 3) {
    score -= 20;
    issues.push(iss('Links', 'Wenige interne Links',
      `Nur ${internal.length} interne Links. Eine starke interne Verlinkung hilft Suchmaschinen alle Seiten zu entdecken und bewertet wichtige Seiten hoeher.`, 'warning',
      'Mehr interne Links zu verwandten Inhalten setzen. Kontextuelle Links im Fliesstext sind am wertvollsten.',
      `${internal.length} intern`, '10+ interne Links'));
  }

  if (external.length === 0 && crawl.pageInfo.wordCount > 300) {
    score -= 5;
    issues.push(iss('Links', 'Keine externen Links',
      'Die Seite verlinkt auf keine externe Quelle. Ausgehende Links zu autorativen Quellen koennen die thematische Relevanz und Glaubwuerdigkeit staerken.', 'info',
      'Relevante externe Links zu vertrauenswuerdigen Quellen hinzufuegen (z.B. Studien, offizielle Seiten, Branchenportale).',
      '0 extern', '2-5 externe Links'));
  }

  const emptyAnchor = crawl.links.filter((l) => !l.text.trim());
  if (emptyAnchor.length > 0) {
    score -= 10;
    issues.push(iss('Links', 'Links ohne Anker-Text',
      `${emptyAnchor.length} Links haben keinen sichtbaren Anker-Text. Suchmaschinen nutzen den Anker-Text um die Zielseite thematisch einzuordnen.`, 'warning',
      'Allen Links beschreibende Anker-Texte geben. Statt "hier klicken" besser "SEO-Leitfaden herunterladen".',
      `${emptyAnchor.length} ohne Text`, '0 ohne Anker-Text'));
  }

  if (totalLinks > 150) {
    score -= 10;
    issues.push(iss('Links', 'Sehr viele Links auf der Seite',
      `Die Seite hat ${totalLinks} Links. Zu viele Links verwaessern den PageRank pro Link und koennen Crawler ueberfordern.`, 'info',
      'Pruefen ob alle Links notwendig sind. Navigation verschlanken, unwichtige Footer-Links reduzieren.',
      `${totalLinks} Links`, 'Max. 100-150'));
  }

  const internalNofollow = internal.filter((l) => l.isNofollow);
  if (internalNofollow.length > 0) {
    score -= 10;
    issues.push(iss('Links', 'Interne Links mit nofollow',
      `${internalNofollow.length} interne Links sind als nofollow markiert. Das blockiert die PageRank-Weitergabe an eigene Seiten.`, 'warning',
      'Nofollow von internen Links entfernen. Nofollow sollte nur fuer externe Links zu nicht-vertrauenswuerdigen Quellen verwendet werden.',
      `${internalNofollow.length} nofollow`, '0 nofollow intern'));
  }

  return res('Links', score, issues, `${internal.length} intern, ${external.length} extern`);
}

// ═══════════════════════════════════════════════════════════════
// 6. TECHNIK
// ═══════════════════════════════════════════════════════════════

export function checkTechnical(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  // HTTP Status
  if (crawl.pageInfo.statusCode !== 200) {
    score -= 40;
    issues.push(iss('Technik', 'HTTP-Statuscode nicht 200',
      `Die Seite antwortet mit Status ${crawl.pageInfo.statusCode} statt 200 OK.`, 'critical',
      `Statuscode ${crawl.pageInfo.statusCode} beheben. 301/302 = Weiterleitung pruefen, 4xx = Seite existiert nicht, 5xx = Serverfehler beheben.`,
      `${crawl.pageInfo.statusCode}`, '200 OK'));
  }

  // HTTPS
  if (!crawl.pageInfo.hasHttps) {
    score -= 25;
    issues.push(iss('Technik', 'Kein HTTPS',
      'Die Seite verwendet kein HTTPS. Google bewertet HTTPS als Ranking-Faktor und Chrome markiert HTTP-Seiten als "nicht sicher".', 'critical',
      'SSL/TLS-Zertifikat installieren (Let\'s Encrypt ist kostenlos) und alle HTTP-URLs per 301 auf HTTPS umleiten.',
      'HTTP', 'HTTPS'));
  }

  // Redirect
  if (crawl.pageInfo.finalUrl && crawl.pageInfo.finalUrl !== crawl.pageInfo.url) {
    score -= 5;
    issues.push(iss('Technik', 'URL-Weiterleitung erkannt',
      `Die URL leitet weiter: ${crawl.pageInfo.url} → ${crawl.pageInfo.finalUrl}`, 'info',
      'Sicherstellen dass die kanonische URL direkt verlinkt wird. Unnoetige Redirect-Ketten vermeiden.',
      'Redirect', 'Direkte URL'));
  }

  // Ladezeit
  if (crawl.pageInfo.responseTimeMs > 3000) {
    score -= 25;
    issues.push(iss('Technik', 'Sehr langsame Ladezeit',
      `Server-Antwortzeit: ${crawl.pageInfo.responseTimeMs}ms. Google empfiehlt einen TTFB unter 200ms.`, 'critical',
      'Server-Performance optimieren: Caching aktivieren, CDN einsetzen, Hosting upgraden, Datenbankabfragen optimieren.',
      `${crawl.pageInfo.responseTimeMs}ms`, '<500ms'));
  } else if (crawl.pageInfo.responseTimeMs > 1000) {
    score -= 10;
    issues.push(iss('Technik', 'Langsame Ladezeit',
      `Server-Antwortzeit: ${crawl.pageInfo.responseTimeMs}ms. Ziel: unter 500ms.`, 'warning',
      'Server-Caching pruefen, Assets komprimieren (gzip/brotli), CDN in Betracht ziehen.',
      `${crawl.pageInfo.responseTimeMs}ms`, '<500ms'));
  }

  // Robots.txt
  if (!crawl.pageInfo.hasRobotsTxt) {
    score -= 8;
    issues.push(iss('Technik', 'Keine robots.txt',
      'Keine robots.txt Datei gefunden. Die robots.txt steuert, welche Bereiche Suchmaschinen crawlen duerfen.', 'warning',
      'robots.txt im Root erstellen: "User-agent: *\\nAllow: /\\nSitemap: https://domain.com/sitemap.xml".',
      'Fehlt', 'Vorhanden'));
  }

  // Meta Robots noindex
  const robotsMeta = crawl.meta.robots.toLowerCase();
  if (robotsMeta.includes('noindex')) {
    score -= 40;
    issues.push(iss('Technik', 'Seite mit noindex blockiert',
      'Die Seite ist mit meta robots "noindex" markiert und wird von Google NICHT indexiert!', 'critical',
      'Das noindex-Tag entfernen, wenn die Seite in den Suchergebnissen erscheinen soll.',
      robotsMeta, 'index, follow'));
  }
  if (robotsMeta.includes('nofollow') && !robotsMeta.includes('noindex')) {
    score -= 10;
    issues.push(iss('Technik', 'Seite mit nofollow markiert',
      'Meta robots "nofollow" blockiert das Verfolgen aller Links auf dieser Seite.', 'warning',
      'Nofollow von meta robots entfernen, damit Suchmaschinen den Links folgen koennen.',
      robotsMeta, 'index, follow'));
  }

  // Sitemap
  if (!crawl.pageInfo.hasSitemap) {
    score -= 8;
    issues.push(iss('Technik', 'Keine XML-Sitemap',
      'Keine sitemap.xml gefunden. Eine Sitemap hilft Suchmaschinen alle Seiten effizient zu finden und zu indexieren.', 'warning',
      'XML-Sitemap unter /sitemap.xml erstellen und in der robots.txt referenzieren.',
      'Fehlt', 'Vorhanden'));
  }

  // Viewport (Mobile-First)
  if (!crawl.meta.viewport) {
    score -= 15;
    issues.push(iss('Technik', 'Kein Viewport-Meta-Tag',
      'Kein Viewport-Tag vorhanden. Seit Googles Mobile-First-Index ist dies absolut kritisch fuer Rankings.', 'critical',
      'Im <head> hinzufuegen: <meta name="viewport" content="width=device-width, initial-scale=1">.',
      'Fehlt', 'viewport vorhanden'));
  }

  // Canonical
  if (!crawl.meta.canonical) {
    score -= 5;
    issues.push(iss('Technik', 'Kein Canonical-Tag',
      'Kein Canonical-Link vorhanden. Der Canonical-Tag verhindert Duplicate-Content-Probleme bei mehreren URL-Varianten.', 'info',
      'Einen self-referencing Canonical-Tag hinzufuegen: <link rel="canonical" href="[aktuelle URL]">.',
      'Fehlt', 'Self-referencing Canonical'));
  }

  // Sprache
  if (!crawl.pageInfo.language) {
    score -= 8;
    issues.push(iss('Technik', 'Kein lang-Attribut',
      'Das HTML-Element hat kein lang-Attribut. Dies hilft Suchmaschinen und Screenreadern die Sprache korrekt zu erkennen.', 'warning',
      'Dem <html>-Tag ein lang-Attribut hinzufuegen: <html lang="de"> oder <html lang="en">.',
      'Fehlt', 'z.B. lang="de"'));
  }

  // Seitengroesse
  const pageSizeKB = Math.round(crawl.pageInfo.contentLength / 1024);
  if (pageSizeKB > 3000) {
    score -= 10;
    issues.push(iss('Technik', 'HTML-Seite sehr gross',
      `Die Seite ist ${pageSizeKB} KB gross. Grosse HTML-Dateien laden langsamer und belasten mobile Verbindungen.`, 'warning',
      'HTML verschlanken: Inline-CSS/JS externalisieren, unnoetige Kommentare entfernen, Komprimierung aktivieren.',
      `${pageSizeKB} KB`, '<500 KB'));
  }

  return res('Technik', score, issues, '');
}

// ═══════════════════════════════════════════════════════════════
// 7. CONTENT
// ═══════════════════════════════════════════════════════════════

export function checkContent(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const wc = crawl.pageInfo.wordCount;

  if (wc < 100) {
    score -= 40;
    issues.push(iss('Content', 'Extrem wenig Content',
      `Nur ${wc} Woerter. Suchmaschinen koennen den Seiteninhalt kaum bewerten. Thin Content kann zu schlechteren Rankings fuehren.`, 'critical',
      'Mindestens 300 Woerter qualitativ hochwertigen, einzigartigen Content erstellen der die Suchintention des Nutzers erfuellt.',
      `${wc} Woerter`, '300+ Woerter'));
  } else if (wc < 300) {
    score -= 25;
    issues.push(iss('Content', 'Wenig Content',
      `Nur ${wc} Woerter. Fuer gute Rankings sind in der Regel mehr als 300 Woerter noetig.`, 'warning',
      'Content ausbauen: Fragen der Zielgruppe beantworten, verwandte Themen abdecken, Mehrwert gegenueber Wettbewerbern schaffen.',
      `${wc} Woerter`, '300+ Woerter'));
  } else if (wc < 600) {
    score -= 10;
    issues.push(iss('Content', 'Maessiger Content-Umfang',
      `${wc} Woerter. Fuer kompetitive Keywords empfehlen sich 600+ Woerter.`, 'info',
      'Content-Umfang erhoehen wenn sinnvoll. Qualitaet geht vor Quantitaet — lieber 500 gute Woerter als 1000 minderwertige.',
      `${wc} Woerter`, '600+ Woerter'));
  }

  // Text-zu-HTML-Ratio
  if (crawl.rawHtml.length > 0 && crawl.textContent.length > 0) {
    const ratio = Math.round((crawl.textContent.length / crawl.rawHtml.length) * 100);
    if (ratio < 10 && crawl.rawHtml.length > 1000) {
      score -= 10;
      issues.push(iss('Content', 'Niedriges Text-zu-HTML-Verhaeltnis',
        `Nur ${ratio}% des HTML ist sichtbarer Text. Ein hoher Code-Anteil deutet auf aufgeblaehten Code hin.`, 'info',
        'HTML-Code verschlanken: unnoetige Wrapper entfernen, CSS/JS externalisieren, Inline-Styles reduzieren.',
        `${ratio}%`, '25%+'));
    }
  }

  // Strukturierte Daten
  if (crawl.structuredData.length === 0) {
    score -= 15;
    issues.push(iss('Content', 'Keine strukturierten Daten (Schema.org)',
      'Keine JSON-LD oder Schema.org Daten gefunden. Strukturierte Daten ermoeglichen Rich Snippets in den Suchergebnissen (Sterne, FAQ, Breadcrumbs, Preise etc.).', 'warning',
      'JSON-LD Markup im <head> hinzufuegen. Je nach Seitentyp: Organization, LocalBusiness, Article, Product, FAQ, BreadcrumbList oder HowTo.',
      '0 Schema-Typen', 'Min. 1 Schema-Typ'));
  } else {
    const types = crawl.structuredData.map((s) => s.type).join(', ');
    issues.push(iss('Content', 'Strukturierte Daten vorhanden',
      `${crawl.structuredData.length} Schema.org Typ(en) gefunden: ${types}. Dies kann Rich Snippets in den Suchergebnissen ermoeglichen.`, 'good',
      'Daten regelmaessig mit dem Google Rich Results Test (search.google.com/test/rich-results) pruefen.',
      types, ''));
  }

  return res('Content', score, issues, `${wc} Woerter`);
}

// ═══════════════════════════════════════════════════════════════
// 8. SOCIAL MEDIA (Open Graph + Twitter Cards)
// ═══════════════════════════════════════════════════════════════

export function checkSocialMedia(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const { ogTitle, ogDescription, ogImage, ogType, twitterCard } = crawl.meta;

  if (!ogTitle) {
    score -= 20;
    issues.push(iss('Social Media', 'Kein og:title',
      'Kein Open Graph Title. Beim Teilen auf Facebook, LinkedIn, WhatsApp etc. wird ein generischer oder fehlender Titel angezeigt.', 'warning',
      '<meta property="og:title" content="Seitentitel hier"> im <head> hinzufuegen.',
      'Fehlt', 'Vorhanden'));
  }
  if (!ogDescription) {
    score -= 15;
    issues.push(iss('Social Media', 'Kein og:description',
      'Keine OG-Description. Geteilte Links zeigen keine Beschreibung in der Vorschau an.', 'warning',
      '<meta property="og:description" content="Beschreibung hier"> hinzufuegen.',
      'Fehlt', 'Vorhanden'));
  }
  if (!ogImage) {
    score -= 20;
    issues.push(iss('Social Media', 'Kein og:image',
      'Kein OG-Bild definiert. Links ohne Vorschaubild erhalten auf Social Media bis zu 80% weniger Klicks.', 'warning',
      '<meta property="og:image" content="https://..."> mit einem Bild in mind. 1200x630px hinzufuegen.',
      'Fehlt', '1200x630px Bild'));
  }
  if (!ogType) {
    score -= 5;
    issues.push(iss('Social Media', 'Kein og:type',
      'Kein Open Graph Type definiert. Facebook und andere Plattformen wissen nicht, was fuer ein Inhalt geteilt wird.', 'info',
      '<meta property="og:type" content="website"> hinzufuegen (oder "article", "product" etc.).',
      'Fehlt', 'z.B. website'));
  }
  if (!twitterCard) {
    score -= 10;
    issues.push(iss('Social Media', 'Keine Twitter Card',
      'Keine Twitter/X Card Tags. Links auf X/Twitter werden ohne Rich Preview angezeigt.', 'info',
      '<meta name="twitter:card" content="summary_large_image"> hinzufuegen fuer grosse Bildvorschau.',
      'Fehlt', 'summary_large_image'));
  }

  return res('Social Media', score, issues, '');
}

// ═══════════════════════════════════════════════════════════════
// 9. URL-ANALYSE
// ═══════════════════════════════════════════════════════════════

export function checkUrl(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  let pathname = '';
  try {
    const parsed = new URL(crawl.pageInfo.finalUrl || crawl.pageInfo.url);
    pathname = parsed.pathname;

    if (parsed.search.length > 0) {
      score -= 10;
      issues.push(iss('URL', 'URL enthaelt Parameter',
        `Query-Parameter gefunden: ${parsed.search.slice(0, 50)}. Parameter-URLs koennen Duplicate Content verursachen.`, 'info',
        'Wenn moeglich sprechende URLs ohne Parameter verwenden. Falls noetig, Canonical-Tag auf die parameterlose Version setzen.',
        parsed.search.slice(0, 40), 'Keine Parameter'));
    }
  } catch {
    return res('URL', score, issues, '');
  }

  const fullUrl = crawl.pageInfo.finalUrl || crawl.pageInfo.url;
  if (fullUrl.length > 100) {
    score -= 10;
    issues.push(iss('URL', 'URL zu lang',
      `Die URL hat ${fullUrl.length} Zeichen. Kurze, sprechende URLs performen besser und sind nutzerfreundlicher.`, 'info',
      'URL auf maximal 75 Zeichen kuerzen. Unnoetige Verzeichnisebenen und Fuellwoerter entfernen.',
      `${fullUrl.length} Zeichen`, 'Max. 75 Zeichen'));
  }

  if (pathname !== pathname.toLowerCase()) {
    score -= 10;
    issues.push(iss('URL', 'Grossbuchstaben in URL',
      'Die URL enthaelt Grossbuchstaben. URLs sind case-sensitive — Varianten koennen als Duplicate Content gewertet werden.', 'warning',
      'Alle URLs in Kleinbuchstaben halten. 301-Weiterleitung von der Grossbuchstaben-Version einrichten.',
      pathname.slice(0, 40), 'Nur Kleinbuchstaben'));
  }

  if (pathname.includes('_')) {
    score -= 5;
    issues.push(iss('URL', 'Unterstriche in URL',
      'Die URL verwendet Unterstriche (_). Google behandelt Bindestriche (-) als Wort-Trenner, Unterstriche hingegen nicht.', 'info',
      'Unterstriche durch Bindestriche (-) ersetzen und 301-Weiterleitungen von den alten URLs einrichten.',
      'Unterstriche', 'Bindestriche (-)'));
  }

  if (/[%&=+]/.test(pathname)) {
    score -= 5;
    issues.push(iss('URL', 'Sonderzeichen in URL-Pfad',
      'Der URL-Pfad enthaelt kodierte Sonderzeichen. Diese machen URLs schwer lesbar und teilbar.', 'info',
      'Sprechende URLs ohne Sonderzeichen verwenden. Umlaute durch ae/oe/ue ersetzen.',
      'Sonderzeichen', 'Nur a-z, 0-9, -'));
  }

  return res('URL', score, issues, pathname.slice(0, 50));
}

// ═══════════════════════════════════════════════════════════════
// RUNNER - Alle Checks ausfuehren
// ═══════════════════════════════════════════════════════════════

export function runAllChecks(crawl: CrawlData): { scores: SEOScore[]; issues: SEOIssue[] } {
  const checks = [
    checkTitle,
    checkMetaDescription,
    checkHeadings,
    checkImages,
    checkLinks,
    checkTechnical,
    checkContent,
    checkSocialMedia,
    checkUrl,
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
