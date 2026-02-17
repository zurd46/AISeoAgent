import { z } from 'zod';

// ─── Meta Tags ───────────────────────────────────────────────

export const MetaInfoSchema = z.object({
  title: z.string().default(''),
  titleLength: z.number().default(0),
  description: z.string().default(''),
  descriptionLength: z.number().default(0),
  keywords: z.string().default(''),
  viewport: z.string().default(''),
  robots: z.string().default(''),
  canonical: z.string().default(''),
  ogTitle: z.string().default(''),
  ogDescription: z.string().default(''),
  ogImage: z.string().default(''),
  ogType: z.string().default(''),
  twitterCard: z.string().default(''),
  twitterTitle: z.string().default(''),
  twitterDescription: z.string().default(''),
});
export type MetaInfo = z.infer<typeof MetaInfoSchema>;

// ─── Headings ────────────────────────────────────────────────

export const HeadingInfoSchema = z.object({
  tag: z.string(),
  text: z.string(),
  level: z.number(),
});
export type HeadingInfo = z.infer<typeof HeadingInfoSchema>;

// ─── Links ───────────────────────────────────────────────────

export const LinkInfoSchema = z.object({
  url: z.string(),
  text: z.string(),
  isInternal: z.boolean().default(true),
  isNofollow: z.boolean().default(false),
  hasTitle: z.boolean().default(false),
});
export type LinkInfo = z.infer<typeof LinkInfoSchema>;

// ─── Images ──────────────────────────────────────────────────

export const ImageInfoSchema = z.object({
  src: z.string(),
  alt: z.string().default(''),
  hasAlt: z.boolean().default(false),
  width: z.string().default(''),
  height: z.string().default(''),
  isLazyLoaded: z.boolean().default(false),
});
export type ImageInfo = z.infer<typeof ImageInfoSchema>;

// ─── Structured Data ─────────────────────────────────────────

export const StructuredDataItemSchema = z.object({
  type: z.string(),
  properties: z.record(z.string()).default({}),
  rawJson: z.string().default(''),
});
export type StructuredDataItem = z.infer<typeof StructuredDataItemSchema>;

// ─── Page Info ───────────────────────────────────────────────

export const PageInfoSchema = z.object({
  url: z.string(),
  finalUrl: z.string().default(''),
  statusCode: z.number().default(0),
  responseTimeMs: z.number().default(0),
  contentLength: z.number().default(0),
  contentType: z.string().default(''),
  wordCount: z.number().default(0),
  language: z.string().default(''),
  charset: z.string().default(''),
  hasHttps: z.boolean().default(false),
  hasRobotsTxt: z.boolean().default(false),
  hasSitemap: z.boolean().default(false),
  robotsTxtContent: z.string().default(''),
});
export type PageInfo = z.infer<typeof PageInfoSchema>;

// ─── Crawl Data ──────────────────────────────────────────────

export const CrawlDataSchema = z.object({
  pageInfo: PageInfoSchema,
  meta: MetaInfoSchema.default({}),
  headings: z.array(HeadingInfoSchema).default([]),
  links: z.array(LinkInfoSchema).default([]),
  images: z.array(ImageInfoSchema).default([]),
  structuredData: z.array(StructuredDataItemSchema).default([]),
  rawHtml: z.string().default(''),
  textContent: z.string().default(''),
});
export type CrawlData = z.infer<typeof CrawlDataSchema>;

// ─── SEO Analysis ────────────────────────────────────────────

export type Severity = 'critical' | 'warning' | 'info' | 'good';

export const SEOIssueSchema = z.object({
  category: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['critical', 'warning', 'info', 'good']).default('info'),
  recommendation: z.string().default(''),
  currentValue: z.string().default(''),
  idealValue: z.string().default(''),
});
export type SEOIssue = z.infer<typeof SEOIssueSchema>;

export const SEOScoreSchema = z.object({
  category: z.string(),
  score: z.number().min(0).max(100),
  maxScore: z.number().default(100),
  details: z.string().default(''),
});
export type SEOScore = z.infer<typeof SEOScoreSchema>;

export const SEOAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100).default(0),
  scores: z.array(SEOScoreSchema).default([]),
  issues: z.array(SEOIssueSchema).default([]),
  strengths: z.array(z.string()).default([]),
  summary: z.string().default(''),
  llmRecommendations: z.string().default(''),
});
export type SEOAnalysis = z.infer<typeof SEOAnalysisSchema>;

// ─── Competitor ──────────────────────────────────────────────

export const CompetitorInfoSchema = z.object({
  url: z.string(),
  title: z.string().default(''),
  description: z.string().default(''),
  domain: z.string().default(''),
  keywordOverlap: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
});
export type CompetitorInfo = z.infer<typeof CompetitorInfoSchema>;

export const CompetitorDataSchema = z.object({
  targetUrl: z.string(),
  competitors: z.array(CompetitorInfoSchema).default([]),
  marketSummary: z.string().default(''),
  competitiveAdvantages: z.array(z.string()).default([]),
  competitiveGaps: z.array(z.string()).default([]),
  llmAnalysis: z.string().default(''),
});
export type CompetitorData = z.infer<typeof CompetitorDataSchema>;

// ─── Keywords ────────────────────────────────────────────────

export const KeywordInfoSchema = z.object({
  keyword: z.string(),
  density: z.number().default(0),
  count: z.number().default(0),
  inTitle: z.boolean().default(false),
  inDescription: z.boolean().default(false),
  inH1: z.boolean().default(false),
  inHeadings: z.boolean().default(false),
  inUrl: z.boolean().default(false),
  prominenceScore: z.number().default(0),
});
export type KeywordInfo = z.infer<typeof KeywordInfoSchema>;

export const KeywordDataSchema = z.object({
  targetUrl: z.string(),
  primaryKeywords: z.array(KeywordInfoSchema).default([]),
  secondaryKeywords: z.array(KeywordInfoSchema).default([]),
  missingKeywords: z.array(z.string()).default([]),
  keywordSuggestions: z.array(z.string()).default([]),
  contentGaps: z.array(z.string()).default([]),
  llmAnalysis: z.string().default(''),
});
export type KeywordData = z.infer<typeof KeywordDataSchema>;

// ─── Full Report ─────────────────────────────────────────────

export const SEOReportSchema = z.object({
  url: z.string(),
  timestamp: z.string(),
  crawlData: CrawlDataSchema.nullable().default(null),
  seoAnalysis: SEOAnalysisSchema.nullable().default(null),
  competitorData: CompetitorDataSchema.nullable().default(null),
  keywordData: KeywordDataSchema.nullable().default(null),
  executiveSummary: z.string().default(''),
  reportHtmlPath: z.string().default(''),
});
export type SEOReport = z.infer<typeof SEOReportSchema>;
