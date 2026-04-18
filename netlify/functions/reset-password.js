import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import {
  getCorsHeaders, handleOptions, jsonResponse, requireAdmin,
  validateStudentId, validatePassword, sanitise
} from './_middleware.js';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  const headers = getCorsHeaders(req);

  if (req.method !== 'PUT') {
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

  const studentId   = sanitise(body.studentId);
  const newPassword = body.newPassword;

  if (!validateStudentId(studentId)) {
    return jsonResponse({ error: 'Invalid student ID' }, 400, req);
  }
  if (!validatePassword(newPassword)) {
    return jsonResponse({ error: 'Password must be 4-200 characters' }, 400, req);
  }

  try {
    const [student] = await sql`SELECT student_id FROM students WHERE student_id = ${studentId}`;
    if (!student) {
      return jsonResponse({ error: `Student ID ${studentId} not found` }, 404, req);
    }

    // Hash the new password before storing
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await sql`UPDATE students SET password = ${hashedPassword} WHERE student_id = ${studentId}`;

    return jsonResponse({ success: true, message: `Password reset successfully for ${studentId}` }, 200, req);

  } catch (error) {
    console.error('Reset password error:', error);
    return jsonResponse({ error: 'Server error. Please try again.' }, 500, req);
  }
};

export const config = { path: '/api/reset-password' };
