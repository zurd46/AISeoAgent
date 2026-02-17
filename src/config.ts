import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ROOT = join(__dirname, '..');
export const REPORTS_DIR = join(PROJECT_ROOT, 'reports');

mkdirSync(REPORTS_DIR, { recursive: true });

export const config = {
  llmProvider: process.env.LLM_PROVIDER || 'ollama',

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.1',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
  },

  http: {
    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30', 10) * 1000,
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5', 10),
    userAgent:
      'Mozilla/5.0 (compatible; AI-SEO-Agent/1.0; +https://github.com/ai-seo-agent)',
  },

  reportsDir: REPORTS_DIR,
} as const;

export async function getLLM() {
  switch (config.llmProvider) {
    case 'anthropic': {
      const { ChatAnthropic } = await import('@langchain/anthropic');
      return new ChatAnthropic({
        model: config.anthropic.model,
        anthropicApiKey: config.anthropic.apiKey,
        temperature: 0,
      });
    }
    case 'openai': {
      const { ChatOpenAI } = await import('@langchain/openai');
      return new ChatOpenAI({
        model: config.openai.model,
        openAIApiKey: config.openai.apiKey,
        temperature: 0,
      });
    }
    case 'ollama':
    default: {
      const { ChatOllama } = await import('@langchain/ollama');
      return new ChatOllama({
        model: config.ollama.model,
        baseUrl: config.ollama.baseUrl,
        temperature: 0,
      });
    }
  }
}
