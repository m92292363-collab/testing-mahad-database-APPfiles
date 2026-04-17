import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);

const adminAttempts = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = adminAttempts.get(ip) || { count: 0, resetAt: now + 30 * 60 * 1000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 30 * 60 * 1000; }
  if (entry.count >= 5) return true;
  entry.count++;
  adminAttempts.set(ip, entry);
  return false;
}

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Too many attempts. Try again in 30 minutes.' }), { status: 429, headers });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password are required' }), { status: 400, headers });
    }
    if (username.length > 50 || password.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers });
    }

    const [admin] = await sql`SELECT id, username, password FROM admin WHERE username = ${username}`;

    if (!admin) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401, headers });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401, headers });
    }

    // Return a session token (simple approach using env secret)
    const sessionToken = Buffer.from(`${admin.id}:${Date.now()}:${process.env.ADMIN_SECRET_KEY}`).toString('base64');

    return new Response(JSON.stringify({
      success: true,
      admin: { id: admin.id, username: admin.username },
      sessionToken
    }), { status: 200, headers });
  } catch (error) {
    console.error('Admin login error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), { status: 500, headers });
  }
};

export const config = { path: '/api/admin-login' };
