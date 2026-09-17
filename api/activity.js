const { getAuthenticatedUser } = require('./_lib/user-auth');
const { logActivity } = require('./_lib/store');

const allowedEvents = new Set(['submission_created', 'comment_created', 'user_registered', 'idea_submitted']);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { eventType, title, message, metadata } = req.body || {};
    if (!allowedEvents.has(eventType) || !title) {
      return res.status(400).json({ error: 'Unsupported activity event.' });
    }

    const event = await logActivity({
      eventType,
      title,
      message,
      actorEmail: user.email,
      metadata: metadata || {}
    });
    return res.status(201).json({ success: true, event });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Could not log activity' });
  }
};
