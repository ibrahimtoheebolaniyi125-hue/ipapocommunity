const {
  readState,
  saveStories,
  saveAlerts,
  updateStory,
  getUnseenStories,
  markStorySeen
} = require('./store');

const trustedSources = [
  'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
  'https://www.aljazeera.com/xml/rss/all.xml',
  'https://tribuneonlineng.com/feed/',
  'https://punchng.com/feed/',
  'https://www.theguardian.com/world/rss'
];

const localSources = [
  'https://news.google.com/rss/search?q=Ipapo+Oyo+Nigeria&hl=en-NG&gl=NG&ceid=NG:en',
  'https://news.google.com/rss/search?q=Itesiwaju+Oyo&hl=en-NG&gl=NG&ceid=NG:en',
  'https://news.google.com/rss/search?q=Oyo+State+local+government&hl=en-NG&gl=NG&ceid=NG:en'
];

const localKeywords = [
  /\bipapo\b/i,
  /\bitesiwaju\b/i,
  /\boyo state\b/i,
  /\bokeho\b/i,
  /\botu\b/i,
  /\bkomu\b/i,
  /\bigbeti\b/i,
  /\batisbo\b/i,
  /\bkajola\b/i,
  /\biseyin\b/i,
  /\boyo local government\b/i
];

const scamPatterns = [
  /urgent|immediately|today only|act now/i,
  /send money|pay now|wire transfer|bank transfer|cash app|bitcoin|crypto|usdt|ethereum|btc/i,
  /claim your prize|winner|congratulations|free reward|gift giveaway|lottery|cash giveaway/i,
  /click here to verify|login to protect|secure your account|confirm your wallet|verify your bank/i,
  /guaranteed profit|double your money|quick return|investment opportunity/i
];

const getCache = async () => readState();

const normaliseText = (value = '') =>
  String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const decodeHtml = (value = '') =>
  String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/g, '/');

/*
 * Extract an attribute from an HTML tag regardless of
 * the order of the attributes.
 */
const extractMetaContent = (
  html = '',
  attributeName = '',
  attributeValue = ''
) => {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedValue = attributeValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const pattern = new RegExp(
    `<meta\\b(?=[^>]*\\b${escapedName}\\s*=\\s*["']${escapedValue}["'])(?=[^>]*\\bcontent\\s*=\\s*["']([^"']+)["'])[^>]*>`,
    'i'
  );

  const reversePattern = new RegExp(
    `<meta\\b(?=[^>]*\\bcontent\\s*=\\s*["']([^"']+)["'])(?=[^>]*\\b${escapedName}\\s*=\\s*["']${escapedValue}["'])[^>]*>`,
    'i'
  );

  return (
    html.match(pattern)?.[1] ||
    html.match(reversePattern)?.[1] ||
    ''
  );
};

/*
 * Extract a useful image URL from an article page.
 *
 * Priority:
 * 1. og:image
 * 2. twitter:image
 * 3. JSON-LD article image
 * 4. image_src
 * 5. first reasonably-sized image
 */
