-- Migration 003: Categories Table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  is_default boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_categories_workspace_id on public.categories(workspace_id);
create index if not exists idx_categories_type on public.categories(type);
