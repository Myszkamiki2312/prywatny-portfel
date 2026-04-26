-- Prywatny Portfel Mobile - Supabase cloud state schema
-- Run this in Supabase SQL Editor. Safe to re-run after updates.

create table if not exists public.app_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_states enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.app_states to authenticated;

drop policy if exists "app_states_select_own" on public.app_states;
drop policy if exists "app_states_insert_own" on public.app_states;
drop policy if exists "app_states_update_own" on public.app_states;

create policy "app_states_select_own"
  on public.app_states for select
  to authenticated
  using (auth.uid() = user_id);

create policy "app_states_insert_own"
  on public.app_states for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "app_states_update_own"
  on public.app_states for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
