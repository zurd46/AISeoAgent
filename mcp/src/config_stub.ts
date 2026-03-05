export const config = {
  http: {
    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30', 10) * 1000,
    userAgent: 'Mozilla/5.0 (compatible; AI-SEO-Agent/1.0; +https://github.com/ai-seo-agent)',
  },
};
