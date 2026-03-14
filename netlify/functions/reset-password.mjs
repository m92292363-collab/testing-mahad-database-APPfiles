import { neon } from '@netlify/neon';
const sql = neon();
export default async (req) => {
  if (req.method !== 'PUT') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  try {
    const { studentId, newPassword } = await req.json();
    if (!studentId || !newPassword) {
      return new Response(JSON.stringify({ error: 'Student ID and new password are required' }), {
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
    await sql`
      UPDATE students SET password = ${newPassword} WHERE student_id = ${studentId}
    `;
    return new Response(JSON.stringify({ success: true, message: `Password reset successfully for ${studentId}` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
export const config = { path: '/api/reset-password' };
