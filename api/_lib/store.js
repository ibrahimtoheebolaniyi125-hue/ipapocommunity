const fs = require('fs');
const path = require('path');

const STORE_DIR = process.env.VERCEL ? '/tmp/ipapo-data' : path.join(process.cwd(), 'data');
const STORE_FILE = path.join(STORE_DIR, 'store.json');

const defaultState = {
  generatedAt: null,
  stories: [],
  alerts: [],
  seenByUser: {},
  approvedIds: [],
  rejectedIds: []
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useLocalStore = !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY;

const readLocalState = () => {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (!fs.existsSync(STORE_FILE)) return { ...defaultState };
    return { ...defaultState, ...JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) };
  } catch (error) {
    console.warn('Could not read local news store:', error.message);
    return { ...defaultState };
  }
};

const writeLocalState = (state) => {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify({ ...defaultState, ...state }, null, 2));
};

const assertConfigured = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
};

const request = async (table, options = {}) => {
  assertConfigured();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase ${table} request failed (${response.status}): ${message}`);
  }

  if (response.status === 204) return null;
  return response.json();
};

const mapStoryToDb = (story) => ({
  id: story.id,
  title: story.title,
  source: story.source,
  link: story.link || '#',
  summary: story.summary || '',
  content: story.content || story.summary || '',
  image: story.image || '',
  published_at: story.publishedAt || null,
  category: story.category || 'World',
  status: story.status || 'pending',
  scam_score: story.scamScore || 0,
  scam_risk: story.scamRisk || 'low',
  scam_label: story.scamLabel || 'Likely safe',
  scam_reasons: story.scamReasons || [],
  is_scam: Boolean(story.isScam),
  fetched_at: story.fetchedAt || new Date().toISOString(),
  updated_at: new Date().toISOString()
});

const mapStoryFromDb = (story) => ({
  id: story.id,
  title: story.title,
  source: story.source,
  link: story.link,
  summary: story.summary,
  content: story.content,
  image: story.image || '',
  publishedAt: story.published_at,
  category: story.category,
  status: story.status,
  scamScore: story.scam_score,
  scamRisk: story.scam_risk,
  scamLabel: story.scam_label,
  scamReasons: story.scam_reasons || [],
  isScam: story.is_scam,
  fetchedAt: story.fetched_at
});

const mapAlertFromDb = (alert) => ({
  id: alert.id,
  title: alert.title,
  risk: alert.risk,
  score: alert.score,
  reasons: alert.reasons || [],
  source: alert.source,
  createdAt: alert.created_at
});

const readState = async () => {
  if (useLocalStore) {
    const state = readLocalState();
    return {
      ...state,
      generatedAt: state.generatedAt || state.stories[0]?.fetchedAt || null,
      approvedIds: state.stories.filter((story) => story.status === 'approved').map((story) => story.id),
      rejectedIds: state.stories.filter((story) => story.status === 'rejected').map((story) => story.id)
    };
  }

  const [stories, alerts] = await Promise.all([
    request('news_stories?select=*&order=fetched_at.desc', { method: 'GET' }),
    request('news_alerts?select=*&order=created_at.desc', { method: 'GET' })
  ]);

  return {
    generatedAt: stories[0]?.fetched_at || null,
    stories: stories.map(mapStoryFromDb),
    alerts: alerts.map(mapAlertFromDb),
    approvedIds: stories.filter((story) => story.status === 'approved').map((story) => story.id),
    rejectedIds: stories.filter((story) => story.status === 'rejected').map((story) => story.id)
  };
};

const saveStories = async (stories) => {
  if (!stories.length) return [];
  if (useLocalStore) {
    const state = readLocalState();
    const existing = new Map(state.stories.map((story) => [story.id, story]));
    stories.forEach((story) => existing.set(story.id, story));
    const saved = [...existing.values()].sort((left, right) => new Date(right.fetchedAt || 0) - new Date(left.fetchedAt || 0));
    writeLocalState({ ...state, generatedAt: new Date().toISOString(), stories: saved });
    return saved;
  }
  return request('news_stories?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(stories.map(mapStoryToDb))
  });
};

const saveAlerts = async (alerts) => {
  if (!alerts.length) return [];
  if (useLocalStore) {
    const state = readLocalState();
    const existing = new Map(state.alerts.map((alert) => [alert.id, alert]));
    alerts.forEach((alert) => existing.set(alert.id, alert));
    const saved = [...existing.values()].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
    writeLocalState({ ...state, alerts: saved });
    return saved;
  }
  return request('news_alerts?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(alerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      risk: alert.risk,
      score: alert.score,
      reasons: alert.reasons || [],
      source: alert.source || 'news-fetcher',
      created_at: alert.createdAt || new Date().toISOString()
    })))
  });
};

const updateStory = async (storyId, status) => {
  if (useLocalStore) {
    const state = readLocalState();
    const index = state.stories.findIndex((story) => story.id === storyId);
    if (index === -1) return null;
    state.stories[index] = { ...state.stories[index], status, updatedAt: new Date().toISOString() };
    writeLocalState(state);
    return state.stories[index];
  }
  const rows = await request(`news_stories?id=eq.${encodeURIComponent(storyId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() })
  });
  return rows[0] ? mapStoryFromDb(rows[0]) : null;
};

