import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);

// Server-side rate limiting (in-memory, resets on function cold start)
const loginAttempts = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + 30 * 60 * 1000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 30 * 60 * 1000; }
  if (entry.count >= 10) return true;
  entry.count++;
  loginAttempts.set(ip, entry);
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
    const { studentId, password } = await req.json();

    if (!studentId || !password) {
      return new Response(JSON.stringify({ error: 'Student ID and password are required' }), { status: 400, headers });
    }
    if (studentId.length > 20 || password.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers });
    }

    const [student] = await sql`
      SELECT id, student_id, full_name, grade_level, class_name, password,
             date_of_birth, guardian_name, guardian_phone, student_phone, address
      FROM students WHERE student_id = ${studentId}
    `;

    if (!student) {
      return new Response(JSON.stringify({ error: 'Invalid Student ID or password' }), { status: 401, headers });
    }

    const passwordMatch = await bcrypt.compare(password, student.password);
    if (!passwordMatch) {
      return new Response(JSON.stringify({ error: 'Invalid Student ID or password' }), { status: 401, headers });
    }

    return new Response(JSON.stringify({
      success: true,
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
        address: student.address
      }
    }), { status: 200, headers });
  } catch (error) {
    console.error('Student login error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), { status: 500, headers });
  }
};

export const config = { path: '/api/student-login' };
