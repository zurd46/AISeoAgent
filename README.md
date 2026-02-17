<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white" alt="LangGraph" />
  <img src="https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white" alt="Ollama" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License" />
</p>

<h1 align="center">AI SEO Agent</h1>

<p align="center">
  <strong>KI-gesteuertes SEO-Analyse-System mit parallelen Agenten und LangGraph-Orchestrierung</strong>
</p>

<p align="center">
  Open-Source CLI-Tool das Webseiten vollautomatisch auf SEO analysiert, Konkurrenten findet, Keywords bewertet und einen detaillierten HTML-Report generiert — alles lokal und kostenlos mit Ollama.
</p>

---

## Highlights

- **5 spezialisierte AI-Agenten** arbeiten parallel an der Analyse
- **LangGraph Orchestrator** steuert den Workflow mit Fan-Out/Fan-In Pattern
- **Animierte CLI** mit ASCII-Art Banner, Gradient-Farben, Spinner und Score-Balken
- **Komplett kostenlos** — Ollama (lokal) + DuckDuckGo (kein API-Key noetig)
- **7 SEO-Check-Kategorien** mit 30+ individuellen Pruefungen
- **HTML Dark-Theme Report** mit Score-Circle, Severity-Badges und AI-Empfehlungen
- **Strukturierte Daten** durchgaengig mit Zod Schemas + TypeScript Types
- **Graceful Degradation** — funktioniert auch ohne LLM (regelbasiert)

---

## Architektur

```
                         ┌─────────┐
                         │  START  │
                         └────┬────┘
                              │
                       ┌──────▼──────┐
                       │   CRAWLER   │   Webseite fetchen + parsen
                       │   Agent     │   (Cheerio HTML Parser)
                       └──────┬──────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
       ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
       │  ANALYZER   │ │ COMPETITOR │ │  KEYWORD    │   Parallel
       │  Agent      │ │ Agent      │ │  Agent      │   Execution
       │  (SEO-Checks│ │ (DuckDuck- │ │  (Density,  │
       │  + LLM)     │ │  Go Search)│ │  Rankings)  │
       └──────┬──────┘ └─────┬──────┘ └──────┬──────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                       ┌──────▼──────┐
                       │  REPORTER   │   HTML Report generieren
                       │  Agent      │   (Handlebars Template)
                       └──────┬──────┘
                              │
                         ┌────▼────┐
                         │   END   │
                         └─────────┘
```

### Projekt-Struktur

```
AISeoAgent/
├── package.json                 # Dependencies + Scripts
├── tsconfig.json                # TypeScript ESM Config
├── .env                         # LLM + HTTP Konfiguration
│
├── src/
│   ├── index.ts                 # CLI Entry Point (Commander)
│   ├── config.ts                # Konfiguration + LLM Factory
│   ├── types.ts                 # Zod Schemas + TypeScript Types
│   │
│   ├── cli/                     # Animierte CLI
│   │   ├── banner.ts            #   ASCII-Art + Gradient
│   │   ├── ui.ts                #   Spinner, Tabellen, Score-Bars
│   │   └── app.ts               #   CLI-Workflow + Steuerung
│   │
│   ├── agents/                  # LangGraph Agent Nodes
│   │   ├── crawler.ts           #   Website Crawler
│   │   ├── analyzer.ts          #   SEO Analyse + LLM
│   │   ├── competitor.ts        #   Konkurrenz-Suche
│   │   ├── keyword.ts           #   Keyword-Analyse
│   │   └── reporter.ts          #   Report-Generator
│   │
│   ├── graph/                   # LangGraph Orchestrator
│   │   ├── state.ts             #   State Definition (Annotation)
│   │   └── workflow.ts          #   Workflow (parallele Edges)
│   │
│   ├── tools/                   # Analyse-Werkzeuge
│   │   ├── scraper.ts           #   Cheerio Web Scraper
│   │   ├── seoChecks.ts         #   7 SEO-Check-Funktionen
│   │   └── search.ts            #   DuckDuckGo Search
│   │
│   └── reports/                 # Report-Generierung
│       ├── generator.ts         #   Handlebars Renderer
│       └── template.ts          #   Dark-Theme HTML Template
│
└── reports/                     # Generierte HTML-Reports
```

---

## Installation

### Voraussetzungen

- **Node.js** >= 18.0
- **npm** oder **pnpm**
- **Ollama** (optional, fuer AI-Empfehlungen)

### Setup

```bash
# Repository klonen
git clone https://github.com/YOUR_USERNAME/ai-seo-agent.git
cd ai-seo-agent

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env
```

### Ollama einrichten (optional, kostenlos)

```bash
# Ollama installieren (macOS)
brew install ollama

# Ollama starten
ollama serve

# Modell herunterladen
ollama pull llama3.1
```

> Ohne Ollama funktioniert das System vollstaendig mit regelbasierten SEO-Checks. Das LLM ergaenzt lediglich AI-generierte Empfehlungen und Zusammenfassungen.

