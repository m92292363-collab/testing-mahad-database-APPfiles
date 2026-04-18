import { neon } from '@neondatabase/serverless';
import {
  getCorsHeaders, handleOptions, jsonResponse, requireAdmin
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
    const gradeLevel = url.searchParams.get('gradeLevel');
    const className  = url.searchParams.get('className');

    // Build query safely — only allow known valid values
    const allowedGrades = ['10', '11', '12'];
    const allowedClasses = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

    const safeGrade = allowedGrades.includes(gradeLevel) ? parseInt(gradeLevel, 10) : null;
    const safeClass = allowedClasses.includes(className) ? className : null;

    let students;
    if (safeGrade && safeClass) {
      students = await sql`
        SELECT id, student_id, full_name, grade_level, class_name,
               date_of_birth, guardian_name, guardian_phone, student_phone, address
        FROM students
        WHERE grade_level = ${safeGrade} AND class_name = ${safeClass}
        ORDER BY grade_level, class_name, student_id
      `;
    } else if (safeGrade) {
      students = await sql`
        SELECT id, student_id, full_name, grade_level, class_name,
               date_of_birth, guardian_name, guardian_phone, student_phone, address
        FROM students
        WHERE grade_level = ${safeGrade}
        ORDER BY class_name, student_id
      `;
    } else if (safeClass) {
      students = await sql`
        SELECT id, student_id, full_name, grade_level, class_name,
               date_of_birth, guardian_name, guardian_phone, student_phone, address
        FROM students
        WHERE class_name = ${safeClass}
        ORDER BY grade_level, student_id
      `;
    } else {
      students = await sql`
        SELECT id, student_id, full_name, grade_level, class_name,
               date_of_birth, guardian_name, guardian_phone, student_phone, address
        FROM students
        ORDER BY grade_level, class_name, student_id
      `;
    }

    return jsonResponse({ success: true, students }, 200, req);

  } catch (error) {
    console.error('Get all students error:', error);
    return jsonResponse({ error: 'Server error. Please try again.' }, 500, req);
  }
};

export const config = { path: '/api/get-all-students' };
