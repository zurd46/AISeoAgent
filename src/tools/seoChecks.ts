import type { CrawlData, SEOIssue, SEOScore, Severity } from '../types.js';

type CheckResult = { score: SEOScore; issues: SEOIssue[] };

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function iss(
  category: string, title: string, description: string, severity: Severity,
  recommendation: string, currentValue: string, idealValue: string
): SEOIssue {
  return { category, title, description, severity, recommendation, currentValue, idealValue };
}

function res(category: string, score: number, issues: SEOIssue[], details: string): CheckResult {
  return { score: { category, score: Math.max(score, 0), maxScore: 100, details }, issues };
}

// ═══════════════════════════════════════════════════════════════
// 1. TITLE TAG
// ═══════════════════════════════════════════════════════════════

export function checkTitle(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const { title, titleLength } = crawl.meta;

  if (!title) {
    return res('Title Tag', 0, [iss('Title Tag', 'Missing title tag',
      'The page has no title tag. The title is the most important on-page SEO factor and is displayed as the headline in search results.', 'critical',
      'Add a unique, descriptive title tag containing the main keyword, 50-60 characters long. Format: "Main Keyword - Description | Brand".',
      'No title', '50-60 characters')], '');
  }

  if (titleLength < 30) {
    score -= 30;
    issues.push(iss('Title Tag', 'Title too short',
      `The title has only ${titleLength} characters. Search engines prefer titles with 50-60 characters; short titles waste SERP space.`, 'warning',
      'Expand the title with relevant keywords to 50-60 characters. Example: "Main Keyword - Description | Brand".',
      `${titleLength} chars`, '50-60 chars'));
  } else if (titleLength > 60) {
    score -= 15;
    issues.push(iss('Title Tag', 'Title too long',
      `The title has ${titleLength} characters and will be truncated in Google search results. Important information may be lost.`, 'warning',
      'Shorten the title to max 60 characters. Place the most important keywords at the beginning, brand name at the end.',
      `${titleLength} chars`, '50-60 chars'));
  }

  // Title is only domain name
  try {
    const domain = new URL(crawl.pageInfo.url).hostname.replace('www.', '');
    if (title.toLowerCase().replace(/[^a-z0-9]/g, '') === domain.replace(/[^a-z0-9.]/g, '').replace(/\./g, '')) {
      score -= 25;
      issues.push(iss('Title Tag', 'Title is only domain name',
        'The title consists only of the domain name and contains no descriptive keywords.', 'warning',
        'Create a descriptive title with the main keyword. Format: "Main Keyword - Description | Brand".',
        title, 'Descriptive title'));
    }
  } catch { /* ignore */ }

  // Title starts with separator
  if (/^[\s|:\-–—]/.test(title)) {
    score -= 10;
    issues.push(iss('Title Tag', 'Title starts with separator',
      'The title starts with a special character instead of relevant keywords. The first words of the title have the highest SEO impact.', 'info',
      'Place the most important keywords at the beginning of the title. Use separators only to set off the brand name at the end.',
      title.slice(0, 20), 'Keywords first'));
  }

  // Duplicate words in title
  const titleWords = title.toLowerCase().match(/\b\w{3,}\b/g) || [];
  const wordFreq = new Map<string, number>();
  for (const w of titleWords) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
  const repeatedWords = [...wordFreq.entries()].filter(([, c]) => c >= 3);
  if (repeatedWords.length > 0) {
    score -= 10;
    issues.push(iss('Title Tag', 'Repeated words in title',
      `The word "${repeatedWords[0]![0]}" appears ${repeatedWords[0]![1]} times in the title. This looks like keyword stuffing to search engines.`, 'warning',
      'Use each keyword only once or twice in the title. Use synonyms and variations instead of repeating.',
      `"${repeatedWords[0]![0]}" ${repeatedWords[0]![1]}x`, 'Max 2x per word'));
  }

  // All caps title
  if (title === title.toUpperCase() && title.length > 10) {
    score -= 5;
    issues.push(iss('Title Tag', 'Title in ALL CAPS',
      'The entire title is written in uppercase. Google may rewrite titles that appear to be shouting.', 'info',
      'Use standard title case or sentence case for better readability and professionalism.',
      'ALL CAPS', 'Title Case'));
  }

  // Title has numbers/power words (positive signal)
  const hasNumbers = /\d/.test(title);
  const powerWords = /\b(best|top|free|new|ultimate|guide|how|why|review|tips|easy|fast|proven|secret|exclusive)\b/i;
  const hasPowerWords = powerWords.test(title);
  if (hasNumbers || hasPowerWords) {
    issues.push(iss('Title Tag', 'Title contains CTR boosters',
      `The title contains ${hasNumbers ? 'numbers' : ''}${hasNumbers && hasPowerWords ? ' and ' : ''}${hasPowerWords ? 'power words' : ''}, which can increase click-through rates in search results.`, 'good',
      'Continue using numbers and compelling words in titles for better CTR.',
      hasNumbers && hasPowerWords ? 'Numbers + power words' : hasNumbers ? 'Numbers' : 'Power words', ''));
  }

  return res('Title Tag', score, issues, title);
}

// ═══════════════════════════════════════════════════════════════
// 2. META DESCRIPTION
// ═══════════════════════════════════════════════════════════════

export function checkMetaDescription(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const { description, descriptionLength } = crawl.meta;

  if (!description) {
    return res('Meta Description', 0, [iss('Meta Description', 'Missing meta description',
      'No meta description present. Google will display a random text snippet instead, which is often not optimal.', 'critical',
      'Create a unique, compelling meta description of 150-160 characters. It should contain the main keyword and have a call-to-action (e.g., "Discover now", "Learn more").',
      'No description', '150-160 chars')], '');
  }

  if (descriptionLength < 80) {
    score -= 30;
    issues.push(iss('Meta Description', 'Meta description much too short',
      `The description has only ${descriptionLength} characters and does not fully utilize the available SERP space.`, 'warning',
      'Expand the description to 150-160 characters. Include keywords, USP, and a call-to-action.',
      `${descriptionLength} chars`, '150-160 chars'));
  } else if (descriptionLength < 120) {
    score -= 15;
    issues.push(iss('Meta Description', 'Meta description slightly short',
      `The description has ${descriptionLength} characters. Optimal length: 150-160 characters.`, 'info',
      'Expand the description to 150-160 characters for maximum visibility in search results.',
      `${descriptionLength} chars`, '150-160 chars'));
  } else if (descriptionLength > 160) {
    score -= 10;
    issues.push(iss('Meta Description', 'Meta description too long',
      `The description has ${descriptionLength} characters and will be truncated in search results.`, 'info',
      'Shorten the description to max 160 characters. The most important message must be in the first 120 characters.',
      `${descriptionLength} chars`, '150-160 chars'));
  }

  // Description identical to title
  if (description.toLowerCase().trim() === crawl.meta.title.toLowerCase().trim() && description.length > 0) {
    score -= 15;
    issues.push(iss('Meta Description', 'Description identical to title',
      'Meta description and title tag are identical. Both should have different, complementary content.', 'warning',
      'Write an independent description that complements the title and provides more details about the page content.',
      'Identical to title', 'Unique text'));
  }

  // Call-to-action check
  const ctaPatterns = /\b(discover|learn|find out|get|try|start|download|sign up|contact|buy|order|book|explore|read|see|check|compare|join|subscribe|register|call|request|jetzt|erfahren|entdecken|mehr|hier|kostenlos)\b/i;
  if (!ctaPatterns.test(description)) {
    score -= 5;
    issues.push(iss('Meta Description', 'No call-to-action in description',
      'The meta description lacks a call-to-action. CTAs in descriptions can significantly increase click-through rates.', 'info',
      'Add a compelling call-to-action like "Discover now", "Learn more", "Start free trial", or "Compare options".',
      'No CTA', 'CTA present'));
  }

  // Contains numbers (positive signal for CTR)
  if (/\d/.test(description)) {
    issues.push(iss('Meta Description', 'Description contains numbers',
      'Numbers in the meta description (prices, percentages, counts) attract attention and can boost click-through rates.', 'good',
      'Continue including specific numbers, stats, or data in descriptions.',
      'Numbers present', ''));
  }

  return res('Meta Description', score, issues, description.slice(0, 100));
}

