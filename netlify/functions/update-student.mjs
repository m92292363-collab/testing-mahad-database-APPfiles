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
    const { studentId, fullName, gradeLevel, className, dateOfBirth, guardianName, guardianPhone, studentPhone, address } = await req.json();
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
    await sql`
      UPDATE students SET
        full_name = COALESCE(${fullName||null}, full_name),
        grade_level = COALESCE(${gradeLevel ? parseInt(gradeLevel) : null}, grade_level),
        class_name = COALESCE(${className||null}, class_name),
        date_of_birth = COALESCE(${dateOfBirth||null}, date_of_birth),
        guardian_name = COALESCE(${guardianName||null}, guardian_name),
        guardian_phone = COALESCE(${guardianPhone||null}, guardian_phone),
        student_phone = COALESCE(${studentPhone||null}, student_phone),
        address = COALESCE(${address||null}, address)
      WHERE student_id = ${studentId}
    `;
    return new Response(JSON.stringify({ success: true, message: 'Student updated successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update student error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
export const config = { path: '/api/update-student' };
