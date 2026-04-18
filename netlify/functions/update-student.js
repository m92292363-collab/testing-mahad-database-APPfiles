import { neon } from '@neondatabase/serverless';
import {
  getCorsHeaders, handleOptions, jsonResponse, requireAdmin,
  validateStudentId, validateName, validateGradeLevel, validateClassName, sanitise
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

  const studentId  = sanitise(body.studentId);
  const fullName   = body.fullName  ? sanitise(body.fullName)  : undefined;
  const gradeLevel = body.gradeLevel !== undefined ? body.gradeLevel : undefined;
  const className  = body.className ? body.className : undefined;

  if (!validateStudentId(studentId)) {
    return jsonResponse({ error: 'Invalid student ID' }, 400, req);
  }
  if (fullName !== undefined && !validateName(fullName)) {
    return jsonResponse({ error: 'Full name must be 2-120 characters' }, 400, req);
  }
  if (gradeLevel !== undefined && gradeLevel !== '' && !validateGradeLevel(gradeLevel)) {
    return jsonResponse({ error: 'Grade level must be 10, 11, or 12' }, 400, req);
  }
  if (className !== undefined && className !== '' && !validateClassName(className)) {
    return jsonResponse({ error: 'Invalid class name' }, 400, req);
  }

  const updates = [];
  const params = [];
  let idx = 1;

  if (fullName)   { updates.push(`full_name = $${idx++}`);   params.push(fullName); }
  if (gradeLevel) { updates.push(`grade_level = $${idx++}`); params.push(parseInt(gradeLevel, 10)); }
  if (className)  { updates.push(`class_name = $${idx++}`);  params.push(className); }

  if (updates.length === 0) {
    return jsonResponse({ error: 'No valid fields to update' }, 400, req);
  }

  params.push(studentId);

  try {
    const [student] = await sql`SELECT student_id FROM students WHERE student_id = ${studentId}`;
    if (!student) {
      return jsonResponse({ error: `Student ID ${studentId} not found` }, 404, req);
    }

    await sql(`UPDATE students SET ${updates.join(', ')} WHERE student_id = $${idx}`, params);

    return jsonResponse({ success: true, message: 'Student updated successfully' }, 200, req);

  } catch (error) {
    console.error('Update student error:', error);
    return jsonResponse({ error: 'Server error. Please try again.' }, 500, req);
  }
};

export const config = { path: '/api/update-student' };
