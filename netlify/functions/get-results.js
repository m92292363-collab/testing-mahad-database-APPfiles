import { neon } from '@neondatabase/serverless';
import {
  getCorsHeaders, handleOptions, jsonResponse,
  requireStudent, validateStudentId
} from './_middleware.js';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  const headers = getCorsHeaders(req);

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  // Verify student JWT — this is what binds the request to the correct student
  let tokenPayload;
  try {
    tokenPayload = requireStudent(req, headers);
  } catch (errResponse) {
    return errResponse;
  }

  // The student ID comes from the VERIFIED TOKEN, not from the URL.
  // This prevents students from reading each other's results.
  const studentId = tokenPayload.studentId;

  if (!validateStudentId(studentId)) {
    return jsonResponse({ error: 'Invalid student ID in token' }, 400, req);
  }

  try {
    const results = await sql`
      SELECT r.subject, r.score, r.grade, r.academic_year, r.term,
             s.full_name, s.grade_level, s.class_name
      FROM results r
      JOIN students s ON r.student_id = s.student_id
      WHERE r.student_id = ${studentId}
      ORDER BY r.academic_year DESC, r.term, r.subject
    `;

    return jsonResponse({ success: true, results }, 200, req);

  } catch (error) {
    console.error('Get results error:', error);
    return jsonResponse({ error: 'Server error. Please try again.' }, 500, req);
  }
};

export const config = { path: '/api/get-results' };