// ═══════════════════════════════════════════════════════════════
// 3. HEADINGS
// ═══════════════════════════════════════════════════════════════

export function checkHeadings(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  const h1Tags = crawl.headings.filter((h) => h.level === 1);
  const h2Tags = crawl.headings.filter((h) => h.level === 2);
  const h3Tags = crawl.headings.filter((h) => h.level === 3);

  if (h1Tags.length === 0) {
    score -= 40;
    issues.push(iss('Headings', 'No H1 tag',
      'The page has no H1 tag. The H1 is the second most important on-page SEO factor after the title and signals the main topic to search engines.', 'critical',
      'Add exactly one H1 tag containing the main keyword of the page and clearly describing the page content.',
      '0 H1 tags', '1 H1 tag'));
  } else if (h1Tags.length > 1) {
    score -= 20;
    issues.push(iss('Headings', 'Multiple H1 tags',
      `The page has ${h1Tags.length} H1 tags. Only one H1 should be used per page to clearly define the main topic.`, 'warning',
      'Convert all but one H1 tag to H2 tags. The remaining H1 should be the main headline of the page.',
      `${h1Tags.length} H1 tags`, '1 H1 tag'));
  } else {
    const h1Text = h1Tags[0]!.text;
    if (h1Text.length > 70) {
      score -= 10;
      issues.push(iss('Headings', 'H1 too long',
        `The H1 tag has ${h1Text.length} characters. Overly long H1 tags lose SEO focus.`, 'info',
        'Shorten the H1 to max 70 characters and focus on the main keyword.',
        `${h1Text.length} chars`, 'Max 70 chars'));
    }
    if (h1Text.toLowerCase().trim() === crawl.meta.title.toLowerCase().trim() && h1Text.length > 0) {
      score -= 5;
      issues.push(iss('Headings', 'H1 identical to title',
        'H1 tag and title tag are word-for-word identical. A slight variation covers more keyword variants.', 'info',
        'Slightly vary the H1 from the title, e.g., by formulating it more explicitly or using a different keyword variation.',
        'Identical', 'Slightly varied'));
    }
  }

  if (h2Tags.length === 0 && crawl.pageInfo.wordCount > 100) {
    score -= 15;
    issues.push(iss('Headings', 'No H2 tags',
      'The page has no H2 tags. H2 tags structure the content and help search engines understand the topic organization.', 'warning',
      'Use H2 tags to divide the content into logical sections. Each H2 should contain a relevant sub-keyword.',
      '0 H2 tags', '2-8 H2 tags'));
  }

  // Hierarchy check (headings in document order!)
  const levels = crawl.headings.map((h) => h.level);
  for (let i = 1; i < levels.length; i++) {
    if (levels[i]! > levels[i - 1]! + 1) {
      score -= 10;
      issues.push(iss('Headings', 'Heading hierarchy broken',
        `Jump from H${levels[i - 1]} directly to H${levels[i]}. Intermediate levels were skipped.`, 'warning',
        `Insert missing heading level H${levels[i - 1]! + 1}. The hierarchy must be continuous: H1 → H2 → H3.`,
        `H${levels[i - 1]} → H${levels[i]}`, 'Continuous hierarchy'));
      break;
    }
  }

  // Duplicate headings
  const headingTexts = crawl.headings.map((h) => h.text.toLowerCase().trim());
  const duplicates = headingTexts.filter((t, i) => headingTexts.indexOf(t) !== i);
  const uniqueDuplicates = [...new Set(duplicates)];
  if (uniqueDuplicates.length > 0) {
    score -= 10;
    issues.push(iss('Headings', 'Duplicate headings',
      `${uniqueDuplicates.length} heading(s) appear multiple times: "${uniqueDuplicates[0]}"`, 'info',
      'Each heading should be unique and cover a different aspect of the topic.',
      `${uniqueDuplicates.length} duplicates`, '0 duplicates'));
  }

  // Very short headings (likely non-descriptive)
  const shortHeadings = crawl.headings.filter(h => h.text.length < 5 && h.text.length > 0);
  if (shortHeadings.length > 0) {
    score -= 5;
    issues.push(iss('Headings', 'Very short headings found',
      `${shortHeadings.length} heading(s) have fewer than 5 characters (e.g., "${shortHeadings[0]!.text}"). These are likely not descriptive enough.`, 'info',
      'Use descriptive headings that clearly communicate the content of each section.',
      `${shortHeadings.length} short headings`, 'Descriptive headings'));
  }

  // Keyword stuffing across headings
  const allHeadingWords = crawl.headings.flatMap(h => h.text.toLowerCase().match(/\b\w{4,}\b/g) || []);
  const headingWordFreq = new Map<string, number>();
  for (const w of allHeadingWords) headingWordFreq.set(w, (headingWordFreq.get(w) || 0) + 1);
  const stuffedWords = [...headingWordFreq.entries()].filter(([, c]) => c >= 5 && crawl.headings.length >= 4);
  if (stuffedWords.length > 0) {
    score -= 10;
    issues.push(iss('Headings', 'Keyword repetition in headings',
      `The word "${stuffedWords[0]![0]}" appears in ${stuffedWords[0]![1]} headings. Excessive repetition may look like keyword stuffing.`, 'warning',
      'Vary the wording across headings. Use synonyms and related terms instead of repeating the same keyword.',
      `"${stuffedWords[0]![0]}" in ${stuffedWords[0]![1]} headings`, 'Varied keywords'));
  }

  // Content depth: headings per word count
  if (crawl.pageInfo.wordCount > 600 && crawl.headings.length < 3) {
    score -= 5;
    issues.push(iss('Headings', 'Too few headings for content length',
      `Only ${crawl.headings.length} heading(s) for ${crawl.pageInfo.wordCount} words. Long content should be well-structured with subheadings every 200-300 words.`, 'info',
      'Add more subheadings (H2, H3) to break up the content and improve readability and SEO.',
      `${crawl.headings.length} headings / ${crawl.pageInfo.wordCount} words`, '1 heading per ~300 words'));
  }

  return res('Headings', score, issues, `H1: ${h1Tags.length}, H2: ${h2Tags.length}, H3: ${h3Tags.length}`);
}

// ═══════════════════════════════════════════════════════════════
// 4. IMAGES
// ═══════════════════════════════════════════════════════════════

