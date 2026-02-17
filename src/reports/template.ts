/**
 * HTML Report Template using Handlebars syntax.
 */
export const REPORT_TEMPLATE = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Report - {{url}}</title>
  <style>
    :root {
      --bg: #0f0f23;
      --surface: #1a1a2e;
      --surface-2: #16213e;
      --border: #2a2a4a;
      --text: #e0e0ff;
      --text-dim: #8888aa;
      --accent: #00d2ff;
      --accent-2: #7b2ff7;
      --green: #00e676;
      --yellow: #ffd740;
      --orange: #ff9100;
      --red: #ff5252;
      --gradient: linear-gradient(135deg, #00d2ff, #3a7bd5, #7b2ff7);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }

    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }

    /* Header */
    .header {
      text-align: center;
      padding: 3rem 2rem;
      background: var(--gradient);
      border-radius: 16px;
      margin-bottom: 2rem;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1), transparent 50%);
    }
    .header h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      position: relative;
    }
    .header .url {
      font-size: 1.1rem;
      opacity: 0.9;
      word-break: break-all;
      position: relative;
    }
    .header .timestamp {
      font-size: 0.85rem;
      opacity: 0.7;
      margin-top: 0.5rem;
      position: relative;
    }

    /* Score Circle */
    .score-section {
      display: flex;
      justify-content: center;
      margin: -3rem 0 2rem;
      position: relative;
      z-index: 10;
    }
    .score-circle {
      width: 160px;
      height: 160px;
      border-radius: 50%;
      background: var(--surface);
      border: 4px solid;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .score-circle.good { border-color: var(--green); }
    .score-circle.ok { border-color: var(--yellow); }
    .score-circle.bad { border-color: var(--red); }
    .score-number {
      font-size: 3rem;
      font-weight: 800;
      line-height: 1;
    }
    .score-circle.good .score-number { color: var(--green); }
    .score-circle.ok .score-number { color: var(--yellow); }
    .score-circle.bad .score-number { color: var(--red); }
    .score-label { color: var(--text-dim); font-size: 0.85rem; }

    /* Cards */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .card h2 {
      font-size: 1.3rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid;
      border-image: var(--gradient) 1;
    }
    .card h3 {
      font-size: 1.1rem;
      color: var(--accent);
      margin: 1rem 0 0.5rem;
    }

    /* Executive Summary */
    .summary-text {
      font-size: 1.05rem;
      line-height: 1.8;
      color: var(--text);
      white-space: pre-wrap;
    }

    /* Score Bars */
    .score-bar-container {
      display: flex;
      align-items: center;
      margin: 0.6rem 0;
    }
    .score-bar-label {
      width: 160px;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .score-bar-track {
      flex: 1;
      height: 24px;
      background: var(--surface-2);
      border-radius: 12px;
      overflow: hidden;
      margin: 0 1rem;
    }
    .score-bar-fill {
      height: 100%;
      border-radius: 12px;
      transition: width 1s ease;
    }
    .score-bar-fill.good { background: linear-gradient(90deg, #00e676, #69f0ae); }
    .score-bar-fill.ok { background: linear-gradient(90deg, #ffd740, #ffab40); }
    .score-bar-fill.bad { background: linear-gradient(90deg, #ff5252, #ff8a80); }
    .score-bar-value {
      width: 50px;
      text-align: right;
      font-weight: 700;
    }

    /* Issues Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th {
      background: var(--surface-2);
      padding: 0.75rem;
      text-align: left;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
    }
    td {
      padding: 0.75rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
    }
    tr:hover { background: rgba(255,255,255,0.02); }

    /* Severity Badges */
    .badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-critical { background: var(--red); color: white; }
    .badge-warning { background: var(--orange); color: white; }
    .badge-info { background: var(--accent); color: var(--bg); }
    .badge-good { background: var(--green); color: var(--bg); }

    /* Grid */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 768px) {
      .grid-2 { grid-template-columns: 1fr; }
    }

    /* Page Info */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .info-item {
      background: var(--surface-2);
      padding: 1rem;
      border-radius: 8px;
    }
    .info-item .label { color: var(--text-dim); font-size: 0.8rem; }
    .info-item .value { font-size: 1.1rem; font-weight: 600; margin-top: 0.3rem; }
    .info-item .value.ok { color: var(--green); }
    .info-item .value.warn { color: var(--yellow); }
    .info-item .value.bad { color: var(--red); }

    /* LLM Box */
    .llm-box {
      background: var(--surface-2);
      border-left: 4px solid var(--accent);
      border-radius: 0 8px 8px 0;
      padding: 1.25rem;
      margin: 1rem 0;
      white-space: pre-wrap;
      line-height: 1.8;
      font-size: 0.95rem;
    }
    .llm-box .llm-label {
      color: var(--accent);
      font-weight: 700;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    /* Keyword chips */
    .keyword-chip {
      display: inline-block;
      padding: 0.3rem 0.8rem;
      margin: 0.2rem;
      border-radius: 20px;
      font-size: 0.85rem;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }
    .keyword-chip.primary {
      border-color: var(--accent);
      color: var(--accent);
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-dim);
      font-size: 0.85rem;
    }

    /* Check/Cross */
    .check { color: var(--green); }
    .cross { color: var(--red); }

    /* PDF Download Button */
    .pdf-btn {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 1000;
      padding: 0.75rem 1.5rem;
      background: var(--gradient);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0,210,255,0.3);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .pdf-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(0,210,255,0.4);
    }
    .pdf-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .pdf-btn svg {
      width: 18px;
      height: 18px;
    }

    /* PDF page-break rules */
    .card {
      page-break-inside: avoid;
    }
    .card:has(table tr:nth-child(n+8)) {
      page-break-inside: auto;
    }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    .score-section { page-break-inside: avoid; }
    .info-grid { page-break-inside: avoid; }
    .score-bar-container { page-break-inside: avoid; }

    @media print {
      .pdf-btn { display: none !important; }
      body { background: white; color: #1a1a2e; }
    }
  </style>
</head>
<body>
  <!-- PDF Download Button -->
  <button class="pdf-btn" onclick="downloadPDF()">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    PDF Download
  </button>

  <div class="container" id="report-content">

    <!-- Header -->
    <div class="header">
      <h1>SEO Analyse Report</h1>
      <div class="url">{{url}}</div>
      <div class="timestamp">Erstellt am {{formattedDate}}</div>
    </div>

    <!-- Overall Score -->
    {{#if seoAnalysis}}
    <div class="score-section">
      <div class="score-circle {{scoreClass}}">
        <div class="score-number">{{seoAnalysis.overallScore}}</div>
        <div class="score-label">von 100</div>
      </div>
    </div>
    {{/if}}

    <!-- Executive Summary -->
    {{#if executiveSummary}}
    <div class="card">
      <h2>Executive Summary</h2>
      <div class="summary-text">{{executiveSummary}}</div>
    </div>
    {{/if}}

    <!-- Page Info -->
    {{#if crawlData}}
    <div class="card">
      <h2>Seiten-Informationen</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">Status Code</div>
          <div class="value {{#if (eq crawlData.pageInfo.statusCode 200)}}ok{{else}}bad{{/if}}">{{crawlData.pageInfo.statusCode}}</div>
        </div>
        <div class="info-item">
          <div class="label">Ladezeit</div>
          <div class="value {{#if (lte crawlData.pageInfo.responseTimeMs 1000)}}ok{{else}}{{#if (lte crawlData.pageInfo.responseTimeMs 3000)}}warn{{else}}bad{{/if}}{{/if}}">{{crawlData.pageInfo.responseTimeMs}}ms</div>
        </div>
        <div class="info-item">
          <div class="label">Woerter</div>
          <div class="value {{#if (gte crawlData.pageInfo.wordCount 300)}}ok{{else}}bad{{/if}}">{{crawlData.pageInfo.wordCount}}</div>
        </div>
        <div class="info-item">
          <div class="label">HTTPS</div>
          <div class="value {{#if crawlData.pageInfo.hasHttps}}ok{{else}}bad{{/if}}">{{#if crawlData.pageInfo.hasHttps}}Ja{{else}}Nein{{/if}}</div>
        </div>
        <div class="info-item">
          <div class="label">Sprache</div>
          <div class="value">{{crawlData.pageInfo.language}}</div>
        </div>
        <div class="info-item">
          <div class="label">Robots.txt</div>
          <div class="value {{#if crawlData.pageInfo.hasRobotsTxt}}ok{{else}}warn{{/if}}">{{#if crawlData.pageInfo.hasRobotsTxt}}Vorhanden{{else}}Fehlt{{/if}}</div>
        </div>
        <div class="info-item">
          <div class="label">Sitemap</div>
          <div class="value {{#if crawlData.pageInfo.hasSitemap}}ok{{else}}warn{{/if}}">{{#if crawlData.pageInfo.hasSitemap}}Vorhanden{{else}}Fehlt{{/if}}</div>
        </div>
        <div class="info-item">
          <div class="label">Strukt. Daten</div>
          <div class="value {{#if crawlData.structuredDataCount}}ok{{else}}warn{{/if}}">{{crawlData.structuredDataCount}} gefunden</div>
        </div>
      </div>

      <h3>Meta Tags</h3>
      <table>
        <tr><th>Tag</th><th>Inhalt</th><th>Laenge</th></tr>
        <tr>
          <td><strong>Title</strong></td>
          <td>{{crawlData.meta.title}}</td>
          <td>{{crawlData.meta.titleLength}} Zeichen</td>
        </tr>
        <tr>
          <td><strong>Description</strong></td>
          <td>{{crawlData.meta.description}}</td>
          <td>{{crawlData.meta.descriptionLength}} Zeichen</td>
        </tr>
        <tr>
          <td><strong>Canonical</strong></td>
          <td>{{crawlData.meta.canonical}}</td>
          <td>-</td>
        </tr>
        <tr>
          <td><strong>Viewport</strong></td>
          <td>{{crawlData.meta.viewport}}</td>
          <td>-</td>
        </tr>
      </table>

      <div class="grid-2">
        <div>
          <h3>Headings ({{headingCount}})</h3>
          <table>
            <tr><th>Tag</th><th>Text</th></tr>
            {{#each crawlData.headings}}
            <tr>
              <td><strong>{{this.tag}}</strong></td>
              <td>{{this.text}}</td>
            </tr>
            {{/each}}
          </table>
        </div>
        <div>
          <h3>Links</h3>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Intern</div>
              <div class="value">{{internalLinkCount}}</div>
            </div>
            <div class="info-item">
              <div class="label">Extern</div>
              <div class="value">{{externalLinkCount}}</div>
            </div>
            <div class="info-item">
              <div class="label">Bilder</div>
              <div class="value">{{imageCount}}</div>
            </div>
            <div class="info-item">
              <div class="label">Bilder mit Alt</div>
              <div class="value">{{imagesWithAlt}}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    {{/if}}

    <!-- SEO Scores -->
    {{#if seoAnalysis}}
    <div class="card">
      <h2>SEO Bewertungen</h2>
      {{#each seoAnalysis.scores}}
      <div class="score-bar-container">
        <div class="score-bar-label">{{this.category}}</div>
        <div class="score-bar-track">
          <div class="score-bar-fill {{this.scoreClass}}" style="width: {{this.score}}%"></div>
        </div>
        <div class="score-bar-value">{{this.score}}%</div>
      </div>
      {{/each}}
    </div>

    <!-- Issues -->
    <div class="card">
      <h2>Gefundene Probleme ({{seoAnalysis.issues.length}})</h2>
      {{#if seoAnalysis.issues.length}}
      <table>
        <tr>
          <th>Severity</th>
          <th>Kategorie</th>
          <th>Problem</th>
          <th>Ist-Wert</th>
          <th>Soll-Wert</th>
          <th>Empfehlung</th>
        </tr>
        {{#each seoAnalysis.issues}}
        <tr>
          <td><span class="badge badge-{{this.severity}}">{{this.severity}}</span></td>
          <td>{{this.category}}</td>
          <td><strong>{{this.title}}</strong><br><small>{{this.description}}</small></td>
          <td>{{this.currentValue}}</td>
          <td>{{this.idealValue}}</td>
          <td><small>{{this.recommendation}}</small></td>
        </tr>
        {{/each}}
      </table>
      {{else}}
      <p style="color: var(--green);">Keine Probleme gefunden!</p>
      {{/if}}
    </div>

    <!-- LLM Recommendations -->
    {{#if seoAnalysis.llmRecommendations}}
    <div class="card">
      <h2>AI Empfehlungen</h2>
      <div class="llm-box">
        <div class="llm-label">AI-generierte Analyse</div>
        {{seoAnalysis.llmRecommendations}}
      </div>
    </div>
    {{/if}}
    {{/if}}

    <!-- Competitor Analysis -->
    {{#if competitorData}}
    <div class="card">
      <h2>Konkurrenz-Analyse</h2>
      <p>{{competitorData.marketSummary}}</p>

      {{#if competitorData.competitors.length}}
      <table>
        <tr>
          <th>#</th>
          <th>Domain</th>
          <th>Title</th>
          <th>Keyword-Overlap</th>
        </tr>
        {{#each competitorData.competitors}}
        <tr>
          <td>{{this.rank}}</td>
          <td><strong>{{this.domain}}</strong></td>
          <td>{{this.title}}</td>
          <td>
            {{#each this.keywordOverlap}}
            <span class="keyword-chip">{{this}}</span>
            {{/each}}
          </td>
        </tr>
        {{/each}}
      </table>
      {{/if}}

      <!-- SEO Comparison Table -->
      {{#if competitorData.crawledCompetitors.length}}
      <h3>SEO-Vergleich mit Top-Konkurrenten</h3>
      <table>
        <tr>
          <th>Metrik</th>
          <th style="color: var(--accent);">Ziel-Seite</th>
          {{#each competitorData.crawledCompetitors}}
          <th>{{this.domain}}</th>
          {{/each}}
        </tr>
        <tr>
          <td><strong>Woerter</strong></td>
          <td style="color: var(--accent);">{{targetSEO.wordCount}}</td>
          {{#each competitorData.crawledCompetitors}}
          <td>{{this.seo.wordCount}}</td>
          {{/each}}
        </tr>
        <tr>
          <td><strong>Title (Zeichen)</strong></td>
          <td style="color: var(--accent);">{{targetSEO.titleLength}}</td>
          {{#each competitorData.crawledCompetitors}}
          <td>{{this.seo.titleLength}}</td>
          {{/each}}
        </tr>
        <tr>
          <td><strong>Description (Zeichen)</strong></td>
          <td style="color: var(--accent);">{{targetSEO.descriptionLength}}</td>
          {{#each competitorData.crawledCompetitors}}
          <td>{{this.seo.descriptionLength}}</td>
          {{/each}}
        </tr>
        <tr>
          <td><strong>Ladezeit (ms)</strong></td>
          <td style="color: var(--accent);">{{targetSEO.responseTimeMs}}</td>
          {{#each competitorData.crawledCompetitors}}
          <td>{{this.seo.responseTimeMs}}</td>
          {{/each}}
        </tr>
        <tr>
          <td><strong>Bilder</strong></td>
          <td style="color: var(--accent);">{{targetSEO.imageCount}}</td>
          {{#each competitorData.crawledCompetitors}}
          <td>{{this.seo.imageCount}}</td>
          {{/each}}
        </tr>
        <tr>
          <td><strong>Interne Links</strong></td>
          <td style="color: var(--accent);">{{targetSEO.internalLinks}}</td>
          {{#each competitorData.crawledCompetitors}}
          <td>{{this.seo.internalLinks}}</td>
          {{/each}}
        </tr>
        <tr>
          <td><strong>Schema.org</strong></td>
          <td>{{#if targetSEO.hasStructuredData}}<span class="check">✓</span>{{else}}<span class="cross">✗</span>{{/if}}</td>
          {{#each competitorData.crawledCompetitors}}
          <td>{{#if this.seo.hasStructuredData}}<span class="check">✓</span>{{else}}<span class="cross">✗</span>{{/if}}</td>
          {{/each}}
        </tr>
        <tr>
          <td><strong>Open Graph</strong></td>
          <td>{{#if targetSEO.hasOgTags}}<span class="check">✓</span>{{else}}<span class="cross">✗</span>{{/if}}</td>
          {{#each competitorData.crawledCompetitors}}
          <td>{{#if this.seo.hasOgTags}}<span class="check">✓</span>{{else}}<span class="cross">✗</span>{{/if}}</td>
          {{/each}}
        </tr>
        <tr>
          <td><strong>Twitter Card</strong></td>
          <td>{{#if targetSEO.hasTwitterCard}}<span class="check">✓</span>{{else}}<span class="cross">✗</span>{{/if}}</td>
          {{#each competitorData.crawledCompetitors}}
          <td>{{#if this.seo.hasTwitterCard}}<span class="check">✓</span>{{else}}<span class="cross">✗</span>{{/if}}</td>
          {{/each}}
        </tr>
      </table>

      <!-- Strengths & Weaknesses per Competitor -->
      {{#each competitorData.crawledCompetitors}}
      {{#if this.hasDetails}}
      <div style="margin-top: 1rem;">
        <h3 style="font-size: 1rem;">{{this.domain}}</h3>
        {{#each this.strengths}}
        <div style="color: var(--red); padding: 0.2rem 0;">↑ {{this}}</div>
        {{/each}}
        {{#each this.weaknesses}}
        <div style="color: var(--green); padding: 0.2rem 0;">↓ {{this}}</div>
        {{/each}}
      </div>
      {{/if}}
      {{/each}}
      {{/if}}

      <!-- Competitive Advantages & Gaps -->
      {{#if competitorData.competitiveAdvantages.length}}
      <h3 style="color: var(--green);">Ihre Vorteile</h3>
      <ul style="list-style: none; padding: 0;">
        {{#each competitorData.competitiveAdvantages}}
        <li style="padding: 0.3rem 0;"><span class="check">+</span> {{this}}</li>
        {{/each}}
      </ul>
      {{/if}}

      {{#if competitorData.competitiveGaps.length}}
      <h3 style="color: var(--red);">Ihre Luecken</h3>
      <ul style="list-style: none; padding: 0;">
        {{#each competitorData.competitiveGaps}}
        <li style="padding: 0.3rem 0;"><span class="cross">-</span> {{this}}</li>
        {{/each}}
      </ul>
      {{/if}}

      {{#if competitorData.llmAnalysis}}
      <div class="llm-box">
        <div class="llm-label">AI Wettbewerbsanalyse</div>
        {{competitorData.llmAnalysis}}
      </div>
      {{/if}}
    </div>
    {{/if}}

    <!-- Keyword Analysis -->
    {{#if keywordData}}
    <div class="card">
      <h2>Keyword-Analyse</h2>

      {{#if keywordData.primaryKeywords.length}}
      <h3>Primaere Keywords</h3>
      <table>
        <tr>
          <th>Keyword</th>
          <th>Anzahl</th>
          <th>Dichte</th>
          <th>Title</th>
          <th>H1</th>
          <th>Description</th>
          <th>URL</th>
          <th>Score</th>
        </tr>
        {{#each keywordData.primaryKeywords}}
        <tr>
          <td><strong>{{this.keyword}}</strong></td>
          <td>{{this.count}}</td>
          <td>{{this.density}}%</td>
          <td class="{{#if this.inTitle}}check{{else}}cross{{/if}}">{{#if this.inTitle}}✓{{else}}✗{{/if}}</td>
          <td class="{{#if this.inH1}}check{{else}}cross{{/if}}">{{#if this.inH1}}✓{{else}}✗{{/if}}</td>
          <td class="{{#if this.inDescription}}check{{else}}cross{{/if}}">{{#if this.inDescription}}✓{{else}}✗{{/if}}</td>
          <td class="{{#if this.inUrl}}check{{else}}cross{{/if}}">{{#if this.inUrl}}✓{{else}}✗{{/if}}</td>
          <td>{{this.prominenceScore}}</td>
        </tr>
        {{/each}}
      </table>
      {{/if}}

      {{#if keywordData.secondaryKeywords.length}}
      <h3>Sekundaere Keywords</h3>
      <div>
        {{#each keywordData.secondaryKeywords}}
        <span class="keyword-chip">{{this.keyword}} ({{this.count}}x)</span>
        {{/each}}
      </div>
      {{/if}}

      {{#if keywordData.llmAnalysis}}
      <div class="llm-box">
        <div class="llm-label">AI Keyword-Empfehlungen</div>
        {{keywordData.llmAnalysis}}
      </div>
      {{/if}}
    </div>
    {{/if}}

    <!-- Structured Data -->
    {{#if crawlData.structuredData.length}}
    <div class="card">
      <h2>Strukturierte Daten (Schema.org)</h2>
      {{#each crawlData.structuredData}}
      <div class="info-item" style="margin-bottom: 1rem;">
        <div class="label">Typ</div>
        <div class="value ok">{{this.type}}</div>
        <pre style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-dim); overflow-x: auto;">{{this.rawJson}}</pre>
      </div>
      {{/each}}
    </div>
    {{/if}}

    <!-- Footer -->
    <div class="footer">
      <p>Generiert von <strong>AI SEO Agent</strong> | LangGraph Orchestrated | {{formattedDate}}</p>
    </div>

  </div>
</body>
</html>`;
