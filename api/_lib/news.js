'use strict';

/**
 * Ipapo Broadcast - News Fetching Engine
 *
 * Responsibilities:
 * - Fetch real news from trusted RSS feeds
 * - Search for Ipapo / Itesiwaju / Oyo-related stories
 * - Extract real publisher images from RSS
 * - Match Google News stories to direct publisher RSS
 * - Try WordPress REST API for featured images
 * - Detect possible scam/fraud stories
 * - Remove duplicates
 * - Return clean daily stories
 *
 * Performance protections:
 * - Publisher RSS requests are cached, including in-flight requests
 * - Image enrichment is limited to recent stories
 * - Image enrichment has a timeout
 * - Failed image requests never stop the news fetch
 */

const crypto = require('crypto');

/* =========================================================
   CONFIGURATION
========================================================= */

const REQUEST_TIMEOUT = 15000;
const IMAGE_REQUEST_TIMEOUT = 10000;
const IMAGE_ENRICHMENT_TIMEOUT = 12000;

const MAX_STORIES = 50;

/**
 * Only attempt expensive image lookups for the newest
 * stories. Stories that already contain RSS images do not
 * need enrichment.
 */
const MAX_IMAGE_ENRICHMENT_STORIES = 15;

/**
 * Number of image lookups allowed at the same time.
 */
const IMAGE_BATCH_SIZE = 3;

/* =========================================================
   TRUSTED FEEDS
========================================================= */

const trustedFeeds = [
  {
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    name: 'Al Jazeera'
  },
  {
    url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
    name: 'BBC'
  },
  {
    url: 'https://tribuneonlineng.com/feed/',
    name: 'Tribune Online'
  },
  {
    url: 'https://punchng.com/feed/',
    name: 'Punch Newspapers'
  },
  {
    url: 'https://guardian.ng/feed/',
    name: 'Guardian Nigeria'
  }
];

/* =========================================================
   LOCAL GOOGLE NEWS FEEDS
========================================================= */

const localFeeds = [
  {
    url:
      'https://news.google.com/rss/search?q=Ipapo%20Oyo%20Nigeria&hl=en-NG&gl=NG&ceid=NG:en',
    name: 'Google News - Ipapo'
  },
  {
    url:
      'https://news.google.com/rss/search?q=Itesiwaju%20Oyo%20Nigeria&hl=en-NG&gl=NG&ceid=NG:en',
    name: 'Google News - Itesiwaju'
  },
  {
    url:
      'https://news.google.com/rss/search?q=Oyo%20State%20Nigeria&hl=en-NG&gl=NG&ceid=NG:en',
    name: 'Google News - Oyo State'
  }
];

/* =========================================================
   PUBLISHER RSS FEEDS
========================================================= */

const publisherRssFeeds = [
  {
    domain: 'tribuneonlineng.com',
    name: 'Tribune Online',
    url: 'https://tribuneonlineng.com/feed/'
  },
  {
    domain: 'punchng.com',
    name: 'Punch Newspapers',
    url: 'https://punchng.com/feed/'
  },
  {
    domain: 'guardian.ng',
    name: 'Guardian Nigeria',
    url: 'https://guardian.ng/feed/'
  },
  {
    domain: 'oyoinsight.com',
    name: 'OyoInsight',
    url: 'https://oyoinsight.com/feed/'
  }
];

/* =========================================================
   LOCAL KEYWORDS
========================================================= */

const localKeywords = [
  'ipapo',
  'itesiwaju',
  'ibadan',
  'oyo state',
  'oyo-state',
  'oyo',
  'saki',
  'saki west',
  'saki west local government',
  'saki east',
  'iwajowa',
  'kajola',
  'iseyin',
  'igboho',
  'okaka',
  'komu',
  'igbeti',
  'lanlate',
  'tesiwaju',
  'yewa',
  'oyo police',
  'oyo amotekun',
  'oyo government',
  'oyo govt'
];

/* =========================================================
   SCAM / FRAUD PATTERNS
========================================================= */

