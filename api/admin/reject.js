const { getCache, updateStoryStatus } = require('../_lib/news');
const { requireAdmin } = require('../_lib/admin-auth');
const { logActivity } = require('../_lib/store');

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
};
