const { fetchDailyStories, getScheduledGreeting } = require('../_lib/news');
const { readState, logActivity } = require('../_lib/store');
const { sendDailyStoryNotifications } = require('../_lib/push');

module.exports = async function handler(req, res) {
  const authorization = req.headers.authorization || '';
  const cronAuthorized = process.env.CRON_SECRET && authorization === `Bearer ${process.env.CRON_SECRET}`;
  if (!cronAuthorized) {
    return res.status(401).json({ success: false, error: 'Cron authentication required.' });
  }

  try {
    const stories = await fetchDailyStories();
    const greeting = await getScheduledGreeting();
    const state = await readState();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const approvedToday = state.stories.filter((story) => (
      story.status === 'approved' &&
      new Date(story.fetchedAt).getTime() >= today.getTime()
    ));
    const push = await sendDailyStoryNotifications(approvedToday);
    await logActivity({
      eventType: 'daily_fetch_completed',
      title: 'Daily local news fetch completed',
      message: `${stories.length} Ipapo-area stories were collected for editorial review.`,
      metadata: { totalStories: stories.length, approvedToday: approvedToday.length, greeting: greeting?.id || null, push }
    });
    for (const alert of state.alerts.slice(0, 10)) {
      await logActivity({
        eventType: 'scam_alert',
        title: alert.risk === 'high' ? 'High-risk story detected' : 'Story needs verification',
        message: alert.title,
        metadata: { risk: alert.risk, score: alert.score }
      });
    }

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      totalStories: stories.length,
      push,
      message: 'Daily Ipapo news fetch completed successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Daily fetch failed'
    });
  }
};
