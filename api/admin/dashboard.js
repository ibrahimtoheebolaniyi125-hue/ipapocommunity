const { getDailyStories, getCache } = require('../_lib/news');
const { getPushSubscriptions, getActivityEvents } = require('../_lib/store');
const { requireAdmin } = require('../_lib/admin-auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!await requireAdmin(req, res)) return;

  try {
    const stories = await getDailyStories(true);
    const cache = await getCache();
    const pending = stories.filter((story) => story.status === 'pending');
    const approved = stories.filter((story) => story.status === 'approved');
    const subscriptions = await getPushSubscriptions();
    const activityEvents = await getActivityEvents(30);
    const notifications = [
      ...cache.alerts.slice(0, 8).map((alert) => ({
        id: alert.id,
        type: 'scam',
        title: alert.risk === 'high' ? 'High-risk story detected' : 'Story needs verification',
        message: alert.title,
        createdAt: alert.createdAt
      })),
      ...pending.slice(0, 8).map((story) => ({
        id: `pending-${story.id}`,
        type: 'review',
        title: 'New story awaiting review',
        message: story.title,
        createdAt: story.fetchedAt
      })),
      ...activityEvents.map((event) => ({
        id: event.id,
        type: event.event_type,
        title: event.title,
        message: event.message,
        createdAt: event.created_at
      }))
    ];

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      stats: {
        totalFetched: stories.length,
        pending: pending.length,
        approved: approved.length,
        scamAlerts: cache.alerts.length
      },
      activity: {
        lastFetch: cache.generatedAt,
        fetchedToday: stories.filter((story) => new Date(story.fetchedAt).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
        pending: pending.length,
        approved: approved.length,
        scamAlerts: cache.alerts.length,
        subscribedDevices: subscriptions.length
      },
      notifications,
      activityEvents,
      stories: pending,
      alerts: cache.alerts,
      newsQueue: pending,
      scamQueue: cache.alerts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Could not load admin dashboard'
    });
  }
};