export function checkImages(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const total = crawl.images.length;

  if (total === 0) {
    if (crawl.pageInfo.wordCount > 300) {
      score -= 10;
      issues.push(iss('Images', 'No images on the page',
        'The page has no visual content. Images improve user experience and drive traffic through Google Image Search.', 'info',
        'Add relevant images with descriptive alt texts and optimized file names (e.g., "red-sofa-living-room.jpg").',
        '0 images', 'Min 1 image'));
    }
    return res('Images', score, issues, 'No images');
  }

  const withoutAlt = crawl.images.filter((img) => !img.hasAlt);
  const pctWithout = (withoutAlt.length / total) * 100;

  if (pctWithout > 50) {
    score -= 35;
    issues.push(iss('Images', 'Many images without alt text',
      `${withoutAlt.length} of ${total} images (${Math.round(pctWithout)}%) have no alt text. Alt texts are essential for SEO and accessibility.`, 'critical',
      'Add descriptive alt texts to all images. The alt text should describe the image content and include a keyword when appropriate (5-15 words).',
      `${withoutAlt.length}/${total} no alt`, '0 without alt text'));
  } else if (pctWithout > 20) {
    score -= 20;
    issues.push(iss('Images', 'Images without alt text',
      `${withoutAlt.length} of ${total} images have no alt text.`, 'warning',
      'Add missing alt texts. The alt text should precisely describe the image content.',
      `${withoutAlt.length}/${total} no alt`, '0 without alt text'));
  } else if (pctWithout > 0) {
    score -= 8;
    issues.push(iss('Images', 'Some images without alt text',
      `${withoutAlt.length} of ${total} images have no alt text.`, 'info',
      'Add the missing alt texts.',
      `${withoutAlt.length}/${total} no alt`, '0 without alt text'));
  }

  // Generic alt texts
  const genericPatterns = /^(image|img|foto|photo|bild|picture|banner|logo|icon|grafik|graphic|untitled|dsc[_\d]|img[_\d]|screenshot)\s*\d*$/i;
  const genericAlts = crawl.images.filter((img) => img.hasAlt && genericPatterns.test(img.alt.trim()));
  if (genericAlts.length > 0) {
    score -= 10;
    issues.push(iss('Images', 'Generic alt texts',
      `${genericAlts.length} images have meaningless alt texts like "image" or "photo".`, 'warning',
      'Replace generic alt texts with descriptive ones. Instead of "image", use e.g., "Red sofa in modern living room".',
      `${genericAlts.length} generic`, 'Descriptive texts'));
  }

  // Alt texts too long
  const longAlts = crawl.images.filter((img) => img.alt.length > 125);
  if (longAlts.length > 0) {
    score -= 5;
    issues.push(iss('Images', 'Alt texts too long',
      `${longAlts.length} images have alt texts over 125 characters. Screen readers read these in full.`, 'info',
      'Shorten alt texts to max 125 characters. Describe the image content precisely and concisely.',
      `${longAlts.length} too long`, 'Max 125 chars'));
  }

  // Missing width/height (CLS)
  const withoutDimensions = crawl.images.filter(img => !img.width && !img.height);
  if (withoutDimensions.length > 3) {
    score -= 10;
    issues.push(iss('Images', 'Images without width/height attributes',
      `${withoutDimensions.length} images have no width/height attributes. This causes layout shifts (CLS) as the page loads, which hurts Core Web Vitals.`, 'warning',
      'Add explicit width and height attributes to all <img> tags, or use CSS aspect-ratio. This prevents Cumulative Layout Shift.',
      `${withoutDimensions.length} missing dimensions`, 'All images with dimensions'));
  }

  // Next-gen image formats
  const imageExtensions = crawl.images
    .map(img => img.src.split('?')[0]?.split('.').pop()?.toLowerCase() || '')
    .filter(Boolean);
  const legacyFormats = imageExtensions.filter(ext => ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext));
  const nextGenFormats = imageExtensions.filter(ext => ['webp', 'avif', 'svg'].includes(ext));
  if (legacyFormats.length > 3 && nextGenFormats.length === 0) {
    score -= 8;
    issues.push(iss('Images', 'No next-gen image formats',
      `All ${legacyFormats.length} images use legacy formats (JPEG/PNG/GIF). Next-gen formats like WebP and AVIF offer 25-50% smaller file sizes.`, 'info',
      'Convert images to WebP or AVIF format. Use <picture> with srcset for browser fallback. Most CDNs offer automatic conversion.',
      `${legacyFormats.length} legacy formats`, 'WebP/AVIF'));
  }

  // Non-descriptive filenames
  const genericFilenames = /\/(img|image|photo|pic|dsc|dcim|screen|untitled|asset|media|download|file)[_\-]?\d+\./i;
  const badFilenames = crawl.images.filter(img => genericFilenames.test(img.src));
  if (badFilenames.length > 2) {
    score -= 5;
    issues.push(iss('Images', 'Non-descriptive image filenames',
      `${badFilenames.length} images have generic filenames like "IMG_1234.jpg". Descriptive filenames help with image SEO.`, 'info',
      'Rename image files with descriptive, keyword-rich names: "red-leather-sofa.webp" instead of "IMG_1234.jpg".',
      `${badFilenames.length} generic names`, 'Descriptive filenames'));
  }

  // Lazy loading
  const aboveFoldImages = crawl.images.slice(0, 3); // First 3 images likely above the fold
  const belowFoldImages = crawl.images.slice(3);
  const nonLazyBelow = belowFoldImages.filter(img => !img.isLazyLoaded);
  if (nonLazyBelow.length > 5) {
    score -= 5;
    issues.push(iss('Images', 'Many images without lazy loading',
      `${nonLazyBelow.length} below-the-fold images are not lazy loaded. This increases initial page load time.`, 'info',
      'Add loading="lazy" to images below the fold. Do NOT lazy-load the first visible images (LCP).',
      `${nonLazyBelow.length} not lazy`, 'Lazy loading for below-fold'));
  }

  return res('Images', score, issues, `${total} images, ${total - withoutAlt.length} with alt`);
}

// ═══════════════════════════════════════════════════════════════
// 5. LINKS
// ═══════════════════════════════════════════════════════════════