const scamPatterns = [
  /send\s+money/i,
  /send\s+funds/i,
  /pay\s+now/i,
  /urgent\s+payment/i,
  /claim\s+your\s+money/i,
  /claim\s+now/i,
  /free\s+money/i,
  /guaranteed\s+cash/i,
  /investment\s+opportunity/i,
  /double\s+your\s+money/i,
  /crypto\s+giveaway/i,
  /airdrop/i,
  /account\s+will\s+be\s+blocked/i,
  /verify\s+your\s+account/i,
  /send\s+your\s+otp/i,
  /share\s+your\s+otp/i,
  /give\s+us\s+your\s+password/i,
  /whatsapp\s+number/i,
  /bank\s+details/i,
  /account\s+details/i,
  /loan\s+approval\s+fee/i,
  /registration\s+fee/i,
  /processing\s+fee/i
];

/* =========================================================
   BASIC HELPERS
========================================================= */

function cleanText(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCharCode(Number(code));
      } catch {
        return '';
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      try {
        return String.fromCharCode(parseInt(code, 16));
      } catch {
        return '';
      }
    });
}

function stripHtml(value) {
  return decodeEntities(cleanText(value));
}

function normalizeTitle(value) {
  return stripHtml(value)
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDomain(value) {
  if (!value) return '';

  try {
    const input = /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`;

    return new URL(input)
      .hostname
      .toLowerCase()
      .replace(/^www\./, '');
  } catch {
    return String(value)
      .toLowerCase()
      .replace(/^www\./, '')
      .split('/')[0];
  }
}

function isGoogleNewsUrl(url) {
  return /news\.google\.com/i.test(String(url || ''));
}

function safeUrl(value) {
  const url = decodeEntities(String(value || '').trim());

  if (!url) return '';

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol !== 'http:' &&
      parsed.protocol !== 'https:'
    ) {
      return '';
    }

    return parsed.toString();
  } catch {
    return '';
  }
}

function makeId(title, link) {
  return crypto
    .createHash('sha256')
    .update(`${normalizeTitle(title)}|${link || ''}`)
    .digest('hex')
    .slice(0, 24);
}

function getReadTime(text) {
  const words = stripHtml(text)
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = Math.max(
    1,
    Math.ceil(words / 220)
  );

  return `${minutes} min read`;
}

function formatDate(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString(
      'en-US',
      {
        month: 'long',
        year: 'numeric'
      }
    );
  }

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }
  );
}

/* =========================================================
   HTTP
========================================================= */

async function fetchText(url, options = {}) {
  const timeout =
    options.timeout || REQUEST_TIMEOUT;

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeout
    );

  try {
    const response =
      await fetch(
        url,
        {
          method:
            options.method || 'GET',

          headers: {
            'User-Agent':
              options.userAgent ||
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',

            'Accept':
              options.accept ||
              'application/rss+xml, application/xml, text/xml, application/json, text/html;q=0.9, */*;q=0.8'
          },

          redirect: 'follow',

          signal:
            controller.signal
        }
      );

    const text =
      await response.text();

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText || ''}`.trim()
      );
    }

    return {
      status:
        response.status,

      headers:
        response.headers,

      text
    };

  } finally {
    clearTimeout(timer);
  }
}

/* =========================================================
   XML HELPERS
========================================================= */

function getTagValue(
  block,
  tagName
) {
  const escaped =
    tagName.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

  const regex =
    new RegExp(
      `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`,
      'i'
    );

  const match =
    String(block || '').match(regex);

  return match
    ? match[1].trim()
    : '';
}

function getXmlAttribute(
  text,
  tagName,
  attributeName
) {
  const escapedTag =
    tagName.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

  const escapedAttr =
    attributeName.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

  const regex =
    new RegExp(
      `<${escapedTag}\\b[^>]*\\b${escapedAttr}\\s*=\\s*["']([^"']+)["'][^>]*>`,
      'i'
    );

  const match =
    String(text || '').match(regex);

  return match
    ? decodeEntities(match[1])
    : '';
}

/* =========================================================
   IMAGE EXTRACTION FROM RSS
========================================================= */

