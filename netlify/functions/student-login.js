import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import {
  getCorsHeaders, handleOptions, jsonResponse,
  signToken, checkRateLimit, recordFailedAttempt, clearAttempts,
  validateStudentId, validatePassword, sanitise
} from './_middleware.js';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  const headers = getCorsHeaders(req);

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400, req);
  }

  const studentId = sanitise(body.studentId);
  const password = body.password; // do not sanitise before bcrypt compare

  // Input validation
  if (!validateStudentId(studentId) || !validatePassword(password)) {
    return jsonResponse({ error: 'Invalid student ID or password format' }, 400, req);
  }

  // Server-side rate limiting keyed by studentId
  const rateLimitKey = `student:${studentId.toLowerCase()}`;
  try {
    const rl = await checkRateLimit(sql, rateLimitKey, 5, 30);
    if (rl.blocked) {
      return jsonResponse(
        { error: `Too many failed attempts. Try again in ${rl.minutesLeft} minute(s).` },
        429, req
      );
    }
  } catch (err) {
    // If rate limit table doesn't exist yet, log but don't block login
    console.error('Rate limit check error (table may not exist):', err.message);
  }

  try {
    const [student] = await sql`
      SELECT
        id, student_id, full_name, grade_level, class_name,
        password,
        date_of_birth, guardian_name, guardian_phone, student_phone, address
      FROM students
      WHERE student_id = ${studentId}
    `;

    if (!student) {
      // Record failed attempt even for non-existent users (prevent enumeration timing)
      try { await recordFailedAttempt(sql, rateLimitKey); } catch {}
      // Constant-time fake compare to prevent timing attacks
      await bcrypt.compare(password, '$2b$12$invalidhashfortimingreasonsonlyxx');
      return jsonResponse({ error: 'Invalid student ID or password' }, 401, req);
    }

    // Compare submitted password against stored hash
    const passwordMatch = await bcrypt.compare(password, student.password);
    if (!passwordMatch) {
      try { await recordFailedAttempt(sql, rateLimitKey); } catch {}
      return jsonResponse({ error: 'Invalid student ID or password' }, 401, req);
    }

    // Success — clear failed attempts and issue JWT
    try { await clearAttempts(sql, rateLimitKey); } catch {}

    const token = signToken({
      role: 'student',
      studentId: student.student_id,
      fullName: student.full_name,
    });

    return jsonResponse({
      success: true,
      token,
      student: {
        id: student.id,
        studentId: student.student_id,
        fullName: student.full_name,
        gradeLevel: student.grade_level,
        className: student.class_name,
        dateOfBirth: student.date_of_birth,
        guardianName: student.guardian_name,
        guardianPhone: student.guardian_phone,
        studentPhone: student.student_phone,
        address: student.address,
      }
    }, 200, req);

  } catch (error) {
    console.error('Student login error:', error);
    return jsonResponse({ error: 'Server error. Please try again.' }, 500, req);
  }
};

export const config = { path: '/api/student-login' };