export function checkLinks(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  const internal = crawl.links.filter((l) => l.isInternal);
  const external = crawl.links.filter((l) => !l.isInternal);
  const totalLinks = crawl.links.length;

  if (internal.length === 0) {
    score -= 30;
    issues.push(iss('Links', 'No internal links',
      'The page has no internal links. Internal linking is crucial for crawlability, site architecture, and PageRank distribution.', 'critical',
      'Add at least 3-5 internal links to topically relevant pages. Use descriptive anchor texts with keywords.',
      '0 internal', '10+ internal links'));
  } else if (internal.length < 3) {
    score -= 20;
    issues.push(iss('Links', 'Few internal links',
      `Only ${internal.length} internal links. Strong internal linking helps search engines discover all pages and ranks important pages higher.`, 'warning',
      'Add more internal links to related content. Contextual links within body text are the most valuable.',
      `${internal.length} internal`, '10+ internal links'));
  }

  if (external.length === 0 && crawl.pageInfo.wordCount > 300) {
    score -= 5;
    issues.push(iss('Links', 'No external links',
      'The page links to no external source. Outbound links to authoritative sources can strengthen topical relevance and credibility.', 'info',
      'Add relevant external links to trustworthy sources (e.g., studies, official sites, industry portals).',
      '0 external', '2-5 external links'));
  }

  const emptyAnchor = crawl.links.filter((l) => !l.text.trim());
  if (emptyAnchor.length > 0) {
    score -= 10;
    issues.push(iss('Links', 'Links without anchor text',
      `${emptyAnchor.length} links have no visible anchor text. Search engines use anchor text to classify the target page thematically.`, 'warning',
      'Give all links descriptive anchor texts. Instead of "click here", better "Download SEO guide".',
      `${emptyAnchor.length} empty`, '0 without anchor text'));
  }

  if (totalLinks > 150) {
    score -= 10;
    issues.push(iss('Links', 'Very many links on the page',
      `The page has ${totalLinks} links. Too many links dilute the PageRank per link and can overwhelm crawlers.`, 'info',
      'Check if all links are necessary. Streamline navigation, reduce unimportant footer links.',
      `${totalLinks} links`, 'Max 100-150'));
  }

  const internalNofollow = internal.filter((l) => l.isNofollow);
  if (internalNofollow.length > 0) {
    score -= 10;
    issues.push(iss('Links', 'Internal links with nofollow',
      `${internalNofollow.length} internal links are marked as nofollow. This blocks PageRank passing to your own pages.`, 'warning',
      'Remove nofollow from internal links. Nofollow should only be used for external links to untrusted sources.',
      `${internalNofollow.length} nofollow`, '0 internal nofollow'));
  }

  // Generic anchor texts
  const genericAnchors = /^(click here|here|read more|more|learn more|link|klicken|mehr|weiterlesen|hier|details|info)$/i;
  const genericAnchorLinks = crawl.links.filter(l => l.text.trim() && genericAnchors.test(l.text.trim()));
  if (genericAnchorLinks.length > 2) {
    score -= 8;
    issues.push(iss('Links', 'Generic anchor texts',
      `${genericAnchorLinks.length} links use generic anchor texts like "click here" or "read more". These provide no keyword signals to search engines.`, 'warning',
      'Replace generic anchors with descriptive keyword-rich texts. E.g., "Learn about SEO best practices" instead of "Read more".',
      `${genericAnchorLinks.length} generic`, 'Descriptive anchors'));
  }

  // Duplicate links to same URL
  const linkUrls = crawl.links.map(l => l.url);
  const urlCounts = new Map<string, number>();
  for (const u of linkUrls) urlCounts.set(u, (urlCounts.get(u) || 0) + 1);
  const heavilyDuplicated = [...urlCounts.entries()].filter(([, c]) => c >= 5);
  if (heavilyDuplicated.length > 0) {
    score -= 5;
    issues.push(iss('Links', 'Excessive duplicate links',
      `${heavilyDuplicated.length} URL(s) are linked 5+ times on the page. Only the first link's anchor text counts for SEO.`, 'info',
      'Reduce duplicate links. Multiple links to the same URL on one page do not add extra SEO value.',
      `${heavilyDuplicated.length} URLs linked 5+ times`, 'Minimal duplication'));
  }

  return res('Links', score, issues, `${internal.length} internal, ${external.length} external`);
}

// ═══════════════════════════════════════════════════════════════
// 6. TECHNICAL
// ═══════════════════════════════════════════════════════════════

export function checkTechnical(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  // HTTP Status
  if (crawl.pageInfo.statusCode !== 200) {
    score -= 40;
    issues.push(iss('Technical', 'HTTP status code not 200',
      `The page responds with status ${crawl.pageInfo.statusCode} instead of 200 OK.`, 'critical',
      `Fix status code ${crawl.pageInfo.statusCode}. 301/302 = check redirect, 4xx = page not found, 5xx = fix server error.`,
      `${crawl.pageInfo.statusCode}`, '200 OK'));
  }

  // HTTPS
  if (!crawl.pageInfo.hasHttps) {
    score -= 25;
    issues.push(iss('Technical', 'No HTTPS',
      'The page does not use HTTPS. Google considers HTTPS a ranking factor and Chrome marks HTTP pages as "not secure".', 'critical',
      'Install an SSL/TLS certificate (Let\'s Encrypt is free) and redirect all HTTP URLs to HTTPS via 301.',
      'HTTP', 'HTTPS'));
  }

  // Redirect
  if (crawl.pageInfo.finalUrl && crawl.pageInfo.finalUrl !== crawl.pageInfo.url) {
    score -= 5;
    issues.push(iss('Technical', 'URL redirect detected',
      `The URL redirects: ${crawl.pageInfo.url} → ${crawl.pageInfo.finalUrl}`, 'info',
      'Ensure the canonical URL is linked directly. Avoid unnecessary redirect chains.',
      'Redirect', 'Direct URL'));
  }

  // Load time
  if (crawl.pageInfo.responseTimeMs > 3000) {
    score -= 25;
    issues.push(iss('Technical', 'Very slow load time',
      `Server response time: ${crawl.pageInfo.responseTimeMs}ms. Google recommends a TTFB under 200ms.`, 'critical',
      'Optimize server performance: enable caching, use a CDN, upgrade hosting, optimize database queries.',
      `${crawl.pageInfo.responseTimeMs}ms`, '<500ms'));
  } else if (crawl.pageInfo.responseTimeMs > 1000) {
    score -= 10;
    issues.push(iss('Technical', 'Slow load time',
      `Server response time: ${crawl.pageInfo.responseTimeMs}ms. Target: under 500ms.`, 'warning',
      'Check server caching, compress assets (gzip/brotli), consider a CDN.',
      `${crawl.pageInfo.responseTimeMs}ms`, '<500ms'));
  }

  // Robots.txt
  if (!crawl.pageInfo.hasRobotsTxt) {
    score -= 8;
    issues.push(iss('Technical', 'No robots.txt',
      'No robots.txt file found. The robots.txt controls which areas search engines are allowed to crawl.', 'warning',
      'Create robots.txt in root: "User-agent: *\\nAllow: /\\nSitemap: https://domain.com/sitemap.xml".',
      'Missing', 'Present'));
  }

  // Meta Robots noindex
  const robotsMeta = crawl.meta.robots.toLowerCase();
  if (robotsMeta.includes('noindex')) {
    score -= 40;
    issues.push(iss('Technical', 'Page blocked with noindex',
      'The page is marked with meta robots "noindex" and will NOT be indexed by Google!', 'critical',
      'Remove the noindex tag if the page should appear in search results.',
      robotsMeta, 'index, follow'));
  }
  if (robotsMeta.includes('nofollow') && !robotsMeta.includes('noindex')) {
    score -= 10;
    issues.push(iss('Technical', 'Page marked with nofollow',
      'Meta robots "nofollow" blocks following all links on this page.', 'warning',
      'Remove nofollow from meta robots so search engines can follow the links.',
      robotsMeta, 'index, follow'));
  }

  // Sitemap
  if (!crawl.pageInfo.hasSitemap) {
    score -= 8;
    issues.push(iss('Technical', 'No XML sitemap',
      'No sitemap.xml found. A sitemap helps search engines find and index all pages efficiently.', 'warning',
      'Create an XML sitemap at /sitemap.xml and reference it in the robots.txt.',
      'Missing', 'Present'));
  }

  // Viewport (Mobile-First)
  if (!crawl.meta.viewport) {
    score -= 15;
    issues.push(iss('Technical', 'No viewport meta tag',
      'No viewport tag present. Since Google\'s mobile-first index, this is absolutely critical for rankings.', 'critical',
      'Add in <head>: <meta name="viewport" content="width=device-width, initial-scale=1">.',
      'Missing', 'Viewport present'));
  }

  // Canonical
  if (!crawl.meta.canonical) {
    score -= 5;
    issues.push(iss('Technical', 'No canonical tag',
      'No canonical link present. The canonical tag prevents duplicate content issues with multiple URL variants.', 'info',
      'Add a self-referencing canonical tag: <link rel="canonical" href="[current URL]">.',
      'Missing', 'Self-referencing canonical'));
  }

  // Language
  if (!crawl.pageInfo.language) {
    score -= 8;
    issues.push(iss('Technical', 'No lang attribute',
      'The HTML element has no lang attribute. This helps search engines and screen readers correctly identify the language.', 'warning',
      'Add a lang attribute to the <html> tag: <html lang="de"> or <html lang="en">.',
      'Missing', 'e.g. lang="en"'));
  }

  // Page size
  const pageSizeKB = Math.round(crawl.pageInfo.contentLength / 1024);
  if (pageSizeKB > 3000) {
    score -= 10;
    issues.push(iss('Technical', 'Very large HTML page',
      `The page is ${pageSizeKB} KB. Large HTML files load slower and strain mobile connections.`, 'warning',
      'Slim down HTML: externalize inline CSS/JS, remove unnecessary comments, enable compression.',
      `${pageSizeKB} KB`, '<500 KB'));
  }

  // DOCTYPE
  if (!crawl.hasDoctype) {
    score -= 5;
    issues.push(iss('Technical', 'Missing DOCTYPE declaration',
      'The page has no <!DOCTYPE html> declaration. Without it, browsers may render the page in quirks mode, causing inconsistent rendering.', 'warning',
      'Add <!DOCTYPE html> as the very first line of the HTML document.',
      'Missing', '<!DOCTYPE html>'));
  }

  // Favicon
  if (!crawl.hasFavicon) {
    score -= 3;
    issues.push(iss('Technical', 'No favicon',
      'No favicon link tag found. A favicon improves brand recognition in browser tabs, bookmarks, and search results.', 'info',
      'Add a favicon: <link rel="icon" href="/favicon.ico"> and <link rel="apple-touch-icon" href="/apple-touch-icon.png">.',
      'Missing', 'Favicon present'));
  }

  // Mixed content
  if (crawl.performance.hasMixedContent) {
    score -= 15;
    issues.push(iss('Technical', 'Mixed content detected',
      `${crawl.performance.mixedContentUrls.length} HTTP resource(s) loaded on HTTPS page. Browsers may block these resources, breaking functionality.`, 'critical',
      'Update all resource URLs to use HTTPS. Check scripts, stylesheets, images, and iframes.',
      `${crawl.performance.mixedContentUrls.length} HTTP resources`, '0 mixed content'));
  }

  // Deprecated HTML tags
  if (crawl.contentDetail.hasDeprecatedTags) {
    score -= 5;
    issues.push(iss('Technical', 'Deprecated HTML tags found',
      `Deprecated HTML tags detected: ${crawl.contentDetail.deprecatedTags.join(', ')}. These may not render correctly in modern browsers.`, 'info',
      'Replace deprecated tags with modern CSS equivalents. E.g., <font> → CSS font-family, <center> → CSS text-align.',
      crawl.contentDetail.deprecatedTags.join(', '), 'No deprecated tags'));
  }

  return res('Technical', score, issues, '');
}

