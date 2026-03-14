import { neon } from '@netlify/neon';
const sql = neon();
export default async (req) => {
  if (req.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  try {
    const { studentId, subject, academicYear, term } = await req.json();
    if (!studentId) {
      return new Response(JSON.stringify({ error: 'Student ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const [student] = await sql`
      SELECT student_id FROM students WHERE student_id = ${studentId}
    `;
    if (!student) {
      return new Response(JSON.stringify({ error: `Student ID ${studentId} not found` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Delete specific result or all results for a student
    if (subject && academicYear && term) {
      await sql`
        DELETE FROM results
        WHERE student_id = ${studentId}
        AND subject = ${subject}
        AND academic_year = ${academicYear}
        AND term = ${term}
      `;
    } else {
      await sql`DELETE FROM results WHERE student_id = ${studentId}`;
    }
    return new Response(JSON.stringify({ success: true, message: 'Results deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete results error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
export const config = { path: '/api/delete-results' };
