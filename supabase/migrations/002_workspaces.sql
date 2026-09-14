-- Migration 002: Workspaces Table
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  type text not null check (type in ('home', 'shop')),
  icon text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint uq_user_workspace_slug unique (user_id, slug)
);

create index if not exists idx_workspaces_user_id on public.workspaces(user_id);
create index if not exists idx_workspaces_slug on public.workspaces(slug);