const getStory = async (storyId) => {
  if (useLocalStore) {
    return readLocalState().stories.find((story) => story.id === storyId) || null;
  }
  const rows = await request(`news_stories?id=eq.${encodeURIComponent(storyId)}&select=*`, { method: 'GET' });
  return rows[0] ? mapStoryFromDb(rows[0]) : null;
};

const getUnseenStories = async (userEmail) => {
  const state = await readState();
  const seenRows = await request(`user_seen_news?user_email=eq.${encodeURIComponent(userEmail)}&select=story_id`, { method: 'GET' });
  const seen = new Set(seenRows.map((row) => row.story_id));
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  return state.stories.filter((story) => (
    story.status === 'approved' &&
    new Date(story.fetchedAt).getTime() >= startOfToday.getTime() &&
    !seen.has(story.id)
  ));
};

const markStorySeen = async (userEmail, storyId) => {
  await request('user_seen_news?on_conflict=user_email,story_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_email: userEmail, story_id: storyId })
  });
};

const savePushSubscription = async (userEmail, subscription) => {
  const rows = await request('push_subscriptions?on_conflict=endpoint', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      user_email: userEmail,
      endpoint: subscription.endpoint,
      subscription,
      updated_at: new Date().toISOString()
    })
  });
  return rows[0];
};

const removePushSubscription = async (endpoint) => {
  await request(`push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, { method: 'DELETE' });
};

const getPushSubscriptions = async () => request('push_subscriptions?select=*', { method: 'GET' });

const claimPushDelivery = async (subscriptionId, storyId) => {
  const rows = await request('push_deliveries?on_conflict=subscription_id,story_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ subscription_id: subscriptionId, story_id: storyId })
  });
  return rows.length > 0;
};

const logActivity = async ({ eventType, title, message = '', actorEmail = null, metadata = {} }) => {
  const rows = await request('activity_events', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      event_type: eventType,
      title,
      message,
      actor_email: actorEmail,
      metadata
    })
  });
  return rows[0];
};

const getActivityEvents = async (limit = 30) => request(`activity_events?select=*&order=created_at.desc&limit=${Math.min(limit, 100)}`, { method: 'GET' });

module.exports = {
  readState,
  saveStories,
  saveAlerts,
  updateStory,
  getStory,
  getUnseenStories,
  markStorySeen,
  savePushSubscription,
  removePushSubscription,
  getPushSubscriptions,
  claimPushDelivery,
  logActivity,
  getActivityEvents,
  mapStoryFromDb
};
