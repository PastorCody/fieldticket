-- FieldTicket Database Schema
-- Run this in your Supabase SQL Editor (supabase.com > SQL Editor)

-- 1. Create enum
create type ticket_status as enum ('draft', 'sent', 'viewed');

-- 2. Profiles table (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  company_name text,
  logo_url text,
  signature_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- 3. Contacts table
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  company text,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.contacts enable row level security;

create policy "Users can view own contacts"
  on public.contacts for select using (auth.uid() = user_id);
create policy "Users can insert own contacts"
  on public.contacts for insert with check (auth.uid() = user_id);
create policy "Users can update own contacts"
  on public.contacts for update using (auth.uid() = user_id);
create policy "Users can delete own contacts"
  on public.contacts for delete using (auth.uid() = user_id);

-- 4. Tickets table
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status ticket_status default 'draft',
  raw_transcript text,
  audio_url text,
  structured_data jsonb,
  ai_questions jsonb,
  ai_answers jsonb,
  pdf_url text,
  recipient_id uuid references public.contacts(id),
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tickets enable row level security;

create policy "Users can view own tickets"
  on public.tickets for select using (auth.uid() = user_id);
create policy "Users can insert own tickets"
  on public.tickets for insert with check (auth.uid() = user_id);
create policy "Users can update own tickets"
  on public.tickets for update using (auth.uid() = user_id);
create policy "Users can delete own tickets"
  on public.tickets for delete using (auth.uid() = user_id);

-- 5. Email log table
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  recipient_email text not null,
  resend_id text,
  status text default 'sent',
  sent_at timestamptz default now()
);

alter table public.email_log enable row level security;

create policy "Users can view own email logs"
  on public.email_log for select using (
    exists (
      select 1 from public.tickets t
      where t.id = email_log.ticket_id and t.user_id = auth.uid()
    )
  );
create policy "Users can insert own email logs"
  on public.email_log for insert with check (
    exists (
      select 1 from public.tickets t
      where t.id = email_log.ticket_id and t.user_id = auth.uid()
    )
  );

-- 6. Indexes
create index idx_tickets_user_id on public.tickets(user_id);
create index idx_tickets_status on public.tickets(status);
create index idx_tickets_created_at on public.tickets(created_at desc);
create index idx_contacts_user_id on public.contacts(user_id);
create index idx_email_log_ticket_id on public.email_log(ticket_id);

-- 7. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. Storage buckets (run these individually in Supabase dashboard > Storage)
-- Or use the Supabase management API:
--   CREATE BUCKET: audio (private)
--   CREATE BUCKET: logos (public)
--   CREATE BUCKET: pdfs (private)

-- Storage RLS policies (run after creating buckets)
-- Audio bucket
create policy "Users can upload audio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can read own audio"
  on storage.objects for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

-- Logos bucket (public read)
create policy "Users can upload logos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Anyone can read logos"
  on storage.objects for select using (bucket_id = 'logos');

-- PDFs bucket
create policy "Users can upload pdfs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can read own pdfs"
  on storage.objects for select to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
