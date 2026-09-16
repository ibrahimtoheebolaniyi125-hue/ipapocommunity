const { markNewsSeenForUser } = require('../_lib/news');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, storyId } = req.body || {};
  if (!email || !storyId) return res.status(400).json({ error: 'email and storyId are required' });

  try {
    await markNewsSeenForUser(String(email).trim().toLowerCase(), storyId);
    return res.status(200).json({ success: true, storyId });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Could not mark story as seen' });
  }
};