function extractImageFromRssItem(
  item
) {
  const imageCandidates = [];

  /* media:content */

  const mediaContent =
    getXmlAttribute(
      item,
      'media:content',
      'url'
    ) ||
    getXmlAttribute(
      item,
      'media:content',
      'href'
    );

  if (mediaContent) {
    imageCandidates.push(
      mediaContent
    );
  }

  /* media:thumbnail */

  const mediaThumbnail =
    getXmlAttribute(
      item,
      'media:thumbnail',
      'url'
    ) ||
    getXmlAttribute(
      item,
      'media:thumbnail',
      'href'
    );

  if (mediaThumbnail) {
    imageCandidates.push(
      mediaThumbnail
    );
  }

  /* enclosure */

  const enclosure =
    getXmlAttribute(
      item,
      'enclosure',
      'url'
    );

  const enclosureType =
    getXmlAttribute(
      item,
      'enclosure',
      'type'
    );

  if (
    enclosure &&
    (
      !enclosureType ||
      enclosureType.startsWith('image/')
    )
  ) {
    imageCandidates.push(
      enclosure
    );
  }

  /* image tag */

  const imageUrl =
    getTagValue(
      item,
      'image'
    );

  if (imageUrl) {
    imageCandidates.push(
      imageUrl
    );
  }

  /* HTML image inside content */

  const htmlFields = [
    getTagValue(
      item,
      'description'
    ),

    getTagValue(
      item,
      'content:encoded'
    ),

    getTagValue(
      item,
      'content'
    )
  ];

  for (
    const html of htmlFields
  ) {
    const matches =
      String(html || '').match(
        /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi
      ) || [];

    for (
      const match of matches
    ) {
      const urlMatch =
        match.match(
          /\bsrc\s*=\s*["']([^"']+)["']/i
        );

      if (
        urlMatch &&
        urlMatch[1]
      ) {
        imageCandidates.push(
          urlMatch[1]
        );
      }
    }
  }

  for (
    const candidate of imageCandidates
  ) {
    const url =
      safeUrl(candidate);

    if (url) {
      return url;
    }
  }

  return '';
}

/* =========================================================
   IMAGE EXTRACTION FROM HTML
========================================================= */

function extractImageFromHtml(
  html
) {
  const source =
    String(html || '');

  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,

    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,

    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,

    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,

    /<img\b[^>]+src=["']([^"']+)["']/i
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      source.match(pattern);

    if (
      match &&
      match[1]
    ) {
      const url =
        safeUrl(
          decodeEntities(
            match[1]
          )
        );

      if (url) {
        return url;
      }
    }
  }

  return '';
}

/* =========================================================
   RSS PARSER
========================================================= */

function parseRssFeed(
  xml,
  feedName,
  feedUrl
) {
  const stories = [];

  const itemMatches =
    String(xml || '').match(
      /<item\b[\s\S]*?<\/item>/gi
    ) || [];

  for (
    const rawItem of itemMatches
  ) {
    const titleRaw =
      getTagValue(
        rawItem,
        'title'
      );

    const title =
      stripHtml(titleRaw);

    if (!title) {
      continue;
    }

    const description =
      stripHtml(
        getTagValue(
          rawItem,
          'description'
        )
      );

    const content =
      stripHtml(
        getTagValue(
          rawItem,
          'content:encoded'
        )
      ) ||
      description;

    const linkRaw =
      getTagValue(
        rawItem,
        'link'
      );

    const link =
      safeUrl(linkRaw);

    const guid =
      stripHtml(
        getTagValue(
          rawItem,
          'guid'
        )
      );

    const publishedAt =
      getTagValue(
        rawItem,
        'pubDate'
      ) ||
      getTagValue(
        rawItem,
        'published'
      ) ||
      getTagValue(
        rawItem,
        'dc:date'
      ) ||
      getTagValue(
        rawItem,
        'updated'
      ) ||
      new Date().toISOString();

    const source =
      stripHtml(
        getTagValue(
          rawItem,
          'source'
        )
      ) ||
      feedName;

    const sourceUrl =
      safeUrl(
        getXmlAttribute(
          rawItem,
          'source',
          'url'
        )
      );

    const image =
      extractImageFromRssItem(
        rawItem
      );

    const publisherDomain =
      normalizeDomain(
        sourceUrl
      ) ||
      normalizeDomain(
        link
      );

    const id =
      makeId(
        title,
        guid ||
          link ||
          feedUrl
      );

    stories.push({
      id,

      title,

      description,

      summary:
        description ||
        content.slice(0, 300),

      content,

      link,

      source,

      publisher:
        source,

      publisherUrl:
        sourceUrl ||
        (
          publisherDomain
            ? `https://${publisherDomain}`
            : ''
        ),

      publisherDomain,

      publishedAt,

      fetchedAt:
        new Date().toISOString(),

      image,

      rawItem,

      category:
        detectCategory(
          title,
          content
        ),

      badge:
        'Latest',

      author:
        source,

      date:
        formatDate(
          publishedAt
        ),

      readTime:
        getReadTime(
          content
        ),

      views: 0,

      status:
        'approved'
    });
  }

  return stories;
}

