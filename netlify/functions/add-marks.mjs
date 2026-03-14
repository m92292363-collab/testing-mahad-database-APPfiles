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
    const { studentId, subject, score, grade, academicYear, term } = await req.json();

    if (!studentId || !subject || score === undefined || !grade || !academicYear || !term) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
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

    const [existing] = await sql`
      SELECT id FROM results 
      WHERE student_id = ${studentId} AND subject = ${subject} 
      AND academic_year = ${academicYear} AND term = ${term}
    `;

    if (existing) {
      await sql`
        UPDATE results 
        SET score = ${score}, grade = ${grade}
        WHERE student_id = ${studentId} AND subject = ${subject}
        AND academic_year = ${academicYear} AND term = ${term}
      `;
    } else {
      await sql`
        INSERT INTO results (student_id, subject, score, grade, academic_year, term)
        VALUES (${studentId}, ${subject}, ${score}, ${grade}, ${academicYear}, ${term})
      `;
    }

    return new Response(JSON.stringify({ success: true, message: 'Result saved successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Add marks error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/add-marks' };