// ═══════════════════════════════════════════════════════════════
// 7. CONTENT
// ═══════════════════════════════════════════════════════════════

export function checkContent(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const wc = crawl.pageInfo.wordCount;

  if (wc < 100) {
    score -= 40;
    issues.push(iss('Content', 'Extremely little content',
      `Only ${wc} words. Search engines can barely evaluate the page content. Thin content can lead to worse rankings.`, 'critical',
      'Create at least 300 words of high-quality, unique content that fulfills the user\'s search intent.',
      `${wc} words`, '300+ words'));
  } else if (wc < 300) {
    score -= 25;
    issues.push(iss('Content', 'Little content',
      `Only ${wc} words. Good rankings typically require more than 300 words.`, 'warning',
      'Expand content: answer target audience questions, cover related topics, create value compared to competitors.',
      `${wc} words`, '300+ words'));
  } else if (wc < 600) {
    score -= 10;
    issues.push(iss('Content', 'Moderate content volume',
      `${wc} words. For competitive keywords, 600+ words are recommended.`, 'info',
      'Increase content volume if meaningful. Quality over quantity — 500 good words are better than 1000 poor ones.',
      `${wc} words`, '600+ words'));
  }

  // Text-to-HTML ratio
  if (crawl.rawHtml.length > 0 && crawl.textContent.length > 0) {
    const ratio = Math.round((crawl.textContent.length / crawl.rawHtml.length) * 100);
    if (ratio < 10 && crawl.rawHtml.length > 1000) {
      score -= 10;
      issues.push(iss('Content', 'Low text-to-HTML ratio',
        `Only ${ratio}% of the HTML is visible text. A high code ratio indicates bloated code.`, 'info',
        'Slim down HTML code: remove unnecessary wrappers, externalize CSS/JS, reduce inline styles.',
        `${ratio}%`, '25%+'));
    }
  }

  // Structured data
  if (crawl.structuredData.length === 0) {
    score -= 15;
    issues.push(iss('Content', 'No structured data (Schema.org)',
      'No JSON-LD or Schema.org data found. Structured data enables rich snippets in search results (stars, FAQ, breadcrumbs, prices, etc.).', 'warning',
      'Add JSON-LD markup in <head>. Depending on page type: Organization, LocalBusiness, Article, Product, FAQ, BreadcrumbList, or HowTo.',
      '0 schema types', 'Min 1 schema type'));
  } else {
    const types = crawl.structuredData.map((s) => s.type).join(', ');
    issues.push(iss('Content', 'Structured data present',
      `${crawl.structuredData.length} Schema.org type(s) found: ${types}. This can enable rich snippets in search results.`, 'good',
      'Regularly test data with Google Rich Results Test (search.google.com/test/rich-results).',
      types, ''));
  }

  // Readability: average sentence length
  if (crawl.contentDetail.avgSentenceLength > 25 && wc > 200) {
    score -= 8;
    issues.push(iss('Content', 'Long average sentence length',
      `Average sentence length is ${crawl.contentDetail.avgSentenceLength} words. Long sentences reduce readability, especially on mobile.`, 'info',
      'Aim for an average of 15-20 words per sentence. Break up long sentences. Use short, punchy sentences for key points.',
      `${crawl.contentDetail.avgSentenceLength} words/sentence`, '15-20 words/sentence'));
  }

  // Long sentences count
  if (crawl.contentDetail.longSentenceCount > 5) {
    score -= 5;
    issues.push(iss('Content', 'Many long sentences',
      `${crawl.contentDetail.longSentenceCount} sentences have more than 30 words. This impacts readability and comprehension.`, 'info',
      'Split long sentences into shorter ones. Each sentence should ideally convey one main idea.',
      `${crawl.contentDetail.longSentenceCount} long sentences`, 'Max 2-3 long sentences'));
  }

  // Paragraph structure
  if (crawl.contentDetail.paragraphCount === 0 && wc > 200) {
    score -= 10;
    issues.push(iss('Content', 'No paragraph structure',
      'The page has no <p> tags. Content without paragraph structure is hard to read and looks like a wall of text.', 'warning',
      'Wrap text in <p> tags. Use short paragraphs (3-5 sentences each) for better readability.',
      '0 paragraphs', 'Multiple paragraphs'));
  }

  // Lists usage (good for featured snippets)
  if (crawl.contentDetail.listCount === 0 && wc > 500) {
    score -= 3;
    issues.push(iss('Content', 'No lists used',
      'The page uses no lists (ul/ol). Lists improve scannability and are often featured in Google\'s featured snippets.', 'info',
      'Add bullet or numbered lists where content can be structured (steps, benefits, features, comparisons).',
      '0 lists', 'Min 1 list'));
  }

  return res('Content', score, issues, `${wc} words`);
}