/* =========================================================
   CATEGORY
========================================================= */

function detectCategory(
  title,
  content
) {
  const text =
    `${title} ${content}`
      .toLowerCase();

  if (
    /education|school|student|teacher|university|college|scholarship/i
      .test(text)
  ) {
    return 'Education';
  }

  if (
    /police|kidnap|crime|security|amotekun|terrorist|gunmen|arrested/i
      .test(text)
  ) {
    return 'Security';
  }

  if (
    /government|governor|commissioner|minister|political|election|party|senator/i
      .test(text)
  ) {
    return 'Politics';
  }

  if (
    /road|bridge|construction|infrastructure|building|project|development/i
      .test(text)
  ) {
    return 'Development';
  }

  if (
    /sport|football|match|player|league/i
      .test(text)
  ) {
    return 'Sports';
  }

  if (
    /culture|festival|traditional|heritage|oba|royal/i
      .test(text)
  ) {
    return 'Culture';
  }

  return 'Community';
}

/* =========================================================
   LOCAL RELEVANCE
========================================================= */

function isLocalStory(
  story
) {
  const text = [
    story.title,
    story.description,
    story.summary,
    story.content,
    story.source,
    story.publisher,
    story.link
  ]
    .join(' ')
    .toLowerCase();

  return localKeywords.some(
    keyword =>
      text.includes(
        keyword.toLowerCase()
      )
  );
}

/* =========================================================
   TITLE MATCHING
========================================================= */

function tokenizeTitle(
  title
) {
  return new Set(
    normalizeTitle(title)
      .split(/\s+/)
      .filter(
        word =>
          word.length > 2
      )
  );
}

function titleSimilarity(
  a,
  b
) {
  const first =
    tokenizeTitle(a);

  const second =
    tokenizeTitle(b);

  if (
    !first.size ||
    !second.size
  ) {
    return 0;
  }

  let common = 0;

  for (
    const word of first
  ) {
    if (
      second.has(word)
    ) {
      common++;
    }
  }

  return (
    common /
    Math.max(
      first.size,
      second.size
    )
  );
}

/* =========================================================
   PUBLISHER RSS CACHE
========================================================= */

/**
 * IMPORTANT:
 *
 * The cache stores the PROMISE immediately.
 *
 * This prevents several stories from starting the same
 * publisher RSS request at the same time.
 */
const publisherFeedCache =
  new Map();

async function loadPublisherFeed(
  feed
) {
  const domain =
    normalizeDomain(
      feed.domain
    );

  if (
    publisherFeedCache.has(
      domain
    )
  ) {
    return publisherFeedCache.get(
      domain
    );
  }

  const promise =
    (async () => {
      try {
        const response =
          await fetchText(
            feed.url,
            {
              timeout:
                REQUEST_TIMEOUT
            }
          );

        const stories =
          parseRssFeed(
            response.text,
            feed.name,
            feed.url
          );

        const result = {
          success: true,
          stories
        };

        console.log(
          `Publisher RSS ${feed.name}: ${stories.length} stories`
        );

        return result;

      } catch (error) {
        const result = {
          success: false,
          stories: [],
          error:
            error.message
        };

        console.log(
          `Publisher RSS ${feed.name} failed with ${error.message}`
        );

        return result;
      }
    })();

  publisherFeedCache.set(
    domain,
    promise
  );

  return promise;
}

