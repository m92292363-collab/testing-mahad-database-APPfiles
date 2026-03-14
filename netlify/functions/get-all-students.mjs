import { neon } from '@netlify/neon';
const sql = neon();

export default async (req) => {
  try {
    const url = new URL(req.url);
    const gradeLevel = url.searchParams.get('gradeLevel');
    const className = url.searchParams.get('className');

    let students;
    if (gradeLevel && className) {
      students = await sql`
        SELECT id, student_id, full_name, grade_level, class_name
        FROM students
        WHERE grade_level = ${parseInt(gradeLevel)} AND class_name = ${className}
        ORDER BY grade_level, class_name, student_id
      `;
    } else if (gradeLevel) {
      students = await sql`
        SELECT id, student_id, full_name, grade_level, class_name
        FROM students
        WHERE grade_level = ${parseInt(gradeLevel)}
        ORDER BY class_name, student_id
      `;
    } else if (className) {
      students = await sql`
        SELECT id, student_id, full_name, grade_level, class_name
        FROM students
        WHERE class_name = ${className}
        ORDER BY grade_level, student_id
      `;
    } else {
      students = await sql`
        SELECT id, student_id, full_name, grade_level, class_name
        FROM students
        ORDER BY grade_level, class_name, student_id
      `;
    }

    return new Response(JSON.stringify({ success: true, students }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get all students error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/get-all-students' };
