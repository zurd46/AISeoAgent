import { StateGraph } from '@langchain/langgraph';
import { SEOStateAnnotation, type SEOGraphState } from './state.js';
import { crawlerNode } from '../agents/crawler.js';
import { analyzerNode } from '../agents/analyzer.js';
import { competitorNode } from '../agents/competitor.js';
import { keywordNode } from '../agents/keyword.js';
import { reporterNode } from '../agents/reporter.js';

/**
 * Build the SEO Agent LangGraph Workflow.
 *
 * Workflow structure:
 *
 *   START
 *     |
 *   crawl
 *     |
 *   +---------+-----------+
 *   |         |           |
 *  analyze  competitor  keyword    (parallel)
 *   |         |           |
 *   +---------+-----------+
 *     |
 *   report
 *     |
 *    END
 */
export function buildSEOWorkflow() {
  const graph = new StateGraph(SEOStateAnnotation)
    // Add all agent nodes
    .addNode('crawl', crawlerNode)
    .addNode('analyze', analyzerNode)
    .addNode('competitor', competitorNode)
    .addNode('keyword', keywordNode)
    .addNode('report', reporterNode)

    // START -> crawl
    .addEdge('__start__', 'crawl')

    // crawl -> [analyze, competitor, keyword] (fan-out = parallel execution)
    .addEdge('crawl', 'analyze')
    .addEdge('crawl', 'competitor')
    .addEdge('crawl', 'keyword')

    // [analyze, competitor, keyword] -> report (fan-in = wait for all)
    .addEdge('analyze', 'report')
    .addEdge('competitor', 'report')
    .addEdge('keyword', 'report')

    // report -> END
    .addEdge('report', '__end__');

  return graph.compile();
}

/**
 * Run a full SEO analysis workflow for a given URL.
 */
export async function runSEOAnalysis(
  url: string,
  onProgress?: (state: SEOGraphState) => void
): Promise<SEOGraphState> {
  const workflow = buildSEOWorkflow();

  let finalState: SEOGraphState | null = null;

  // Stream events so we can report progress
  const stream = await workflow.stream(
    { url },
    { recursionLimit: 20 }
  );

  for await (const event of stream) {
    // Each event is { nodeName: stateUpdate }
    if (onProgress) {
      // Merge event into a progress view
      const nodeNames = Object.keys(event);
      for (const nodeName of nodeNames) {
        const update = event[nodeName] as Partial<SEOGraphState>;
        if (update.status) {
          onProgress({ ...update, url } as SEOGraphState);
        }
      }
    }
    // Keep track of the latest state via the event values
    const values = Object.values(event);
    if (values.length > 0) {
      finalState = values[values.length - 1] as SEOGraphState;
    }
  }

  if (!finalState) {
    throw new Error('Workflow produced no output');
  }

  return finalState;
}
