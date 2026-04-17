import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'PUT') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  if (req.headers.get('x-admin-key') !== process.env.ADMIN_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  try {
    const { studentId, fullName, gradeLevel, className, dateOfBirth, guardianName, guardianPhone, studentPhone, address } = await req.json();

    if (!studentId || studentId.length > 20) return new Response(JSON.stringify({ error: 'Student ID is required' }), { status: 400, headers });

    const [student] = await sql`SELECT student_id FROM students WHERE student_id = ${studentId}`;
    if (!student) return new Response(JSON.stringify({ error: `Student ID ${studentId} not found` }), { status: 404, headers });

    // Build update using only tagged template branches
    const hasFullName = fullName !== undefined && fullName !== '';
    const hasGrade = gradeLevel !== undefined && gradeLevel !== '';
    const hasClass = className !== undefined && className !== '';
    const hasDob = dateOfBirth !== undefined && dateOfBirth !== '';
    const hasGuardianName = guardianName !== undefined && guardianName !== '';
    const hasGuardianPhone = guardianPhone !== undefined && guardianPhone !== '';
    const hasStudentPhone = studentPhone !== undefined && studentPhone !== '';
    const hasAddress = address !== undefined && address !== '';

    if (!hasFullName && !hasGrade && !hasClass && !hasDob && !hasGuardianName && !hasGuardianPhone && !hasStudentPhone && !hasAddress) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400, headers });
    }

    // Update each field individually using safe tagged templates
    if (hasFullName) await sql`UPDATE students SET full_name = ${fullName} WHERE student_id = ${studentId}`;
    if (hasGrade) await sql`UPDATE students SET grade_level = ${parseInt(gradeLevel)} WHERE student_id = ${studentId}`;
    if (hasClass) await sql`UPDATE students SET class_name = ${className} WHERE student_id = ${studentId}`;
    if (hasDob) await sql`UPDATE students SET date_of_birth = ${dateOfBirth} WHERE student_id = ${studentId}`;
    if (hasGuardianName) await sql`UPDATE students SET guardian_name = ${guardianName} WHERE student_id = ${studentId}`;
    if (hasGuardianPhone) await sql`UPDATE students SET guardian_phone = ${guardianPhone} WHERE student_id = ${studentId}`;
    if (hasStudentPhone) await sql`UPDATE students SET student_phone = ${studentPhone} WHERE student_id = ${studentId}`;
    if (hasAddress) await sql`UPDATE students SET address = ${address} WHERE student_id = ${studentId}`;

    return new Response(JSON.stringify({ success: true, message: 'Student updated successfully' }), { status: 200, headers });
  } catch (error) {
    console.error('Update student error:', error);
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), { status: 500, headers });
  }
};

export const config = { path: '/api/update-student' };
