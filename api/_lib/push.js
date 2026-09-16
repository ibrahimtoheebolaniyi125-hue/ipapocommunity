const webpush = require('web-push');
const {
  getPushSubscriptions,
  claimPushDelivery,
  removePushSubscription
  ,logActivity
} = require('./store');

const configure = () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    throw new Error('Web Push is not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.');
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
};

const sendDailyStoryNotifications = async (stories) => {
  configure();
  const subscriptions = await getPushSubscriptions();
  let sent = 0;
  let skipped = 0;

  for (const story of stories) {
    for (const record of subscriptions) {
      const claimed = await claimPushDelivery(record.id, story.id);
      if (!claimed) {
        skipped += 1;
        continue;
      }

      try {
        await webpush.sendNotification(record.subscription, JSON.stringify({
          title: 'New Ipapo Broadcast story',
          body: story.title,
          url: `/article.html?id=${encodeURIComponent(story.id)}`,
          tag: `ipapo-story-${story.id}`
        }));
        sent += 1;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await removePushSubscription(record.endpoint);
        }
      }
    }
  }

  const result = { subscriptions: subscriptions.length, sent, skipped };
  await logActivity({
    eventType: 'push_delivery',
    title: 'Push notification delivery completed',
    message: `${sent} device notifications sent for ${stories.length} approved stories.`,
    metadata: result
  });
  return result;
};

module.exports = { sendDailyStoryNotifications };
