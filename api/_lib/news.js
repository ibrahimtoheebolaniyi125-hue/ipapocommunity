const trustedFeeds = [
  {
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml'
  },
  {
    name: 'BBC Africa',
    url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml'
  },
  {
    name: 'Tribune Online',
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

const localFeeds = [
  {
    name: 'Google News - Ipapo',
    url: 'https://news.google.com/rss/search?q=Ipapo+Oyo+Nigeria&hl=en-NG&gl=NG&ceid=NG:en'
  },
  {
    name: 'Google News - Itesiwaju',
    url: 'https://news.google.com/rss/search?q=Itesiwaju+Oyo+Nigeria&hl=en-NG&gl=NG&ceid=NG:en'
  },
  {
    name: 'Google News - Oyo State',
    url: 'https://news.google.com/rss/search?q=Oyo+State+Nigeria&hl=en-NG&gl=NG&ceid=NG:en'
  }
];

/*
 * Ipapo Broadcast fallback image.
 *
 * IMPORTANT:
 * Every news story will use this image.
 * Publisher/PUNCH images are intentionally
 * NOT used.
 */
const FALLBACK_IMAGE = '/img/broadcast.jpeg';

const localKeywords = [
  'ipapo',
  'itesiwaju',
  'ibadan',
  'oyo state',
  'oyo-state',
  'oyo',
  'saki',
  'saki west',
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
  'oyo govt',
  'makinde'
];

/*
 * Number of stories displayed.
 */
const MAX_STORIES = 15;

let publisherFeedCache = new Map();

function cleanText(value) {
  if (!value) return '';

  return String(value)
    .replace(/<!\[CDATA\[/gi, '')
    .replace(/\]\]>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value) {
  if (!value) return '';

  return String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizeTitle(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/*
 * Common words that do not help much
 * when comparing headlines.
 */
const stopWords = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'for',
  'in',
  'on',
  'at',
  'by',
  'with',
  'from',
  'as',
  'is',
  'are',
  'was',
  'were',
  'has',
  'have',
  'had',
  'will',
  'its',
  'their',
  'his',
  'her',
  'this',
  'that',
  'these',
  'those',
  'says',
  'said',
  'news',
  'report',
  'reports',
  'latest',
  'update',
  'updates',
  'nigeria',
  'nigerian',
  'state',
  'government',
  'govt',
  'official',
  'officials'
]);

function getSignificantWords(value) {
  return normalizeTitle(value)
    .split(/\s+/)
    .filter(word => {
      return word.length >= 3 &&
        !stopWords.has(word);
    });
}

/*
 * Calculate how closely two headlines are related.
 */
function titleSimilarity(a, b) {
  const firstWords =
    getSignificantWords(a);

  const secondWords =
    getSignificantWords(b);

  if (
    !firstWords.length ||
    !secondWords.length
  ) {
    return 0;
  }

  const first =
    new Set(firstWords);

  const second =
    new Set(secondWords);

  let matches = 0;

  for (const word of first) {
    if (second.has(word)) {
      matches++;
    }
  }

  if (!matches) {
    return 0;
  }

  const union =
    new Set([
      ...first,
      ...second
    ]).size;

  const jaccard =
    union
      ? matches / union
      : 0;

  const smaller =
    Math.min(
      first.size,
      second.size
    );

  const containment =
    smaller
      ? matches / smaller
      : 0;

  const aText =
    normalizeTitle(a);

  const bText =
    normalizeTitle(b);

  let phraseBonus = 0;

  if (
    aText.includes(bText) ||
    bText.includes(aText)
  ) {
    phraseBonus = 0.30;
  }

  /*
   * Important Oyo-related terms.
   */
  const importantTerms = [
    'makinde',
    'oyo',
    'ibadan',
    'ipapo',
    'igbeti',
    'saki',
    'igboho',
    'iseyin',
    'itesiwaju',
    'iwajowa',
    'kajola',
    'komu',
    'lanlate',
    'police',
    'amotekun'
  ];

  let importantMatches = 0;

  for (
    const term
    of importantTerms
  ) {
    if (
      aText.includes(term) &&
      bText.includes(term)
    ) {
      importantMatches++;
    }
  }

  const importantBonus =
    Math.min(
      importantMatches * 0.10,
      0.30
    );

  return Math.min(
    (jaccard * 0.30) +
    (containment * 0.45) +
    phraseBonus +
    importantBonus,
    1
  );
}

/*
 * Kept for compatibility with existing
 * news parsing code.
 *
 * The returned publisher image is NOT used
 * in the final story.
 */
function getValidImage(image) {
  if (!image) return '';

  let value =
    String(image).trim();

  if (!value) return '';

  value =
    decodeHtml(value);

  if (
    value.startsWith('//')
  ) {
    value =
      `https:${value}`;
  }

  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value;
  }

  return '';
}

function extractImageFromHtml(html) {
  if (!html) return '';

  const source =
    String(html);

  const patterns = [
    /<media:content[^>]+url=["']([^"']+)["']/i,
    /<media:thumbnail[^>]+url=["']([^"']+)["']/i,
    /<enclosure[^>]+url=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["']/i,
    /<img[^>]+data-src=["']([^"']+)["']/i,
    /<img[^>]+data-lazy-src=["']([^"']+)["']/i
  ];

  for (
    const pattern
    of patterns
  ) {
    const match =
      source.match(pattern);

    if (
      match &&
      match[1]
    ) {
      const image =
        getValidImage(
          match[1]
        );

      if (image) {
        return image;
      }
    }
  }

  return '';
}

function getTagValue(
  block,
  tagNames
) {
  if (!block) return '';

  for (
    const tagName
    of tagNames
  ) {
    const escaped =
      tagName.replace(
        ':',
        '\\:'
      );

    const regex =
      new RegExp(
        `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`,
        'i'
      );

    const match =
      block.match(regex);

    if (
      match &&
      match[1]
    ) {
      return match[1].trim();
    }
  }

  return '';
}

function getTagAttribute(
  block,
  tagName,
  attribute
) {
  if (!block) return '';

  const regex =
    new RegExp(
      `<${tagName}(?:\\s[^>]*)?\\s${attribute}=["']([^"']+)["']`,
      'i'
    );

  const match =
    block.match(regex);

  return match &&
    match[1]
    ? match[1].trim()
    : '';
}

function parseRss(
  xml,
  feedName
) {
  if (!xml) return [];

  const items = [];

  const blocks =
    xml.match(
      /<item\b[\s\S]*?<\/item>/gi
    ) || [];

  for (
    const block
    of blocks
  ) {
    const titleRaw =
      getTagValue(
        block,
        ['title']
      );

    const linkRaw =
      getTagValue(
        block,
        ['link']
      );

    const descriptionRaw =
      getTagValue(
        block,
        [
          'description',
          'content:encoded'
        ]
      );

    const pubDateRaw =
      getTagValue(
        block,
        [
          'pubDate',
          'dc:date',
          'published',
          'updated'
        ]
      );

    const title =
      cleanText(titleRaw);

    const link =
      cleanText(linkRaw);

    const description =
      cleanText(descriptionRaw);

    if (!title) {
      continue;
    }

    /*
     * We may still read the publisher image
     * while parsing RSS, but it will NEVER be
     * used in the final output.
     */
    let publisherImage = '';

    const mediaUrl =
      getTagAttribute(
        block,
        'media:content',
        'url'
      ) ||
      getTagAttribute(
        block,
        'media:thumbnail',
        'url'
      );

    if (mediaUrl) {
      publisherImage =
        getValidImage(
          mediaUrl
        );
    }

    if (!publisherImage) {
      const enclosureUrl =
        getTagAttribute(
          block,
          'enclosure',
          'url'
        );

      publisherImage =
        getValidImage(
          enclosureUrl
        );
    }

    if (!publisherImage) {
      publisherImage =
        extractImageFromHtml(
          descriptionRaw
        );
    }

    let publishedAt = null;

    if (pubDateRaw) {
      const parsedDate =
        new Date(
          cleanText(
            pubDateRaw
          )
        );

      if (
        !Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        publishedAt =
          parsedDate.toISOString();
      }
    }

    items.push({
      title,
      link,
      description,
      publishedAt,

      /*
       * Force the Ipapo Broadcast image
       * immediately.
       */
      image: FALLBACK_IMAGE,

      /*
       * Keep publisher image internally only
       * for compatibility/debugging if needed.
       */
      publisherImage,

      source: feedName
    });
  }

  return items;
}

async function fetchFeed(feed) {
  try {
    const response =
      await fetch(
        feed.url,
        {
          headers: {
            'User-Agent':
              'Ipapo-Broadcast/1.0'
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    return await response.text();
  } catch (error) {
    console.warn(
      `Feed failed: ${feed.name}`,
      error.message
    );

    return '';
  }
}

async function getPublisherFeed(feed) {
  const cacheKey =
    feed.url;

  if (
    publisherFeedCache.has(
      cacheKey
    )
  ) {
    return publisherFeedCache.get(
      cacheKey
    );
  }

  const xml =
    await fetchFeed(feed);

  const articles =
    parseRss(
      xml,
      feed.name
    );

  publisherFeedCache.set(
    cacheKey,
    articles
  );

  return articles;
}

function isLocalStory(story) {
  const text =
    normalizeTitle(
      `${story.title} ${story.description}`
    );

  return localKeywords.some(
    keyword =>
      text.includes(
        normalizeTitle(keyword)
      )
  );
}

function normalizeStory(story) {
  return {
    ...story,

    title:
      cleanText(
        story.title
      ),

    description:
      cleanText(
        story.description
      ),

    link:
      cleanText(
        story.link
      ),

    /*
     * IMPORTANT:
     * Always use the Ipapo Broadcast image.
     */
    image:
      FALLBACK_IMAGE,

    imageSource:
      'local-fallback'
  };
}

function getStoryId(story) {
  const value =
    `${story.title}|${story.link}`;

  return Buffer
    .from(value)
    .toString('base64')
    .replace(
      /[^a-zA-Z0-9]/g,
      ''
    )
    .slice(
      0,
      60
    );
}

function dedupeStories(stories) {
  const seen =
    new Set();

  const result = [];

  for (
    const story
    of stories
  ) {
    const normalized =
      normalizeTitle(
        story.title
      );

    if (!normalized) {
      continue;
    }

    const key =
      story.link ||
      normalized;

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    result.push(story);
  }

  return result;
}

function classifyCategory(story) {
  const text =
    normalizeTitle(
      `${story.title} ${story.description}`
    );

  if (
    text.includes('police') ||
    text.includes('security') ||
    text.includes('kidnap') ||
    text.includes('crime') ||
    text.includes('amotekun')
  ) {
    return 'Security';
  }

  if (
    text.includes('school') ||
    text.includes('education') ||
    text.includes('student') ||
    text.includes('teacher')
  ) {
    return 'Education';
  }

  if (
    text.includes('hospital') ||
    text.includes('health') ||
    text.includes('doctor') ||
    text.includes('medical')
  ) {
    return 'Health';
  }

  if (
    text.includes('football') ||
    text.includes('sports') ||
    text.includes('match')
  ) {
    return 'Sports';
  }

  if (
    text.includes('farm') ||
    text.includes('agriculture') ||
    text.includes('farmer')
  ) {
    return 'Agriculture';
  }

  if (
    text.includes('culture') ||
    text.includes('oba') ||
    text.includes('traditional') ||
    text.includes('palace')
  ) {
    return 'Culture';
  }

  if (
    text.includes('government') ||
    text.includes('governor') ||
    text.includes('makinde') ||
    text.includes('politics')
  ) {
    return 'Politics';
  }

  if (
    text.includes('development') ||
    text.includes('road') ||
    text.includes('project') ||
    text.includes('infrastructure')
  ) {
    return 'Development';
  }

  return 'Community';
}

/*
 * Always return the same local image.
 */
function getFallbackImage() {
  return FALLBACK_IMAGE;
}

/*
 * Basic scam-risk detection.
 *
 * This is NOT the final AI scam detection system.
 * We will improve this later.
 */
function calculateScamScore(story) {
  const text =
    normalizeTitle(
      `${story.title} ${story.description}`
    );

  const suspiciousTerms = [
    'send money',
    'pay now',
    'investment opportunity',
    'double your money',
    'free cash',
    'giveaway',
    'claim your money',
    'urgent payment',
    'secret investment',
    'crypto giveaway'
  ];

  let score = 0;

  for (
    const term
    of suspiciousTerms
  ) {
    if (
      text.includes(
        normalizeTitle(term)
      )
    ) {
      score += 15;
    }
  }

  return Math.min(
    score,
    100
  );
}

/*
 * Kept for compatibility.
 *
 * PUNCH image matching has been disabled.
 * The website now intentionally uses
 * broadcast.jpeg for every story.
 */
async function findPunchImage() {
  return '';
}

/*
 * Force every story to use the local
 * Ipapo Broadcast fallback image.
 */
async function enrichStoryImage(story) {
  story =
    normalizeStory(
      story
    );

  story.image =
    FALLBACK_IMAGE;

  story.imageSource =
    'local-fallback';

  return story;
}

async function enrichImages(stories) {
  const output = [];

  const batchSize = 3;

  for (
    let i = 0;
    i < stories.length;
    i += batchSize
  ) {
    const batch =
      stories.slice(
        i,
        i + batchSize
      );

    const enriched =
      await Promise.all(
        batch.map(
          story =>
            enrichStoryImage(
              story
            )
        )
      );

    output.push(
      ...enriched
    );
  }

  return output;
}

function cleanStory(story) {
  const category =
    story.category ||
    classifyCategory(
      story
    );

  const scamScore =
    typeof story.scamScore === 'number'
      ? story.scamScore
      : calculateScamScore(
          story
        );

  /*
   * FINAL IMAGE GUARANTEE:
   * Every story ALWAYS receives
   * /img/broadcast.jpeg.
   */
  return {
    id:
      story.id ||
      getStoryId(
        story
      ),

    title:
      story.title,

    description:
      story.description,

    link:
      story.link,

    source:
      story.source ||
      'Unknown',

    category,

    image:
      FALLBACK_IMAGE,

    imageSource:
      'local-fallback',

    publishedAt:
      story.publishedAt ||
      new Date().toISOString(),

    scamScore,

    scamRisk:
      scamScore >= 60
        ? 'high'
        : scamScore >= 30
          ? 'medium'
          : 'low'
  };
}

async function fetchDailyStories() {
  /*
   * Clear feed cache so fresh RSS data
   * can be retrieved.
   */
  publisherFeedCache =
    new Map();

  const allFeeds = [
    ...trustedFeeds,
    ...localFeeds
  ];

  const feedResults =
    await Promise.all(
      allFeeds.map(
        async feed => {
          const xml =
            await fetchFeed(
              feed
            );

          return parseRss(
            xml,
            feed.name
          );
        }
      )
    );

  let stories =
    feedResults.flat();

  /*
   * Keep stories relevant to Ipapo/Oyo.
   */
  stories =
    stories.filter(
      isLocalStory
    );

  stories =
    stories.map(
      normalizeStory
    );

  stories =
    dedupeStories(
      stories
    );

  /*
   * Newest stories first.
   */
  stories.sort(
    (a, b) =>
      new Date(
        b.publishedAt || 0
      ).getTime() -
      new Date(
        a.publishedAt || 0
      ).getTime()
  );

  /*
   * Keep the public page manageable.
   */
  stories =
    stories.slice(
      0,
      MAX_STORIES
    );

  /*
   * Force the local fallback image.
   */
  stories =
    await enrichImages(
      stories
    );

  /*
   * Clean the final data.
   */
  stories =
    stories.map(
      cleanStory
    );

  stories =
    dedupeStories(
      stories
    );

  stories.sort(
    (a, b) =>
      new Date(
        b.publishedAt || 0
      ).getTime() -
      new Date(
        a.publishedAt || 0
      ).getTime()
  );

  /*
   * FINAL GUARANTEE:
   * Every story must use broadcast.jpeg.
   */
  stories =
    stories
      .slice(
        0,
        MAX_STORIES
      )
      .map(
        story => ({
          ...story,

          image:
            FALLBACK_IMAGE,

          imageSource:
            'local-fallback'
        })
      );

  console.log(
    `Ipapo Broadcast: ${stories.length} stories prepared`
  );

  console.log(
    `Stories with fallback images: ${
      stories.filter(
        story =>
          story.image ===
          FALLBACK_IMAGE
      ).length
    }`
  );

  console.log(
    `External images used: 0`
  );

  console.log(
    `Local fallback images: ${
      stories.filter(
        story =>
          story.imageSource ===
          'local-fallback'
      ).length
    }`
  );

  return stories;
}

async function getDailyStories() {
  return fetchDailyStories();
}

module.exports = {
  getDailyStories,
  fetchDailyStories,
  findPunchImage,
  titleSimilarity
};






