-- Seed Script: Staff and Admin Users for TechXetra
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
    'pbkdf2:sha256:100000:14a60549d80c29b1c78dabe1d809b11c:92769eb6b632ec40730df3725ca6f8c56f56188c033f34eaac2f8ac55101e8e7',
    'Super Admin',
    'SUPER_ADMIN',
    1,
    0,
    'Tezpur University',
    NULL,
    1,
    1,
    1792502600811,
    1792502600811,
    1792502600811
  ),

  -- 2 Leads
  (
    '00000000-0000-4000-9000-000000000011',
    'lead1@techxetra.in',
    'pbkdf2:sha256:100000:6d5de4aacacd86b641d176ca6cef38e9:f413c12639b3f04e2298cbd176ecebbd60964d570f6a550d874beabed9effe28',
    'Lead Alpha',
    'LEAD',
    1,
    1,
    'Tezpur University',
    'TU-LEAD-01',
    1,
    1,
    1792502600811,
    1792502600811,
    1792502600811
  ),
  (
    '00000000-0000-4000-9000-000000000012',
    'lead2@techxetra.in',
    'pbkdf2:sha256:100000:6d5de4aacacd86b641d176ca6cef38e9:f413c12639b3f04e2298cbd176ecebbd60964d570f6a550d874beabed9effe28',
    'Lead Beta',
    'LEAD',
    1,
    1,
    'Tezpur University',
    'TU-LEAD-02',
    1,
    1,
    1792502600811,
    1792502600811,
    1792502600811
  ),

  -- 4 Volunteers
  (
    '00000000-0000-4000-9000-000000000021',
    'vol1@techxetra.in',
    'pbkdf2:sha256:100000:5d6cb2ddd1b77d53e8b75a7cafc3c17a:96eb9122b5d4c6ad82515ea335c23ef076e286b9681c6106233a62c5835a0cd8',
    'Volunteer One',
    'VOLUNTEER',
    0,
    1,
    'Tezpur University',
    'TU-VOL-01',
    1,
    1,
    1792502600811,
    1792502600811,
    1792502600811
  ),
  (
    '00000000-0000-4000-9000-000000000022',
    'vol2@techxetra.in',
    'pbkdf2:sha256:100000:5d6cb2ddd1b77d53e8b75a7cafc3c17a:96eb9122b5d4c6ad82515ea335c23ef076e286b9681c6106233a62c5835a0cd8',
    'Volunteer Two',
    'VOLUNTEER',
    0,
    1,
    'Tezpur University',
    'TU-VOL-02',
    1,
    1,
    1792502600811,
    1792502600811,
    1792502600811
  ),
  (
    '00000000-0000-4000-9000-000000000023',
    'vol3@techxetra.in',
    'pbkdf2:sha256:100000:5d6cb2ddd1b77d53e8b75a7cafc3c17a:96eb9122b5d4c6ad82515ea335c23ef076e286b9681c6106233a62c5835a0cd8',
    'Volunteer Three',
    'VOLUNTEER',
    0,
    1,
    'Tezpur University',
    'TU-VOL-03',
    1,
    1,
    1792502600811,
    1792502600811,
    1792502600811
  ),
  (
    '00000000-0000-4000-9000-000000000024',
    'vol4@techxetra.in',
    'pbkdf2:sha256:100000:5d6cb2ddd1b77d53e8b75a7cafc3c17a:96eb9122b5d4c6ad82515ea335c23ef076e286b9681c6106233a62c5835a0cd8',
    'Volunteer Four',
    'VOLUNTEER',
    0,
    1,
    'Tezpur University',
    'TU-VOL-04',
    1,
    1,
    1792502600811,
    1792502600811,
    1792502600811
  )
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  password_hash = excluded.password_hash,
  role = excluded.role,
  can_review_payments = excluded.can_review_payments,
  is_active = 1,
  updated_at = 1792502600811;
