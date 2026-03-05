import * as cheerio from 'cheerio';
import { config } from './config_stub.js';
import type {
  AccessibilityInfo,
  ContentDetailInfo,
  CrawlData,
  HeadingInfo,
  HreflangTag,
  ImageInfo,
  LinkInfo,
  MetaInfo,
  PageInfo,
  PerformanceInfo,
  StructuredDataItem,
} from './types.js';

// ─── Template Placeholder Filter ─────────────────────────────
// Erkennt ungerenderte Template-Syntax (Vue {{ }}, Angular, etc.)
const TEMPLATE_PLACEHOLDER_RE = /\{\{.*?\}\}/;

function containsTemplatePlaceholder(text: string): boolean {
  return TEMPLATE_PLACEHOLDER_RE.test(text);
}

function cleanTemplatePlaceholders(text: string): string {
  return text.replace(/\{\{.*?\}\}/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Puppeteer Rendering ─────────────────────────────────────

interface RenderedPage {
  html: string;
  finalUrl: string;
  statusCode: number;
  elapsedMs: number;
}

async function renderWithPuppeteer(url: string): Promise<RenderedPage | null> {
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(config.http.userAgent);
      await page.setViewport({ width: 1920, height: 1080 });

      const start = performance.now();
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: config.http.timeout,
      });
      const elapsedMs = performance.now() - start;

      // Warten bis Framework gerendert hat
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      const html = await page.content();
      const finalUrl = page.url();
      const statusCode = response?.status() || 0;

      return { html, finalUrl, statusCode, elapsedMs: Math.round(elapsedMs) };
    } finally {
      await browser.close();
    }
  } catch {
    return null;
  }
}

// ─── Main Fetch Function ─────────────────────────────────────

export async function fetchPage(inputUrl: string): Promise<CrawlData> {
  let url = inputUrl.trim();
  if (!url.startsWith('http')) url = `https://${url}`;

  const parsedUrl = new URL(url);
  const baseDomain = parsedUrl.hostname;

  let html: string;
  let finalUrl: string;
  let statusCode: number;
  let elapsedMs: number;
  let usedPuppeteer = false;

  // Versuch 1: Puppeteer (JavaScript-Rendering)
  const rendered = await renderWithPuppeteer(url);
  if (rendered) {
    html = rendered.html;
    finalUrl = rendered.finalUrl;
    statusCode = rendered.statusCode;
    elapsedMs = rendered.elapsedMs;
    usedPuppeteer = true;
  } else {
    // Fallback: Cheerio (nur HTML)
    const start = performance.now();
    const resp = await fetch(url, {
      headers: { 'User-Agent': config.http.userAgent },
      redirect: 'follow',
      signal: AbortSignal.timeout(config.http.timeout),
    });
    elapsedMs = Math.round(performance.now() - start);
    html = await resp.text();
    finalUrl = resp.url;
    statusCode = resp.status;
  }

  const pageInfo: PageInfo = {
    url,
    finalUrl,
    statusCode,
    responseTimeMs: elapsedMs,
    contentLength: html.length,
    contentType: 'text/html',
    wordCount: 0,
    language: '',
    charset: '',
    hasHttps: finalUrl.startsWith('https'),
    hasRobotsTxt: false,
    hasSitemap: false,
    robotsTxtContent: '',
  };

  // Check robots.txt & sitemap.xml parallel
  const [robotsResult, sitemapResult] = await Promise.all([
    fetch(`${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`, {
      headers: { 'User-Agent': config.http.userAgent },
      signal: AbortSignal.timeout(5000),
    }).catch(() => null),
    fetch(`${parsedUrl.protocol}//${parsedUrl.host}/sitemap.xml`, {
      headers: { 'User-Agent': config.http.userAgent },
      signal: AbortSignal.timeout(5000),
    }).catch(() => null),
  ]);

  if (robotsResult?.ok) {
    pageInfo.hasRobotsTxt = true;
    try {
      pageInfo.robotsTxtContent = (await robotsResult.text()).slice(0, 2000);
    } catch { /* ignore */ }
  }
  if (sitemapResult?.ok) {
    pageInfo.hasSitemap = true;
  }

  // Parse HTML
  const $ = cheerio.load(html);

  // Remove non-content elements for text extraction
  $('script, style, noscript').remove();
  const textContent = $('body').text().replace(/\s+/g, ' ').trim();
  pageInfo.wordCount = textContent.split(/\s+/).filter(Boolean).length;

  // Reload for full parsing
  const $full = cheerio.load(html);

  // Language
  pageInfo.language = $full('html').attr('lang') || '';

  // Charset
  const charsetMeta = $full('meta[charset]').attr('charset');
  if (charsetMeta) pageInfo.charset = charsetMeta;

  const meta = extractMeta($full);
  const headings = extractHeadings($full);
  const links = extractLinks($full, url, baseDomain);
  const images = extractImages($full);
  const structuredData = extractStructuredData($full);
  const hreflangTags = extractHreflangTags($full);
  const accessibility = extractAccessibilityInfo($full);
  const perfInfo = extractPerformanceInfo($full, html, pageInfo.hasHttps);
  const contentDetail = extractContentDetailInfo($full, textContent);

  // Favicon
  const hasFavicon = !!(
    $full('link[rel="icon"]').length > 0 ||
    $full('link[rel="shortcut icon"]').length > 0 ||
    $full('link[rel="apple-touch-icon"]').length > 0
  );

  // DOCTYPE
  const hasDoctype = /^<!doctype\s+html/i.test(html.trimStart());

  return {
    pageInfo,
    meta,
    headings,
    links,
    images,
    structuredData,
    rawHtml: html.slice(0, 50000),
    textContent: textContent.slice(0, 10000),
    hasFavicon,
    hasDoctype,
    hreflangTags,
    accessibility,
    performance: perfInfo,
    contentDetail,
  };
}

