const {
  readState,
  saveStories,
  saveAlerts,
  updateStory,
  getStory
} = require('./store');

/*
|--------------------------------------------------------------------------
| NEWS SOURCES
|--------------------------------------------------------------------------
*/

const trustedSources = [
  {
    name: 'BBC Africa',
    url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml'
  },
  {
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml'
  },
  {
    name: 'Tribune',
    url: 'https://tribuneonlineng.com/feed/'
  },
  {
    name: 'Punch',
    url: 'https://punchng.com/feed/'
  },
  {
    name: 'Guardian Nigeria',
    url: 'https://guardian.ng/feed/'
  }
];

const localSources = [
  {
    name: 'Google News - Ipapo',
    url: 'https://news.google.com/rss/search?q=Ipapo+Oyo+Nigeria&hl=en-NG&gl=NG&ceid=NG:en'
  },
  {
    name: 'Google News - Itesiwaju',
    url: 'https://news.google.com/rss/search?q=Itesiwaju+Oyo+Nigeria&hl=en-NG&gl=NG&ceid=NG:en'
  },
  {
    name: 'Google News - Oyo',
    url: 'https://news.google.com/rss/search?q=Oyo+State+Nigeria&hl=en-NG&gl=NG&ceid=NG:en'
  }
];

const localKeywords = [
  'ipapo',
  'itesiwaju',
  'igbeti',
  'oyo state',
  'oyo',
  'irepo',
  'shaki',
  'kishi',
  'komu',
  'igboho',
  'tesiwaju',
  'atist',
  'ilorin'
];

const scamPatterns = [
  /send money/i,
  /pay now/i,
  /urgent payment/i,
  /investment opportunity/i,
  /double your money/i,
  /guaranteed profit/i,
  /crypto giveaway/i,
  /free airtime/i,
  /free data/i,
  /claim your prize/i,
  /you have won/i,
  /winner/i,
  /bank details/i,
  /account number/i,
  /password/i,
  /otp/i,
  /verification code/i,
  /click here immediately/i,
  /limited time/i,
  /act now/i,
  /cash giveaway/i
];

/*
|--------------------------------------------------------------------------
| BASIC HELPERS
|--------------------------------------------------------------------------
*/

function normaliseText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[(.*?)\]\]>/gis, '$1')
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
    });
}

function stripHtml(value) {
  return decodeHtml(String(value || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/*
|--------------------------------------------------------------------------
| URL HELPERS
|--------------------------------------------------------------------------
*/

function isValidImageUrl(value) {
  if (!value) return false;

  const url = String(value).trim();

  if (!/^https?:\/\//i.test(url)) {
    return false;
  }

  if (/data:image/i.test(url)) {
    return false;
  }

  if (/googleusercontent\.com/i.test(url)) {
    return false;
  }

  if (/gstatic\.com/i.test(url)) {
    return false;
  }

  if (/favicon/i.test(url)) {
    return false;
  }

  if (/logo(?:[-_]?icon)?\.(svg|png|jpg|jpeg|webp)/i.test(url)) {
    return false;
  }

  if (/\/icon(?:[-_].*)?\.(svg|png|jpg|jpeg|webp)/i.test(url)) {
    return false;
  }

  return true;
}

function makeAbsoluteUrl(imageUrl, baseUrl) {
  if (!imageUrl) return '';

  const value = decodeHtml(String(imageUrl).trim());

  if (!value) return '';

  if (/^data:/i.test(value)) {
    return '';
  }

  try {
    return new URL(value, baseUrl).href;
  } catch {
    return '';
  }
}

function isGooglePreviewImage(url) {
  if (!url) return true;

  return (
    /googleusercontent\.com/i.test(url) ||
    /gstatic\.com/i.test(url) ||
    /news\.google\.com/i.test(url)
  );
}

/*
|--------------------------------------------------------------------------
| HTML META EXTRACTION
|--------------------------------------------------------------------------
*/

function extractMetaContent(html, names) {
  const wanted = Array.isArray(names) ? names : [names];

  for (const name of wanted) {
    const escapedName = String(name)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        'i'
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapedName}["'][^>]*>`,
        'i'
      )
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);

      if (match && match[1]) {
        return decodeHtml(match[1].trim());
      }
    }
  }

  return '';
}

/*
|--------------------------------------------------------------------------
| JSON-LD IMAGE EXTRACTION
|--------------------------------------------------------------------------
*/

