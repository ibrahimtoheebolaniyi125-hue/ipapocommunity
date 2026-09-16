const { readState, saveStories, saveAlerts, updateStory, getUnseenStories, markStorySeen } = require('./store');

const trustedSources = [
  'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
  'https://www.aljazeera.com/xml/rss/all.xml',
  'https://tribuneonlineng.com/feed/',
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

const normaliseText = (value = '') => String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const extractArticleImage = async (link) => {
  if (!link || link === '#') return '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(link, {
      headers: { 'User-Agent': 'IpapoBroadcast/1.0' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) return '';

    const html = await response.text();
    const imageMatch = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);

    if (!imageMatch) return '';
    return new URL(imageMatch[1], link).href;
  } catch (error) {
    return '';
  }
};

const parseRssFeed = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'IpapoBroadcast/1.0' }
  });

  if (!response.ok) {
    return [];
  }

  const xml = await response.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

  return items.map((match) => {
    const chunk = match[1];
    const title = normaliseText((chunk.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const link = (chunk.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '';
    const descriptionHtml = (chunk.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || '';
    const description = normaliseText(descriptionHtml);
    const pubDate = (chunk.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || new Date().toISOString();
    const image = (
      (chunk.match(/<media:content[^>]+url=["']([^"']+)["']/i) || [])[1] ||
      (chunk.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) || [])[1] ||
      (chunk.match(/<enclosure[^>]+url=["']([^"']+)["']/i) || [])[1] ||
      (descriptionHtml.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] ||
      ''
    );

    if (!title) {
      return null;
    }

    const source = new URL(url).hostname.replace('www.', '');
    const stableKey = Buffer.from(`${source}:${link || title}`).toString('base64url').slice(0, 80);

    return {
      id: `feed-${stableKey}`,
      title,
      source,
      link: link || '#',
      summary: description || title,
      content: description || title,
      image,
      publishedAt: pubDate,
      category: 'World'
    };
  }).filter(Boolean);
};

const scoreScam = (text = '') => {
  const lower = String(text).toLowerCase();
  let score = 0;
  const reasons = [];

  scamPatterns.forEach((pattern) => {
    if (pattern.test(lower)) {
      score += 22;
      reasons.push(pattern.toString().replace(/\//g, '').slice(0, 40));
    }
  });

  if (/\b(urgent|immediately|today|now)\b/.test(lower)) {
    score += 15;
  }

  if (/(pay|send|transfer).*(bank|money|bitcoin|crypto|wallet)/i.test(lower)) {
    score += 20;
  }

  if (/(claim|winner|lottery|gift|reward)/i.test(lower)) {
    score += 18;
  }

  return {
    score: Math.min(score, 100),
    reasons: [...new Set(reasons)].slice(0, 5),
    risk: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low',
    label: score >= 60 ? 'Scam alert' : score >= 30 ? 'Needs verification' : 'Likely safe'
  };
};

const sanitizeStory = (story) => {
  const scam = scoreScam(`${story.title} ${story.summary} ${story.content}`);
  return {
    ...story,
    status: 'pending',
    scamScore: scam.score,
    scamRisk: scam.risk,
    scamLabel: scam.label,
    scamReasons: scam.reasons,
    isScam: scam.risk === 'high'
  };
};

const dedupeStories = (stories = []) => {
  const map = new Map();
  stories.forEach((story) => {
    const key = (story.title || '').toLowerCase().trim();
    if (!key) return;
    if (!map.has(key)) map.set(key, story);
  });
  return [...map.values()];
};

const isLocalStory = (story) => {
  const text = `${story.title} ${story.summary} ${story.content}`;
  return localKeywords.some((keyword) => keyword.test(text));
};

const fetchDailyStories = async () => {
  const feeds = await Promise.all([...trustedSources, ...localSources].map(parseRssFeed));
  const merged = dedupeStories(feeds.flat()).filter(isLocalStory);
  const enriched = await Promise.all(merged.map(async (story) => ({
    ...story,
    image: story.image || await extractArticleImage(story.link)
  })));
  const analysed = enriched.map((story) => ({
    ...story,
    category: 'Local'
  })).map(sanitizeStory);
  const cleaned = analysed.filter((story) => story.scamRisk !== 'high');
  const existingState = await readState();
  const existingStories = new Map(existingState.stories.map((story) => [story.id, story]));
  const fetchedAt = new Date().toISOString();

  const nextStories = cleaned.slice(0, 20).map((story) => ({
    ...story,
    status: existingStories.get(story.id)?.status || story.status,
    fetchedAt: existingStories.get(story.id)?.fetchedAt || fetchedAt
  }));
  const nextAlerts = analysed.filter((story) => story.scamRisk !== 'low').map((story) => ({
    id: `alert-${story.id}`,
    title: story.title,
    risk: story.scamRisk,
    score: story.scamScore,
    reasons: story.scamReasons,
    source: story.source,
    createdAt: new Date().toISOString()
  }));

  await saveStories(nextStories);
  await saveAlerts(nextAlerts);
  return nextStories;
};

const getDailyStories = async (force = false) => {
  const cache = await getCache();
  const now = Date.now();

  if (!force && cache.generatedAt && (now - new Date(cache.generatedAt).getTime()) < 15 * 60 * 1000) {
    return cache.stories;
  }

  return fetchDailyStories();
};

const getScheduledGreeting = async (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const dayOfWeek = date.getUTCDay();
  const isNewYear = month === 0 && day === 1;
  const isNewMonth = day === 1;
  const isNewWeek = dayOfWeek === 1;

  if (!isNewYear && !isNewMonth && !isNewWeek) return null;

  let period;
  let title;
  let message;
  if (isNewYear) {
    period = `year-${year}`;
    title = `Happy New Year from Ipapo Broadcast - ${year}`;
    message = `Wishing every Ipapo family, resident, and descendant a peaceful and prosperous ${year}.`;
  } else if (isNewMonth) {
    period = `month-${year}-${String(month + 1).padStart(2, '0')}`;
    title = `Happy New Month from Ipapo Broadcast`;
    message = `Welcome to a new month, Ipapo. May this month bring progress, good health, and stronger community connections.`;
  } else {
    const monday = new Date(Date.UTC(year, month, day - (dayOfWeek || 7) + 1));
    period = `week-${monday.toISOString().slice(0, 10)}`;
    title = `Happy New Week from Ipapo Broadcast`;
    message = `A new week begins across Ipapo and Itesiwaju. Stay informed, stay connected, and support one another.`;
  }

  const id = `announcement-${period}`;
  const state = await readState();
  const existing = state.stories.find((story) => story.id === id);
  if (existing) return existing;

  const greeting = {
    id,
    title,
    source: 'Ipapo Broadcast Editorial Desk',
    link: `/article.html?id=${encodeURIComponent(id)}`,
    summary: message,
    content: `<p>${message}</p>`,
    image: 'img/ipapo_gateway.jpg',
    publishedAt: date.toISOString(),
    category: 'Community',
    status: 'approved',
    scamScore: 0,
    scamRisk: 'low',
    scamLabel: 'Likely safe',
    scamReasons: [],
    isScam: false,
    fetchedAt: date.toISOString()
  };

  await saveStories([greeting]);
  return greeting;
};

const updateStoryStatus = (storyId, status) => updateStory(storyId, status);

const getDailyNewsForUser = (userEmail = 'all') => getUnseenStories(userEmail);

const markNewsSeenForUser = (userEmail, itemId) => markStorySeen(userEmail, itemId);

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
