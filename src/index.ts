#!/usr/bin/env node

import { Command } from 'commander';
import { runFullAnalysis, runQuickCrawl } from './cli/app.js';

const program = new Command();

program
  .name('seo-agent')
  .description('AI-powered SEO Analysis Agent System')
  .version('1.0.0');

program
  .command('analyze')
  .description('Vollstaendige SEO-Analyse mit allen Agents (Crawl + SEO + Konkurrenz + Keywords + Report)')
  .argument('<url>', 'URL der zu analysierenden Webseite')
  .action(async (url: string) => {
    await runFullAnalysis(url);
  });

program
  .command('crawl')
  .description('Schneller Crawl einer Webseite (nur Daten sammeln)')
  .argument('<url>', 'URL der zu crawlenden Webseite')
  .action(async (url: string) => {
    await runQuickCrawl(url);
  });

program.parse();
