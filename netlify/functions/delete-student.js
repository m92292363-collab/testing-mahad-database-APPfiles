import { neon } from '@neondatabase/serverless';
import {
  getCorsHeaders, handleOptions, jsonResponse, requireAdmin,
  validateStudentId, sanitise
} from './_middleware.js';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  const headers = getCorsHeaders(req);

  if (req.method !== 'DELETE') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  try {
    requireAdmin(req, headers);
  } catch (errResponse) {
    return errResponse;
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400, req);
  }

  const studentId = sanitise(body.studentId);

  if (!validateStudentId(studentId)) {
    return jsonResponse({ error: 'Invalid student ID' }, 400, req);
  }

  try {
    const [student] = await sql`
      SELECT student_id, full_name FROM students WHERE student_id = ${studentId}
    `;
    if (!student) {
      return jsonResponse({ error: `Student ID ${studentId} not found` }, 404, req);
    }

    await sql`DELETE FROM results WHERE student_id = ${studentId}`;
    await sql`DELETE FROM students WHERE student_id = ${studentId}`;

    return jsonResponse({
      success: true,
      message: `Student ${student.full_name} (${studentId}) and all their results deleted successfully`
    }, 200, req);

  } catch (error) {
    console.error('Delete student error:', error);
    return jsonResponse({ error: 'Server error. Please try again.' }, 500, req);
  }
};

export const config = { path: '/api/delete-student' };