// ═══════════════════════════════════════════════════════════════
// 8. SOCIAL MEDIA (Open Graph + Twitter Cards)
// ═══════════════════════════════════════════════════════════════

export function checkSocialMedia(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const { ogTitle, ogDescription, ogImage, ogType, twitterCard } = crawl.meta;

  if (!ogTitle) {
    score -= 20;
    issues.push(iss('Social Media', 'No og:title',
      'No Open Graph title. When shared on Facebook, LinkedIn, WhatsApp etc., a generic or missing title will be displayed.', 'warning',
      'Add <meta property="og:title" content="Page title here"> in the <head>.',
      'Missing', 'Present'));
  }
  if (!ogDescription) {
    score -= 15;
    issues.push(iss('Social Media', 'No og:description',
      'No OG description. Shared links will show no description in the preview.', 'warning',
      'Add <meta property="og:description" content="Description here">.',
      'Missing', 'Present'));
  }
  if (!ogImage) {
    score -= 20;
    issues.push(iss('Social Media', 'No og:image',
      'No OG image defined. Links without a preview image receive up to 80% fewer clicks on social media.', 'warning',
      'Add <meta property="og:image" content="https://..."> with an image of min. 1200x630px.',
      'Missing', '1200x630px image'));
  }
  if (!ogType) {
    score -= 5;
    issues.push(iss('Social Media', 'No og:type',
      'No Open Graph type defined. Facebook and other platforms don\'t know what type of content is being shared.', 'info',
      'Add <meta property="og:type" content="website"> (or "article", "product", etc.).',
      'Missing', 'e.g. website'));
  }
  if (!twitterCard) {
    score -= 10;
    issues.push(iss('Social Media', 'No Twitter Card',
      'No Twitter/X Card tags. Links on X/Twitter will be displayed without a rich preview.', 'info',
      'Add <meta name="twitter:card" content="summary_large_image"> for a large image preview.',
      'Missing', 'summary_large_image'));
  }

  // og:url check
  // og:image dimensions suggestion when image exists but no size meta
  if (ogImage && !crawl.meta.ogType) {
    // Already covered by og:type check above
  }

  // All OG + Twitter present = good signal
  if (ogTitle && ogDescription && ogImage && twitterCard) {
    issues.push(iss('Social Media', 'Complete social media tags',
      'All essential Open Graph and Twitter Card tags are present. Links will display rich previews when shared.', 'good',
      'Test previews with Facebook Sharing Debugger and Twitter Card Validator.',
      'Complete', ''));
  }

  return res('Social Media', score, issues, '');
}

// ═══════════════════════════════════════════════════════════════
// 9. URL ANALYSIS
// ═══════════════════════════════════════════════════════════════

export function checkUrl(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  let pathname = '';
  try {
    const parsed = new URL(crawl.pageInfo.finalUrl || crawl.pageInfo.url);
    pathname = parsed.pathname;

    if (parsed.search.length > 0) {
      score -= 10;
      issues.push(iss('URL', 'URL contains parameters',
        `Query parameters found: ${parsed.search.slice(0, 50)}. Parameter URLs can cause duplicate content.`, 'info',
        'Use clean URLs without parameters when possible. If needed, set canonical tag to the parameterless version.',
        parsed.search.slice(0, 40), 'No parameters'));
    }
  } catch {
    return res('URL', score, issues, '');
  }

  const fullUrl = crawl.pageInfo.finalUrl || crawl.pageInfo.url;
  if (fullUrl.length > 100) {
    score -= 10;
    issues.push(iss('URL', 'URL too long',
      `The URL has ${fullUrl.length} characters. Short, descriptive URLs perform better and are more user-friendly.`, 'info',
      'Shorten the URL to max 75 characters. Remove unnecessary directory levels and filler words.',
      `${fullUrl.length} chars`, 'Max 75 chars'));
  }

  if (pathname !== pathname.toLowerCase()) {
    score -= 10;
    issues.push(iss('URL', 'Uppercase letters in URL',
      'The URL contains uppercase letters. URLs are case-sensitive — variants can be treated as duplicate content.', 'warning',
      'Keep all URLs in lowercase. Set up 301 redirects from uppercase versions.',
      pathname.slice(0, 40), 'Lowercase only'));
  }

  if (pathname.includes('_')) {
    score -= 5;
    issues.push(iss('URL', 'Underscores in URL',
      'The URL uses underscores (_). Google treats hyphens (-) as word separators, but not underscores.', 'info',
      'Replace underscores with hyphens (-) and set up 301 redirects from old URLs.',
      'Underscores', 'Hyphens (-)'));
  }

  if (/[%&=+]/.test(pathname)) {
    score -= 5;
    issues.push(iss('URL', 'Special characters in URL path',
      'The URL path contains encoded special characters. These make URLs hard to read and share.', 'info',
      'Use clean URLs without special characters. Replace umlauts with ae/oe/ue.',
      'Special chars', 'Only a-z, 0-9, -'));
  }

  // URL depth
  const depth = pathname.split('/').filter(Boolean).length;
  if (depth > 4) {
    score -= 5;
    issues.push(iss('URL', 'Deep URL structure',
      `The URL has ${depth} directory levels. Deep URLs are harder for users and crawlers, and dilute keyword signals.`, 'info',
      'Flatten the URL structure. Important pages should be max 2-3 levels deep from the root.',
      `${depth} levels`, 'Max 3 levels'));
  }

  // File extension in URL
  if (/\.(html|htm|php|asp|aspx|jsp)$/i.test(pathname)) {
    score -= 3;
    issues.push(iss('URL', 'File extension in URL',
      'The URL contains a file extension. Modern URLs should be extension-free for cleaner appearance and easier migrations.', 'info',
      'Configure the server to serve clean URLs without file extensions. Set up 301 redirects.',
      pathname.split('/').pop() || '', 'No extension'));
  }

  return res('URL', score, issues, pathname.slice(0, 50));
}

// ═══════════════════════════════════════════════════════════════
// 10. ACCESSIBILITY
// ═══════════════════════════════════════════════════════════════

