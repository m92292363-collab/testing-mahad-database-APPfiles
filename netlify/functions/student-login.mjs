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
    const { studentId, password } = await req.json();

    if (!studentId || !password) {
      return new Response(JSON.stringify({ error: 'Student ID and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const [student] = await sql`
      SELECT id, student_id, full_name, grade_level 
      FROM students 
      WHERE student_id = ${studentId} AND password = ${password}
    `;

    if (!student) {
      return new Response(JSON.stringify({ error: 'Invalid Student ID or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      student: {
        id: student.id,
        studentId: student.student_id,
        fullName: student.full_name,
        gradeLevel: student.grade_level
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/student-login' };