const extractImageUrl = (html = '', baseUrl = '') => {
  const source = decodeHtml(html);

  const candidates = [];

  const ogImage = extractMetaContent(
    source,
    'property',
    'og:image'
  );

  const twitterImage =
    extractMetaContent(
      source,
      'name',
      'twitter:image'
    ) ||
    extractMetaContent(
      source,
      'name',
      'twitter:image:src'
    );

  if (ogImage) {
    candidates.push(ogImage);
  }

  if (twitterImage) {
    candidates.push(twitterImage);
  }

  /*
   * Try JSON-LD.
   *
   * Many news websites expose article images through:
   * "image": "https://..."
   *
   * or:
   * "image": {
   *   "url": "https://..."
   * }
   *
   * or:
   * "image": [
   *   "https://..."
   * ]
   */
  const jsonLdBlocks = [
    ...source.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  ];

  for (const block of jsonLdBlocks) {
    const rawJson = block[1]
      .trim()
      .replace(/<!--/g, '')
      .replace(/-->/g, '');

    try {
      const parsed = JSON.parse(rawJson);

      const objects = Array.isArray(parsed)
        ? parsed
        : [parsed];

      for (const item of objects) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        const image = item.image;

        if (typeof image === 'string') {
          candidates.push(image);
        } else if (Array.isArray(image)) {
          image.forEach((value) => {
            if (typeof value === 'string') {
              candidates.push(value);
            }

            if (
              value &&
              typeof value === 'object' &&
              typeof value.url === 'string'
            ) {
              candidates.push(value.url);
            }
          });
        } else if (
          image &&
          typeof image === 'object' &&
          typeof image.url === 'string'
        ) {
          candidates.push(image.url);
        }
      }
    } catch (error) {
      /*
       * Some websites contain malformed JSON-LD.
       * Ignore it and continue to the next method.
       */
    }
  }

  /*
   * image_src is used by some older news websites.
   */
  const imageSrc = source.match(
    /<link[^>]+rel=["'][^"']*\bimage_src\b[^"']*["'][^>]+href=["']([^"']+)["']/i
  )?.[1];

  if (imageSrc) {
    candidates.push(imageSrc);
  }

  /*
   * Last fallback:
   * Look for an image with an actual image extension.
   * This comes AFTER og:image and JSON-LD so that logos
   * and icons are less likely to be selected.
   */
  const imageMatches = [
    ...source.matchAll(
      /<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/gi
    )
  ];

  for (const match of imageMatches.slice(0, 15)) {
    const image = match[1];

    if (
      /\.(jpg|jpeg|png|webp|gif)(\?|#|$)/i.test(image)
    ) {
      candidates.push(image);
    }
  }

  for (const candidate of candidates.filter(Boolean)) {
    try {
      const absoluteUrl = new URL(
        candidate,
        baseUrl || undefined
      ).href;

      const hostname = new URL(absoluteUrl).hostname
        .toLowerCase();

      /*
       * Do not use Google's preview/proxy images.
       * We want the actual publisher image.
       */
      if (
        hostname.includes('googleusercontent.com') ||
        hostname.includes('gstatic.com')
      ) {
        continue;
      }

      /*
       * Ignore obvious tracking pixels and data URLs.
       */
      if (
        absoluteUrl.startsWith('data:') ||
        absoluteUrl.includes('favicon') ||
        absoluteUrl.includes('logo.svg') ||
        absoluteUrl.includes('icon.svg')
      ) {
        continue;
      }

      return absoluteUrl;
    } catch (error) {
      continue;
    }
  }

  return '';
};

const isGooglePreviewImage = (image = '') => {
  try {
    const hostname = new URL(image).hostname.toLowerCase();

    return (
      hostname.includes('googleusercontent.com') ||
      hostname.includes('gstatic.com')
    );
  } catch (error) {
    return false;
  }
};

/*
 * Fetch an article page and extract the actual publisher image.
 *
 * For Google News:
 *
 * Google News RSS
 *       ↓
 * Google News article URL
 *       ↓
 * Follow redirect
 *       ↓
 * Original publisher URL
 *       ↓
 * og:image / twitter:image / JSON-LD
 */
