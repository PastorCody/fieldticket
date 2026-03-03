-- FieldTicket Migration 003: Admin column for owner analytics
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Set Cody as admin
UPDATE public.profiles SET is_admin = true WHERE email = 'cody@gymlife.ai';
