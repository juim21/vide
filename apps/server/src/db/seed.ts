import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { resolve } from 'path';
import bcrypt from 'bcrypt';
import * as schema from './schema.js';
import { migrate } from './migrate.js';

// Run migration first
migrate();

const sqlite = new Database(resolve(process.cwd(), 'data/vide.db'));
sqlite.pragma('journal_keys = ON');
const db = drizzle(sqlite, { schema });

async function seed() {
  console.log('Seeding database...');

  const password = await bcrypt.hash('password123', 10);

  // Create users
  const users = [
    { username: 'alice', email: 'alice@vide.com', passwordHash: password, displayName: 'Alice', bio: '영상 크리에이터' },
    { username: 'bob', email: 'bob@vide.com', passwordHash: password, displayName: 'Bob', bio: '일상 브이로그' },
    { username: 'charlie', email: 'charlie@vide.com', passwordHash: password, displayName: 'Charlie', bio: '요리 & 맛집' },
    { username: 'diana', email: 'diana@vide.com', passwordHash: password, displayName: 'Diana', bio: '여행 기록' },
    { username: 'evan', email: 'evan@vide.com', passwordHash: password, displayName: 'Evan', bio: '코딩 튜토리얼' },
  ];

  const insertedUsers: { id: number; username: string }[] = [];
  for (const user of users) {
    try {
      const result = db.insert(schema.users).values(user).returning({ id: schema.users.id, username: schema.users.username }).get();
      insertedUsers.push(result);
      console.log(`  Created user: @${result.username} (id: ${result.id})`);
    } catch {
      console.log(`  User @${user.username} already exists, skipping`);
    }
  }

  if (insertedUsers.length === 0) {
    console.log('No new users created. Database may already be seeded.');
    sqlite.close();
    return;
  }

  // Create follows (everyone follows alice)
  for (const user of insertedUsers.slice(1)) {
    db.insert(schema.follows).values({ followerId: user.id, followingId: insertedUsers[0].id }).run();
  }
  // Alice follows bob and charlie
  db.insert(schema.follows).values({ followerId: insertedUsers[0].id, followingId: insertedUsers[1].id }).run();
  db.insert(schema.follows).values({ followerId: insertedUsers[0].id, followingId: insertedUsers[2].id }).run();
  console.log('  Created follow relationships');

  console.log('\nSeed complete!');
  console.log('\nTest accounts (all passwords: password123):');
  for (const user of users) {
    console.log(`  ${user.email} / password123`);
  }

  sqlite.close();
}

seed().catch(console.error);
