-- Migration: 0003_custom_forms_and_event_enhancements.sql
-- Description: Dynamic custom registration forms and event staff / payment indexing.

-- 1. Add form_schema column to events table to store dynamic registration form definition (JSON)
ALTER TABLE events ADD COLUMN form_schema TEXT;

-- 2. Add form_responses column to registrations table to store user questionnaire answers (JSON)
ALTER TABLE registrations ADD COLUMN form_responses TEXT;

-- 3. Create index on event_staff to optimize staff dashboard lookups
CREATE INDEX IF NOT EXISTS idx_event_staff_user ON event_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_event_user ON event_staff(event_id, user_id);

-- 4. Create index on purchase_items for fast event-scoped payment queries
CREATE INDEX IF NOT EXISTS idx_purchase_items_event ON purchase_items(event_id, purchase_id);
