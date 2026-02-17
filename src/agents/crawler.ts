import { fetchPage } from '../tools/scraper.js';
import type { SEOGraphState } from '../graph/state.js';

/**
 * Crawler Agent Node - fetches the target URL and extracts all SEO-relevant data.
 */
export async function crawlerNode(
  state: SEOGraphState
): Promise<Partial<SEOGraphState>> {
  try {
    const crawlData = await fetchPage(state.url);
    return {
      crawlData,
      status: 'crawled',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Crawl fehlgeschlagen: ${msg}`],
      status: 'error',
    };
  }
}
