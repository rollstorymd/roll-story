import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // sb_secret_...
);

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const role =
      user.user_metadata?.role ||
      user.raw_user_meta_data?.role;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    req.admin = user;
    next();
  } catch (err) {
    console.error('[auth]', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export default authenticate;