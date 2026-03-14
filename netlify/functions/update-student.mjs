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
    const { studentId, fullName, gradeLevel, className } = await req.json();

    if (!studentId) {
      return new Response(JSON.stringify({ error: 'Student ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check student exists
    const [student] = await sql`
      SELECT student_id FROM students WHERE student_id = ${studentId}
    `;
    if (!student) {
      return new Response(JSON.stringify({ error: `Student ID ${studentId} not found` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build update dynamically based on what's provided
    if (fullName && gradeLevel && className) {
      await sql`
        UPDATE students SET full_name = ${fullName}, grade_level = ${parseInt(gradeLevel)}, class_name = ${className}
        WHERE student_id = ${studentId}
      `;
    } else if (fullName && gradeLevel) {
      await sql`UPDATE students SET full_name = ${fullName}, grade_level = ${parseInt(gradeLevel)} WHERE student_id = ${studentId}`;
    } else if (fullName && className) {
      await sql`UPDATE students SET full_name = ${fullName}, class_name = ${className} WHERE student_id = ${studentId}`;
    } else if (gradeLevel && className) {
      await sql`UPDATE students SET grade_level = ${parseInt(gradeLevel)}, class_name = ${className} WHERE student_id = ${studentId}`;
    } else if (fullName) {
      await sql`UPDATE students SET full_name = ${fullName} WHERE student_id = ${studentId}`;
    } else if (gradeLevel) {
      await sql`UPDATE students SET grade_level = ${parseInt(gradeLevel)} WHERE student_id = ${studentId}`;
    } else if (className) {
      await sql`UPDATE students SET class_name = ${className} WHERE student_id = ${studentId}`;
    } else {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