// ─── Quick fetch without Puppeteer (for competitor crawling) ──

export async function fetchPageLight(inputUrl: string): Promise<CrawlData> {
  let url = inputUrl.trim();
  if (!url.startsWith('http')) url = `https://${url}`;

  const parsedUrl = new URL(url);
  const baseDomain = parsedUrl.hostname;

  const start = performance.now();
  const resp = await fetch(url, {
    headers: { 'User-Agent': config.http.userAgent },
    redirect: 'follow',
    signal: AbortSignal.timeout(config.http.timeout),
  });
  const elapsedMs = Math.round(performance.now() - start);
  const html = await resp.text();

  const pageInfo: PageInfo = {
    url,
    finalUrl: resp.url,
    statusCode: resp.status,
    responseTimeMs: elapsedMs,
    contentLength: html.length,
    contentType: resp.headers.get('content-type') || '',
    wordCount: 0,
    language: '',
    charset: '',
    hasHttps: resp.url.startsWith('https'),
    hasRobotsTxt: false,
    hasSitemap: false,
    robotsTxtContent: '',
  };

  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  const textContent = $('body').text().replace(/\s+/g, ' ').trim();
  pageInfo.wordCount = textContent.split(/\s+/).filter(Boolean).length;

  const $full = cheerio.load(html);
  pageInfo.language = $full('html').attr('lang') || '';

  const meta = extractMeta($full);
  const headings = extractHeadings($full);
  const links = extractLinks($full, url, baseDomain);
  const images = extractImages($full);
  const structuredData = extractStructuredData($full);
  const hreflangTags = extractHreflangTags($full);
  const accessibility = extractAccessibilityInfo($full);
  const performanceInfo = extractPerformanceInfo($full, html, pageInfo.hasHttps);
  const contentDetail = extractContentDetailInfo($full, textContent);

  const hasFavicon = !!(
    $full('link[rel="icon"]').length > 0 ||
    $full('link[rel="shortcut icon"]').length > 0 ||
    $full('link[rel="apple-touch-icon"]').length > 0
  );
  const hasDoctype = /^<!doctype\s+html/i.test(html.trimStart());

  return {
    pageInfo,
    meta,
    headings,
    links,
    images,
    structuredData,
    rawHtml: html.slice(0, 50000),
    textContent: textContent.slice(0, 10000),
    hasFavicon,
    hasDoctype,
    hreflangTags,
    accessibility,
    performance: performanceInfo,
    contentDetail,
  };
}

// ─── Extraction Functions ────────────────────────────────────

function extractMeta($: cheerio.CheerioAPI): MetaInfo {
  const title = $('title').first().text().trim();

  const getMetaContent = (selector: string): string =>
    $(selector).attr('content')?.trim() || '';

  const description = getMetaContent('meta[name="description"]');

  return {
    title,
    titleLength: title.length,
    description,
    descriptionLength: description.length,
    keywords: getMetaContent('meta[name="keywords"]'),
    viewport: getMetaContent('meta[name="viewport"]'),
    robots: getMetaContent('meta[name="robots"]'),
    canonical: $('link[rel="canonical"]').attr('href') || '',
    ogTitle: getMetaContent('meta[property="og:title"]'),
    ogDescription: getMetaContent('meta[property="og:description"]'),
    ogImage: getMetaContent('meta[property="og:image"]'),
    ogType: getMetaContent('meta[property="og:type"]'),
    twitterCard: getMetaContent('meta[name="twitter:card"]'),
    twitterTitle: getMetaContent('meta[name="twitter:title"]'),
    twitterDescription: getMetaContent('meta[name="twitter:description"]'),
  };
}

