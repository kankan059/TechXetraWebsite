-- Migration: 0003_add_password_auth.sql
-- Description: Add password_hash column to users table for native email/password authentication

ALTER TABLE users ADD COLUMN password_hash TEXT;
