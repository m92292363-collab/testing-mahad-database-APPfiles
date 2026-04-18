// migrate-passwords.js
// Run ONCE to hash all existing plain-text passwords in the database.
// Usage: node migrate-passwords.js
// Requires: DATABASE_URL env var set (same as your Netlify env)

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);
const SALT_ROUNDS = 12;

async function migrate() {
  console.log('Starting password migration...');

  // Fetch all students with plain-text passwords
  // We detect plain text by checking if the stored value does NOT start with '$2'
  // (bcrypt hashes always start with $2a$ or $2b$)
  const students = await sql`
    SELECT student_id, password FROM students
    WHERE password NOT LIKE '$2%'
  `;

  console.log(`Found ${students.length} students with plain-text passwords.`);

  let done = 0;
  for (const student of students) {
    const hash = await bcrypt.hash(student.password, SALT_ROUNDS);
    await sql`
      UPDATE students SET password = ${hash}
      WHERE student_id = ${student.student_id}
    `;
    done++;
    if (done % 10 === 0) console.log(`  ${done}/${students.length} done...`);
  }

  // Migrate admin passwords too
  const admins = await sql`
    SELECT id, password FROM admin
    WHERE password NOT LIKE '$2%'
  `;
  console.log(`Found ${admins.length} admin(s) with plain-text passwords.`);
  for (const admin of admins) {
    const hash = await bcrypt.hash(admin.password, SALT_ROUNDS);
    await sql`UPDATE admin SET password = ${hash} WHERE id = ${admin.id}`;
  }

  console.log('Migration complete.');
  console.log(`  Students migrated: ${students.length}`);
  console.log(`  Admins migrated:   ${admins.length}`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