---

## Nutzung

### Vollstaendige SEO-Analyse

```bash
npx tsx src/index.ts analyze https://example.com
```

Fuehrt den kompletten Workflow durch:

1. **Crawling** — Webseite laden, HTML parsen, Meta-Tags/Links/Bilder extrahieren
2. **Parallele Analyse** — SEO-Checks, Konkurrenz-Suche, Keyword-Analyse gleichzeitig
3. **Report** — HTML-Report generieren und im Browser oeffnen

### Schneller Crawl

```bash
npx tsx src/index.ts crawl https://example.com
```

Nur die Webseite crawlen und Basis-Informationen anzeigen (ohne Analyse).

### Hilfe

```bash
npx tsx src/index.ts --help
```

---

## SEO-Checks

Das System fuehrt **30+ individuelle Pruefungen** in 7 Kategorien durch:

| Kategorie | Pruefungen |
|---|---|
| **Title Tag** | Vorhanden, Laenge (30-60 Zeichen), Keyword-Platzierung |
| **Meta Description** | Vorhanden, Laenge (120-160 Zeichen), Unique |
| **Headings** | H1 vorhanden (genau 1x), H2-Struktur, Hierarchie-Reihenfolge |
| **Bilder** | Alt-Texte vorhanden, Lazy Loading, Dimensionen |
| **Links** | Interne Verlinkung (10+), Anker-Texte, Nofollow |
| **Technik** | HTTPS, Ladezeit (<500ms), Robots.txt, Sitemap, Viewport, Canonical |
| **Content** | Wortanzahl (300+), Schema.org/JSON-LD, Open Graph Tags |

### Severity-Stufen

- `KRITISCH` — Schwerwiegendes Problem, sofort beheben
- `WARNUNG` — Sollte behoben werden, mittlere Prioritaet
- `INFO` — Verbesserungsvorschlag, niedrige Prioritaet
- `GUT` — Kein Handlungsbedarf

---

## Agenten im Detail

### Crawler Agent

Fetcht die Ziel-URL und extrahiert saemtliche SEO-relevanten Daten:

- HTTP Status, Ladezeit, Content-Type
- Meta-Tags (Title, Description, Robots, Canonical, Viewport)
- Open Graph + Twitter Card Tags
- Heading-Struktur (H1-H6)
- Interne und externe Links mit Anker-Texten
- Bilder mit Alt-Text-Analyse
- Schema.org / JSON-LD Structured Data
- Robots.txt und Sitemap.xml Pruefung

### Analyzer Agent

Fuehrt alle 7 SEO-Check-Kategorien durch und berechnet Scores (0-100). Optional generiert ein LLM priorisierte Handlungsempfehlungen basierend auf den gefundenen Problemen.

### Competitor Agent

Sucht ueber DuckDuckGo nach Webseiten die fuer dieselben Keywords ranken. Identifiziert Keyword-Overlap und analysiert die Wettbewerbslandschaft. LLM-gesteuerte Wettbewerbsanalyse mit Staerken, Schwaechen und Chancen.

### Keyword Agent

Extrahiert die haeufigsten Keywords aus dem Seiteninhalt. Bewertet:

- **Keyword-Dichte** (Haeufigkeit im Text)
- **Prominenz-Score** (Vorkommen in Title, H1, Description, URL)
- **DuckDuckGo-Rankings** (approximative Position)
- **Content-Gaps** (fehlende Keywords)

### Reporter Agent

Generiert einen umfassenden HTML-Report im Dark-Theme Design mit:

- Score-Circle Visualisierung
- Kategorie-Score-Balken
- Issue-Tabelle mit Severity-Badges
- Konkurrenten-Uebersicht
- Keyword-Analyse-Tabelle
- AI-generierte Empfehlungen
- Strukturierte Daten Uebersicht

---

## Konfiguration

### `.env` Datei

```env
# LLM Provider: "ollama" (kostenlos), "openai" oder "anthropic"
LLM_PROVIDER=ollama

# Ollama (Standard - kostenlos, lokal)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

# Optional: OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Optional: Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# HTTP
REQUEST_TIMEOUT=30
MAX_CONCURRENT_REQUESTS=5
```

### LLM-Provider wechseln

Das System unterstuetzt 3 LLM-Provider:

| Provider | Kosten | Setup |
|---|---|---|
| **Ollama** | Kostenlos | `ollama serve` + `ollama pull llama3.1` |
| **OpenAI** | Kostenpflichtig | API-Key in `.env` setzen |
| **Anthropic** | Kostenpflichtig | API-Key in `.env` setzen |

---

## HTML-Report

Der generierte Report beinhaltet:

