// netlify/functions/_middleware.js
// Shared helpers: CORS headers, JWT verification, input sanitisation, rate limiting

import jwt from 'jsonwebtoken';
import { neon } from '@neondatabase/serverless';

// ─── CORS ────────────────────────────────────────────────────────────────────
// Lock down to your real production domain. Add localhost for local dev.
const ALLOWED_ORIGINS = [
  process.env.SITE_URL,           // e.g. https://tallindingislamicinstitute.netlify.app
  'http://localhost:8888',
  'http://localhost:3000',
].filter(Boolean);

export function getCorsHeaders(req) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || '');
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    // Security headers on every response
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

export function handleOptions(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }
  return null;
}

export function jsonResponse(data, status = 200, req = null) {
  const headers = req ? getCorsHeaders(req) : { 'Content-Type': 'application/json' };
  return new Response(JSON.stringify(data), { status, headers });
}

// ─── JWT ─────────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.error('FATAL: JWT_SECRET env var is not set');

export function signToken(payload, expiresIn = '8h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn, algorithm: 'HS256' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

// Require a valid admin JWT. Returns the decoded payload or throws a Response.
export function requireAdmin(req, corsHeaders) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorised: no token provided' }),
      { status: 401, headers: corsHeaders }
    );
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    throw new Response(
      JSON.stringify({ error: 'Unauthorised: invalid or expired token' }),
      { status: 401, headers: corsHeaders }
    );
  }
  return payload;
}

// Require a valid student JWT. Returns payload or throws a Response.
export function requireStudent(req, corsHeaders) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorised: no token provided' }),
      { status: 401, headers: corsHeaders }
    );
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'student') {
    throw new Response(
      JSON.stringify({ error: 'Unauthorised: invalid or expired token' }),
      { status: 401, headers: corsHeaders }
    );
  }
  return payload;
}

// ─── SERVER-SIDE RATE LIMITING ───────────────────────────────────────────────
// Uses the Neon DB to store attempts. No extra service needed.
// Call at the top of login endpoints.
export async function checkRateLimit(sql, key, maxAttempts = 5, windowMinutes = 30) {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  // Clean up old attempts
  await sql`
    DELETE FROM login_attempts
    WHERE attempt_key = ${key} AND attempted_at < ${windowStart}
  `;

  // Count recent attempts
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM login_attempts
    WHERE attempt_key = ${key} AND attempted_at >= ${windowStart}
  `;

  if (count >= maxAttempts) {
    const [oldest] = await sql`
      SELECT attempted_at FROM login_attempts
      WHERE attempt_key = ${key}
      ORDER BY attempted_at ASC LIMIT 1
    `;
    const unlockAt = new Date(new Date(oldest.attempted_at).getTime() + windowMinutes * 60 * 1000);
    const minutesLeft = Math.ceil((unlockAt - Date.now()) / 60000);
    return { blocked: true, minutesLeft };
  }
  return { blocked: false, count };
}

export async function recordFailedAttempt(sql, key) {
  await sql`
    INSERT INTO login_attempts (attempt_key, attempted_at)
    VALUES (${key}, NOW())
  `;
}

export async function clearAttempts(sql, key) {
  await sql`DELETE FROM login_attempts WHERE attempt_key = ${key}`;
}

// ─── INPUT VALIDATION ────────────────────────────────────────────────────────
export function validateStudentId(id) {
  if (!id || typeof id !== 'string') return false;
  if (id.length < 2 || id.length > 30) return false;
  return /^[a-zA-Z0-9\-_]+$/.test(id);
}

export function validateName(name) {
  if (!name || typeof name !== 'string') return false;
  return name.trim().length >= 2 && name.trim().length <= 120;
}

export function validatePassword(pw) {
  if (!pw || typeof pw !== 'string') return false;
  return pw.length >= 4 && pw.length <= 200;
}

export function validateScore(score) {
  const n = parseInt(score, 10);
  return Number.isInteger(n) && n >= 0 && n <= 100;
}

export function validateGrade(grade) {
  return ['A', 'B', 'C', 'D', 'F'].includes(grade);
}

export function validateTerm(term) {
  return ['Term 1', 'Term 2', 'Term 3'].includes(term);
}

export function validateGradeLevel(level) {
  return [10, 11, 12].includes(parseInt(level, 10));
}

export function validateClassName(cls) {
  return ['أ', 'ب', 'ج', 'د', 'هـ', 'و'].includes(cls);
}

export function validateAcademicYear(year) {
  if (!year || typeof year !== 'string') return false;
  return /^\d{4}-\d{4}$/.test(year.trim());
}

// Sanitise a string: trim and strip HTML-like characters
export function sanitise(str) {
  if (!str) return str;
  return String(str).trim().replace(/[<>"']/g, '');
}
