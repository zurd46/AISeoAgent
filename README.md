<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white" alt="LangGraph" />
  <img src="https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white" alt="Ollama" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License" />
</p>

<h1 align="center">AI SEO Agent</h1>

<p align="center">
  <strong>AI-powered SEO analysis system with parallel agents and LangGraph orchestration</strong>
</p>

<p align="center">
  Open-source CLI tool that fully automatically analyzes websites for SEO, finds competitors, evaluates keywords, and generates a detailed HTML report — all locally and for free with Ollama.
</p>

---

## Highlights

- **5 specialized AI agents** working in parallel on the analysis
- **LangGraph Orchestrator** controls the workflow with fan-out/fan-in pattern
- **Animated CLI** with ASCII art banner, gradient colors, spinners, and score bars
- **Completely free** — Ollama (local) + DuckDuckGo (no API key required)
- **7 SEO check categories** with 30+ individual checks
- **HTML dark-theme report** with score circle, severity badges, and AI recommendations
- **Structured data** throughout with Zod schemas + TypeScript types
- **Graceful degradation** — works without LLM (rule-based)

---

## Architecture

```
                         ┌─────────┐
                         │  START  │
                         └────┬────┘
                              │
                       ┌──────▼──────┐
                       │   CRAWLER   │   Fetch + parse website
                       │   Agent     │   (Cheerio HTML Parser)
                       └──────┬──────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
       ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
       │  ANALYZER   │ │ COMPETITOR │ │  KEYWORD    │   Parallel
       │  Agent      │ │ Agent      │ │  Agent      │   Execution
       │  (SEO Checks│ │ (DuckDuck- │ │  (Density,  │
       │  + LLM)     │ │  Go Search)│ │  Rankings)  │
       └──────┬──────┘ └─────┬──────┘ └──────┬──────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                       ┌──────▼──────┐
                       │  REPORTER   │   Generate HTML report
                       │  Agent      │   (Handlebars Template)
                       └──────┬──────┘
                              │
                         ┌────▼────┐
                         │   END   │
                         └─────────┘
```

### Project Structure

```
AISeoAgent/
├── package.json                 # Dependencies + Scripts
├── tsconfig.json                # TypeScript ESM Config
├── .env                         # LLM + HTTP Configuration
│
├── src/
│   ├── index.ts                 # CLI Entry Point (Commander)
│   ├── config.ts                # Configuration + LLM Factory
│   ├── types.ts                 # Zod Schemas + TypeScript Types
│   │
│   ├── cli/                     # Animated CLI
│   │   ├── banner.ts            #   ASCII Art + Gradient
│   │   ├── ui.ts                #   Spinners, Tables, Score Bars
│   │   └── app.ts               #   CLI Workflow + Control
│   │
│   ├── agents/                  # LangGraph Agent Nodes
│   │   ├── crawler.ts           #   Website Crawler
│   │   ├── analyzer.ts          #   SEO Analysis + LLM
│   │   ├── competitor.ts        #   Competitor Search
│   │   ├── keyword.ts           #   Keyword Analysis
│   │   └── reporter.ts          #   Report Generator
│   │
│   ├── graph/                   # LangGraph Orchestrator
│   │   ├── state.ts             #   State Definition (Annotation)
│   │   └── workflow.ts          #   Workflow (Parallel Edges)
│   │
│   ├── tools/                   # Analysis Tools
│   │   ├── scraper.ts           #   Cheerio Web Scraper
│   │   ├── seoChecks.ts         #   7 SEO Check Functions
│   │   └── search.ts            #   DuckDuckGo Search
│   │
│   └── reports/                 # Report Generation
│       ├── generator.ts         #   Handlebars Renderer
│       └── template.ts          #   Dark-Theme HTML Template
│
└── reports/                     # Generated HTML Reports
```

---

## Installation

### Prerequisites

- **Node.js** >= 18.0
- **npm** or **pnpm**
- **Ollama** (optional, for AI recommendations)

### Setup

```bash
# Clone the repository
git clone https://github.com/zurd46/ai-seo-agent.git
cd ai-seo-agent

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

### Set up Ollama (optional, free)

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama
ollama serve

# Download a model
ollama pull llama3.1
```

> Without Ollama, the system works fully with rule-based SEO checks. The LLM only adds AI-generated recommendations and summaries.

---

## Usage

### Full SEO Analysis

```bash
npx tsx src/index.ts analyze https://example.com
```

Runs the complete workflow:

1. **Crawling** — Load website, parse HTML, extract meta tags/links/images
2. **Parallel Analysis** — SEO checks, competitor search, keyword analysis simultaneously
3. **Report** — Generate HTML report and open in browser

### Quick Crawl

```bash
npx tsx src/index.ts crawl https://example.com
```

Only crawl the website and display basic information (without analysis).

### Help

```bash
npx tsx src/index.ts --help
```

---

## SEO Checks

The system performs **30+ individual checks** across 7 categories:

| Category | Checks |
|---|---|
| **Title Tag** | Present, length (30-60 characters), keyword placement |
| **Meta Description** | Present, length (120-160 characters), unique |
| **Headings** | H1 present (exactly 1), H2 structure, hierarchy order |
| **Images** | Alt texts present, lazy loading, dimensions |
| **Links** | Internal linking (10+), anchor texts, nofollow |
| **Technical** | HTTPS, load time (<500ms), robots.txt, sitemap, viewport, canonical |
| **Content** | Word count (300+), Schema.org/JSON-LD, Open Graph tags |

### Severity Levels

- `CRITICAL` — Severe issue, fix immediately
- `WARNING` — Should be fixed, medium priority
- `INFO` — Improvement suggestion, low priority
- `GOOD` — No action needed