/* =========================================================
   FIND PUBLISHER
========================================================= */

function findPublisherFeedForStory(
  story
) {
  const domain =
    normalizeDomain(
      story.publisherUrl
    ) ||
    normalizeDomain(
      story.publisherDomain
    );

  if (!domain) {
    return null;
  }

  return (
    publisherRssFeeds.find(
      feed => {
        const feedDomain =
          normalizeDomain(
            feed.domain
          );

        return (
          domain === feedDomain ||
          domain.endsWith(
            `.${feedDomain}`
          ) ||
          feedDomain.endsWith(
            `.${domain}`
          )
        );
      }
    ) ||
    null
  );
}

/* =========================================================
   PUBLISHER RSS IMAGE MATCH
========================================================= */

async function findPublisherArticle(
  story
) {
  const feed =
    findPublisherFeedForStory(
      story
    );

  if (!feed) {
    return null;
  }

  const result =
    await loadPublisherFeed(
      feed
    );

  if (
    !result.success ||
    !result.stories.length
  ) {
    return null;
  }

  let best = null;
  let bestScore = 0;

  for (
    const candidate of result.stories
  ) {
    const score =
      titleSimilarity(
        story.title,
        candidate.title
      );

    if (
      score > bestScore
    ) {
      bestScore =
        score;

      best =
        candidate;
    }
  }

  if (
    !best ||
    bestScore < 0.45
  ) {
    return null;
  }

  return {
    story: best,
    score: bestScore
  };
}

/* =========================================================
   WORDPRESS IMAGE FALLBACK
========================================================= */

function looksLikeWordPressDomain(
  domain
) {
  return Boolean(
    domain &&
    (
      domain.includes(
        'wordpress'
      ) ||
      domain.includes(
        'oyoinsight'
      ) ||
      domain.includes(
        'tribuneonlineng'
      ) ||
      domain.includes(
        'punchng'
      )
    )
  );
}

async function fetchJson(
  url
) {
  const response =
    await fetchText(
      url,
      {
        timeout:
          IMAGE_REQUEST_TIMEOUT,

        accept:
          'application/json, text/plain, */*'
      }
    );

  try {
    return JSON.parse(
      response.text
    );
  } catch {
    throw new Error(
      'Invalid JSON response'
    );
  }
}

function extractWordPressImage(
  post
) {
  if (!post) {
    return '';
  }

  const featured =
    post._embedded &&
    post._embedded[
      'wp:featuredmedia'
    ];

  if (
    Array.isArray(featured) &&
    featured.length
  ) {
    const sourceUrl =
      featured[0] &&
      featured[0].source_url;

    const image =
      safeUrl(
        sourceUrl
      );

    if (image) {
      return image;
    }
  }

  const content =
    post.content &&
    post.content.rendered;

  if (content) {
    const image =
      extractImageFromHtml(
        content
      );

    if (image) {
      return image;
    }
  }

  const excerpt =
    post.excerpt &&
    post.excerpt.rendered;

  if (excerpt) {
    const image =
      extractImageFromHtml(
        excerpt
      );

    if (image) {
      return image;
    }
  }

  return '';
}

async function findWordPressImage(
  story
) {
  const domain =
    normalizeDomain(
      story.publisherDomain ||
      story.publisherUrl ||
      story.link
    );

  if (
    !domain ||
    !looksLikeWordPressDomain(
      domain
    )
  ) {
    return '';
  }

  const searchUrl =
    `https://${domain}/wp-json/wp/v2/posts?search=${encodeURIComponent(story.title)}&per_page=5&_embed=1`;

  try {
    const posts =
      await fetchJson(
        searchUrl
      );

    if (
      !Array.isArray(posts) ||
      !posts.length
    ) {
      return '';
    }

    let best = null;
    let bestScore = 0;

    for (
      const post of posts
    ) {
      const postTitle =
        post &&
        post.title &&
        post.title.rendered
          ? stripHtml(
              post.title.rendered
            )
          : '';

      const score =
        titleSimilarity(
          story.title,
          postTitle
        );

      if (
        score > bestScore
      ) {
        bestScore =
          score;

        best =
          post;
      }
    }

    if (
      !best ||
      bestScore < 0.40
    ) {
      return '';
    }

    return extractWordPressImage(
      best
    );

  } catch (error) {
    console.log(
      `WordPress image lookup failed for ${domain}: ${error.message}`
    );

    return '';
  }
}

