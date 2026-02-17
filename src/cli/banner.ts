import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';

export const COOL_GRADIENT = gradient(['#00d2ff', '#3a7bd5', '#7b2ff7']) as (text: string) => string;
export const FIRE_GRADIENT = gradient(['#f12711', '#f5af19', '#f12711']) as (text: string) => string;

export function showBanner(): void {
  const banner = figlet.textSync('SEO Agent', {
    font: 'ANSI Shadow',
    horizontalLayout: 'fitted',
  });

  console.log('');
  console.log(COOL_GRADIENT(banner));
  console.log('');
  console.log(
    chalk.gray('  ') +
    COOL_GRADIENT('AI-Powered SEO Analysis System') +
    chalk.gray('  |  ') +
    chalk.dim('v1.0.0')
  );
  console.log(
    chalk.gray('  ') +
    chalk.dim('LangGraph Orchestrator + Parallel Agent Execution')
  );
  console.log('');
  console.log(chalk.gray('  ' + '─'.repeat(60)));
  console.log('');
}

export function showAgentHeader(agentName: string): string {
  const icons: Record<string, string> = {
    crawl: '[ CRAWLER  ]',
    analyze: '[ ANALYZER ]',
    competitor: '[ COMPETE  ]',
    keyword: '[ KEYWORD  ]',
    report: '[ REPORTER ]',
  };
  return chalk.bold(COOL_GRADIENT(icons[agentName] || `[ ${agentName.toUpperCase()} ]`));
}

export function showScoreBar(score: number, width = 30): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;

  let color: (s: string) => string;
  if (score >= 80) color = chalk.green;
  else if (score >= 60) color = chalk.yellow;
  else if (score >= 40) color = (s: string) => chalk.hex('#ff8c00')(s);
  else color = chalk.red;

  const bar = color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  const scoreText = color(`${score}%`);

  return `${bar} ${scoreText}`;
}

export function showSeverityBadge(severity: string): string {
  switch (severity) {
    case 'critical':
      return FIRE_GRADIENT(' KRITISCH ');
    case 'warning':
      return chalk.bgYellow.black(' WARNUNG  ');
    case 'info':
      return chalk.bgBlue.white('  INFO    ');
    case 'good':
      return chalk.bgGreen.black('   GUT    ');
    default:
      return chalk.bgGray.white(`  ${severity.toUpperCase()}  `);
  }
}

