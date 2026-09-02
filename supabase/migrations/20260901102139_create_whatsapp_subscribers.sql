/*
# Create whatsapp_subscribers table

1. New Tables
- `whatsapp_subscribers`
  - `id` (uuid, primary key)
  - `full_name` (text, not null) — subscriber's full name
  - `whatsapp_number` (text, not null) — phone number with country code
  - `profession` (text, not null) — category: Student, Job Seeker, Small Business, Crypto/Stock Trader
  - `payment_status` (text, default 'pending') — mock payment status: pending, paid
  - `subscription_active` (boolean, default false) — whether subscription is active
  - `last_capsule` (text, nullable) — last generated capsule message
  - `last_capsule_at` (timestamptz, nullable) — when last capsule was generated
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
2. Security
- Enable RLS on `whatsapp_subscribers`.
- Allow anon + authenticated CRUD — this is a no-auth app (uses mock Google sign-in, not Supabase auth).
*/

CREATE TABLE IF NOT EXISTS whatsapp_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  whatsapp_number text NOT NULL,
  profession text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  subscription_active boolean NOT NULL DEFAULT false,
  last_capsule text,
  last_capsule_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_subscribers" ON whatsapp_subscribers;
CREATE POLICY "anon_select_subscribers" ON whatsapp_subscribers
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_subscribers" ON whatsapp_subscribers;
CREATE POLICY "anon_insert_subscribers" ON whatsapp_subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_subscribers" ON whatsapp_subscribers;
CREATE POLICY "anon_update_subscribers" ON whatsapp_subscribers
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_subscribers" ON whatsapp_subscribers;
CREATE POLICY "anon_delete_subscribers" ON whatsapp_subscribers
  FOR DELETE TO anon, authenticated USING (true);
