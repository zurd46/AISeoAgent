#!/usr/bin/env node

import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { fetchPage, fetchPageLight } from './scraper.js';
import { runAllChecks } from './seoChecks.js';
import { searchCompetitors, extractKeywordsFromText, searchKeywordRankings } from './search.js';
import type { CrawlData, SEOAnalysis, CompetitorData, KeywordData, SEOReport } from './types.js';

const server = new McpServer({
  name: 'ai-seo-agent',
  version: '1.0.0',
});

// ─── Tool: crawl_url ────────────────────────────────────────

server.tool(
  'crawl_url',
  'Crawl a website and extract all SEO-relevant data: meta tags, headings, links, images, structured data, robots.txt, sitemap, load time, and more.',
  {
    url: z.string().describe('The URL of the website to crawl'),
    light: z.boolean().optional().default(false).describe('Use light crawl mode (no Puppeteer rendering, faster but may miss JS-rendered content)'),
  },
  async ({ url, light }) => {
    try {
      const crawlData = light ? await fetchPageLight(url) : await fetchPage(url);
      // Remove rawHtml to keep response size manageable
      const { rawHtml, ...result } = crawlData;
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Crawl failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool: analyze_seo ──────────────────────────────────────

server.tool(
  'analyze_seo',
  'Run a full SEO analysis on a website. Performs 30+ checks across 9 categories: Title Tag, Meta Description, Headings, Images, Links, Technical, Content, Social Media, and URL. Returns scores (0-100) and detailed issues with severity levels and recommendations.',
  {
    url: z.string().describe('The URL of the website to analyze'),
  },
  async ({ url }) => {
    try {
      const crawlData = await fetchPage(url);
      const { scores, issues } = runAllChecks(crawlData);
      const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
      const overallScore = Math.round(totalScore / scores.length);

      const analysis: SEOAnalysis = {
        overallScore,
        scores,
        issues,
        strengths: scores.filter(s => s.score >= 80).map(s => `${s.category}: ${s.score}/100`),
        summary: `SEO Score: ${overallScore}/100. ${issues.filter(i => i.severity === 'critical').length} critical issues, ${issues.filter(i => i.severity === 'warning').length} warnings.`,
        llmRecommendations: '',
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `SEO analysis failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool: find_competitors ─────────────────────────────────

server.tool(
  'find_competitors',
  'Find competitor websites that rank for the same keywords as the target URL. Searches via DuckDuckGo, identifies keyword overlap, and optionally crawls top competitors for detailed SEO comparison (word count, structured data, load time, etc.).',
  {
    url: z.string().describe('The URL of the website to find competitors for'),
    crawl_top: z.number().optional().default(3).describe('Number of top competitors to crawl for detailed SEO comparison (0 to skip, max 5)'),
  },
  async ({ url, crawl_top }) => {
    try {
      const crawlData = await fetchPage(url);
      const topKeywords = extractKeywordsFromText(crawlData.textContent, 15);
      const keywordStrings = topKeywords.map(k => k.word);

      const competitors = await searchCompetitors(url, keywordStrings);

      // Crawl top competitors for SEO comparison
      const crawlCount = Math.min(crawl_top, 5);
      if (crawlCount > 0) {
        const crawlPromises = competitors.slice(0, crawlCount).map(async (comp) => {
          try {
            const compCrawl = await fetchPageLight(comp.url);
            comp.seo = {
              titleLength: compCrawl.meta.titleLength,
              descriptionLength: compCrawl.meta.descriptionLength,
              h1Count: compCrawl.headings.filter(h => h.level === 1).length,
              wordCount: compCrawl.pageInfo.wordCount,
              hasHttps: compCrawl.pageInfo.hasHttps,
              hasStructuredData: compCrawl.structuredData.length > 0,
              structuredDataTypes: compCrawl.structuredData.map(s => s.type),
              imageCount: compCrawl.images.length,
              imagesWithAlt: compCrawl.images.filter(i => i.hasAlt).length,
              internalLinks: compCrawl.links.filter(l => l.isInternal).length,
              externalLinks: compCrawl.links.filter(l => !l.isInternal).length,
              responseTimeMs: compCrawl.pageInfo.responseTimeMs,
              hasOgTags: !!compCrawl.meta.ogTitle,
              hasTwitterCard: !!compCrawl.meta.twitterCard,
            };
            comp.title = compCrawl.meta.title || comp.title;
            comp.description = compCrawl.meta.description || comp.description;

            // Compare with target
            if (comp.seo.wordCount > crawlData.pageInfo.wordCount * 1.5) comp.strengths.push(`More content (${comp.seo.wordCount} words)`);
            if (comp.seo.wordCount < crawlData.pageInfo.wordCount * 0.5) comp.weaknesses.push(`Less content (${comp.seo.wordCount} words)`);
            if (comp.seo.hasStructuredData && crawlData.structuredData.length === 0) comp.strengths.push('Has structured data');
            if (!comp.seo.hasStructuredData && crawlData.structuredData.length > 0) comp.weaknesses.push('No structured data');
            if (comp.seo.hasOgTags && !crawlData.meta.ogTitle) comp.strengths.push('Has Open Graph tags');
            if (comp.seo.responseTimeMs < crawlData.pageInfo.responseTimeMs * 0.5) comp.strengths.push(`Faster load time (${comp.seo.responseTimeMs}ms)`);
            if (comp.seo.responseTimeMs > crawlData.pageInfo.responseTimeMs * 2) comp.weaknesses.push(`Slower load time (${comp.seo.responseTimeMs}ms)`);
          } catch {
            // Could not crawl competitor
          }
        });
        await Promise.all(crawlPromises);
      }

      const data: CompetitorData = {
        targetUrl: url,
        competitors,
        marketSummary: `${competitors.length} competitors found, top ${Math.min(crawlCount, competitors.length)} analyzed in detail`,
        competitiveAdvantages: [],
        competitiveGaps: [],
        llmAnalysis: '',
      };

      // Derive advantages and gaps
      const crawledComps = competitors.filter(c => c.seo);
      if (crawledComps.length > 0) {
        const avgWordCount = Math.round(crawledComps.reduce((s, c) => s + (c.seo?.wordCount || 0), 0) / crawledComps.length);
        if (crawlData.pageInfo.wordCount > avgWordCount * 1.2) data.competitiveAdvantages.push(`More content than average (${crawlData.pageInfo.wordCount} vs. ${avgWordCount})`);
        if (crawlData.pageInfo.wordCount < avgWordCount * 0.8) data.competitiveGaps.push(`Less content than average (${crawlData.pageInfo.wordCount} vs. ${avgWordCount})`);

        const compsWithSD = crawledComps.filter(c => c.seo?.hasStructuredData).length;
        if (crawlData.structuredData.length > 0 && compsWithSD < crawledComps.length / 2) data.competitiveAdvantages.push('Has structured data (majority of competitors do not)');
        if (crawlData.structuredData.length === 0 && compsWithSD > crawledComps.length / 2) data.competitiveGaps.push('No structured data (majority of competitors have it)');
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Competitor analysis failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool: analyze_keywords ─────────────────────────────────

server.tool(
  'analyze_keywords',
  'Extract and analyze keywords from a website. Calculates keyword density, prominence score (presence in title, H1, description, URL), and approximate DuckDuckGo ranking positions. Identifies primary and secondary keywords.',
  {
    url: z.string().describe('The URL of the website to analyze keywords for'),
    top_n: z.number().optional().default(20).describe('Number of top keywords to extract (max 50)'),
    check_rankings: z.boolean().optional().default(true).describe('Check DuckDuckGo rankings for top 5 keywords (slower but more data)'),
  },
  async ({ url, top_n, check_rankings }) => {
    try {
      const crawlData = await fetchPage(url);
      const topKeywords = extractKeywordsFromText(crawlData.textContent, Math.min(top_n, 50));
      const totalWords = crawlData.pageInfo.wordCount || 1;
      const titleLower = crawlData.meta.title.toLowerCase();
      const descLower = crawlData.meta.description.toLowerCase();
      const urlLower = url.toLowerCase();
      const h1Texts = crawlData.headings.filter(h => h.level === 1).map(h => h.text.toLowerCase());
      const allHeadingTexts = crawlData.headings.map(h => h.text.toLowerCase());

      const keywordInfos = topKeywords.map(({ word, count }) => {
        const density = Math.round((count / totalWords) * 10000) / 100;
        const inTitle = titleLower.includes(word);
        const inDescription = descLower.includes(word);
        const inH1 = h1Texts.some(t => t.includes(word));
        const inHeadings = allHeadingTexts.some(t => t.includes(word));
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
      if (check_rankings) {
        const topForRanking = keywordInfos.slice(0, 5).map(k => k.keyword);
        const rankings = await searchKeywordRankings(url, topForRanking);
        for (const kw of keywordInfos) {
          const rank = rankings.get(kw.keyword);
          if (rank != null) {
            kw.prominenceScore = Math.min(100, kw.prominenceScore + (21 - rank));
          }
        }
      }

      const primary = keywordInfos.filter(k => k.prominenceScore >= 30).slice(0, 10);
      const secondary = keywordInfos.filter(k => k.prominenceScore < 30).slice(0, 10);

      const data: KeywordData = {
        targetUrl: url,
        primaryKeywords: primary,
        secondaryKeywords: secondary,
        missingKeywords: [],
        keywordSuggestions: [],
        contentGaps: [],
        llmAnalysis: '',
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Keyword analysis failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool: full_seo_report ──────────────────────────────────

server.tool(
  'full_seo_report',
  'Run a complete SEO analysis pipeline: crawl the website, perform SEO checks, find competitors, analyze keywords, and return a comprehensive report. This combines all other tools into a single operation.',
  {
    url: z.string().describe('The URL of the website to analyze'),
  },
  async ({ url }) => {
    try {
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      // Phase 1: Crawl
      const crawlData = await fetchPage(normalizedUrl);

      // Phase 2: Parallel analysis
      const [seoResult, competitorResult, keywordResult] = await Promise.all([
        // SEO Analysis
        (async () => {
          const { scores, issues } = runAllChecks(crawlData);
          const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
          const overallScore = Math.round(totalScore / scores.length);
          return {
            overallScore,
            scores,
            issues,
            strengths: scores.filter(s => s.score >= 80).map(s => `${s.category}: ${s.score}/100`),
            summary: `SEO Score: ${overallScore}/100`,
            llmRecommendations: '',
          } as SEOAnalysis;
        })(),

        // Competitor Analysis
        (async () => {
          const topKeywords = extractKeywordsFromText(crawlData.textContent, 15);
          const competitors = await searchCompetitors(normalizedUrl, topKeywords.map(k => k.word));
          // Light crawl top 3
          const crawlPromises = competitors.slice(0, 3).map(async (comp) => {
            try {
              const compCrawl = await fetchPageLight(comp.url);
              comp.seo = {
                titleLength: compCrawl.meta.titleLength,
                descriptionLength: compCrawl.meta.descriptionLength,
                h1Count: compCrawl.headings.filter(h => h.level === 1).length,
                wordCount: compCrawl.pageInfo.wordCount,
                hasHttps: compCrawl.pageInfo.hasHttps,
                hasStructuredData: compCrawl.structuredData.length > 0,
                structuredDataTypes: compCrawl.structuredData.map(s => s.type),
                imageCount: compCrawl.images.length,
                imagesWithAlt: compCrawl.images.filter(i => i.hasAlt).length,
                internalLinks: compCrawl.links.filter(l => l.isInternal).length,
                externalLinks: compCrawl.links.filter(l => !l.isInternal).length,
                responseTimeMs: compCrawl.pageInfo.responseTimeMs,
                hasOgTags: !!compCrawl.meta.ogTitle,
                hasTwitterCard: !!compCrawl.meta.twitterCard,
              };
            } catch { /* skip */ }
          });
          await Promise.all(crawlPromises);
          return {
            targetUrl: normalizedUrl,
            competitors,
            marketSummary: `${competitors.length} competitors found`,
            competitiveAdvantages: [],
            competitiveGaps: [],
            llmAnalysis: '',
          } as CompetitorData;
        })(),

        // Keyword Analysis
        (async () => {
          const topKeywords = extractKeywordsFromText(crawlData.textContent, 20);
          const totalWords = crawlData.pageInfo.wordCount || 1;
          const titleLower = crawlData.meta.title.toLowerCase();
          const descLower = crawlData.meta.description.toLowerCase();
          const urlLower = normalizedUrl.toLowerCase();
          const h1Texts = crawlData.headings.filter(h => h.level === 1).map(h => h.text.toLowerCase());
          const allHeadingTexts = crawlData.headings.map(h => h.text.toLowerCase());

          const keywordInfos = topKeywords.map(({ word, count }) => {
            const density = Math.round((count / totalWords) * 10000) / 100;
            const inTitle = titleLower.includes(word);
            const inDescription = descLower.includes(word);
            const inH1 = h1Texts.some(t => t.includes(word));
            const inHeadings = allHeadingTexts.some(t => t.includes(word));
            const inUrl = urlLower.includes(word);
            let prominenceScore = 0;
            if (inTitle) prominenceScore += 30;
            if (inDescription) prominenceScore += 20;
            if (inH1) prominenceScore += 25;
            if (inHeadings) prominenceScore += 10;
            if (inUrl) prominenceScore += 15;
            return { keyword: word, density, count, inTitle, inDescription, inH1, inHeadings, inUrl, prominenceScore };
          });

          const topForRanking = keywordInfos.slice(0, 5).map(k => k.keyword);
          const rankings = await searchKeywordRankings(normalizedUrl, topForRanking);
          for (const kw of keywordInfos) {
            const rank = rankings.get(kw.keyword);
            if (rank != null) kw.prominenceScore = Math.min(100, kw.prominenceScore + (21 - rank));
          }

          return {
            targetUrl: normalizedUrl,
            primaryKeywords: keywordInfos.filter(k => k.prominenceScore >= 30).slice(0, 10),
            secondaryKeywords: keywordInfos.filter(k => k.prominenceScore < 30).slice(0, 10),
            missingKeywords: [],
            keywordSuggestions: [],
            contentGaps: [],
            llmAnalysis: '',
          } as KeywordData;
        })(),
      ]);

      const report: SEOReport = {
        url: normalizedUrl,
        timestamp: new Date().toISOString(),
        crawlData: { ...crawlData, rawHtml: '' }, // Strip rawHtml for response size
        seoAnalysis: seoResult,
        competitorData: competitorResult,
        keywordData: keywordResult,
        executiveSummary: `SEO analysis for ${normalizedUrl}: Overall score ${seoResult.overallScore}/100. Found ${seoResult.issues.filter(i => i.severity === 'critical').length} critical issues, ${seoResult.issues.filter(i => i.severity === 'warning').length} warnings. ${competitorResult.competitors.length} competitors identified. ${keywordResult.primaryKeywords.length} primary keywords analyzed.`,
        reportHtmlPath: '',
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(report, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Full SEO report failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ─── Start Server ───────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('MCP Server failed to start:', error);
  process.exit(1);
});
