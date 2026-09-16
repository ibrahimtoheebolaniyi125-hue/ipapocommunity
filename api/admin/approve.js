const { getCache, updateStoryStatus } = require('../_lib/news');
const { sendDailyStoryNotifications } = require('../_lib/push');
const { logActivity } = require('../_lib/store');
const { requireAdmin } = require('../_lib/admin-auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!await requireAdmin(req, res)) return;

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
};
