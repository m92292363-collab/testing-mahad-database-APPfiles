import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  if (req.headers.get('x-admin-key') !== process.env.ADMIN_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  try {
    const { studentId, subject, score, grade, academicYear, term } = await req.json();

    if (!studentId || !subject || score === undefined || !grade || !academicYear || !term) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), { status: 400, headers });
    }
    if (studentId.length > 20 || subject.length > 100 || academicYear.length > 20 || term.length > 20) {
      return new Response(JSON.stringify({ error: 'Invalid input length' }), { status: 400, headers });
    }
    if (score < 0 || score > 100) {
      return new Response(JSON.stringify({ error: 'Score must be between 0 and 100' }), { status: 400, headers });
    }
    if (!['A','B','C','D','F'].includes(grade)) {
      return new Response(JSON.stringify({ error: 'Invalid grade value' }), { status: 400, headers });
    }

    const [student] = await sql`SELECT student_id FROM students WHERE student_id = ${studentId}`;
    if (!student) return new Response(JSON.stringify({ error: `Student ID ${studentId} not found` }), { status: 404, headers });

    const [existing] = await sql`
      SELECT id FROM results
      WHERE student_id = ${studentId} AND subject = ${subject}
        AND academic_year = ${academicYear} AND term = ${term}
    `;

    if (existing) {
      await sql`
        UPDATE results SET score = ${score}, grade = ${grade}
        WHERE student_id = ${studentId} AND subject = ${subject}
          AND academic_year = ${academicYear} AND term = ${term}
      `;
    } else {
      await sql`
        INSERT INTO results (student_id, subject, score, grade, academic_year, term)
        VALUES (${studentId}, ${subject}, ${score}, ${grade}, ${academicYear}, ${term})
      `;
    }

    return new Response(JSON.stringify({ success: true, message: 'Result saved successfully' }), { status: 200, headers });
  } catch (error) {
    console.error('Add marks error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), { status: 500, headers });
  }
};

export const config = { path: '/api/add-marks' };
