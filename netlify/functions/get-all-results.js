import { neon } from '@neondatabase/serverless';
import {
  getCorsHeaders, handleOptions, jsonResponse, requireAdmin,
  validateAcademicYear, validateTerm
} from './_middleware.js';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  const headers = getCorsHeaders(req);

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  try {
    requireAdmin(req, headers);
  } catch (errResponse) {
    return errResponse;
  }

  try {
    const url = new URL(req.url);
    const rawGrade = url.searchParams.get('gradeLevel');
    const rawClass = url.searchParams.get('className');
    const rawYear  = url.searchParams.get('academicYear');
    const rawTerm  = url.searchParams.get('term');

    // Whitelist all query parameters
    const allowedGrades   = ['10', '11', '12'];
    const allowedClasses  = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
    const allowedTerms    = ['Term 1', 'Term 2', 'Term 3'];

    const gradeLevel  = allowedGrades.includes(rawGrade)  ? parseInt(rawGrade, 10) : null;
    const className   = allowedClasses.includes(rawClass) ? rawClass : null;
    const academicYear = rawYear && validateAcademicYear(rawYear) ? rawYear.trim() : null;
    const term        = allowedTerms.includes(rawTerm) ? rawTerm : null;

    // Build query with parameterised conditions
    const conditions = [];
    const params = [];
    let i = 1;

    if (gradeLevel)   { conditions.push(`s.grade_level = $${i++}`);   params.push(gradeLevel); }
    if (className)    { conditions.push(`s.class_name = $${i++}`);    params.push(className); }
    if (academicYear) { conditions.push(`r.academic_year = $${i++}`); params.push(academicYear); }
    if (term)         { conditions.push(`r.term = $${i++}`);          params.push(term); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
             s.student_id, s.full_name, s.grade_level, s.class_name
      FROM results r
      JOIN students s ON r.student_id = s.student_id
      ${where}
      ORDER BY s.grade_level, s.class_name, s.student_id, r.subject
    `;

    const results = await sql(query, params);
    return jsonResponse({ success: true, results }, 200, req);

  } catch (error) {
    console.error('Get all results error:', error);
    return jsonResponse({ error: 'Server error. Please try again.' }, 500, req);
  }
};

export const config = { path: '/api/get-all-results' };