const extractArticleImage = async (link) => {
  if (!link || link === '#') {
    return '';
  }

  let controller;
  let timeout;

  try {
    controller = new AbortController();

    timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    const response = await fetch(link, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-NG,en;q=0.9'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return '';
    }

    const finalUrl = response.url || link;

    /*
     * Only inspect HTML pages.
     */
    const contentType =
      response.headers.get('content-type') || '';

    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml+xml')
    ) {
      return '';
    }

    const html = await response.text();

    /*
     * The final response URL is extremely important.
     *
     * If the original link was:
     * news.google.com/...
     *
     * but Google redirected to:
     * punchng.com/...
     *
     * finalUrl will contain the publisher URL.
     */
    const finalHostname =
      new URL(finalUrl).hostname.toLowerCase();

    const originalHostname =
      new URL(link).hostname.toLowerCase();

    const isGoogleNews =
      originalHostname.includes('news.google.com');

    const isPublisherPage =
      !finalHostname.includes('news.google.com');

    /*
     * First try the page we reached.
     */
    if (isPublisherPage) {
      const publisherImage =
        extractImageUrl(html, finalUrl);

      if (publisherImage) {
        return publisherImage;
      }
    }

    /*
     * Sometimes Google News does not redirect cleanly.
     *
     * Try to find a canonical publisher URL.
     */
    const canonical =
      extractMetaContent(
        html,
        'property',
        'og:url'
      ) ||
      html.match(
        /<link[^>]+rel=["'][^"']*\bcanonical\b[^"']*["'][^>]+href=["']([^"']+)["']/i
      )?.[1] ||
      '';

    if (canonical && isGoogleNews) {
      try {
        const canonicalUrl =
          new URL(canonical, finalUrl).href;

        const canonicalHostname =
          new URL(canonicalUrl).hostname.toLowerCase();

        if (
          !canonicalHostname.includes('news.google.com')
        ) {
          const canonicalImage =
            await extractArticleImage(canonicalUrl);

          if (canonicalImage) {
            return canonicalImage;
          }
        }
      } catch (error) {
        /*
         * Ignore malformed canonical URLs.
         */
      }
    }

    /*
     * For a normal publisher RSS link, use the image
     * directly from that page.
     */
    if (!isGoogleNews) {
      const directImage =
        extractImageUrl(html, finalUrl);

      if (directImage) {
        return directImage;
      }
    }

    return '';
  } catch (error) {
    /*
     * Image fetching should NEVER break the news fetch.
     */
    console.warn(
      `Could not fetch article image (${link}):`,
      error.message
    );

    return '';
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

/*
 * Parse an RSS feed.
 */
const parseRssFeed = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'IpapoBroadcast/1.0'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();

    const items = [
      ...xml.matchAll(
        /<item>([\s\S]*?)<\/item>/gi
      )
    ];

    return items
      .map((match) => {
        const chunk = match[1];

        const title =
          normaliseText(
            (
              chunk.match(
                /<title>([\s\S]*?)<\/title>/i
              ) || []
            )[1] || ''
          );

        const link =
          (
            chunk.match(
              /<link>([\s\S]*?)<\/link>/i
            ) || []
          )[1] || '';

        const descriptionHtml =
          (
            chunk.match(
              /<description>([\s\S]*?)<\/description>/i
            ) || []
          )[1] || '';

        const decodedDescription =
          decodeHtml(descriptionHtml);

        const description =
          normaliseText(decodedDescription);

        const pubDate =
          (
            chunk.match(
              /<pubDate>([\s\S]*?)<\/pubDate>/i
            ) || []
          )[1] ||
          new Date().toISOString();

        /*
         * Try to get an image directly from RSS first.
         */
        const image =
          (
            chunk.match(
              /<media:content[^>]+url=["']([^"']+)["']/i
            ) || []
          )[1] ||
          (
            chunk.match(
              /<media:thumbnail[^>]+url=["']([^"']+)["']/i
            ) || []
          )[1] ||
          (
            chunk.match(
              /<enclosure[^>]+url=["']([^"']+)["']/i
            ) || []
          )[1] ||
          extractImageUrl(
            decodedDescription,
            url
          ) ||
          '';

        if (!title) {
          return null;
        }

        const source =
          new URL(url).hostname
            .replace('www.', '');

        const stableKey =
          Buffer
            .from(
              `${source}:${link || title}`
            )
            .toString('base64url')
            .slice(0, 80);

        return {
          id: `feed-${stableKey}`,
          title,
          source,
          link: link || '#',
          summary:
            description || title,
          content:
            description || title,

          /*
           * Never keep Google's preview image.
           */
          image:
            isGooglePreviewImage(image)
              ? ''
              : image,

          publishedAt: pubDate,
          category: 'World'
        };
      })
      .filter(Boolean);

  } catch (error) {
    console.warn(
      `News source unavailable (${url}):`,
      error.message
    );

    return [];
  }
};

/*
 * Scam detection.
 */
