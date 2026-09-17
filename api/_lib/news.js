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
    .replace(/&#39;|&apos;/g, "'");

const extractImageUrl = (html = '', baseUrl = '') => {
  const source = decodeHtml(html);

  const candidates = [
    source.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1],
    source.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)?.[1],
    source.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i)?.[1],
    source.match(/"image"\s*:\s*["']([^"']+)["']/i)?.[1]
  ].filter(Boolean);

  if (!candidates.length) return '';

  try {
    return new URL(candidates[0], baseUrl || undefined).href;
  } catch (error) {
    return '';
  }
};

const isGooglePreviewImage = (image = '') => {
  try {
    return new URL(image).hostname.includes('googleusercontent.com');
  } catch (error) {
    return false;
  }
};

const extractArticleImage = async (link) => {
  if (!link || link === '#') return '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(link, {
      headers: {
        'User-Agent': 'IpapoBroadcast/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) return '';

    const html = await response.text();
    const image = extractImageUrl(html, link);

    const canonical =
      html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      '';

    const canonicalUrl = canonical
      ? new URL(canonical, link).href
      : '';

    const isGoogleNewsUrl =
      new URL(link).hostname.includes('news.google.com');

    const isPublisherUrl =
      canonicalUrl &&
      !new URL(canonicalUrl).hostname.includes('news.google.com');

    if (isGoogleNewsUrl && isPublisherUrl) {
      const publisherImage = await extractArticleImage(canonicalUrl);

      if (publisherImage) {
        return publisherImage;
      }
    }

    return image && !isGoogleNewsUrl ? image : '';

  } catch (error) {
    return '';
  }
};

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
      ...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)
    ];

    return items
      .map((match) => {
        const chunk = match[1];

        const title =
          normaliseText(
            (chunk.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || ''
          );

        const link =
          (chunk.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '';

        const descriptionHtml =
          (chunk.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || '';

        const decodedDescription =
          decodeHtml(descriptionHtml);

        const description =
          normaliseText(decodedDescription);

        const pubDate =
          (chunk.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] ||
          new Date().toISOString();

        const image =
          (chunk.match(/<media:content[^>]+url=["']([^"']+)["']/i) || [])[1] ||
          (chunk.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) || [])[1] ||
          (chunk.match(/<enclosure[^>]+url=["']([^"']+)["']/i) || [])[1] ||
          extractImageUrl(decodedDescription, url) ||
          '';

        if (!title) {
          return null;
        }

        const source =
          new URL(url).hostname.replace('www.', '');

        const stableKey =
          Buffer
            .from(`${source}:${link || title}`)
            .toString('base64url')
            .slice(0, 80);

        return {
          id: `feed-${stableKey}`,
          title,
          source,
          link: link || '#',
          summary: description || title,
          content: description || title,
          image: isGooglePreviewImage(image) ? '' : image,
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

const scoreScam = (text = '') => {
  const lower = String(text).toLowerCase();

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

  if (/\b(urgent|immediately|today|now)\b/.test(lower)) {
    score += 15;
  }

  if (
    /(pay|send|transfer).*(bank|money|bitcoin|crypto|wallet)/i.test(lower)
  ) {
    score += 20;
  }

  if (
    /(claim|winner|lottery|gift|reward)/i.test(lower)
  ) {
    score += 18;
  }

  return {
    score: Math.min(score, 100),
    reasons: [...new Set(reasons)].slice(0, 5),
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

const sanitizeStory = (story) => {
  const scam = scoreScam(
    `${story.title} ${story.summary} ${story.content}`
  );

  return {
    ...story,

    // Low-risk stories can be shown publicly.
    // Medium-risk stories remain pending for review.
    status:
      scam.risk === 'low'
        ? 'approved'
        : 'pending',

    scamScore: scam.score,
    scamRisk: scam.risk,
    scamLabel: scam.label,
    scamReasons: scam.reasons,
    isScam: scam.risk === 'high'
  };
};

/*
 * Remove duplicate stories by BOTH ID and title.
 * This prevents Supabase from receiving the same
 * constrained ID more than once in one request.
 */
const dedupeStories = (stories = []) => {
  const seenIds = new Set();
  const seenTitles = new Set();
  const result = [];

  for (const story of stories) {
    if (!story || !story.id) continue;

    const idKey = String(story.id).trim();

    const titleKey =
      String(story.title || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    if (seenIds.has(idKey)) {
      continue;
    }

    if (titleKey && seenTitles.has(titleKey)) {
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

const isLocalStory = (story) => {
  const text =
    `${story.title} ${story.summary} ${story.content}`;

  return localKeywords.some(
    (keyword) => keyword.test(text)
  );
};

const fetchDailyStories = async () => {
  const feeds = await Promise.all(
    [...trustedSources, ...localSources].map(
      parseRssFeed
    )
  );

  /*
   * Only accept genuinely recent articles.
   *
   * This prevents old stories from 2022, 2025,
   * etc. from appearing as current news.
   *
   * Current window: last 7 days.
   */
  const now = Date.now();

  const recentStories =
    feeds
      .flat()
      .filter((story) => {
        const publishedTime =
          new Date(story.publishedAt).getTime();

        if (Number.isNaN(publishedTime)) {
          return false;
        }

        const age =
          now - publishedTime;

        return (
          age >= 0 &&
          age <= 7 * 24 * 60 * 60 * 1000
        );
      });

  const merged =
    dedupeStories(recentStories)
      .filter(isLocalStory);

  const enriched =
    await Promise.all(
      merged.map(async (story) => ({
        ...story,
        image:
          await extractArticleImage(story.link) ||
          story.image
      }))
    );

  const analysed =
    enriched
      .map((story) => ({
        ...story,
        category: 'Local'
      }))
      .map(sanitizeStory);

  /*
   * High-risk stories are not published publicly.
   * They are still sent to the alert system below.
   */
  const cleaned =
    analysed.filter(
      (story) => story.scamRisk !== 'high'
    );

  const existingState =
    await readState();

  const existingStories =
    new Map(
      existingState.stories.map(
        (story) => [story.id, story]
      )
    );

  const fetchedAt =
    new Date().toISOString();

  /*
   * Keep existing stories that already have a good
   * image so the site does not unnecessarily lose
   * useful article images.
   */
  const retainedImageStories =
    existingState.stories.filter(
      (story) =>
        story.image &&
        !isGooglePreviewImage(story.image) &&
        isLocalStory(story)
    );

  /*
   * Combine newly fetched stories with retained
   * stories, then remove duplicates.
   */
  const candidateStories =
    dedupeStories([
      ...cleaned,
      ...retainedImageStories
    ]);

  /*
   * Put stories with images first and limit the
   * collection to 20 stories.
   */
  const limitedStories =
    candidateStories
      .sort(
        (left, right) =>
          Number(Boolean(right.image)) -
          Number(Boolean(left.image))
      )
      .slice(0, 20);

  /*
   * Final ID-only safety check immediately before
   * sending anything to Supabase.
   */
  const finalStories = [];
  const finalIds = new Set();

  for (const story of limitedStories) {
    if (!story || !story.id) continue;

    const id = String(story.id);

    if (finalIds.has(id)) {
      continue;
    }

    finalIds.add(id);

    finalStories.push({
      ...story,

      status:
        existingStories.get(id)?.status ||
        story.status,

      fetchedAt:
        existingStories.get(id)?.fetchedAt ||
        fetchedAt
    });
  }

  const nextAlerts =
    analysed
      .filter(
        (story) => story.scamRisk !== 'low'
      )
      .map((story) => ({
        id: `alert-${story.id}`,
        title: story.title,
        risk: story.scamRisk,
        score: story.scamScore,
        reasons: story.scamReasons,
        source: story.source,
        createdAt:
          new Date().toISOString()
      }));

  await saveStories(finalStories);

  await saveAlerts(
    dedupeStories(nextAlerts)
  );

  return finalStories;
};

const getDailyStories = async (force = false) => {
  const cache =
    await getCache();

  const now =
    Date.now();

  const visibleStories =
    dedupeStories(
      cache.stories
        .filter(
          (story) =>
            !isGooglePreviewImage(story.image)
        )
    )
      .sort(
        (left, right) =>
          Number(Boolean(right.image)) -
          Number(Boolean(left.image))
      );

  if (
    !force &&
    cache.generatedAt &&
    (
      now -
      new Date(cache.generatedAt).getTime()
    ) <
    15 * 60 * 1000
  ) {
    return visibleStories;
  }

  return fetchDailyStories();
};

const getScheduledGreeting = async (
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
    month === 0 && day === 1;

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
    period = `year-${year}`;

    title =
      `Happy New Year from Ipapo Broadcast - ${year}`;

    message =
      `Wishing every Ipapo family, resident, and descendant a peaceful and prosperous ${year}.`;

  } else if (isNewMonth) {
    period =
      `month-${year}-${String(month + 1).padStart(2, '0')}`;

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
          day - (dayOfWeek || 7) + 1
        )
      );

    period =
      `week-${monday.toISOString().slice(0, 10)}`;

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
      (story) => story.id === id
    );

  if (existing) {
    return existing;
  }

  const greeting = {
    id,
    title,
    source: 'Ipapo Broadcast Editorial Desk',
    link:
      `/article.html?id=${encodeURIComponent(id)}`,
    summary: message,
    content: `<p>${message}</p>`,
    image: 'img/ipapo_gateway.jpg',
    publishedAt:
      date.toISOString(),
    category: 'Community',
    status: 'approved',
    scamScore: 0,
    scamRisk: 'low',
    scamLabel: 'Likely safe',
    scamReasons: [],
    isScam: false,
    fetchedAt:
      date.toISOString()
  };

  await saveStories([greeting]);

  return greeting;
};

const updateStoryStatus =
  (storyId, status) =>
    updateStory(storyId, status);

const getDailyNewsForUser =
  (userEmail = 'all') =>
    getUnseenStories(userEmail);

const markNewsSeenForUser =
  (userEmail, itemId) =>
    markStorySeen(userEmail, itemId);

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