function extractHeadings($: cheerio.CheerioAPI): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  // WICHTIG: In Dokumentreihenfolge extrahieren (nicht per Level!)
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tagName = $(el).prop('tagName')?.toLowerCase() || '';
    const level = parseInt(tagName.replace('h', ''), 10);
    let text = $(el).text().trim();
    if (!text || isNaN(level)) return;

    // Template-Platzhalter filtern (z.B. Vue {{ }}, Angular, etc.)
    if (containsTemplatePlaceholder(text)) {
      text = cleanTemplatePlaceholders(text);
      if (!text) return; // Komplett aus Platzhaltern bestehend -> ueberspringen
    }

    headings.push({ tag: tagName, text: text.slice(0, 200), level });
  });
  return headings;
}

function extractLinks(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  baseDomain: string
): LinkInfo[] {
  const links: LinkInfo[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim() || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    let fullUrl: string;
    try {
      fullUrl = new URL(href, baseUrl).toString();
    } catch {
      return;
    }

    let linkDomain: string;
    try {
      linkDomain = new URL(fullUrl).hostname;
    } catch {
      return;
    }

    const rel = $(el).attr('rel') || '';

    links.push({
      url: fullUrl,
      text: $(el).text().trim().slice(0, 100),
      isInternal: linkDomain === baseDomain || linkDomain === `www.${baseDomain}` || baseDomain === `www.${linkDomain}`,
      isNofollow: rel.includes('nofollow'),
      hasTitle: !!$(el).attr('title'),
    });
  });
  return links;
}

function extractImages($: cheerio.CheerioAPI): ImageInfo[] {
  const images: ImageInfo[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    const alt = $(el).attr('alt') || '';
    images.push({
      src,
      alt,
      hasAlt: alt.trim().length > 0,
      width: $(el).attr('width') || '',
      height: $(el).attr('height') || '',
      isLazyLoaded: $(el).attr('loading') === 'lazy' || !!$(el).attr('data-src'),
    });
  });
  return images;
}

function extractHreflangTags($: cheerio.CheerioAPI): HreflangTag[] {
  const tags: HreflangTag[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr('hreflang') || '';
    const href = $(el).attr('href') || '';
    if (lang && href) {
      tags.push({ lang, href });
    }
  });
  return tags;
}

function extractAccessibilityInfo($: cheerio.CheerioAPI): AccessibilityInfo {
  // Skip navigation
  const hasSkipNavigation = $('a[href="#main"], a[href="#content"], a[href="#main-content"], a.skip-link, a.skip-nav, [class*="skip-to"]').length > 0;

  // ARIA landmarks
  const ariaLandmarks = $('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="search"], main, nav, header, footer, aside').length;

  // Forms without labels
  let formsTotal = 0;
  let formsWithoutLabels = 0;
  $('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select').each((_, el) => {
    formsTotal++;
    const id = $(el).attr('id');
    const hasLabel = !!(
      $(el).attr('aria-label') ||
      $(el).attr('aria-labelledby') ||
      $(el).attr('placeholder') ||
      (id && $(`label[for="${id}"]`).length > 0) ||
      $(el).closest('label').length > 0
    );
    if (!hasLabel) formsWithoutLabels++;
  });

  // Positive tabindex
  let tabindexPositiveCount = 0;
  $('[tabindex]').each((_, el) => {
    const val = parseInt($(el).attr('tabindex') || '0', 10);
    if (val > 0) tabindexPositiveCount++;
  });

  // Iframes without title
  const iframes = $('iframe');
  let iframesWithoutTitle = 0;
  iframes.each((_, el) => {
    if (!$(el).attr('title')) iframesWithoutTitle++;
  });

  // Buttons without accessible text
  let buttonsWithoutText = 0;
  $('button, [role="button"], input[type="button"], input[type="submit"]').each((_, el) => {
    const hasText = !!(
      $(el).text().trim() ||
      $(el).attr('aria-label') ||
      $(el).attr('aria-labelledby') ||
      $(el).attr('value') ||
      $(el).attr('title')
    );
    if (!hasText) buttonsWithoutText++;
  });

  return {
    hasSkipNavigation,
    hasAriaLandmarks: ariaLandmarks > 0,
    ariaLandmarkCount: ariaLandmarks,
    formsTotal,
    formsWithoutLabels,
    tabindexPositiveCount,
    iframeCount: iframes.length,
    iframesWithoutTitle,
    buttonsWithoutText,
  };
}

