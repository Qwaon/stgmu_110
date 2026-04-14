// ─── PS Club — Supabase Setup Script ────────────────────────────────────────
// Runs migrations, creates auth users, inserts clubs/rooms/profiles, enables Realtime
// Usage: node scripts/setup.mjs

import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dir = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://bwhvymzozpwigbuuuzeg.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3aHZ5bXpvenB3aWdidXV1emVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE5MjU4OSwiZXhwIjoyMDkxNzY4NTg5fQ.pRgr4t-qtmrNtJ0VtxpJZ2o6WzlOB7gO9r4C8wraNRQ'
const DB_PASS      = 'bHa6QcCA5RS4YZSM'
const USER_PASS    = 'sonicstv0709'
const DB_HOST      = 'db.bwhvymzozpwigbuuuzeg.supabase.co'

const CLUB_1 = 'aaaabbbb-0000-0000-0000-000000000001'
const CLUB_2 = 'aaaabbbb-0000-0000-0000-000000000002'

// ─── PostgreSQL client ────────────────────────────────────────────────────────
const pool = new pg.Pool({
  host:     DB_HOST,
  port:     5432,
  database: 'postgres',
  user:     'postgres',
  password: DB_PASS,
  ssl:      { rejectUnauthorized: false },
})

async function sql(query) {
  const client = await pool.connect()
  try {
    return await client.query(query)
  } finally {
    client.release()
  }
}

// ─── HTTPS helper ─────────────────────────────────────────────────────────────
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const req = https.request({
      hostname: 'bwhvymzozpwigbuuuzeg.supabase.co',
      path,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey':        SERVICE_KEY,
        'Prefer':        'resolution=merge-duplicates,return=representation',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let buf = ''
      res.on('data', c => buf += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }) }
        catch { resolve({ status: res.statusCode, body: buf }) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function createAuthUser(email, password) {
  const r = await request('POST', '/auth/v1/admin/users', {
    email,
    password,
    email_confirm: true,
  })
  if (r.status === 200 || r.status === 201) return r.body.id
  if (r.body?.msg?.includes('already') || r.body?.code === 'email_exists') {
    // Already exists — fetch their ID
    const list = await request('GET', `/auth/v1/admin/users?page=1&per_page=50`, null)
    const user = list.body.users?.find(u => u.email === email)
    if (user) return user.id
  }
  throw new Error(`Auth error for ${email}: ${JSON.stringify(r.body)}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 PS Club — Supabase Setup\n')

  // ── 1. Migrations ────────────────────────────────────────────────────────────
  console.log('📦 Running migrations...')

  const migrations = ['0001_schema.sql', '0002_rls.sql', '0004_menu.sql']
  for (const file of migrations) {
    const content = readFileSync(resolve(__dir, '../supabase/migrations', file), 'utf8')
    try {
      await sql(content)
      console.log(`  ✅ ${file}`)
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log(`  ⚠️  ${file} — already applied`)
      } else {
        throw new Error(`${file}: ${e.message}`)
      }
    }
  }

  // ── 2. Clubs ─────────────────────────────────────────────────────────────────
  console.log('\n🏢 Inserting clubs...')
  await sql(`
    INSERT INTO clubs (id, name, address, hourly_rate) VALUES
      ('${CLUB_1}', 'Sonic — Морозова', 'ул. Морозова', 500),
      ('${CLUB_2}', 'Sonic — Толстого', 'ул. Толстого', 500)
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, address = EXCLUDED.address;
  `)
  console.log('  ✅ Sonic — Морозова')
  console.log('  ✅ Sonic — Толстого')

  // ── 3. Rooms ─────────────────────────────────────────────────────────────────
  console.log('\n🎮 Inserting rooms...')
  await sql(`
    INSERT INTO rooms (club_id, name, type) VALUES
      ('${CLUB_1}', 'Room 1', 'standard'),
      ('${CLUB_1}', 'Room 2', 'standard'),
      ('${CLUB_1}', 'Room 3', 'standard'),
      ('${CLUB_1}', 'VIP',    'vip'),
      ('${CLUB_1}', 'Room 5', 'standard'),
      ('${CLUB_2}', 'Room 1', 'standard'),
      ('${CLUB_2}', 'Room 2', 'standard'),
      ('${CLUB_2}', 'VIP',    'vip'),
      ('${CLUB_2}', 'Room 4', 'standard')
    ON CONFLICT DO NOTHING;
  `)
  console.log('  ✅ 5 комнат — Морозова')
  console.log('  ✅ 4 комнаты — Толстого')

  // ── 4. Auth users + profiles ─────────────────────────────────────────────────
  console.log('\n👤 Creating users...')
  const usersData = [
    { email: 'owner@sonic.kz',    role: 'owner', club_id: null   },
    { email: 'morozova@sonic.kz', role: 'admin', club_id: CLUB_1 },
    { email: 'tolstogo@sonic.kz', role: 'admin', club_id: CLUB_2 },
  ]

  for (const u of usersData) {
    const uid = await createAuthUser(u.email, USER_PASS)
    const clubVal = u.club_id ? `'${u.club_id}'` : 'null'
    await sql(`
      INSERT INTO users (id, email, role, club_id)
      VALUES ('${uid}', '${u.email}', '${u.role}', ${clubVal})
      ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, club_id = EXCLUDED.club_id;
    `)
    const tag = u.role === 'owner' ? '👑 owner' : `🔑 admin (${u.club_id === CLUB_1 ? 'Морозова' : 'Толстого'})`
    console.log(`  ✅ ${u.email}  [${tag}]`)
  }

  // ── 5. Realtime ───────────────────────────────────────────────────────────────
  console.log('\n⚡ Enabling Realtime for rooms + sessions...')
  await sql(`ALTER TABLE rooms    REPLICA IDENTITY FULL;`)
  await sql(`ALTER TABLE sessions REPLICA IDENTITY FULL;`)
  await sql(`
    DO $$ BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE rooms, sessions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)
  console.log('  ✅ rooms — Realtime on')
  console.log('  ✅ sessions — Realtime on')

  await pool.end()

  console.log('\n✅ Setup complete! Всё готово.\n')
  console.log('┌─────────────────────────────────────────────┐')
  console.log('│  Логины                                     │')
  console.log('│  👑 owner@sonic.kz      — владелец          │')
  console.log('│  🔑 morozova@sonic.kz   — admin Морозова    │')
  console.log('│  🔑 tolstogo@sonic.kz   — admin Толстого    │')
  console.log(`│  🔒 Пароль: ${USER_PASS}                │`)
  console.log('└─────────────────────────────────────────────┘\n')
}

main().catch(async e => {
  console.error('\n❌ Error:', e.message)
  await pool.end()
  process.exit(1)
})
