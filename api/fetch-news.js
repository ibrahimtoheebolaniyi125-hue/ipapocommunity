'use strict';

const {
  getDailyStories
} = require('./_lib/news');

const {
  saveStories
} = require('./_lib/store');


/* =========================================================
   LOCAL FALLBACK STORIES
========================================================= */

const fallbackStories = [
  {
    id: 'art-001',
    title:
      'Community Development Program: Ipapo Scholarship Award Ceremony',
    category: 'Community',
    badge: 'Featured',
    isBreaking: true,
    author: 'Ipapo Media Desk',
    date: 'September 2026',
    readTime: '4 min read',
    image: 'img/group.jpg',
    summary:
      'Celebrating excellence: Future Leaders Development Initiatives and Ipapo Scholarship Award Ceremony recognize promising scholars across Itesiwaju LGA.',
    content:
      '<p>The annual Ipapo Community Development and Scholarship Ceremony concluded yesterday with vibrant celebrations, bringing together elders, youth, community leaders, and descendants from across Nigeria and the diaspora.</p>',
    views: 1420,
    source: 'local-fallback'
  },

  {
    id: 'art-005',
    title:
      'Cultural Tourism: KAP Film Village & Resort Boosts Regional Economy',
    category: 'Culture',
    badge: 'Regional Spotlight',
    isBreaking: true,
    author: 'Ipapo Culture Bureau',
    date: 'September 2026',
    readTime: '5 min read',
    image: 'img/ippao.jpg',
    summary:
      'Kunle Afolayan’s landmark film studio and cultural resort project in the Ipapo/Itesiwaju axis brings global cinema and tourism to our doorsteps.',
    content:
      '<p>The development of the KAP Film Village & Resort represents a major creative and tourism investment in the Ipapo/Itesiwaju territory.</p>',
    views: 3100,
    source: 'local-fallback'
  },

  {
    id: 'art-008',
    title:
      'Education Infrastructure: Construction of College of Education Advances',
    category: 'Education',
    badge: 'Development',
    isBreaking: true,
    author: 'Infrastructure Desk',
    date: 'September 2026',
    readTime: '4 min read',
    image: 'img/building.jpg',
    summary:
      'New campus facilities, lecture halls, and housing units take shape in Ipapo to expand teacher training across Oyo State.',
    content:
      '<p>Construction of the new College of Education campus in Ipapo is progressing steadily.</p>',
    views: 1840,
    source: 'local-fallback'
  }
];


/* =========================================================
   FALLBACK IMAGES
========================================================= */

const fallbackImages = {
  Education: 'img/building.jpg',
  Community: 'img/group.jpg',
  Culture: 'img/ippao.jpg',
  Development: 'img/building.jpg',
  Politics: 'img/building.jpg',
  Security: 'img/group.jpg',
  Sports: 'img/group.jpg',
  Agriculture: 'img/group.jpg',
  Health: 'img/building.jpg'
};


/* =========================================================
   GET FALLBACK IMAGE
========================================================= */

function getFallbackImage(story) {
  if (
    story &&
    story.category &&
    fallbackImages[story.category]
  ) {
    return fallbackImages[story.category];
  }

  return 'img/group.jpg';
}


/* =========================================================
   CHECK IMAGE
========================================================= */

function isUsableImage(image) {
  if (!image) {
    return false;
  }

  const value = String(image).trim();

  if (!value) {
    return false;
  }

  const lower = value.toLowerCase();

  const blockedWords = [
    'logo',
    'favicon',
    'avatar',
    'placeholder',
    'no-image',
    'no_image',
    'default-image',
    'default_image'
  ];

  for (const word of blockedWords) {
    if (lower.includes(word)) {
      return false;
    }
  }

  if (
    lower.includes('.svg') ||
    lower.startsWith('data:image/svg')
  ) {
    return false;
  }

  return true;
}


/* =========================================================
   GUARANTEE IMAGES
========================================================= */

function guaranteeImages(stories) {
  if (!Array.isArray(stories)) {
    return [];
  }

  return stories.map(story => {
    const currentImage =
      story && story.image
        ? String(story.image).trim()
        : '';

    const finalImage =
      isUsableImage(currentImage)
        ? currentImage
        : getFallbackImage(story);

    return {
      ...story,

      image:
        finalImage ||
        'img/group.jpg',

      status:
        story.status ||
        'approved'
    };
  });
}


/* =========================================================
   API HANDLER
========================================================= */

module.exports = async function handler(req, res) {

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {

    /* -------------------------------------------------------
       FETCH LIVE NEWS
    ------------------------------------------------------- */

    let stories = await getDailyStories();

    if (!Array.isArray(stories)) {
      stories = [];
    }


    /* -------------------------------------------------------
       GUARANTEE IMAGES + APPROVED STATUS
    ------------------------------------------------------- */

    stories = guaranteeImages(stories);


    /* -------------------------------------------------------
       SAVE STORIES TO STORE
       
       THIS IS IMPORTANT:
       The /api/news?action=unseen endpoint reads
       from the store. Saving here makes the fresh
       stories available to that endpoint.
    ------------------------------------------------------- */

    if (stories.length > 0) {
      try {
        await saveStories(stories);
        console.log(
          `Saved ${stories.length} news stories to store.`
        );
      } catch (saveError) {
        console.error(
          'Could not save news stories:',
          saveError.message
        );
      }
    }


    /* -------------------------------------------------------
       RETURN NEWS
    ------------------------------------------------------- */

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      stories
    });

  } catch (error) {

    console.error(
      'Fetch news error:',
      error
    );


    /* -------------------------------------------------------
       FALLBACK NEWS
    ------------------------------------------------------- */

    const safeFallbackStories =
      guaranteeImages(
        fallbackStories
      );


    /* -------------------------------------------------------
       SAVE FALLBACK STORIES TOO
    ------------------------------------------------------- */

    try {
      await saveStories(
        safeFallbackStories
      );

      console.log(
        `Saved ${safeFallbackStories.length} fallback stories.`
      );

    } catch (saveError) {

      console.error(
        'Could not save fallback stories:',
        saveError.message
      );
    }


    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      stories: safeFallbackStories,
      warning:
        error.message ||
        'Using local fallback data'
    });
  }
};