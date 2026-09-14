-- Migration 001: Profiles Table
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  currency text default 'INR',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_profiles_user_id on public.profiles(user_id);