export function checkAccessibility(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const a11y = crawl.accessibility;

  // ARIA landmarks / semantic HTML
  if (!a11y.hasAriaLandmarks) {
    score -= 15;
    issues.push(iss('Accessibility', 'No ARIA landmarks or semantic HTML',
      'No semantic landmarks (main, nav, header, footer, aside) or ARIA roles found. Screen readers rely on these to navigate the page.', 'warning',
      'Use semantic HTML5 elements: <main>, <nav>, <header>, <footer>, <aside>. These automatically create ARIA landmarks.',
      '0 landmarks', 'Min 3-4 landmarks'));
  } else if (a11y.ariaLandmarkCount < 3) {
    score -= 5;
    issues.push(iss('Accessibility', 'Few semantic landmarks',
      `Only ${a11y.ariaLandmarkCount} landmark(s) found. A well-structured page typically has at least main, nav, header, and footer.`, 'info',
      'Ensure the page uses <main>, <nav>, <header>, and <footer> for proper semantic structure.',
      `${a11y.ariaLandmarkCount} landmarks`, '4+ landmarks'));
  }

  // Skip navigation
  if (!a11y.hasSkipNavigation && crawl.links.length > 20) {
    score -= 8;
    issues.push(iss('Accessibility', 'No skip navigation link',
      'No "skip to content" link found. Keyboard users must tab through all navigation links to reach the main content.', 'info',
      'Add a visually hidden "Skip to main content" link as the first focusable element on the page.',
      'Missing', 'Skip link present'));
  }

  // Form labels
  if (a11y.formsWithoutLabels > 0) {
    score -= 15;
    issues.push(iss('Accessibility', 'Form inputs without labels',
      `${a11y.formsWithoutLabels} of ${a11y.formsTotal} form input(s) have no associated label, aria-label, or aria-labelledby. Screen readers cannot identify these fields.`, 'warning',
      'Add <label for="id"> elements or aria-label attributes to all form inputs. Placeholder alone is not sufficient.',
      `${a11y.formsWithoutLabels}/${a11y.formsTotal} unlabeled`, '0 unlabeled'));
  }

  // Positive tabindex
  if (a11y.tabindexPositiveCount > 0) {
    score -= 10;
    issues.push(iss('Accessibility', 'Positive tabindex values found',
      `${a11y.tabindexPositiveCount} element(s) have positive tabindex values. This overrides the natural tab order and confuses keyboard users.`, 'warning',
      'Remove positive tabindex values. Use tabindex="0" to add elements to natural tab order, or tabindex="-1" for programmatic focus only.',
      `${a11y.tabindexPositiveCount} positive tabindex`, '0 positive tabindex'));
  }

  // Iframes without title
  if (a11y.iframesWithoutTitle > 0) {
    score -= 8;
    issues.push(iss('Accessibility', 'Iframes without title',
      `${a11y.iframesWithoutTitle} of ${a11y.iframeCount} iframe(s) have no title attribute. Screen readers cannot describe the iframe content.`, 'warning',
      'Add a descriptive title attribute to all iframes: <iframe title="Embedded video about..." src="...">.',
      `${a11y.iframesWithoutTitle}/${a11y.iframeCount} untitled`, '0 untitled'));
  }

  // Buttons without accessible text
  if (a11y.buttonsWithoutText > 0) {
    score -= 10;
    issues.push(iss('Accessibility', 'Buttons without accessible text',
      `${a11y.buttonsWithoutText} button(s) have no visible text, aria-label, or title. Screen readers cannot describe what these buttons do.`, 'warning',
      'Add text content, aria-label, or title to all buttons. Icon-only buttons need aria-label="Close" or similar.',
      `${a11y.buttonsWithoutText} buttons`, '0 unlabeled buttons'));
  }

  // Images without alt (cross-reference from images check, accessibility perspective)
  const decorativeImages = crawl.images.filter(img => !img.hasAlt && !img.src.includes('icon') && !img.src.includes('logo'));
  if (decorativeImages.length > 5) {
    score -= 10;
    issues.push(iss('Accessibility', 'Many images without alt text (a11y)',
      `${decorativeImages.length} images lack alt text. For accessibility: informative images need descriptive alt text, decorative images need alt="".`, 'warning',
      'Add alt="descriptive text" for informative images. For purely decorative images, use alt="" (empty) so screen readers skip them.',
      `${decorativeImages.length} missing alt`, 'All images with alt'));
  }

  return res('Accessibility', score, issues, '');
}

// ═══════════════════════════════════════════════════════════════
// 11. PERFORMANCE
// ═══════════════════════════════════════════════════════════════

export function checkPerformance(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;
  const perf = crawl.performance;

  // Render-blocking scripts
  if (perf.renderBlockingScripts > 0) {
    const penalty = Math.min(perf.renderBlockingScripts * 5, 25);
    score -= penalty;
    issues.push(iss('Performance', 'Render-blocking scripts in <head>',
      `${perf.renderBlockingScripts} script(s) in <head> without async or defer attribute. These block page rendering until they are downloaded and executed.`, 'warning',
      'Add async or defer to all <script> tags in <head>. Use defer for scripts that depend on DOM, async for independent scripts.',
      `${perf.renderBlockingScripts} blocking`, '0 render-blocking'));
  }

  // Excessive inline CSS
  const inlineStyleKB = Math.round(perf.inlineStyleBytes / 1024);
  if (inlineStyleKB > 50) {
    score -= 15;
    issues.push(iss('Performance', 'Excessive inline CSS',
      `${inlineStyleKB} KB of inline CSS in ${perf.inlineStyleCount} <style> tags. This increases HTML size and cannot be cached separately.`, 'warning',
      'Move inline CSS to external stylesheets. External CSS is cached by the browser and shared across pages.',
      `${inlineStyleKB} KB inline CSS`, 'External stylesheets'));
  } else if (inlineStyleKB > 20) {
    score -= 5;
    issues.push(iss('Performance', 'Large amount of inline CSS',
      `${inlineStyleKB} KB of inline CSS. Consider moving to external stylesheets for better caching.`, 'info',
      'Critical CSS can stay inline (< 14KB), but the rest should be in external files.',
      `${inlineStyleKB} KB`, '<14 KB inline'));
  }

  // Excessive inline JS
  const inlineScriptKB = Math.round(perf.inlineScriptBytes / 1024);
  if (inlineScriptKB > 50) {
    score -= 15;
    issues.push(iss('Performance', 'Excessive inline JavaScript',
      `${inlineScriptKB} KB of inline JavaScript in ${perf.inlineScriptCount} script blocks. This increases HTML size and cannot be cached.`, 'warning',
      'Move inline scripts to external files with async/defer. External scripts are cached and can be loaded in parallel.',
      `${inlineScriptKB} KB inline JS`, 'External scripts'));
  }

  // Too many external resources
  const totalExternalResources = perf.externalStylesheetCount + perf.externalScriptCount;
  if (totalExternalResources > 30) {
    score -= 15;
    issues.push(iss('Performance', 'Too many external resources',
      `${totalExternalResources} external resources (${perf.externalStylesheetCount} CSS + ${perf.externalScriptCount} JS). Each request adds latency, especially on mobile.`, 'warning',
      'Bundle and minify CSS/JS files. Aim for fewer HTTP requests. Consider using HTTP/2 server push or preload hints.',
      `${totalExternalResources} resources`, '<15 resources'));
  } else if (totalExternalResources > 20) {
    score -= 8;
    issues.push(iss('Performance', 'Many external resources',
      `${totalExternalResources} external resources loaded. Consider bundling to reduce HTTP requests.`, 'info',
      'Combine CSS and JS files where possible. Use resource hints (preconnect, preload) for critical resources.',
      `${totalExternalResources} resources`, '<15 resources'));
  }

  // Resource hints
  if (perf.externalScriptCount > 5 && perf.preconnectCount === 0 && perf.prefetchCount === 0) {
    score -= 5;
    issues.push(iss('Performance', 'No resource hints',
      'No preconnect, preload, or prefetch hints found. Resource hints help the browser discover and download critical resources earlier.', 'info',
      'Add <link rel="preconnect" href="https://..."> for third-party origins and <link rel="preload"> for critical assets.',
      '0 hints', 'Preconnect + preload'));
  }

  // Page size (total HTML)
  const htmlSizeKB = Math.round(crawl.pageInfo.contentLength / 1024);
  if (htmlSizeKB > 500) {
    score -= 10;
    issues.push(iss('Performance', 'Large initial HTML payload',
      `Initial HTML document is ${htmlSizeKB} KB. Large HTML payloads slow down First Contentful Paint, especially on slow connections.`, 'warning',
      'Reduce HTML size: remove unused code, defer non-critical content, implement lazy loading for below-fold content.',
      `${htmlSizeKB} KB`, '<200 KB'));
  }

  // Good performance signals
  if (perf.renderBlockingScripts === 0 && totalExternalResources < 15 && htmlSizeKB < 200) {
    issues.push(iss('Performance', 'Good resource loading',
      'No render-blocking scripts, reasonable resource count, and small HTML payload. Page should load efficiently.', 'good',
      'Monitor performance with Lighthouse and Core Web Vitals.',
      'Efficient', ''));
  }

  return res('Performance', score, issues, `${totalExternalResources} resources, ${htmlSizeKB} KB HTML`);
}

