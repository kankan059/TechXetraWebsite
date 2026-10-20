-- Migration: 0002_seed.sql
-- Description: Idempotent seed data for settings and fest days (with dev placeholders).
-- Note: Production dates and prices must be configured by operator before go-live.
-- First SUPER_ADMIN must be provisioned via scripts/bootstrap-admin.sql.

-- Fest Days (3 days)
INSERT OR IGNORE INTO fest_days (day_number, date, starts_at, ends_at, description)
VALUES
  (1, '2026-11-06', 1793923200000, 1794009599999, 'TechXetra 2026 Day 1'),
  (2, '2026-11-07', 1794009600000, 1794095999999, 'TechXetra 2026 Day 2'),
  (3, '2026-11-08', 1794096000000, 1794182399999, 'TechXetra 2026 Day 3');

-- Global Settings
INSERT OR IGNORE INTO settings (key, value, updated_at)
VALUES
  ('gate_pass_price_paise', '30000', 1793923200000),
  ('gate_pass_student_price_paise', '20000', 1793923200000),
  ('purchases_enabled', '1', 1793923200000),
  ('student_id_warning_text', 'Physical student institution ID card must be presented at entry for verification.', 1793923200000),
  ('support_contact', 'support@techxetra.in', 1793923200000);
