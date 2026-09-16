import bcrypt from 'bcrypt';
import { eq, sql } from 'drizzle-orm';
import type { Database } from './index.js';
import { skills, users } from '../schemas/index.js';
import { skillData } from './skill-data.js';
import { emailSchema, passwordSchema } from '../validators/auth.js';

export async function seedDatabase(db: Database, adminEmail?: string, adminPassword?: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(8160201)`);
    await tx.insert(skills).values(skillData).onConflictDoNothing({ target: skills.slug });
    if (!adminEmail || !adminPassword)
      return 'skipped: ADMIN_EMAIL and ADMIN_PASSWORD are both required';
    const email = emailSchema.parse(adminEmail);
    const password = passwordSchema.parse(adminPassword);
    const [existing] = await tx
      .select({ role: users.role })
      .from(users)
      .where(eq(users.email, email));
    if (existing) {
      if (existing.role !== 'ADMIN') throw new Error('Admin email belongs to a non-admin account');
      return 'already exists; password unchanged';
    }
    const [admin] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'ADMIN'))
      .limit(1);
    if (admin) return 'skipped: an admin already exists';
    await tx.insert(users).values({
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    });
    return 'created';
  });
}