function extractPerformanceInfo($: cheerio.CheerioAPI, html: string, isHttps: boolean): PerformanceInfo {
  // Inline styles
  let inlineStyleBytes = 0;
  const inlineStyles = $('style');
  inlineStyles.each((_, el) => {
    inlineStyleBytes += ($(el).html() || '').length;
  });

  // Inline scripts
  let inlineScriptBytes = 0;
  let inlineScriptCount = 0;
  $('script:not([src])').each((_, el) => {
    const content = $(el).html() || '';
    if (content.trim().length > 0) {
      inlineScriptCount++;
      inlineScriptBytes += content.length;
    }
  });

  // External resources
  const externalStylesheetCount = $('link[rel="stylesheet"]').length;
  const externalScripts = $('script[src]');
  const externalScriptCount = externalScripts.length;

  // Render-blocking scripts (scripts in <head> without async/defer)
  let renderBlockingScripts = 0;
  $('head script[src]').each((_, el) => {
    if (!$(el).attr('async') && !$(el).attr('defer')) {
      renderBlockingScripts++;
    }
  });

  // Resource hints
  const preconnectCount = $('link[rel="preconnect"]').length;
  const prefetchCount = $('link[rel="prefetch"], link[rel="preload"], link[rel="dns-prefetch"]').length;

  // Mixed content (HTTP resources on HTTPS pages)
  const mixedContentUrls: string[] = [];
  if (isHttps) {
    $('script[src^="http:"], link[href^="http:"], img[src^="http:"], iframe[src^="http:"], video[src^="http:"], audio[src^="http:"]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('href') || '';
      if (src && mixedContentUrls.length < 10) {
        mixedContentUrls.push(src);
      }
    });
  }

  return {
    inlineStyleCount: inlineStyles.length,
    inlineStyleBytes,
    inlineScriptCount,
    inlineScriptBytes,
    externalStylesheetCount,
    externalScriptCount,
    renderBlockingScripts,
    preconnectCount,
    prefetchCount,
    hasMixedContent: mixedContentUrls.length > 0,
    mixedContentUrls,
  };
}

function extractContentDetailInfo($: cheerio.CheerioAPI, textContent: string): ContentDetailInfo {
  // Paragraphs
  const paragraphs = $('p');
  const paragraphCount = paragraphs.length;

  // Sentence analysis
  const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const avgSentenceLength = sentences.length > 0
    ? Math.round(sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length)
    : 0;
  const longSentenceCount = sentences.filter(s => s.trim().split(/\s+/).length > 30).length;

  // Lists
  const listCount = $('ul, ol').length;
  const listItemCount = $('li').length;

  // Tables
  const tableCount = $('table').length;

  // Deprecated HTML tags
  const deprecatedSelectors = ['font', 'center', 'marquee', 'blink', 'strike', 'big', 'tt', 'frame', 'frameset', 'applet'];
  const deprecatedTags: string[] = [];
  for (const tag of deprecatedSelectors) {
    if ($(tag).length > 0) {
      deprecatedTags.push(`<${tag}> (${$(tag).length}x)`);
    }
  }

  return {
    paragraphCount,
    avgSentenceLength,
    longSentenceCount,
    listCount,
    listItemCount,
    tableCount,
    hasDeprecatedTags: deprecatedTags.length > 0,
    deprecatedTags,
  };
}

function extractStructuredData($: cheerio.CheerioAPI): StructuredDataItem[] {
  const items: StructuredDataItem[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() || '';
      const data = JSON.parse(raw);

      const processItem = (d: Record<string, unknown>) => {
        const type = (d['@type'] as string) || 'Unknown';
        const properties: Record<string, string> = {};
        for (const [k, v] of Object.entries(d)) {
          if (k !== '@type' && k !== '@context') {
            properties[k] = String(v).slice(0, 200);
          }
        }
        items.push({
          type,
          properties,
          rawJson: JSON.stringify(d).slice(0, 1000),
        });
      };

      if (Array.isArray(data)) {
        data.forEach((d) => {
          if (typeof d === 'object' && d !== null) processItem(d);
        });
      } else if (typeof data === 'object' && data !== null) {
        processItem(data);
      }
    } catch {
      // invalid JSON-LD
    }
  });

  return items;
}