function findImagesInJsonLd(value, output = []) {
  if (!value) return output;

  if (typeof value === 'string') {
    if (isValidImageUrl(value)) {
      output.push(value);
    }

    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      findImagesInJsonLd(item, output);
    }

    return output;
  }

  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey === 'image' ||
        lowerKey === 'thumbnail' ||
        lowerKey === 'thumbnailurl' ||
        lowerKey === 'contenturl'
      ) {
        if (typeof item === 'string') {
          if (isValidImageUrl(item)) {
            output.push(item);
          }
        } else {
          findImagesInJsonLd(item, output);
        }
      } else {
        findImagesInJsonLd(item, output);
      }
    }
  }

  return output;
}

/*
|--------------------------------------------------------------------------
| IMAGE EXTRACTION FROM PUBLISHER HTML
|--------------------------------------------------------------------------
*/

function extractImageUrl(html, baseUrl) {
  if (!html) return '';

  const candidates = [];

  /*
   * 1. Open Graph image
   */
  const ogImage = extractMetaContent(html, [
    'og:image',
    'og:image:url',
    'og:image:secure_url'
  ]);

  if (ogImage) {
    candidates.push(ogImage);
  }

  /*
   * 2. Twitter image
   */
  const twitterImage = extractMetaContent(html, [
    'twitter:image',
    'twitter:image:src'
  ]);

  if (twitterImage) {
    candidates.push(twitterImage);
  }

  /*
   * 3. JSON-LD
   */
  const jsonLdRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let jsonMatch;

  while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
    const rawJson = jsonMatch[1].trim();

    if (!rawJson) continue;

    try {
      const parsed = JSON.parse(rawJson);

      const jsonImages = findImagesInJsonLd(parsed);

      candidates.push(...jsonImages);
    } catch {
      /*
       * Some publishers place invalid JSON-LD.
       * Ignore it and continue with other extraction methods.
       */
    }
  }

  /*
   * 4. image_src link
   */
  const imageSrcMatch = html.match(
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i
  );

  if (imageSrcMatch && imageSrcMatch[1]) {
    candidates.push(imageSrcMatch[1]);
  }

  /*
   * 5. Normal <img>
   *
   * Supports:
   * src
   * data-src
   * data-lazy-src
   * data-original
   * data-image
   */
  const imgRegex = /<img\b[^>]*>/gi;

  let imgMatch;

  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const imgTag = imgMatch[0];

    const attributes = [
      'src',
      'data-src',
      'data-lazy-src',
      'data-original',
      'data-image',
      'data-url'
    ];

    for (const attribute of attributes) {
      const regex = new RegExp(
        `${attribute}\\s*=\\s*["']([^"']+)["']`,
        'i'
      );

      const match = imgTag.match(regex);

      if (match && match[1]) {
        candidates.push(match[1]);
      }
    }
  }

  /*
   * 6. srcset
   */
  const srcsetRegex =
    /(?:srcset|data-srcset)=["']([^"']+)["']/gi;

  let srcsetMatch;

  while ((srcsetMatch = srcsetRegex.exec(html)) !== null) {
    const srcset = srcsetMatch[1];

    const urls = srcset
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean);

    candidates.push(...urls);
  }

  /*
   * 7. Select the first valid publisher image.
   */
  for (const candidate of candidates) {
    const absoluteUrl = makeAbsoluteUrl(
      candidate,
      baseUrl
    );

    if (!isValidImageUrl(absoluteUrl)) {
      continue;
    }

    if (isGooglePreviewImage(absoluteUrl)) {
      continue;
    }

    return absoluteUrl;
  }

  return '';
}

/*
|--------------------------------------------------------------------------
| FETCH HTML
|--------------------------------------------------------------------------
*/

