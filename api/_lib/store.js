'use strict';

const fs = require('fs');
const path = require('path');


/* =========================================================
   STORAGE LOCATION
========================================================= */

const STORE_DIR = process.env.VERCEL
  ? '/tmp/ipapo-data'
  : path.join(process.cwd(), 'data');

const STORE_FILE = path.join(
  STORE_DIR,
  'store.json'
);


/* =========================================================
   DEFAULT STATE
========================================================= */

const defaultState = {
  generatedAt: null,
  stories: [],
  alerts: [],
  activityEvents: [],
  seenByUser: {},
  approvedIds: [],
  rejectedIds: []
};


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const useLocalStore =
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY;


/* =========================================================
   LOCAL STORE
========================================================= */

function ensureLocalStore() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(
      STORE_DIR,
      { recursive: true }
    );
  }
}


function readLocalState() {
  try {
    ensureLocalStore();

    if (!fs.existsSync(STORE_FILE)) {
      return {
        ...defaultState,
        stories: []
      };
    }

    const raw =
      fs.readFileSync(
        STORE_FILE,
        'utf8'
      );

    if (!raw.trim()) {
      return {
        ...defaultState,
        stories: []
      };
    }

    const parsed =
      JSON.parse(raw);

    return {
      ...defaultState,
      ...parsed,
      stories:
        Array.isArray(parsed.stories)
          ? parsed.stories
          : [],
      alerts:
        Array.isArray(parsed.alerts)
          ? parsed.alerts
          : [],
      activityEvents:
        Array.isArray(parsed.activityEvents)
          ? parsed.activityEvents
          : []
    };

  } catch (error) {

    console.warn(
      'Could not read local news store:',
      error.message
    );

    return {
      ...defaultState,
      stories: []
    };
  }
}


function writeLocalState(state) {
  ensureLocalStore();

  const finalState = {
    ...defaultState,
    ...state
  };

  fs.writeFileSync(
    STORE_FILE,
    JSON.stringify(
      finalState,
      null,
      2
    ),
    'utf8'
  );
}


/* =========================================================
   SUPABASE REQUEST
========================================================= */

function assertConfigured() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
}


async function request(
  table,
  options = {}
) {
  assertConfigured();

  const response =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${table}`,
      {
        ...options,

        headers: {
          apikey:
            SUPABASE_SERVICE_ROLE_KEY,

          Authorization:
            `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,

          'Content-Type':
            'application/json',

          ...(options.headers || {})
        }
      }
    );

  if (!response.ok) {

    const message =
      await response.text();

    throw new Error(
      `Supabase ${table} request failed (${response.status}): ${message}`
    );
  }

  if (
    response.status === 204
  ) {
    return null;
  }

  return response.json();
}


/* =========================================================
   STORY NORMALIZATION
========================================================= */

