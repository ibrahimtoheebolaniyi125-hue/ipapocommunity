const checks = {
  supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  push: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT),
  cron: Boolean(process.env.CRON_SECRET)
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const ready = checks.supabase && checks.push;
  return res.status(ready ? 200 : 503).json({
    success: ready,
    checks,
    message: ready ? 'Ipapo production services are configured.' : 'Production environment variables are incomplete.'
  });
};
