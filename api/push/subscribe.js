const { savePushSubscription } = require('../_lib/store');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, subscription } = req.body || {};
  if (!email || !subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'email and subscription are required' });
  }

  try {
    await savePushSubscription(String(email).trim().toLowerCase(), subscription);
    return res.status(201).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Could not save push subscription' });
  }
};
