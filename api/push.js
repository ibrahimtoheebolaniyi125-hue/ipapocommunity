const { savePushSubscription, removePushSubscription } = require('./_lib/store');

async function handleConfig(req, res) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) return res.status(503).json({ error: 'Push notifications are not configured.' });
  return res.status(200).json({ publicKey });
}

async function handleSubscribe(req, res) {
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
}

async function handleUnsubscribe(req, res) {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });

  try {
    await removePushSubscription(endpoint);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Could not remove push subscription' });
  }
}

module.exports = async function handler(req, res) {
  const action = String((req.query && req.query.action) || '').trim();

  if (action === 'config' && req.method === 'GET') return handleConfig(req, res);
  if (action === 'subscribe' && req.method === 'POST') return handleSubscribe(req, res);
  if (action === 'unsubscribe' && req.method === 'POST') return handleUnsubscribe(req, res);

  return res.status(404).json({ error: 'Unknown push action. Use ?action=config|subscribe|unsubscribe' });
};