---

## Agents in Detail

### Crawler Agent

Fetches the target URL and extracts all SEO-relevant data:

- HTTP status, load time, content type
- Meta tags (title, description, robots, canonical, viewport)
- Open Graph + Twitter Card tags
- Heading structure (H1-H6)
- Internal and external links with anchor texts
- Images with alt text analysis
- Schema.org / JSON-LD structured data
- Robots.txt and sitemap.xml check

### Analyzer Agent

Runs all 7 SEO check categories and calculates scores (0-100). Optionally, an LLM generates prioritized action recommendations based on the issues found.

### Competitor Agent

Searches via DuckDuckGo for websites ranking for the same keywords. Identifies keyword overlap and analyzes the competitive landscape. LLM-driven competitive analysis with strengths, weaknesses, and opportunities.

### Keyword Agent

Extracts the most frequent keywords from the page content. Evaluates:

- **Keyword density** (frequency in text)
- **Prominence score** (presence in title, H1, description, URL)
- **DuckDuckGo rankings** (approximate position)
- **Content gaps** (missing keywords)

### Reporter Agent

Generates a comprehensive HTML report in dark-theme design with:

- Score circle visualization
- Category score bars
- Issue table with severity badges
- Competitor overview
- Keyword analysis table
- AI-generated recommendations
- Structured data overview

---

## Configuration

### `.env` File

```env
# LLM Provider: "ollama" (free), "openai" or "anthropic"
LLM_PROVIDER=ollama

# Ollama (default - free, local)
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

### Switching LLM Provider

The system supports 3 LLM providers:

| Provider | Cost | Setup |
|---|---|---|
| **Ollama** | Free | `ollama serve` + `ollama pull llama3.1` |
| **OpenAI** | Paid | Set API key in `.env` |
| **Anthropic** | Paid | Set API key in `.env` |

---

## HTML Report

The generated report includes:

- **Executive Summary** — AI-generated summary of key findings
- **Page Information** — Status, load time, HTTPS, meta tags, links, images
- **SEO Scores** — Score bars for each of the 7 categories
- **Issues Found** — Sorted by severity with actual/expected comparison and recommendations
- **AI Recommendations** — LLM-generated prioritized action recommendations
- **Competitor Analysis** — Top competitors with keyword overlap
- **Keyword Analysis** — Primary/secondary keywords with prominence score
- **Structured Data** — Found Schema.org/JSON-LD entries

Reports are saved under `reports/` and automatically opened in the browser.

---

## Tech Stack

| Technology | Usage |
|---|---|
| **TypeScript** | Type-safe codebase, ESM modules |
| **LangGraph** | Workflow orchestration with parallel agent execution |
| **LangChain** | LLM abstraction (Ollama, OpenAI, Anthropic) |
| **Zod** | Schema validation + TypeScript type inference |
| **Cheerio** | Fast HTML parsing (server-side) |
| **Commander** | CLI command parsing |
| **Chalk** | Terminal colors |
| **Ora** | Terminal spinners/animations |
| **Boxen** | Terminal boxes |
| **Gradient-String** | Gradient text in terminal |
| **Figlet** | ASCII art text |
| **CLI-Table3** | Formatted terminal tables |
| **Handlebars** | HTML template engine |
| **DuckDuckGo** | Free web search (no API key) |

---

## CLI Preview

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
  ✔ Website successfully crawled

  ▸ Phase 2: Parallel Agent Analysis ······················
  ✔ SEO analysis completed (Score: 64/100)
  ✔ 10 competitors found
  ✔ 13 keywords analyzed

  ▸ Phase 3: Results ······································
  ┌────────────────────┬──────────┬──────────────────────────────────┐
  │ Category           │ Score    │ Bar                              │
  ├────────────────────┼──────────┼──────────────────────────────────┤
  │ Title Tag          │ 70/100   │ █████████████████████░░░░░░░░░   │
  │ Meta Description   │ 0/100    │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
  │ Headings           │ 85/100   │ ██████████████████████████░░░░   │
  │ Images             │ 100/100  │ ██████████████████████████████   │
  │ Technical          │ 75/100   │ ███████████████████████░░░░░░░   │
  └────────────────────┴──────────┴──────────────────────────────────┘

  ▸ Phase 4: Report Generation ····························
  ✔ HTML report generated

  ╔═ SEO Analysis Complete ═════════════════════════════════╗
  ║  Report saved: reports/seo_report_example.html          ║
  ║  Duration: 5.4s                                         ║
  ╚═════════════════════════════════════════════════════════╝
```

---

## Development

```bash
# Compile TypeScript
npm run build

# Development mode (tsx)
npm run dev

# Run directly
npx tsx src/index.ts analyze https://example.com
```

---

## Keywords

`seo` `seo-analysis` `seo-tool` `seo-audit` `seo-checker` `website-analysis` `ai-agent` `ai-seo` `langgraph` `langchain` `ollama` `typescript` `nodejs` `cli-tool` `web-scraping` `keyword-analysis` `competitor-analysis` `seo-report` `html-report` `open-source` `free-seo-tool` `duckduckgo` `structured-data` `schema-org` `meta-tags` `on-page-seo` `technical-seo`

---

## Roadmap

- [ ] Multi-page crawling (analyze entire website)
- [ ] PDF report export
- [ ] Lighthouse integration (Core Web Vitals)
- [ ] Historical comparison (score trends over time)
- [ ] Broken link checker
- [ ] Hreflang check (internationalization)
- [ ] Backlink analysis
- [ ] Content readability score (Flesch-Kincaid)
- [ ] API mode (JSON output for CI/CD integration)
- [ ] Docker container

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with LangGraph + TypeScript + Ollama</sub>
</p>
