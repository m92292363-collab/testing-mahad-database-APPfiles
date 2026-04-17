import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'DELETE') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  if (req.headers.get('x-admin-key') !== process.env.ADMIN_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  try {
    const { studentId } = await req.json();

    if (!studentId || studentId.length > 20) {
      return new Response(JSON.stringify({ error: 'Student ID is required' }), { status: 400, headers });
    }

    const [student] = await sql`SELECT student_id FROM students WHERE student_id = ${studentId}`;
    if (!student) return new Response(JSON.stringify({ error: `Student ID ${studentId} not found` }), { status: 404, headers });

    await sql`DELETE FROM results WHERE student_id = ${studentId}`;
    await sql`DELETE FROM students WHERE student_id = ${studentId}`;

    return new Response(JSON.stringify({ success: true, message: `Student ${studentId} deleted successfully` }), { status: 200, headers });
  } catch (error) {
    console.error('Delete student error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), { status: 500, headers });
  }
};

export const config = { path: '/api/delete-student' };
