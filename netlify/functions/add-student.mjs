import { neon } from '@netlify/neon';
const sql = neon();
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  try {
    const { studentId, fullName, password, gradeLevel, className, dateOfBirth, guardianName, guardianPhone, studentPhone, address } = await req.json();
    if (!studentId || !fullName || !password || !gradeLevel || !className) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    await sql`
      INSERT INTO students (student_id, full_name, password, grade_level, class_name, date_of_birth, guardian_name, guardian_phone, student_phone, address)
      VALUES (${studentId}, ${fullName}, ${password}, ${parseInt(gradeLevel)}, ${className}, ${dateOfBirth||null}, ${guardianName||null}, ${guardianPhone||null}, ${studentPhone||null}, ${address||null})
    `;
    return new Response(JSON.stringify({ success: true, message: `Student ${fullName} added successfully` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return new Response(JSON.stringify({ error: 'Student ID already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.error('Add student error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
export const config = { path: '/api/add-student' };
