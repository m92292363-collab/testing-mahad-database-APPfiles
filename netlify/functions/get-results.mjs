import { neon } from '@netlify/neon';

const sql = neon();

export default async (req) => {
  const url = new URL(req.url);
  const studentId = url.searchParams.get('studentId');

  if (!studentId) {
    return new Response(JSON.stringify({ error: 'Student ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const results = await sql`
      SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
             s.full_name, s.grade_level
      FROM results r
      JOIN students s ON r.student_id = s.student_id
      WHERE r.student_id = ${studentId}
      ORDER BY r.term, r.subject
    `;

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get results error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/get-results' };