// ═══════════════════════════════════════════════════════════════
// 12. INTERNATIONAL SEO
// ═══════════════════════════════════════════════════════════════

export function checkInternational(crawl: CrawlData): CheckResult {
  const issues: SEOIssue[] = [];
  let score = 100;

  const hreflangTags = crawl.hreflangTags;
  const language = crawl.pageInfo.language;

  // Hreflang tags
  if (hreflangTags.length > 0) {
    // Check for x-default
    const hasXDefault = hreflangTags.some(t => t.lang === 'x-default');
    if (!hasXDefault) {
      score -= 10;
      issues.push(iss('International', 'Missing x-default hreflang',
        'Hreflang tags are present but no x-default tag found. The x-default tag tells search engines which page to show for unsupported languages.', 'warning',
        'Add <link rel="alternate" hreflang="x-default" href="..."> pointing to the default/fallback language version.',
        'No x-default', 'x-default present'));
    }

    // Check self-referencing hreflang
    const currentUrl = crawl.pageInfo.finalUrl || crawl.pageInfo.url;
    const hasSelfRef = hreflangTags.some(t => {
      try {
        return new URL(t.href).pathname === new URL(currentUrl).pathname;
      } catch {
        return false;
      }
    });
    if (!hasSelfRef) {
      score -= 5;
      issues.push(iss('International', 'Missing self-referencing hreflang',
        'The page does not include a self-referencing hreflang tag for its own language. Every page with hreflang should reference itself.', 'info',
        'Add a hreflang tag that references the current page with its language code.',
        'No self-reference', 'Self-referencing present'));
    }

    // Valid language codes
    const invalidLangs = hreflangTags.filter(t => t.lang !== 'x-default' && !/^[a-z]{2}(-[A-Z]{2})?$/.test(t.lang));
    if (invalidLangs.length > 0) {
      score -= 10;
      issues.push(iss('International', 'Invalid hreflang language codes',
        `${invalidLangs.length} hreflang tag(s) have invalid language codes: ${invalidLangs.map(t => t.lang).join(', ')}`, 'warning',
        'Use valid ISO 639-1 language codes (e.g., "en", "de") optionally with ISO 3166-1 Alpha-2 country (e.g., "en-US", "de-CH").',
        invalidLangs.map(t => t.lang).join(', '), 'Valid ISO codes'));
    }

    issues.push(iss('International', 'Hreflang tags present',
      `${hreflangTags.length} hreflang tag(s) found for ${hreflangTags.map(t => t.lang).join(', ')}. Multi-language targeting is configured.`, 'good',
      'Regularly validate hreflang implementation with Google Search Console International Targeting report.',
      `${hreflangTags.length} languages`, ''));
  }

  // Language attribute consistency
  if (language) {
    // Check if language attribute matches content hreflang
    if (hreflangTags.length > 0) {
      const langBase = language.split('-')[0]!.toLowerCase();
      const matchingHreflang = hreflangTags.find(t => t.lang.split('-')[0]!.toLowerCase() === langBase);
      if (!matchingHreflang && hreflangTags.some(t => t.lang !== 'x-default')) {
        score -= 5;
        issues.push(iss('International', 'Language mismatch',
          `The HTML lang attribute "${language}" does not match any hreflang tag. This could confuse search engines about the page language.`, 'warning',
          'Ensure the HTML lang attribute matches one of the hreflang tags.',
          `lang="${language}"`, 'Matching hreflang'));
      }
    }
  } else {
    // Already flagged in technical check, but note for international context
    if (hreflangTags.length > 0) {
      score -= 10;
      issues.push(iss('International', 'Hreflang without lang attribute',
        'Hreflang tags are defined but the HTML element has no lang attribute. The base language is ambiguous.', 'warning',
        'Add a lang attribute to <html> that matches the current page language.',
        'No lang', 'lang attribute set'));
    }
  }

  // No internationalization at all (just informational)
  if (hreflangTags.length === 0 && language) {
    issues.push(iss('International', 'Single language site',
      `The page is in "${language}" with no hreflang tags. This is fine for single-language sites.`, 'good',
      'If your audience is international, consider adding hreflang tags for language/region targeting.',
      `lang="${language}"`, ''));
  }

  return res('International', score, issues, hreflangTags.length > 0 ? `${hreflangTags.length} languages` : language || 'Not set');
}

// ═══════════════════════════════════════════════════════════════
// RUNNER - Run all checks
// ═══════════════════════════════════════════════════════════════

export function runAllChecks(crawl: CrawlData): { scores: SEOScore[]; issues: SEOIssue[] } {
  const checks = [
    checkTitle,
    checkMetaDescription,
    checkHeadings,
    checkImages,
    checkLinks,
    checkTechnical,
    checkContent,
    checkSocialMedia,
    checkUrl,
    checkAccessibility,
    checkPerformance,
    checkInternational,
  ];

  const allScores: SEOScore[] = [];
  const allIssues: SEOIssue[] = [];

  for (const check of checks) {
    const { score, issues } = check(crawl);
    allScores.push(score);
    allIssues.push(...issues);
  }

  return { scores: allScores, issues: allIssues };
}
