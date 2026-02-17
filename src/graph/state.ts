import { Annotation } from '@langchain/langgraph';
import type {
  CrawlData,
  SEOAnalysis,
  CompetitorData,
  KeywordData,
} from '../types.js';

/**
 * LangGraph State Definition for the SEO Agent Workflow.
 *
 * Uses reducers for fields that get updated by parallel nodes.
 * The `errors` field uses a list-append reducer so errors from
 * parallel branches accumulate instead of overwriting.
 */
export const SEOStateAnnotation = Annotation.Root({
  // Input
  url: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  // Crawl results
  crawlData: Annotation<CrawlData | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Parallel analysis results
  seoAnalysis: Annotation<SEOAnalysis | null>({
    reducer: (prev, next) => next ?? prev,
    default: () => null,
  }),

  competitorData: Annotation<CompetitorData | null>({
    reducer: (prev, next) => next ?? prev,
    default: () => null,
  }),

  keywordData: Annotation<KeywordData | null>({
    reducer: (prev, next) => next ?? prev,
    default: () => null,
  }),

  // Report
  reportPath: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  // Errors accumulate from all branches
  errors: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // Status tracking
  status: Annotation<string>({
    reducer: (_, next) => next,
    default: () => 'pending',
  }),
});

export type SEOGraphState = typeof SEOStateAnnotation.State;
