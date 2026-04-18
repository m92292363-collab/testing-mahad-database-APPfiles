import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import {
  getCorsHeaders, handleOptions, jsonResponse,
  signToken, checkRateLimit, recordFailedAttempt, clearAttempts,
  sanitise
} from './_middleware.js';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400, req);
  }

  const username = sanitise(body.username);
  const password = body.password;

  if (!username || !password || username.length > 80 || password.length > 200) {
    return jsonResponse({ error: 'Username and password are required' }, 400, req);
  }

  // Strict rate limiting for admin — 5 attempts per 30 min per username
  const rateLimitKey = `admin:${username.toLowerCase()}`;
  try {
    const rl = await checkRateLimit(sql, rateLimitKey, 5, 30);
    if (rl.blocked) {
      return jsonResponse(
        { error: `Too many failed attempts. Try again in ${rl.minutesLeft} minute(s).` },
        429, req
      );
    }
  } catch (err) {
    console.error('Rate limit check error:', err.message);
  }

  try {
    const [admin] = await sql`
      SELECT id, username, password FROM admin
      WHERE username = ${username}
    `;

    if (!admin) {
      try { await recordFailedAttempt(sql, rateLimitKey); } catch {}
      await bcrypt.compare(password, '$2b$12$invalidhashfortimingreasonsonlyxx');
      return jsonResponse({ error: 'Invalid username or password' }, 401, req);
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      try { await recordFailedAttempt(sql, rateLimitKey); } catch {}
      return jsonResponse({ error: 'Invalid username or password' }, 401, req);
    }

    try { await clearAttempts(sql, rateLimitKey); } catch {}

    const token = signToken(
      { role: 'admin', adminId: admin.id, username: admin.username },
      '8h'  // admin sessions expire after 8 hours
    );

    return jsonResponse({
      success: true,
      token,
      admin: { id: admin.id, username: admin.username }
    }, 200, req);

  } catch (error) {
    console.error('Admin login error:', error);
    return jsonResponse({ error: 'Server error. Please try again.' }, 500, req);
  }
};

export const config = { path: '/api/admin-login' };