function normalizeStory(story) {
  if (!story) {
    return null;
  }

  return {
    ...story,

    id:
      story.id ||
      `story-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    title:
      story.title ||
      'Untitled story',

    description:
      story.description ||
      story.summary ||
      '',

    summary:
      story.summary ||
      story.description ||
      '',

    content:
      story.content ||
      story.description ||
      story.summary ||
      '',

    source:
      story.source ||
      'Unknown',

    link:
      story.link ||
      '#',

    category:
      story.category ||
      'Community',

    image:
      story.image ||
      '/img/broadcast.jpeg',

    imageSource:
      story.imageSource ||
      'local-fallback',

    publishedAt:
      story.publishedAt ||
      new Date().toISOString(),

    fetchedAt:
      story.fetchedAt ||
      new Date().toISOString(),

    status:
      story.status ||
      'approved',

    scamScore:
      Number(story.scamScore) || 0,

    scamRisk:
      story.scamRisk ||
      'low',

    scamLabel:
      story.scamLabel ||
      'Likely safe',

    scamReasons:
      Array.isArray(story.scamReasons)
        ? story.scamReasons
        : [],

    isScam:
      Boolean(story.isScam)
  };
}


/* =========================================================
   DATABASE MAPPING
========================================================= */

function mapStoryToDb(story) {
  const normalized =
    normalizeStory(story);

  return {
    id: normalized.id,
    title: normalized.title,
    source: normalized.source,
    link: normalized.link,
    summary: normalized.summary,
    content: normalized.content,
    image: normalized.image,

    published_at:
      normalized.publishedAt,

    category:
      normalized.category,

    status:
      normalized.status,

    scam_score:
      normalized.scamScore,

    scam_risk:
      normalized.scamRisk,

    scam_label:
      normalized.scamLabel,

    scam_reasons:
      normalized.scamReasons,

    is_scam:
      normalized.isScam,

    fetched_at:
      normalized.fetchedAt,

    updated_at:
      new Date().toISOString()
  };
}


function mapStoryFromDb(story) {
  return normalizeStory({
    id: story.id,
    title: story.title,
    source: story.source,
    link: story.link,
    summary: story.summary,
    content: story.content,
    image: story.image,
    publishedAt: story.published_at,
    category: story.category,
    status: story.status,
    scamScore: story.scam_score,
    scamRisk: story.scam_risk,
    scamLabel: story.scam_label,
    scamReasons: story.scam_reasons,
    isScam: story.is_scam,
    fetchedAt: story.fetched_at
  });
}


function mapAlertFromDb(alert) {
  return {
    id: alert.id,
    title: alert.title,
    risk: alert.risk,
    score: alert.score,
    reasons:
      alert.reasons || [],
    source:
      alert.source,
    createdAt:
      alert.created_at
  };
}


/* =========================================================
   READ STATE
========================================================= */

async function readState() {

  /* -------------------------------------------------------
     LOCAL DEVELOPMENT
  ------------------------------------------------------- */

  if (useLocalStore) {

    const state =
      readLocalState();

    const stories =
      Array.isArray(state.stories)
        ? state.stories
            .map(normalizeStory)
            .filter(Boolean)
        : [];

    return {
      ...state,

      stories,

      generatedAt:
        state.generatedAt ||
        (
          stories[0] &&
          (
            stories[0].fetchedAt ||
            stories[0].publishedAt
          )
        ) ||
        null,

      approvedIds:
        stories
          .filter(
            story =>
              story.status !== 'rejected'
          )
          .map(
            story => story.id
          ),

      rejectedIds:
        stories
          .filter(
            story =>
              story.status === 'rejected'
          )
          .map(
            story => story.id
          )
    };
  }


  /* -------------------------------------------------------
     SUPABASE
  ------------------------------------------------------- */

  const stories =
    await request(
      'news_stories?select=*&order=fetched_at.desc',
      {
        method: 'GET'
      }
    );

  const alerts =
    await request(
      'news_alerts?select=*&order=created_at.desc',
      {
        method: 'GET'
      }
    );

  const mappedStories =
    Array.isArray(stories)
      ? stories
          .map(mapStoryFromDb)
          .filter(Boolean)
      : [];

  return {

    generatedAt:
      mappedStories.length > 0
        ? mappedStories[0].fetchedAt
        : null,

    stories:
      mappedStories,

    alerts:
      Array.isArray(alerts)
        ? alerts.map(mapAlertFromDb)
        : [],

    approvedIds:
      mappedStories
        .filter(
          story =>
            story.status !== 'rejected'
        )
        .map(
          story => story.id
        ),

    rejectedIds:
      mappedStories
        .filter(
          story =>
            story.status === 'rejected'
        )
        .map(
          story => story.id
        )
  };
}


/* =========================================================
   SAVE STORIES
========================================================= */

async function saveStories(stories) {

  if (
    !Array.isArray(stories) ||
    stories.length === 0
  ) {
    return [];
  }

  const normalizedStories =
    stories
      .map(normalizeStory)
      .filter(Boolean);


  /* -------------------------------------------------------
     LOCAL STORE
  ------------------------------------------------------- */

  if (useLocalStore) {

    const state =
      readLocalState();

    const existing =
      new Map();

    /* Existing stories */
    (
      Array.isArray(state.stories)
        ? state.stories
        : []
    ).forEach(story => {

      const normalized =
        normalizeStory(story);

      if (normalized) {
        existing.set(
          normalized.id,
          normalized
        );
      }
    });


    /* New stories */
    normalizedStories.forEach(story => {

      const previous =
        existing.get(story.id);

      existing.set(
        story.id,
        {
          ...(previous || {}),
          ...story,

          /*
           * Never accidentally turn an approved
           * story back into pending/rejected.
           */
          status:
            previous &&
            previous.status
              ? previous.status
              : (
                  story.status ||
                  'approved'
                )
        }
      );
    });


    const saved =
      Array.from(
        existing.values()
      )
        .map(normalizeStory)
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(
              b.fetchedAt || 0
            ) -
            new Date(
              a.fetchedAt || 0
            )
        );


    writeLocalState({

      ...state,

      generatedAt:
        new Date().toISOString(),

      stories:
        saved
    });


    /* -----------------------------------------------------
       VERIFY WRITE
    ----------------------------------------------------- */

    const verification =
      readLocalState();

    console.log(
      `Local store now contains ${verification.stories.length} stories.`
    );


    return saved;
  }


  /* -------------------------------------------------------
     SUPABASE
  ------------------------------------------------------- */

  const rows =
    normalizedStories.map(
      mapStoryToDb
    );

  return request(
    'news_stories?on_conflict=id',
    {
      method: 'POST',

      headers: {
        Prefer:
          'resolution=merge-duplicates,return=representation'
      },

      body:
        JSON.stringify(rows)
    }
  );
}


/* =========================================================
   SAVE ALERTS
========================================================= */

async function saveAlerts(alerts) {

  if (
    !Array.isArray(alerts) ||
    alerts.length === 0
  ) {
    return [];
  }

  if (useLocalStore) {

    const state =
      readLocalState();

    const existing =
      new Map();

    (
      Array.isArray(state.alerts)
        ? state.alerts
        : []
    ).forEach(alert => {

      if (alert && alert.id) {
        existing.set(
          alert.id,
          alert
        );
      }
    });

    alerts.forEach(alert => {

      if (alert && alert.id) {
        existing.set(
          alert.id,
          alert
        );
      }
    });

    const saved =
      Array.from(
        existing.values()
      ).sort(
        (a, b) =>
          new Date(
            b.createdAt || 0
          ) -
          new Date(
            a.createdAt || 0
          )
      );

    writeLocalState({
      ...state,
      alerts: saved
    });

    return saved;
  }


  const rows =
    alerts.map(alert => ({
      id: alert.id,
      title: alert.title,
      risk: alert.risk,
      score: alert.score,
      reasons:
        alert.reasons || [],
      source:
        alert.source ||
        'news-fetcher',
      created_at:
        alert.createdAt ||
        new Date().toISOString()
    }));

  return request(
    'news_alerts?on_conflict=id',
    {
      method: 'POST',

      headers: {
        Prefer:
          'resolution=merge-duplicates,return=representation'
      },

      body:
        JSON.stringify(rows)
    }
  );
}


/* =========================================================
   GET STORY
========================================================= */

async function getStory(storyId) {

  if (!storyId) {
    return null;
  }


  if (useLocalStore) {

    const state =
      readLocalState();

    const story =
      state.stories.find(
        story =>
          story &&
          story.id === storyId
      );

    return story
      ? normalizeStory(story)
      : null;
  }


  const rows =
    await request(
      `news_stories?id=eq.${encodeURIComponent(
        storyId
      )}&select=*`,
      {
        method: 'GET'
      }
    );

  return (
    rows &&
    rows[0]
  )
    ? mapStoryFromDb(
        rows[0]
      )
    : null;
}


/* =========================================================
   UPDATE STORY STATUS
========================================================= */

async function updateStory(
  storyId,
  status
) {

  if (!storyId) {
    return null;
  }


  if (useLocalStore) {

    const state =
      readLocalState();

    const index =
      state.stories.findIndex(
        story =>
          story &&
          story.id === storyId
      );

    if (index === -1) {
      return null;
    }

    state.stories[index] =
      normalizeStory({
        ...state.stories[index],
        status,
        updatedAt:
          new Date().toISOString()
      });

    writeLocalState(
      state
    );

    return state.stories[index];
  }


  const rows =
    await request(
      `news_stories?id=eq.${encodeURIComponent(
        storyId
      )}`,
      {
        method: 'PATCH',

        headers: {
          Prefer:
            'return=representation'
        },

        body:
          JSON.stringify({
            status,

            updated_at:
              new Date().toISOString()
          })
      }
    );

  return (
    rows &&
    rows[0]
  )
    ? mapStoryFromDb(
        rows[0]
      )
    : null;
}


/* =========================================================
   GET UNSEEN STORIES FOR REGISTERED USER
========================================================= */

async function getUnseenStories(
  userEmail
) {

  if (!userEmail) {
    return [];
  }

  const state =
    await readState();


  if (useLocalStore) {

    return state.stories.filter(
      story =>
        story.status !== 'rejected'
    );
  }


  const seenRows =
    await request(
      `user_seen_news?user_email=eq.${encodeURIComponent(
        userEmail
      )}&select=story_id`,
      {
        method: 'GET'
      }
    );

  const seen =
    new Set(
      seenRows.map(
        row =>
          row.story_id
      )
    );

  return state.stories.filter(
    story =>
      story.status !== 'rejected' &&
      !seen.has(story.id)
  );
}


/* =========================================================
   MARK REGISTERED USER STORY SEEN
========================================================= */

async function markStorySeen(
  userEmail,
  storyId
) {

  if (
    !userEmail ||
    !storyId
  ) {
    return;
  }

  if (useLocalStore) {
    return;
  }

  await request(
    'user_seen_news?on_conflict=user_email,story_id',
    {
      method: 'POST',

      headers: {
        Prefer:
          'resolution=merge-duplicates,return=minimal'
      },

      body:
        JSON.stringify({
          user_email:
            userEmail,

          story_id:
            storyId
        })
    }
  );
}


/* =========================================================
   GET UNSEEN ANONYMOUS STORIES
========================================================= */

async function getUnseenAnonymousStories(
  visitorId
) {

  if (!visitorId) {
    return [];
  }

  const state =
    await readState();


  console.log(
    `Checking unseen stories for visitor: ${visitorId}`
  );

  console.log(
    `Store contains ${state.stories.length} stories.`
  );


  /* -------------------------------------------------------
     LOCAL DEVELOPMENT

     Anonymous seen history cannot be persisted
     permanently in local mode, so return all approved
     stories here.
  ------------------------------------------------------- */

  if (useLocalStore) {

    const stories =
      state.stories.filter(
        story =>
          story &&
          story.id &&
          story.status !== 'rejected'
      );

    console.log(
      `Returning ${stories.length} local unseen stories.`
    );

    return stories;
  }


  /* -------------------------------------------------------
     SUPABASE PRODUCTION
  ------------------------------------------------------- */

  const seenRows =
    await request(
      `anonymous_seen_news?visitor_id=eq.${encodeURIComponent(
        visitorId
      )}&select=story_id`,
      {
        method: 'GET'
      }
    );

  const seen =
    new Set(
      (
        Array.isArray(seenRows)
          ? seenRows
          : []
      ).map(
        row =>
          row.story_id
      )
    );


  const startOfToday =
    new Date();

  startOfToday.setUTCHours(
    0,
    0,
    0,
    0
  );


  return state.stories.filter(
    story => {

      if (
        !story ||
        !story.id
      ) {
        return false;
      }

      if (
        story.status ===
        'rejected'
      ) {
        return false;
      }

      const fetchedTime =
        new Date(
          story.fetchedAt ||
          story.publishedAt
        ).getTime();

      if (
        Number.isNaN(
          fetchedTime
        )
      ) {
        return false;
      }

      if (
        fetchedTime <
        startOfToday.getTime()
      ) {
        return false;
      }

      if (
        seen.has(
          story.id
        )
      ) {
        return false;
      }

      return true;
    }
  );
}


/* =========================================================
   MARK ANONYMOUS STORY SEEN
========================================================= */

async function markAnonymousStorySeen(
  visitorId,
  storyId
) {

  if (
    !visitorId ||
    !storyId
  ) {
    return;
  }


  /*
   * Local development:
   * There is no persistent anonymous database.
   */
  if (useLocalStore) {
    return;
  }


  await request(
    'anonymous_seen_news?on_conflict=visitor_id,story_id',
    {
      method: 'POST',

      headers: {
        Prefer:
          'resolution=merge-duplicates,return=minimal'
      },

      body:
        JSON.stringify({
          visitor_id:
            visitorId,

          story_id:
            storyId
        })
    }
  );
}


/* =========================================================
   PUSH SUBSCRIPTIONS
========================================================= */

async function savePushSubscription(
  userEmail,
  subscription
) {

  if (
    useLocalStore ||
    !subscription ||
    !subscription.endpoint
  ) {
    return null;
  }

  const rows =
    await request(
      'push_subscriptions?on_conflict=endpoint',
      {
        method: 'POST',

        headers: {
          Prefer:
            'resolution=merge-duplicates,return=representation'
        },

        body:
          JSON.stringify({
            user_email:
              userEmail,

            endpoint:
              subscription.endpoint,

            subscription,

            updated_at:
              new Date().toISOString()
          })
      }
    );

  return (
    rows &&
    rows[0]
  )
    ? rows[0]
    : null;
}


async function removePushSubscription(
  endpoint
) {

  if (
    useLocalStore ||
    !endpoint
  ) {
    return;
  }

  await request(
    `push_subscriptions?endpoint=eq.${encodeURIComponent(
      endpoint
    )}`,
    {
      method: 'DELETE'
    }
  );
}


async function getPushSubscriptions() {

  if (useLocalStore) {
    return [];
  }

  return request(
    'push_subscriptions?select=*',
    {
      method: 'GET'
    }
  );
}


async function claimPushDelivery(
  subscriptionId,
  storyId
) {

  if (
    useLocalStore ||
    !subscriptionId ||
    !storyId
  ) {
    return false;
  }

  const rows =
    await request(
      'push_deliveries?on_conflict=subscription_id,story_id',
      {
        method: 'POST',

        headers: {
          Prefer:
            'resolution=ignore-duplicates,return=representation'
        },

        body:
          JSON.stringify({
            subscription_id:
              subscriptionId,

            story_id:
              storyId
          })
      }
    );

  return (
    Array.isArray(rows) &&
    rows.length > 0
  );
}


/* =========================================================
   ACTIVITY LOG
========================================================= */

async function logActivity({
  eventType,
  title,
  message = '',
  actorEmail = null,
  metadata = {}
}) {

  if (useLocalStore) {

    const state =
      readLocalState();

    const event = {
      id:
        `activity-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      event_type:
        eventType,

      title,

      message,

      actor_email:
        actorEmail,

      metadata,

      created_at:
        new Date().toISOString()
    };

    const activityEvents =
      [
        event,
        ...(state.activityEvents || [])
      ].slice(0, 100);

    writeLocalState({
      ...state,
      activityEvents
    });

    return event;
  }


  const rows =
    await request(
      'activity_events',
      {
        method: 'POST',

        headers: {
          Prefer:
            'return=representation'
        },

        body:
          JSON.stringify({
            event_type:
              eventType,

            title,

            message,

            actor_email:
              actorEmail,

            metadata
          })
      }
    );

  return (
    rows &&
    rows[0]
  )
    ? rows[0]
    : null;
}


/* =========================================================
   GET ACTIVITY EVENTS
========================================================= */

async function getActivityEvents(
  limit = 30
) {

  limit =
    Math.min(
      Math.max(
        Number(limit) || 30,
        1
      ),
      100
    );


  if (useLocalStore) {

    return (
      readLocalState()
        .activityEvents || []
    ).slice(
      0,
      limit
    );
  }


  return request(
    `activity_events?select=*&order=created_at.desc&limit=${limit}`,
    {
      method: 'GET'
    }
  );
}


/* =========================================================
   REGISTERED USERS
========================================================= */

async function getRegisteredUsers() {

  if (useLocalStore) {
    return [];
  }

  return request(
    'profiles?select=id,email,first_name,last_name,username,phone,location,role,status,created_at&order=created_at.desc',
    {
      method: 'GET'
    }
  );
}


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

  readState,

  saveStories,

  saveAlerts,

  updateStory,

  getStory,

  getUnseenStories,

  markStorySeen,

  getUnseenAnonymousStories,

  markAnonymousStorySeen,

  savePushSubscription,

  removePushSubscription,

  getPushSubscriptions,

  claimPushDelivery,

  logActivity,

  getActivityEvents,

  getRegisteredUsers,

  mapStoryFromDb
};