/* =========================================================
   DIRECT ARTICLE IMAGE
========================================================= */

async function fetchDirectArticleImage(
  story
) {
  if (
    !story.link ||
    isGoogleNewsUrl(
      story.link
    )
  ) {
    return '';
  }

  try {
    const response =
      await fetchText(
        story.link,
        {
          timeout:
            IMAGE_REQUEST_TIMEOUT,

          accept:
            'text/html,application/xhtml+xml'
        }
      );

    return extractImageFromHtml(
      response.text
    );

  } catch {
    return '';
  }
}

/* =========================================================
   IMAGE ENRICHMENT
========================================================= */

async function enrichStoryImage(
  story
) {
  /**
   * 1. Keep an image that already came
   *    directly from RSS.
   */
  if (story.image) {
    return story;
  }

  /**
   * 2. Try matching the Google News
   *    story to the publisher RSS.
   */
  try {
    const publisherMatch =
      await findPublisherArticle(
        story
      );

    if (
      publisherMatch &&
      publisherMatch.story
    ) {
      const matched =
        publisherMatch.story;

      if (matched.image) {
        story.image =
          matched.image;

        if (
          matched.link &&
          !isGoogleNewsUrl(
            matched.link
          )
        ) {
          story.link =
            matched.link;
        }

        story.publisher =
          matched.publisher ||
          story.publisher;

        story.publisherDomain =
          matched.publisherDomain ||
          story.publisherDomain;

        story.publisherUrl =
          matched.publisherUrl ||
          story.publisherUrl;

        return story;
      }
    }
  } catch (error) {
    console.log(
      `Publisher image matching failed: ${error.message}`
    );
  }

  /**
   * 3. Try WordPress featured image.
   */
  try {
    const wordpressImage =
      await findWordPressImage(
        story
      );

    if (wordpressImage) {
      story.image =
        wordpressImage;

      return story;
    }
  } catch {
    // Ignore image failure.
  }

  /**
   * 4. Finally try the direct article.
   */
  try {
    const directImage =
      await fetchDirectArticleImage(
        story
      );

    if (directImage) {
      story.image =
        directImage;
    }
  } catch {
    // Ignore image failure.
  }

  return story;
}

/* =========================================================
   IMAGE ENRICHMENT TIMEOUT
========================================================= */

function enrichStoryWithTimeout(
  story
) {
  return Promise.race([
    enrichStoryImage(
      story
    ),

    new Promise(
      resolve => {
        setTimeout(
          () => {
            console.log(
              `Image enrichment timeout: ${story.title}`
            );

            resolve(story);
          },
          IMAGE_ENRICHMENT_TIMEOUT
        );
      }
    )
  ]).catch(
    error => {
      console.log(
        `Image enrichment failed: ${error.message}`
      );

      return story;
    }
  );
}

/* =========================================================
   IMAGE ENRICHMENT WITH LIMITS
========================================================= */

