import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  if (req.headers.get('x-admin-key') !== process.env.ADMIN_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  try {
    const url = new URL(req.url);
    const gradeLevel = url.searchParams.get('gradeLevel');
    const className = url.searchParams.get('className');

    const grade = gradeLevel ? parseInt(gradeLevel) : null;
    if (gradeLevel && isNaN(grade)) return new Response(JSON.stringify({ error: 'Invalid grade' }), { status: 400, headers });

    let students;
    if (grade && className) {
      students = await sql`SELECT id, student_id, full_name, grade_level, class_name, date_of_birth, guardian_name, guardian_phone, student_phone, address FROM students WHERE grade_level = ${grade} AND class_name = ${className} ORDER BY grade_level, class_name, student_id`;
    } else if (grade) {
      students = await sql`SELECT id, student_id, full_name, grade_level, class_name, date_of_birth, guardian_name, guardian_phone, student_phone, address FROM students WHERE grade_level = ${grade} ORDER BY class_name, student_id`;
    } else if (className) {
      students = await sql`SELECT id, student_id, full_name, grade_level, class_name, date_of_birth, guardian_name, guardian_phone, student_phone, address FROM students WHERE class_name = ${className} ORDER BY grade_level, student_id`;
    } else {
      students = await sql`SELECT id, student_id, full_name, grade_level, class_name, date_of_birth, guardian_name, guardian_phone, student_phone, address FROM students ORDER BY grade_level, class_name, student_id`;
    }

    return new Response(JSON.stringify({ success: true, students }), { status: 200, headers });
  } catch (error) {
    console.error('Get all students error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), { status: 500, headers });
  }
};

export const config = { path: '/api/get-all-students' };
