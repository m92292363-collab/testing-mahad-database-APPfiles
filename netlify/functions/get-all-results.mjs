import { neon } from '@netlify/neon';
const sql = neon();

export default async (req) => {
  try {
    const url = new URL(req.url);
    const gradeLevel = url.searchParams.get('gradeLevel');
    const className = url.searchParams.get('className');
    const academicYear = url.searchParams.get('academicYear');
    const term = url.searchParams.get('term');

    // Build dynamic conditions
    const conditions = [];
    const params = [];

    if (gradeLevel) { conditions.push(`s.grade_level = ${parseInt(gradeLevel)}`); }
    if (className) { conditions.push(`s.class_name = '${className}'`); }
    if (academicYear) { conditions.push(`r.academic_year = '${academicYear}'`); }
    if (term) { conditions.push(`r.term = '${term}'`); }

    let results;

    if (gradeLevel && className && academicYear && term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r
        JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${parseInt(gradeLevel)} AND s.class_name = ${className}
          AND r.academic_year = ${academicYear} AND r.term = ${term}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject
      `;
    } else if (gradeLevel && className && academicYear) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r
        JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${parseInt(gradeLevel)} AND s.class_name = ${className}
          AND r.academic_year = ${academicYear}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject
      `;
    } else if (gradeLevel && className && term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r
        JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${parseInt(gradeLevel)} AND s.class_name = ${className}
          AND r.term = ${term}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject
      `;
    } else if (gradeLevel && className) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r
        JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${parseInt(gradeLevel)} AND s.class_name = ${className}
        ORDER BY s.student_id, r.subject
      `;
    } else if (gradeLevel && academicYear && term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r
        JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${parseInt(gradeLevel)}
          AND r.academic_year = ${academicYear} AND r.term = ${term}
        ORDER BY s.class_name, s.student_id, r.subject
      `;
    } else if (gradeLevel && academicYear) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r
        JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${parseInt(gradeLevel)} AND r.academic_year = ${academicYear}
        ORDER BY s.class_name, s.student_id, r.subject
      `;
    } else if (gradeLevel && term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r
        JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${parseInt(gradeLevel)} AND r.term = ${term}
        ORDER BY s.class_name, s.student_id, r.subject
      `;
    } else if (gradeLevel) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r
        JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${parseInt(gradeLevel)}
        ORDER BY s.class_name, s.student_id, r.subject
      `;
    } else if (academicYear && term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r
        JOIN students s ON r.student_id = s.student_id
        WHERE r.academic_year = ${academicYear} AND r.term = ${term}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject
      `;
    } else if (academicYear) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r
        JOIN students s ON r.student_id = s.student_id
        WHERE r.academic_year = ${academicYear}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject
      `;
    } else if (term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r
        JOIN students s ON r.student_id = s.student_id
        WHERE r.term = ${term}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject
      `;
    } else {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r
        JOIN students s ON r.student_id = s.student_id
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject
      `;
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get all results error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/get-all-results' };
