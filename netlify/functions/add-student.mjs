import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  if (req.headers.get('x-admin-key') !== process.env.ADMIN_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  try {
    const { studentId, fullName, password, gradeLevel, className, dateOfBirth, guardianName, guardianPhone, studentPhone, address } = await req.json();

    if (!studentId || !fullName || !password || !gradeLevel || !className) {
      return new Response(JSON.stringify({ error: 'All required fields must be filled' }), { status: 400, headers });
    }
    if (studentId.length > 20 || fullName.length > 100 || password.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid input length' }), { status: 400, headers });
    }

    const [existing] = await sql`SELECT student_id FROM students WHERE student_id = ${studentId}`;
    if (existing) return new Response(JSON.stringify({ error: 'Student ID already exists' }), { status: 409, headers });

    const hashedPassword = await bcrypt.hash(password, 10);

    await sql`
      INSERT INTO students (student_id, full_name, password, grade_level, class_name, date_of_birth, guardian_name, guardian_phone, student_phone, address)
      VALUES (${studentId}, ${fullName}, ${hashedPassword}, ${parseInt(gradeLevel)}, ${className}, ${dateOfBirth || null}, ${guardianName || null}, ${guardianPhone || null}, ${studentPhone || null}, ${address || null})
    `;

    return new Response(JSON.stringify({ success: true, message: `Student ${fullName} added successfully` }), { status: 200, headers });
  } catch (error) {
    console.error('Add student error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), { status: 500, headers });
  }
};

export const config = { path: '/api/add-student' };