async function enrichImages(
  stories
) {
  /**
   * Work on a copy so the original array
   * remains safe.
   */
  const output =
    stories.slice();

  /**
   * Stories that already have an image
   * require no expensive processing.
   */
  const candidates =
    output
      .map(
        (story, index) => ({
          story,
          index
        })
      )
      .filter(
        item =>
          !item.story.image
      )
      .slice(
        0,
        MAX_IMAGE_ENRICHMENT_STORIES
      );

  console.log(
    `Image enrichment: ${candidates.length} stories queued`
  );

  /**
   * Process only a few requests at a time.
   */
  for (
    let i = 0;
    i < candidates.length;
    i += IMAGE_BATCH_SIZE
  ) {
    const batch =
      candidates.slice(
        i,
        i + IMAGE_BATCH_SIZE
      );

    const enriched =
      await Promise.all(
        batch.map(
          item =>
            enrichStoryWithTimeout(
              item.story
            )
        )
      );

    enriched.forEach(
      (story, offset) => {
        const original =
          batch[offset];

        output[
          original.index
        ] = story;
      }
    );

    console.log(
      `Image enrichment progress: ${Math.min(
        i + batch.length,
        candidates.length
      )}/${candidates.length}`
    );
  }

  return output;
}

/* =========================================================
   SCAM DETECTION
========================================================= */

function analyzeScamRisk(
  story
) {
  const text =
    [
      story.title,
      story.description,
      story.summary,
      story.content
    ]
      .join(' ')
      .trim();

  const flags = [];

  for (
    const pattern of scamPatterns
  ) {
    if (
      pattern.test(text)
    ) {
      flags.push(
        pattern.source
      );
    }
  }

  let score = 0;

  score +=
    Math.min(
      flags.length * 12,
      60
    );

  if (
    !story.publisher &&
    !story.source
  ) {
    score += 10;
  }

  let label =
    'low';

  if (
    score >= 60
  ) {
    label =
      'high';
  } else if (
    score >= 30
  ) {
    label =
      'medium';
  }

  return {
    scamScore:
      score,

    scamRisk:
      label,

    scamFlags:
      flags,

    scamReviewRequired:
      score >= 30
  };
}

/* =========================================================
   STORY CLEANUP
========================================================= */

function cleanStory(
  story
) {
  const title =
    stripHtml(
      story.title
    );

  const description =
    stripHtml(
      story.description ||
      story.summary ||
      ''
    );

  const content =
    stripHtml(
      story.content ||
      description
    );

  const scam =
    analyzeScamRisk({
      ...story,
      title,
      description,
      content
    });

  return {
    id:
      story.id ||
      makeId(
        title,
        story.link
      ),

    title,

    description,

    summary:
      description ||
      content.slice(0, 300),

    content,

    link:
      safeUrl(
        story.link
      ),

    source:
      story.source ||
      story.publisher ||
      'Ipapo Broadcast',

    publisher:
      story.publisher ||
      story.source ||
      'Unknown Publisher',

    publisherUrl:
      story.publisherUrl ||
      '',

    publisherDomain:
      story.publisherDomain ||
      normalizeDomain(
        story.publisherUrl
      ),

    publishedAt:
      story.publishedAt ||
      new Date().toISOString(),

    fetchedAt:
      story.fetchedAt ||
      new Date().toISOString(),

    image:
      safeUrl(
        story.image
      ),

    category:
      story.category ||
      detectCategory(
        title,
        content
      ),

    badge:
      story.badge ||
      'Latest',

    author:
      story.author ||
      story.publisher ||
      'Ipapo Broadcast',

    date:
      story.date ||
      formatDate(
        story.publishedAt
      ),

    readTime:
      story.readTime ||
      getReadTime(
        content
      ),

    views:
      Number(
        story.views || 0
      ),

    status:
      story.status ||
      (
        scam.scamReviewRequired
          ? 'pending_review'
          : 'approved'
      ),

    scamScore:
      scam.scamScore,

    scamRisk:
      scam.scamRisk,

    scamFlags:
      scam.scamFlags,

    scamReviewRequired:
      scam.scamReviewRequired
  };
}

/* =========================================================
   DUPLICATES
========================================================= */

function dedupeStories(
  stories
) {
  const seenIds =
    new Set();

  const seenTitles =
    new Set();

  const result =
    [];

  for (
    const story of stories
  ) {
    const id =
      story.id;

    const title =
      normalizeTitle(
        story.title
      );

    if (
      id &&
      seenIds.has(id)
    ) {
      continue;
    }

    if (
      title &&
      seenTitles.has(title)
    ) {
      continue;
    }

    if (id) {
      seenIds.add(id);
    }

    if (title) {
      seenTitles.add(title);
    }

    result.push(
      story
    );
  }

  return result;
}

