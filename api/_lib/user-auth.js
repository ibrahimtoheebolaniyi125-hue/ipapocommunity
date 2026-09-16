const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

const getAuthenticatedUser = async (req) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token}`
    }
  });
  return response.ok ? response.json() : null;
};

module.exports = { getAuthenticatedUser };
