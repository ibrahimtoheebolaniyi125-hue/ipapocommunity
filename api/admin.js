const { getDailyStories, getCache, updateStoryStatus } = require('./_lib/news');
const { sendDailyStoryNotifications } = require('./_lib/push');
const { getPushSubscriptions, getActivityEvents, logActivity } = require('./_lib/store');
const { requireAdmin } = require('./_lib/admin-auth');

async function handleDashboard(req, res) {
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
}

async function handleApprove(req, res) {
  try {
    const { storyId } = req.body || {};
    if (!storyId) {
      return res.status(400).json({ error: 'storyId is required' });
    }

    const updated = await updateStoryStatus(storyId, 'approved');
    if (!updated) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const push = await sendDailyStoryNotifications([updated]);
    await logActivity({
      eventType: 'news_approved',
      title: 'News story approved',
      message: updated.title,
      metadata: { storyId: updated.id, push }
    });

    const cache = await getCache();
    return res.status(200).json({
      success: true,
      story: updated,
      approved: true,
      push,
      queue: cache.stories.filter((story) => story.status === 'pending')
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Could not approve story'
    });
  }
}

async function handleReject(req, res) {
  try {
    const { storyId } = req.body || {};
    if (!storyId) {
      return res.status(400).json({ error: 'storyId is required' });
    }

    const updated = await updateStoryStatus(storyId, 'rejected');
    if (!updated) {
      return res.status(404).json({ error: 'Story not found' });
    }

    await logActivity({
      eventType: 'news_rejected',
      title: 'News story rejected',
      message: updated.title,
      metadata: { storyId: updated.id }
    });

    const cache = await getCache();
    return res.status(200).json({
      success: true,
      story: updated,
      rejected: true,
      queue: cache.stories.filter((story) => story.status === 'pending')
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Could not reject story'
    });
  }
}

module.exports = async function handler(req, res) {
  const action = String((req.query && req.query.action) || '').trim();

  if (action === 'dashboard' && req.method === 'GET') {
    if (!await requireAdmin(req, res)) return;
    return handleDashboard(req, res);
  }

  if (action === 'approve' && req.method === 'POST') {
    if (!await requireAdmin(req, res)) return;
    return handleApprove(req, res);
  }

  if (action === 'reject' && req.method === 'POST') {
    if (!await requireAdmin(req, res)) return;
    return handleReject(req, res);
  }

  return res.status(404).json({ error: 'Unknown admin action. Use ?action=dashboard|approve|reject' });
};