- **Executive Summary** — AI-generierte Zusammenfassung der wichtigsten Erkenntnisse
- **Seiten-Informationen** — Status, Ladezeit, HTTPS, Meta-Tags, Links, Bilder
- **SEO-Bewertungen** — Score-Balken fuer jede der 7 Kategorien
- **Gefundene Probleme** — Sortiert nach Severity mit Ist/Soll-Vergleich und Empfehlungen
- **AI-Empfehlungen** — LLM-generierte priorisierte Handlungsempfehlungen
- **Konkurrenz-Analyse** — Top-Konkurrenten mit Keyword-Overlap
- **Keyword-Analyse** — Primaere/sekundaere Keywords mit Prominenz-Score
- **Strukturierte Daten** — Gefundene Schema.org/JSON-LD Eintraege

Reports werden unter `reports/` gespeichert und automatisch im Browser geoeffnet.

---

## Tech Stack

| Technologie | Verwendung |
|---|---|
| **TypeScript** | Typsichere Codebasis, ESM Module |
| **LangGraph** | Workflow-Orchestrierung mit paralleler Agent-Ausfuehrung |
| **LangChain** | LLM-Abstraktion (Ollama, OpenAI, Anthropic) |
| **Zod** | Schema-Validierung + TypeScript Type Inference |
| **Cheerio** | Schnelles HTML Parsing (serverseitig) |
| **Commander** | CLI Command Parsing |
| **Chalk** | Terminal-Farben |
| **Ora** | Terminal-Spinner/Animationen |
| **Boxen** | Terminal-Boxen |
| **Gradient-String** | Gradient-Text im Terminal |
| **Figlet** | ASCII-Art Text |
| **CLI-Table3** | Formatierte Terminal-Tabellen |
| **Handlebars** | HTML Template Engine |
| **DuckDuckGo** | Kostenlose Web-Suche (kein API-Key) |

---

## CLI-Vorschau

```
███████╗███████╗ ██████╗      █████╗  ██████╗ ███████╗███╗   ██╗████████╗
██╔════╝██╔════╝██╔═══██╗    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
███████╗█████╗  ██║   ██║    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║
╚════██║██╔══╝  ██║   ██║    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║
███████║███████╗╚██████╔╝    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║
╚══════╝╚══════╝ ╚═════╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝

  AI-Powered SEO Analysis System  |  v1.0.0
  LangGraph Orchestrator + Parallel Agent Execution

  ▸ Phase 1: Website Crawling ·····························
  ✔ Website erfolgreich gecrawlt

  ▸ Phase 2: Parallele Agent-Analyse ······················
  ✔ SEO-Analyse abgeschlossen (Score: 64/100)
  ✔ 10 Konkurrenten gefunden
  ✔ 13 Keywords analysiert

  ▸ Phase 3: Ergebnisse ···································
  ┌────────────────────┬──────────┬──────────────────────────────────┐
  │ Kategorie          │ Score    │ Balken                           │
  ├────────────────────┼──────────┼──────────────────────────────────┤
  │ Title Tag          │ 70/100   │ █████████████████████░░░░░░░░░   │
  │ Meta Description   │ 0/100    │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
  │ Headings           │ 85/100   │ ██████████████████████████░░░░   │
  │ Bilder             │ 100/100  │ ██████████████████████████████   │
  │ Technik            │ 75/100   │ ███████████████████████░░░░░░░   │
  └────────────────────┴──────────┴──────────────────────────────────┘

  ▸ Phase 4: Report-Generierung ···························
  ✔ HTML-Report generiert

  ╔═ SEO Analyse abgeschlossen ═══════════════════════════╗
  ║  Report gespeichert: reports/seo_report_example.html  ║
  ║  Dauer: 5.4s                                          ║
  ╚═══════════════════════════════════════════════════════╝
```

---

## Entwicklung

```bash
# TypeScript kompilieren
npm run build

# Development Mode (tsx)
npm run dev

# Direkt ausfuehren
npx tsx src/index.ts analyze https://example.com
```

---

## Keywords

`seo` `seo-analysis` `seo-tool` `seo-audit` `seo-checker` `website-analysis` `ai-agent` `ai-seo` `langgraph` `langchain` `ollama` `typescript` `nodejs` `cli-tool` `web-scraping` `keyword-analysis` `competitor-analysis` `seo-report` `html-report` `open-source` `free-seo-tool` `duckduckgo` `structured-data` `schema-org` `meta-tags` `on-page-seo` `technical-seo`

---

## Roadmap

- [ ] Multi-Page Crawling (gesamte Website analysieren)
- [ ] PDF-Report Export
- [ ] Lighthouse Integration (Core Web Vitals)
- [ ] Historischer Vergleich (Score-Verlauf ueber Zeit)
- [ ] Broken Link Checker
- [ ] Hreflang-Pruefung (Internationalisierung)
- [ ] Backlink-Analyse
- [ ] Content Readability Score (Flesch-Kincaid)
- [ ] API-Modus (JSON Output fuer CI/CD Integration)
- [ ] Docker Container

---

## Lizenz

MIT License — siehe [LICENSE](LICENSE) fuer Details.

---

<p align="center">
  <sub>Built with LangGraph + TypeScript + Ollama</sub>
</p>
