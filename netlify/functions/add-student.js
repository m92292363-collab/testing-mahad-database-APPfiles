import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import {
  getCorsHeaders, handleOptions, jsonResponse, requireAdmin,
  validateStudentId, validateName, validatePassword,
  validateGradeLevel, validateClassName, sanitise
} from './_middleware.js';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  const headers = getCorsHeaders(req);

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  // Require valid admin JWT
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
  const fullName    = sanitise(body.fullName);
  const password    = body.password;
  const gradeLevel  = body.gradeLevel;
  const className   = body.className;
  const dateOfBirth = body.dateOfBirth || null;
  const guardianName  = sanitise(body.guardianName)  || null;
  const guardianPhone = sanitise(body.guardianPhone) || null;
  const studentPhone  = sanitise(body.studentPhone)  || null;
  const address       = sanitise(body.address)       || null;

  // Validate required fields
  if (!validateStudentId(studentId)) {
    return jsonResponse({ error: 'Invalid student ID (2-30 alphanumeric chars, hyphens, underscores)' }, 400, req);
  }
  if (!validateName(fullName)) {
    return jsonResponse({ error: 'Full name must be 2-120 characters' }, 400, req);
  }
  if (!validatePassword(password)) {
    return jsonResponse({ error: 'Password must be 4-200 characters' }, 400, req);
  }
  if (!validateGradeLevel(gradeLevel)) {
    return jsonResponse({ error: 'Grade level must be 10, 11, or 12' }, 400, req);
  }
  if (!validateClassName(className)) {
    return jsonResponse({ error: 'Invalid class name' }, 400, req);
  }
  // Validate optional fields
  if (guardianPhone && guardianPhone.length > 30) {
    return jsonResponse({ error: 'Guardian phone too long' }, 400, req);
  }
  if (studentPhone && studentPhone.length > 30) {
    return jsonResponse({ error: 'Student phone too long' }, 400, req);
  }
  if (address && address.length > 200) {
    return jsonResponse({ error: 'Address too long (max 200 chars)' }, 400, req);
  }

  try {
    const [existing] = await sql`
      SELECT student_id FROM students WHERE student_id = ${studentId}
    `;
    if (existing) {
      return jsonResponse({ error: 'Student ID already exists' }, 409, req);
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 12);

    await sql`
      INSERT INTO students (
        student_id, full_name, password, grade_level, class_name,
        date_of_birth, guardian_name, guardian_phone, student_phone, address
      ) VALUES (
        ${studentId}, ${fullName}, ${hashedPassword}, ${parseInt(gradeLevel, 10)},
        ${className}, ${dateOfBirth}, ${guardianName}, ${guardianPhone},
        ${studentPhone}, ${address}
      )
    `;

    return jsonResponse({ success: true, message: `Student ${fullName} added successfully` }, 200, req);

  } catch (error) {
    console.error('Add student error:', error);
    return jsonResponse({ error: 'Server error. Please try again.' }, 500, req);
  }
};

export const config = { path: '/api/add-student' };