/* =========================================================
   FETCH ONE RSS FEED
========================================================= */

async function fetchFeed(
  feed
) {
  try {
    const response =
      await fetchText(
        feed.url
      );

    const stories =
      parseRssFeed(
        response.text,
        feed.name,
        feed.url
      );

    console.log(
      `Fetched ${stories.length} stories from ${feed.name}`
    );

    return stories;

  } catch (error) {
    console.log(
      `RSS feed failed: ${feed.url} ${error.message}`
    );

    return [];
  }
}

/* =========================================================
   MAIN DAILY FETCH
========================================================= */

async function fetchDailyStories() {
  console.log(
    'Starting daily Ipapo news fetch...'
  );

  /**
   * Clear publisher cache at the beginning
   * of each completely new fetch.
   */
  publisherFeedCache.clear();

  const allFeeds = [
    ...trustedFeeds,
    ...localFeeds
  ];

  /* -----------------------------------------
     FETCH ALL MAIN FEEDS
  ----------------------------------------- */

  const feedResults =
    await Promise.all(
      allFeeds.map(
        feed =>
          fetchFeed(feed)
      )
    );

  const allStories =
    feedResults.flat();

  console.log(
    `Fetched ${allStories.length} RSS stories`
  );

  /* -----------------------------------------
     LOCAL FILTER
  ----------------------------------------- */

  let localStories =
    allStories.filter(
      isLocalStory
    );

  console.log(
    `${localStories.length} stories matched local keywords`
  );

  /* -----------------------------------------
     DEDUPE
  ----------------------------------------- */

  localStories =
    dedupeStories(
      localStories
    );

  /* -----------------------------------------
     NEWEST FIRST
  ----------------------------------------- */

  localStories.sort(
    (a, b) =>
      new Date(
        b.publishedAt
      ).getTime() -
      new Date(
        a.publishedAt
      ).getTime()
  );

  console.log(
    `After dedupe: ${localStories.length} stories`
  );

  /* -----------------------------------------
     IMAGE ENRICHMENT
  ----------------------------------------- */

  localStories =
    await enrichImages(
      localStories
    );

  /* -----------------------------------------
     CLEAN STORIES
  ----------------------------------------- */

  localStories =
    localStories.map(
      cleanStory
    );

  /* -----------------------------------------
     FINAL DEDUPE
  ----------------------------------------- */

  localStories =
    dedupeStories(
      localStories
    );

  /* -----------------------------------------
     SORT AGAIN
  ----------------------------------------- */

  localStories.sort(
    (a, b) =>
      new Date(
        b.publishedAt
      ).getTime() -
      new Date(
        a.publishedAt
      ).getTime()
  );

  /* -----------------------------------------
     LIMIT RESULTS
  ----------------------------------------- */

  const finalStories =
    localStories.slice(
      0,
      MAX_STORIES
    );

  /* -----------------------------------------
     IMAGE COUNT
  ----------------------------------------- */

  const imageCount =
    finalStories.filter(
      story =>
        Boolean(
          story.image
        )
    ).length;

  console.log(
    `Stories with images: ${imageCount}`
  );

  console.log(
    `Returning ${finalStories.length} stories`
  );

  return finalStories;
}

/* =========================================================
   GET DAILY STORIES
========================================================= */

async function getDailyStories() {
  return fetchDailyStories();
}

/* =========================================================
   GREETING
========================================================= */

function getGreeting(
  hour = new Date().getHours()
) {
  if (
    hour < 12
  ) {
    return 'Good morning';
  }

  if (
    hour < 17
  ) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

/* =========================================================
   GET NEWS
========================================================= */

async function getNews() {
  return fetchDailyStories();
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  fetchDailyStories,
  getDailyStories,
  getNews,
  getGreeting,
  fetchFeed,
  parseRssFeed,
  isLocalStory,
  analyzeScamRisk,
  cleanStory,
  dedupeStories,
  extractImageFromRssItem,
  extractImageFromHtml,
  titleSimilarity
};