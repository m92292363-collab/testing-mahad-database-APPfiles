import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  // Admin key check
  if (req.headers.get('x-admin-key') !== process.env.ADMIN_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  try {
    const url = new URL(req.url);
    const gradeLevel = url.searchParams.get('gradeLevel');
    const className = url.searchParams.get('className');
    const academicYear = url.searchParams.get('academicYear');
    const term = url.searchParams.get('term');

    // Input length validation
    if (className && className.length > 10) return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers });
    if (academicYear && academicYear.length > 20) return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers });
    if (term && term.length > 20) return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers });

    const grade = gradeLevel ? parseInt(gradeLevel) : null;
    if (gradeLevel && isNaN(grade)) return new Response(JSON.stringify({ error: 'Invalid grade' }), { status: 400, headers });

    let results;

    if (grade && className && academicYear && term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${grade} AND s.class_name = ${className}
          AND r.academic_year = ${academicYear} AND r.term = ${term}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (grade && className && academicYear) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${grade} AND s.class_name = ${className}
          AND r.academic_year = ${academicYear}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (grade && className && term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${grade} AND s.class_name = ${className}
          AND r.term = ${term}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (grade && academicYear && term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${grade} AND r.academic_year = ${academicYear}
          AND r.term = ${term}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (className && academicYear && term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE s.class_name = ${className} AND r.academic_year = ${academicYear}
          AND r.term = ${term}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (grade && className) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${grade} AND s.class_name = ${className}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (grade && academicYear) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${grade} AND r.academic_year = ${academicYear}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (grade && term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${grade} AND r.term = ${term}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (className && academicYear) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE s.class_name = ${className} AND r.academic_year = ${academicYear}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (academicYear && term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE r.academic_year = ${academicYear} AND r.term = ${term}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (grade) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE s.grade_level = ${grade}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (className) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE s.class_name = ${className}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (academicYear) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE r.academic_year = ${academicYear}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else if (term) {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        WHERE r.term = ${term}
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    } else {
      results = await sql`
        SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
               s.student_id, s.full_name, s.grade_level, s.class_name
        FROM results r JOIN students s ON r.student_id = s.student_id
        ORDER BY s.grade_level, s.class_name, s.student_id, r.subject`;
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers });
  } catch (error) {
    console.error('Get all results error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), { status: 500, headers });
  }
};

export const config = { path: '/api/get-all-results' };