async function fetchHtml(url, timeoutMs = 12000) {
  if (!url) {
    return null;
  }

  const controller =
    typeof AbortController !== 'undefined'
      ? new AbortController()
      : null;

  const timeout = setTimeout(() => {
    if (controller) {
      controller.abort();
    }
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller ? controller.signal : undefined,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language':
          'en-US,en;q=0.9',
        'Cache-Control':
          'no-cache',
        'Referer':
          'https://www.google.com/'
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    return {
      html,
      finalUrl: response.url || url,
      status: response.status
    };
  } catch (error) {
    console.warn(
      `Could not fetch ${url}:`,
      error.message || error
    );

    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/*
|--------------------------------------------------------------------------
| CANONICAL URL EXTRACTION
|--------------------------------------------------------------------------
*/

function extractCanonicalUrl(html, baseUrl) {
  if (!html) return '';

  const ogUrl = extractMetaContent(html, [
    'og:url',
    'twitter:url'
  ]);

  if (ogUrl) {
    try {
      return new URL(ogUrl, baseUrl).href;
    } catch {}
  }

  const canonicalMatch = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i
  );

  if (canonicalMatch && canonicalMatch[1]) {
    try {
      return new URL(
        decodeHtml(canonicalMatch[1]),
        baseUrl
      ).href;
    } catch {}
  }

  return '';
}

/*
|--------------------------------------------------------------------------
| GOOGLE NEWS DETECTION
|--------------------------------------------------------------------------
*/

function isGoogleNewsUrl(url) {
  if (!url) return false;

  try {
    const hostname = new URL(url).hostname.toLowerCase();

    return (
      hostname === 'news.google.com' ||
      hostname.endsWith('.news.google.com')
    );
  } catch {
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| PUBLISHER IMAGE EXTRACTION
|--------------------------------------------------------------------------
|
| Google News RSS often gives a Google News URL rather than the
| publisher's direct article URL.
|
| This function:
|
| 1. Opens the Google News URL.
| 2. Checks whether Google redirected to publisher.
| 3. Extracts publisher image.
| 4. If Google remains in the URL, checks canonical/og:url.
| 5. Opens that canonical publisher URL.
| 6. Extracts og:image / Twitter image / JSON-LD / lazy images.
|--------------------------------------------------------------------------
*/

async function extractArticleImage(articleUrl) {
  if (!articleUrl) {
    return '';
  }

  try {
    /*
     * DIRECT PUBLISHER URL
     */
    if (!isGoogleNewsUrl(articleUrl)) {
      const page = await fetchHtml(articleUrl);

      if (!page) {
        return '';
      }

      const image = extractImageUrl(
        page.html,
        page.finalUrl || articleUrl
      );

      if (image) {
        return image;
      }

      const canonicalUrl = extractCanonicalUrl(
        page.html,
        page.finalUrl || articleUrl
      );

      if (
        canonicalUrl &&
        canonicalUrl !== articleUrl &&
        !isGoogleNewsUrl(canonicalUrl)
      ) {
        const canonicalPage = await fetchHtml(
          canonicalUrl
        );

        if (canonicalPage) {
          return extractImageUrl(
            canonicalPage.html,
            canonicalPage.finalUrl || canonicalUrl
          );
        }
      }

      return '';
    }

    /*
     * GOOGLE NEWS URL
     */
    const googlePage = await fetchHtml(articleUrl);

    if (!googlePage) {
      return '';
    }

    /*
     * If Google redirected directly to publisher,
     * extract from the publisher page.
     */
    if (
      googlePage.finalUrl &&
      !isGoogleNewsUrl(googlePage.finalUrl)
    ) {
      const publisherImage = extractImageUrl(
        googlePage.html,
        googlePage.finalUrl
      );

      if (publisherImage) {
        return publisherImage;
      }

      const publisherCanonical =
        extractCanonicalUrl(
          googlePage.html,
          googlePage.finalUrl
        );

      if (
        publisherCanonical &&
        !isGoogleNewsUrl(publisherCanonical)
      ) {
        const canonicalPage =
          await fetchHtml(publisherCanonical);

        if (canonicalPage) {
          const canonicalImage =
            extractImageUrl(
              canonicalPage.html,
              canonicalPage.finalUrl ||
                publisherCanonical
            );

          if (canonicalImage) {
            return canonicalImage;
          }
        }
      }
    }

    /*
     * Google may remain as the final URL.
     * Try canonical URL from Google's response.
     */
    const googleCanonical =
      extractCanonicalUrl(
        googlePage.html,
        googlePage.finalUrl || articleUrl
      );

    if (
      googleCanonical &&
      !isGoogleNewsUrl(googleCanonical)
    ) {
      const publisherPage =
        await fetchHtml(googleCanonical);

      if (publisherPage) {
        const publisherImage =
          extractImageUrl(
            publisherPage.html,
            publisherPage.finalUrl ||
              googleCanonical
          );

        if (publisherImage) {
          return publisherImage;
        }
      }
    }

    /*
     * Sometimes Google's page itself contains a usable
     * image that points outside Google.
     *
     * We only accept it when it is a real external
     * publisher image.
     */
    const googleExtractedImage =
      extractImageUrl(
        googlePage.html,
        googlePage.finalUrl || articleUrl
      );

    if (
      googleExtractedImage &&
      !isGooglePreviewImage(googleExtractedImage)
    ) {
      return googleExtractedImage;
    }

    return '';
  } catch (error) {
    console.warn(
      'Article image extraction failed:',
      error.message || error
    );

    return '';
  }
}

/*
|--------------------------------------------------------------------------
| RSS PARSER
|--------------------------------------------------------------------------
*/

function parseRssFeed(xml, sourceName) {
  const stories = [];

  if (!xml) {
    return stories;
  }

  const itemRegex =
    /<item\b[\s\S]*?<\/item>/gi;

  const items = xml.match(itemRegex) || [];

  for (const item of items) {
    const getTag = (tag) => {
      const regex = new RegExp(
        `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
        'i'
      );

      const match = item.match(regex);

      return match
        ? decodeHtml(match[1].trim())
        : '';
    };

    const title = stripHtml(getTag('title'));
    const link = getTag('link');
    const description =
      getTag('description');

    const pubDate =
      getTag('pubDate') ||
      getTag('published') ||
      getTag('dc:date');

    /*
     * Google News RSS has a <source url="...">
     * field. Keep it because it identifies the
     * publisher even when the article link is
     * still a Google News URL.
     */
    let publisherUrl = '';

    const sourceMatch = item.match(
      /<source\b[^>]*url=["']([^"']+)["'][^>]*>/i
    );

    if (sourceMatch && sourceMatch[1]) {
      publisherUrl = decodeHtml(
        sourceMatch[1].trim()
      );
    }

    /*
     * RSS media:image / enclosure image.
     */
    let rssImage = '';

    const mediaContent =
      item.match(
        /<media:content\b[^>]*url=["']([^"']+)["'][^>]*>/i
      );

    if (
      mediaContent &&
      mediaContent[1]
    ) {
      rssImage = mediaContent[1];
    }

    const mediaThumbnail =
      item.match(
        /<media:thumbnail\b[^>]*url=["']([^"']+)["'][^>]*>/i
      );

    if (
      !rssImage &&
      mediaThumbnail &&
      mediaThumbnail[1]
    ) {
      rssImage = mediaThumbnail[1];
    }

    const enclosure =
      item.match(
        /<enclosure\b[^>]*url=["']([^"']+)["'][^>]*>/i
      );

    if (
      !rssImage &&
      enclosure &&
      enclosure[1]
    ) {
      rssImage = enclosure[1];
    }

    /*
     * Some RSS feeds put an image inside the
     * description HTML.
     */
    if (!rssImage) {
      const descriptionImage =
        description.match(
          /<img\b[^>]*(?:src|data-src)=["']([^"']+)["']/i
        );

      if (
        descriptionImage &&
        descriptionImage[1]
      ) {
        rssImage =
          descriptionImage[1];
      }
    }

    if (!title || !link) {
      continue;
    }

    stories.push({
      title,
      link,
      description: stripHtml(description),
      publishedAt: pubDate
        ? new Date(pubDate).toISOString()
        : new Date().toISOString(),
      source: sourceName,
      publisherUrl,
      rssImage
    });
  }

  return stories;
}

/*
|--------------------------------------------------------------------------
| SCAM DETECTION
|--------------------------------------------------------------------------
*/

function scoreScam(story) {
  const text = [
    story.title,
    story.summary,
    story.description,
    story.content
  ]
    .filter(Boolean)
    .join(' ');

  let score = 0;
  const reasons = [];

  for (const pattern of scamPatterns) {
    if (pattern.test(text)) {
      score += 1;

      reasons.push(
        pattern.source
          .replace(/\\b|\(\?:|\(\?=/g, '')
      );
    }
  }

  /*
   * Strong scam signals.
   */
  if (
    /send\s+(money|cash|payment)/i.test(text)
  ) {
    score += 3;
    reasons.push(
      'Request for money'
    );
  }

  if (
    /(otp|password|pin|bank details|account number)/i.test(
      text
    )
  ) {
    score += 3;
    reasons.push(
      'Sensitive financial information request'
    );
  }

  let scamRisk = 'low';

  if (score >= 6) {
    scamRisk = 'high';
  } else if (score >= 3) {
    scamRisk = 'medium';
  }

  return {
    scamScore: score,
    scamRisk,
    scamLabel:
      scamRisk === 'high'
        ? 'Potential scam'
        : scamRisk === 'medium'
          ? 'Needs verification'
          : 'Likely safe',
    scamReasons: reasons,
    isScam: scamRisk === 'high'
  };
}

/*
|--------------------------------------------------------------------------
| STORY SANITIZATION
|--------------------------------------------------------------------------
*/

function sanitizeStory(story) {
  const scam = scoreScam(story);

  return {
    ...story,
    title: normaliseText(story.title),
    summary: normaliseText(
      story.summary ||
      story.description ||
      ''
    ),
    content:
      story.content ||
      story.summary ||
      story.description ||
      '',
    image: story.image || '',
    publishedAt:
      story.publishedAt ||
      story.fetchedAt ||
      new Date().toISOString(),
    category:
      story.category ||
      'Local',
    status:
      story.status ||
      'approved',
    ...scam
  };
}

/*
|--------------------------------------------------------------------------
| DEDUPLICATION
|--------------------------------------------------------------------------
*/

function dedupeStories(stories) {
  const map = new Map();

  for (const story of stories) {
    if (!story || !story.title) {
      continue;
    }

    const key =
      String(
        story.link ||
        story.title
      )
        .toLowerCase()
        .trim();

    if (!map.has(key)) {
      map.set(key, story);
    } else {
      const existing = map.get(key);

      /*
       * Prefer the version that has an image.
       */
      if (
        !existing.image &&
        story.image
      ) {
        map.set(key, story);
      }
    }
  }

  return Array.from(map.values());
}

/*
|--------------------------------------------------------------------------
| LOCAL STORY FILTER
|--------------------------------------------------------------------------
*/

function isLocalStory(story) {
  const text = [
    story.title,
    story.description,
    story.summary,
    story.source
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return localKeywords.some(
    (keyword) =>
      text.includes(keyword.toLowerCase())
  );
}

/*
|--------------------------------------------------------------------------
| FETCH A SINGLE RSS FEED
|--------------------------------------------------------------------------
*/

async function fetchFeed(source) {
  try {
    const page = await fetchHtml(
      source.url,
      12000
    );

    if (!page) {
      return [];
    }

    return parseRssFeed(
      page.html,
      source.name
    );
  } catch (error) {
    console.error(
      `RSS feed failed: ${source.name}`,
      error
    );

    return [];
  }
}

/*
|--------------------------------------------------------------------------
| FETCH DAILY STORIES
|--------------------------------------------------------------------------
*/

async function fetchDailyStories() {
  console.log(
    'Starting daily Ipapo news fetch...'
  );

  const feeds = [
    ...trustedSources,
    ...localSources
  ];

  const results =
    await Promise.all(
      feeds.map(fetchFeed)
    );

  let rawStories =
    results.flat();

  console.log(
    `Fetched ${rawStories.length} RSS stories`
  );

  /*
   * Keep stories from the last 7 days.
   */
  const now = Date.now();

  const sevenDaysAgo =
    now -
    7 * 24 * 60 * 60 * 1000;

  rawStories =
    rawStories.filter((story) => {
      const timestamp =
        new Date(
          story.publishedAt
        ).getTime();

      return (
        Number.isFinite(timestamp) &&
        timestamp >= sevenDaysAgo
      );
    });

  /*
   * Keep stories relevant to Ipapo/Oyo/Itesiwaju.
   */
  rawStories =
    rawStories.filter(isLocalStory);

  console.log(
    `${rawStories.length} stories passed local filtering`
  );

  /*
   * Dedupe before expensive image extraction.
   */
  rawStories =
    dedupeStories(rawStories);

  /*
   * Enrich stories with real publisher images.
   *
   * Image extraction is intentionally limited
   * so the Vercel function does not spend too
   * much time fetching hundreds of pages.
   */
  const enrichedStories = [];

  for (const story of rawStories) {
    let image = '';

    /*
     * First use an actual RSS image if available.
     */
    if (
      story.rssImage &&
      isValidImageUrl(
        story.rssImage
      ) &&
      !isGooglePreviewImage(
        story.rssImage
      )
    ) {
      image = makeAbsoluteUrl(
        story.rssImage,
        story.link
      );
    }

    /*
     * Then try the publisher/article page.
     */
    if (!image) {
      image =
        await extractArticleImage(
          story.link
        );
    }

    /*
     * If the Google News article could not be
     * opened, keep image empty instead of using
     * a fake/random image.
     */
    const cleaned = sanitizeStory({
      id:
        'feed-' +
        Buffer.from(
          story.link
        ).toString('base64url'),

      title: story.title,

      source:
        story.source,

      link:
        story.link,

      publisherUrl:
        story.publisherUrl || '',

      summary:
        story.description,

      content:
        story.description,

      image:
        image || '',

      publishedAt:
        story.publishedAt,

      category:
        'Local',

      status:
        'approved',

      fetchedAt:
        new Date().toISOString()
    });

    enrichedStories.push(cleaned);

    console.log(
      `Image for "${story.title}":`,
      image || 'NOT FOUND'
    );
  }

  /*
   * Load existing stories.
   */
  let existingStories = [];

  try {
    const state =
      await readState();

    existingStories =
      Array.isArray(state.stories)
        ? state.stories
        : [];
  } catch (error) {
    console.warn(
      'Could not read existing stories:',
      error.message || error
    );
  }

  /*
   * Keep existing stories that still have
   * useful images and were not replaced.
   */
  const existingWithImages =
    existingStories.filter(
      (story) =>
        story &&
        story.image &&
        isValidImageUrl(
          story.image
        )
    );

  /*
   * Merge new and existing stories.
   */
  const merged =
    dedupeStories([
      ...enrichedStories,
      ...existingWithImages
    ]);

  /*
   * Stories with real images appear first.
   */
  merged.sort((a, b) => {
    if (a.image && !b.image) {
      return -1;
    }

    if (!a.image && b.image) {
      return 1;
    }

    return (
      new Date(
        b.publishedAt ||
        b.fetchedAt ||
        0
      ).getTime() -
      new Date(
        a.publishedAt ||
        a.fetchedAt ||
        0
      ).getTime()
    );
  });

  /*
   * Save stories.
   */
  try {
    await saveStories(
      merged
    );
  } catch (error) {
    console.error(
      'Could not save stories:',
      error
    );
  }

  /*
   * Save scam alerts.
   */
  const scamStories =
    enrichedStories.filter(
      (story) =>
        story.isScam ||
        story.scamRisk === 'medium'
    );

  if (scamStories.length) {
    try {
      const alerts =
        scamStories.map(
          (story) => ({
            storyId:
              story.id,

            title:
              story.title,

            risk:
              story.scamRisk,

            score:
              story.scamScore,

            reasons:
              story.scamReasons,

            createdAt:
              new Date().toISOString()
          })
        );

      await saveAlerts(
        alerts
      );
    } catch (error) {
      console.error(
        'Could not save scam alerts:',
        error
      );
    }
  }

  console.log(
    `Daily fetch complete. ${enrichedStories.length} new stories processed.`
  );

  return enrichedStories;
}

/*
|--------------------------------------------------------------------------
| GET DAILY STORIES
|--------------------------------------------------------------------------
*/

async function getDailyStories() {
  try {
    const state =
      await readState();

    const stories =
      Array.isArray(state.stories)
        ? state.stories
        : [];

    return stories.filter(
      (story) =>
        story.status === 'approved'
    );
  } catch (error) {
    console.error(
      'Could not get daily stories:',
      error
    );

    return [];
  }
}

/*
|--------------------------------------------------------------------------
| COMMUNITY GREETING
|--------------------------------------------------------------------------
*/

function getScheduledGreeting() {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return 'Good morning, Ipapo!';
  }

  if (hour < 17) {
    return 'Good afternoon, Ipapo!';
  }

  return 'Good evening, Ipapo!';
}

/*
|--------------------------------------------------------------------------
| BACKWARD COMPATIBILITY
|--------------------------------------------------------------------------
*/

async function getDailyNewsForUser(
  userEmail
) {
  return getDailyStories();
}

async function markNewsSeenForUser(
  userEmail,
  storyId
) {
  try {
    await updateStory(
      storyId,
      {
        lastViewedBy:
          userEmail,

        lastViewedAt:
          new Date().toISOString()
      }
    );

    return true;
  } catch {
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  trustedSources,
  localSources,
  localKeywords,

  normaliseText,
  decodeHtml,
  stripHtml,

  extractMetaContent,
  extractImageUrl,
  extractArticleImage,

  parseRssFeed,
  scoreScam,
  sanitizeStory,
  dedupeStories,
  isLocalStory,

  fetchDailyStories,
  getDailyStories,
  getScheduledGreeting,

  getDailyNewsForUser,
  markNewsSeenForUser,

  getStory
};