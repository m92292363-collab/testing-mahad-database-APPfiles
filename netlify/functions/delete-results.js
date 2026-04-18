import { neon } from '@neondatabase/serverless';
import {
  getCorsHeaders, handleOptions, jsonResponse, requireAdmin,
  validateStudentId, validateTerm, validateAcademicYear, sanitise
} from './_middleware.js';

const sql = neon(process.env.DATABASE_URL);

const ALLOWED_SUBJECTS = new Set([
  'القرآن الكريم', 'القراءة المجودة', 'التفسير', 'أصول التفسير',
  'الحديث', 'أصول الحديث', 'التوحيد', 'الفقه', 'الفرائض',
  'النحو', 'البلاغة', 'الأدب', 'المطالعة', 'الإنشاء',
  'التاريخ', 'علم النفس', 'الجغرافيا', 'التربية',
  'English Language', 'الإنسانية', 'العلوم', 'اللغة',
]);

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

  const studentId    = sanitise(body.studentId);
  const subject      = body.subject ? sanitise(body.subject) : null;
  const academicYear = body.academicYear ? sanitise(body.academicYear) : null;
  const term         = body.term || null;

  if (!validateStudentId(studentId)) {
    return jsonResponse({ error: 'Invalid student ID' }, 400, req);
  }
  if (subject && !ALLOWED_SUBJECTS.has(subject)) {
    return jsonResponse({ error: 'Invalid subject' }, 400, req);
  }
  if (subject && (!academicYear || !validateAcademicYear(academicYear))) {
    return jsonResponse({ error: 'Academic year is required when deleting a specific subject (format YYYY-YYYY)' }, 400, req);
  }
  if (subject && (!term || !validateTerm(term))) {
    return jsonResponse({ error: 'Term is required when deleting a specific subject' }, 400, req);
  }

  try {
    const [student] = await sql`SELECT student_id FROM students WHERE student_id = ${studentId}`;
    if (!student) {
      return jsonResponse({ error: `Student ID ${studentId} not found` }, 404, req);
    }

    if (subject && academicYear && term) {
      await sql`
        DELETE FROM results
        WHERE student_id = ${studentId}
          AND subject = ${subject}
          AND academic_year = ${academicYear}
          AND term = ${term}
      `;
    } else {
      await sql`DELETE FROM results WHERE student_id = ${studentId}`;
    }

    return jsonResponse({ success: true, message: 'Results deleted successfully' }, 200, req);

  } catch (error) {
    console.error('Delete results error:', error);
    return jsonResponse({ error: 'Server error. Please try again.' }, 500, req);
  }
};

export const config = { path: '/api/delete-results' };
