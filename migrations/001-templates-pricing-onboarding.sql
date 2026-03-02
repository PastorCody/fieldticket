-- FieldTicket Migration 001: Templates, Pricing, Onboarding
-- Run this in Supabase SQL Editor

-- 1. Add onboarding columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

-- 2. Add template_id and pricing_data to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS pricing_data jsonb;

-- 3. Create contact_templates table
CREATE TABLE IF NOT EXISTS public.contact_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  visible_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_field_defs jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, name)
);

-- 4. Add foreign key from tickets to contact_templates
-- (only if the constraint doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tickets_template_id_fkey'
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES public.contact_templates(id);
  END IF;
END $$;

-- 5. Enable RLS on contact_templates
ALTER TABLE public.contact_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON public.contact_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON public.contact_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.contact_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.contact_templates FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_contact_templates_contact_id
  ON public.contact_templates(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_templates_user_id
  ON public.contact_templates(user_id);

-- 7. Mark existing users (who have tickets) as already onboarded
UPDATE public.profiles
SET onboarding_completed = true
WHERE id IN (SELECT DISTINCT user_id FROM public.tickets);
