import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const url = new URL(req.url);
    const studentId = url.searchParams.get('studentId');

    if (!studentId) return new Response(JSON.stringify({ error: 'Student ID is required' }), { status: 400, headers });
    if (studentId.length > 20) return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers });

    const results = await sql`
      SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
             s.full_name, s.grade_level, s.class_name
      FROM results r JOIN students s ON r.student_id = s.student_id
      WHERE r.student_id = ${studentId}
      ORDER BY r.academic_year DESC, r.term, r.subject
    `;

    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers });
  } catch (error) {
    console.error('Get results error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), { status: 500, headers });
  }
};

export const config = { path: '/api/get-results' };
