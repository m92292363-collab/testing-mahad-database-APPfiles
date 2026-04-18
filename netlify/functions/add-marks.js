import { neon } from '@neondatabase/serverless';
import {
  getCorsHeaders, handleOptions, jsonResponse, requireAdmin,
  validateStudentId, validateScore, validateGrade,
  validateTerm, validateAcademicYear, sanitise
} from './_middleware.js';

const sql = neon(process.env.DATABASE_URL);

// Allowed subject names — prevents arbitrary strings being stored
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

  if (req.method !== 'POST') {
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
  const subject      = sanitise(body.subject);
  const score        = body.score;
  const grade        = sanitise(body.grade);
  const academicYear = sanitise(body.academicYear);
  const term         = body.term;

  if (!validateStudentId(studentId)) {
    return jsonResponse({ error: 'Invalid student ID' }, 400, req);
  }
  if (!subject || !ALLOWED_SUBJECTS.has(subject)) {
    return jsonResponse({ error: 'Invalid or unrecognised subject' }, 400, req);
  }
  if (!validateScore(score)) {
    return jsonResponse({ error: 'Score must be an integer between 0 and 100' }, 400, req);
  }
  if (!validateGrade(grade)) {
    return jsonResponse({ error: 'Grade must be A, B, C, D, or F' }, 400, req);
  }
  if (!validateAcademicYear(academicYear)) {
    return jsonResponse({ error: 'Academic year must be in format YYYY-YYYY' }, 400, req);
  }
  if (!validateTerm(term)) {
    return jsonResponse({ error: 'Term must be Term 1, Term 2, or Term 3' }, 400, req);
  }

  try {
    const [student] = await sql`
      SELECT student_id FROM students WHERE student_id = ${studentId}
    `;
    if (!student) {
      return jsonResponse({ error: `Student ID ${studentId} not found` }, 404, req);
    }

    const [existing] = await sql`
      SELECT id FROM results
      WHERE student_id = ${studentId}
        AND subject = ${subject}
        AND academic_year = ${academicYear}
        AND term = ${term}
    `;

    if (existing) {
      await sql`
        UPDATE results SET score = ${parseInt(score, 10)}, grade = ${grade}
        WHERE student_id = ${studentId}
          AND subject = ${subject}
          AND academic_year = ${academicYear}
          AND term = ${term}
      `;
    } else {
      await sql`
        INSERT INTO results (student_id, subject, score, grade, academic_year, term)
        VALUES (${studentId}, ${subject}, ${parseInt(score, 10)}, ${grade}, ${academicYear}, ${term})
      `;
    }

    return jsonResponse({ success: true, message: 'Result saved successfully' }, 200, req);

  } catch (error) {
    console.error('Add marks error:', error);
    return jsonResponse({ error: 'Server error. Please try again.' }, 500, req);
  }
};

export const config = { path: '/api/add-marks' };