const scoreScam = (text = '') => {
  const lower =
    String(text).toLowerCase();

  let score = 0;

  const reasons = [];

  scamPatterns.forEach((pattern) => {
    if (pattern.test(lower)) {
      score += 22;

      reasons.push(
        pattern
          .toString()
          .replace(/\//g, '')
          .slice(0, 40)
      );
    }
  });

  if (
    /\b(urgent|immediately|today|now)\b/.test(
      lower
    )
  ) {
    score += 15;
  }

  if (
    /(pay|send|transfer).*(bank|money|bitcoin|crypto|wallet)/i.test(
      lower
    )
  ) {
    score += 20;
  }

  if (
    /(claim|winner|lottery|gift|reward)/i.test(
      lower
    )
  ) {
    score += 18;
  }

  return {
    score: Math.min(score, 100),

    reasons: [
      ...new Set(reasons)
    ].slice(0, 5),

    risk:
      score >= 60
        ? 'high'
        : score >= 30
          ? 'medium'
          : 'low',

    label:
      score >= 60
        ? 'Scam alert'
        : score >= 30
          ? 'Needs verification'
          : 'Likely safe'
  };
};

/*
 * Analyse and sanitize a story.
 */
const sanitizeStory = (story) => {
  const scam =
    scoreScam(
      `${story.title} ${story.summary} ${story.content}`
    );

  return {
    ...story,

    /*
     * Low-risk stories can be shown publicly.
     * Medium/high-risk stories remain pending.
     */
    status:
      scam.risk === 'low'
        ? 'approved'
        : 'pending',

    scamScore: scam.score,
    scamRisk: scam.risk,
    scamLabel: scam.label,
    scamReasons: scam.reasons,
    isScam:
      scam.risk === 'high'
  };
};

/*
 * Remove duplicates by BOTH ID and title.
 */
const dedupeStories = (stories = []) => {
  const seenIds = new Set();
  const seenTitles = new Set();

  const result = [];

  for (const story of stories) {
    if (!story || !story.id) {
      continue;
    }

    const idKey =
      String(story.id).trim();

    const titleKey =
      String(story.title || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    if (seenIds.has(idKey)) {
      continue;
    }

    if (
      titleKey &&
      seenTitles.has(titleKey)
    ) {
      continue;
    }

    seenIds.add(idKey);

    if (titleKey) {
      seenTitles.add(titleKey);
    }

    result.push(story);
  }

  return result;
};

/*
 * Check whether a story is related to Ipapo/Oyo.
 */
const isLocalStory = (story) => {
  const text =
    `${story.title} ${story.summary} ${story.content}`;

  return localKeywords.some(
    (keyword) => keyword.test(text)
  );
};

/*
 * Fetch today's local stories.
 */
const fetchDailyStories = async () => {
  const feeds =
    await Promise.all(
      [
        ...trustedSources,
        ...localSources
      ].map(parseRssFeed)
    );

  /*
   * Only accept articles from the last 7 days.
   */
  const now =
    Date.now();

  const recentStories =
    feeds
      .flat()
      .filter((story) => {
        const publishedTime =
          new Date(
            story.publishedAt
          ).getTime();

        if (
          Number.isNaN(publishedTime)
        ) {
          return false;
        }

        const age =
          now - publishedTime;

        return (
          age >= 0 &&
          age <=
            7 *
            24 *
            60 *
            60 *
            1000
        );
      });

  /*
   * Remove duplicates and keep only
   * local/Oyo-related stories.
   */
  const merged =
    dedupeStories(recentStories)
      .filter(isLocalStory);

  /*
   * IMPORTANT:
   *
   * Fetch the actual publisher page for
   * every story and attempt to retrieve
   * the publisher's real image.
   *
   * If an image cannot be found, the story
   * is still kept.
   */
  const enriched =
    await Promise.all(
      merged.map(async (story) => {
        let articleImage = '';

        try {
          articleImage =
            await extractArticleImage(
              story.link
            );
        } catch (error) {
          articleImage = '';
        }

        return {
          ...story,

          /*
           * Publisher image first.
           * RSS image second.
           */
          image:
            articleImage ||
            story.image ||
            ''
        };
      })
    );

  /*
   * Set all fetched stories as Local.
   */
  const analysed =
    enriched
      .map((story) => ({
        ...story,
        category: 'Local'
      }))
      .map(sanitizeStory);

  /*
   * High-risk stories are not publicly published.
   * They still go into the alert system.
   */
  const cleaned =
    analysed.filter(
      (story) =>
        story.scamRisk !== 'high'
    );

  const existingState =
    await readState();

  const existingStories =
    new Map(
      existingState.stories.map(
        (story) => [
          story.id,
          story
        ]
      )
    );

  const fetchedAt =
    new Date().toISOString();

  /*
   * Keep existing stories that already have
   * valid publisher images.
   */
  const retainedImageStories =
    existingState.stories.filter(
      (story) =>
        story.image &&
        !isGooglePreviewImage(
          story.image
        ) &&
        isLocalStory(story)
    );

  /*
   * Combine newly fetched stories with
   * existing stories that have useful images.
   */
  const candidateStories =
    dedupeStories([
      ...cleaned,
      ...retainedImageStories
    ]);

  /*
   * Put stories with actual images first.
   */
  const limitedStories =
    candidateStories
      .sort(
        (left, right) =>
          Number(
            Boolean(right.image)
          ) -
          Number(
            Boolean(left.image)
          )
      )
      .slice(0, 20);

  /*
   * Final ID-only safety check before
   * sending anything to Supabase.
   */
  const finalStories = [];

  const finalIds =
    new Set();

  for (
    const story of limitedStories
  ) {
    if (
      !story ||
      !story.id
    ) {
      continue;
    }

    const id =
      String(story.id);

    if (
      finalIds.has(id)
    ) {
      continue;
    }

    finalIds.add(id);

    finalStories.push({
      ...story,

      /*
       * Preserve an existing approved/pending
       * status when the story already exists.
       */
      status:
        existingStories.get(id)?.status ||
        story.status,

      /*
       * Preserve the original fetchedAt for
       * existing stories.
       */
      fetchedAt:
        existingStories.get(id)?.fetchedAt ||
        fetchedAt
    });
  }

  /*
   * Create scam alerts for medium/high-risk stories.
   */
  const nextAlerts =
    analysed
      .filter(
        (story) =>
          story.scamRisk !== 'low'
      )
      .map((story) => ({
        id:
          `alert-${story.id}`,

        title:
          story.title,

        risk:
          story.scamRisk,

        score:
          story.scamScore,

        reasons:
          story.scamReasons,

        source:
          story.source,

        createdAt:
          new Date().toISOString()
      }));

  /*
   * Save the final stories.
   */
  await saveStories(
    finalStories
  );

  /*
   * Save scam alerts.
   */
  await saveAlerts(
    dedupeStories(nextAlerts)
  );

  return finalStories;
};

/*
 * Get daily stories.
 */
const getDailyStories =
  async (force = false) => {
    const cache =
      await getCache();

    const now =
      Date.now();

    const visibleStories =
      dedupeStories(
        cache.stories.filter(
          (story) =>
            !isGooglePreviewImage(
              story.image
            )
        )
      )
        .sort(
          (left, right) =>
            Number(
              Boolean(right.image)
            ) -
            Number(
              Boolean(left.image)
            )
        );

    /*
     * Use the cache for 15 minutes unless
     * force=true.
     */
    if (
      !force &&
      cache.generatedAt &&
      (
        now -
        new Date(
          cache.generatedAt
        ).getTime()
      ) <
        15 *
        60 *
        1000
    ) {
      return visibleStories;
    }

    return fetchDailyStories();
  };

/*
 * Scheduled community greetings.
 */
const getScheduledGreeting =
  async (
    date = new Date()
  ) => {
    const year =
      date.getUTCFullYear();

    const month =
      date.getUTCMonth();

    const day =
      date.getUTCDate();

    const dayOfWeek =
      date.getUTCDay();

    const isNewYear =
      month === 0 &&
      day === 1;

    const isNewMonth =
      day === 1;

    const isNewWeek =
      dayOfWeek === 1;

    if (
      !isNewYear &&
      !isNewMonth &&
      !isNewWeek
    ) {
      return null;
    }

    let period;
    let title;
    let message;

    if (isNewYear) {
      period =
        `year-${year}`;

      title =
        `Happy New Year from Ipapo Broadcast - ${year}`;

      message =
        `Wishing every Ipapo family, resident, and descendant a peaceful and prosperous ${year}.`;

    } else if (isNewMonth) {
      period =
        `month-${year}-${String(
          month + 1
        ).padStart(2, '0')}`;

      title =
        'Happy New Month from Ipapo Broadcast';

      message =
        'Welcome to a new month, Ipapo. May this month bring progress, good health, and stronger community connections.';

    } else {
      const monday =
        new Date(
          Date.UTC(
            year,
            month,
            day -
              (dayOfWeek || 7) +
              1
          )
        );

      period =
        `week-${monday
          .toISOString()
          .slice(0, 10)}`;

      title =
        'Happy New Week from Ipapo Broadcast';

      message =
        'A new week begins across Ipapo and Itesiwaju. Stay informed, stay connected, and support one another.';
    }

    const id =
      `announcement-${period}`;

    const state =
      await readState();

    const existing =
      state.stories.find(
        (story) =>
          story.id === id
      );

    if (existing) {
      return existing;
    }

    const greeting = {
      id,

      title,

      source:
        'Ipapo Broadcast Editorial Desk',

      link:
        `/article.html?id=${encodeURIComponent(id)}`,

      summary:
        message,

      content:
        `<p>${message}</p>`,

      image:
        'img/ipapo_gateway.jpg',

      publishedAt:
        date.toISOString(),

      category:
        'Community',

      status:
        'approved',

      scamScore:
        0,

      scamRisk:
        'low',

      scamLabel:
        'Likely safe',

      scamReasons:
        [],

      isScam:
        false,

      fetchedAt:
        date.toISOString()
    };

    await saveStories([
      greeting
    ]);

    return greeting;
  };

const updateStoryStatus =
  (storyId, status) =>
    updateStory(
      storyId,
      status
    );

const getDailyNewsForUser =
  (userEmail = 'all') =>
    getUnseenStories(
      userEmail
    );

const markNewsSeenForUser =
  (userEmail, itemId) =>
    markStorySeen(
      userEmail,
      itemId
    );

module.exports = {
  fetchDailyStories,
  getDailyStories,
  getScheduledGreeting,
  updateStoryStatus,
  getCache,
  scoreScam,
  getDailyNewsForUser,
  markNewsSeenForUser
};