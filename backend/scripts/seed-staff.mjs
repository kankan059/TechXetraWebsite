import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const sqlOutputPath = path.join(__dirname, 'seed-staff-users.sql')

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return `pbkdf2:sha256:100000:${saltHex}:${hashHex}`
}

async function run() {
  console.log('Generating password hashes for seed staff users...')

  const adminHash = await hashPassword('Admin@1234')
  const leadHash = await hashPassword('Lead@1234')
  const volHash = await hashPassword('Volunteer@1234')

  const now = Date.now()

  const sql = `-- Seed Script: Staff and Admin Users for TechXetra
-- Roles: 1 SUPER_ADMIN, 2 LEADs, 4 VOLUNTEERs
-- Pre-configured with secure PBKDF2 password hashes for email/password login.
--
-- Credentials:
-- 1. Super Admin: admin@techxetra.in / Admin@1234
-- 2. Lead 1:      lead1@techxetra.in / Lead@1234
-- 3. Lead 2:      lead2@techxetra.in / Lead@1234
-- 4. Volunteer 1: vol1@techxetra.in  / Volunteer@1234
-- 5. Volunteer 2: vol2@techxetra.in  / Volunteer@1234
-- 6. Volunteer 3: vol3@techxetra.in  / Volunteer@1234
-- 7. Volunteer 4: vol4@techxetra.in  / Volunteer@1234

INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  can_review_payments,
  is_student,
  institution_name,
  institution_id,
  student_fields_locked,
  is_active,
  profile_completed_at,
  created_at,
  updated_at
) VALUES
  -- 1 Super Admin
  (
    '00000000-0000-4000-9000-000000000001',
    'admin@techxetra.in',
    '${adminHash}',
    'Super Admin',
    'SUPER_ADMIN',
    1,
    0,
    'Tezpur University',
    NULL,
    1,
    1,
    ${now},
    ${now},
    ${now}
  ),

  -- 2 Leads
  (
    '00000000-0000-4000-9000-000000000011',
    'lead1@techxetra.in',
    '${leadHash}',
    'Lead Alpha',
    'LEAD',
    1,
    1,
    'Tezpur University',
    'TU-LEAD-01',
    1,
    1,
    ${now},
    ${now},
    ${now}
  ),
  (
    '00000000-0000-4000-9000-000000000012',
    'lead2@techxetra.in',
    '${leadHash}',
    'Lead Beta',
    'LEAD',
    1,
    1,
    'Tezpur University',
    'TU-LEAD-02',
    1,
    1,
    ${now},
    ${now},
    ${now}
  ),

  -- 4 Volunteers
  (
    '00000000-0000-4000-9000-000000000021',
    'vol1@techxetra.in',
    '${volHash}',
    'Volunteer One',
    'VOLUNTEER',
    0,
    1,
    'Tezpur University',
    'TU-VOL-01',
    1,
    1,
    ${now},
    ${now},
    ${now}
  ),
  (
    '00000000-0000-4000-9000-000000000022',
    'vol2@techxetra.in',
    '${volHash}',
    'Volunteer Two',
    'VOLUNTEER',
    0,
    1,
    'Tezpur University',
    'TU-VOL-02',
    1,
    1,
    ${now},
    ${now},
    ${now}
  ),
  (
    '00000000-0000-4000-9000-000000000023',
    'vol3@techxetra.in',
    '${volHash}',
    'Volunteer Three',
    'VOLUNTEER',
    0,
    1,
    'Tezpur University',
    'TU-VOL-03',
    1,
    1,
    ${now},
    ${now},
    ${now}
  ),
  (
    '00000000-0000-4000-9000-000000000024',
    'vol4@techxetra.in',
    '${volHash}',
    'Volunteer Four',
    'VOLUNTEER',
    0,
    1,
    'Tezpur University',
    'TU-VOL-04',
    1,
    1,
    ${now},
    ${now},
    ${now}
  )
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  password_hash = excluded.password_hash,
  role = excluded.role,
  can_review_payments = excluded.can_review_payments,
  is_active = 1,
  updated_at = ${now};
`

  fs.writeFileSync(sqlOutputPath, sql, 'utf8')
  console.log(`Successfully generated: ${sqlOutputPath}`)
  console.log('Seeded Users & Passwords:')
  console.log('  - admin@techxetra.in / Admin@1234 (SUPER_ADMIN)')
  console.log('  - lead1@techxetra.in / Lead@1234 (LEAD)')
  console.log('  - lead2@techxetra.in / Lead@1234 (LEAD)')
  console.log('  - vol1@techxetra.in  / Volunteer@1234 (VOLUNTEER)')
  console.log('  - vol2@techxetra.in  / Volunteer@1234 (VOLUNTEER)')
  console.log('  - vol3@techxetra.in  / Volunteer@1234 (VOLUNTEER)')
  console.log('  - vol4@techxetra.in  / Volunteer@1234 (VOLUNTEER)')
}

run()
