const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

const deny = (res, status, error) => {
  res.status(status).json({ success: false, error });
  return null;
};

const requireAdmin = async (req, res) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!token) return deny(res, 401, 'Authentication required.');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return deny(res, 503, 'Supabase authentication is not configured.');
  }

  try {
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${token}`
      }
    });
    if (!userResponse.ok) return deny(res, 401, 'Invalid or expired session.');

    const authUser = await userResponse.json();
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(authUser.id)}&select=id,email,role,status`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (!profileResponse.ok) return deny(res, 500, 'Could not verify administrator profile.');

    const profiles = await profileResponse.json();
    const profile = profiles[0];
    if (!profile || !['admin', 'superadmin'].includes(profile.role) || profile.status !== 'active') {
      return deny(res, 403, 'Administrator access required.');
    }

    return { ...authUser, profile };
  } catch (error) {
    return deny(res, 500, 'Could not verify authentication.');
  }
};

module.exports = { requireAdmin };
