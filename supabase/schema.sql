-- PromptProbe schema
-- Run in the Supabase SQL editor. Stores the attack catalog and anonymous
-- scan results. No API keys or raw prompt/response text are ever stored.

-- ── Attacks catalog ────────────────────────────────────────────────────────
create table if not exists public.attacks (
  id          text primary key,
  category    text not null,
  owasp_id    text not null,
  severity    smallint not null check (severity between 1 and 5),
  prompt      text not null,
  rubric      text not null,
  active      boolean not null default true,
  version     integer not null default 1,
  created_at  timestamptz not null default now()
);

-- ── Anonymous scan results ─────────────────────────────────────────────────
create table if not exists public.scans (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  provider     text not null,
  model        text not null,
  total_score  smallint not null check (total_score between 0 and 100),
  grade        text not null check (grade in ('A','B','C','D','F')),
  subscores    jsonb not null default '{}'::jsonb
);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.attacks enable row level security;
alter table public.scans   enable row level security;

-- Anyone may read the (non-sensitive) attack catalog.
create policy attacks_read_anon on public.attacks
  for select using (true);

-- Anyone may insert a scan result, but only well-shaped rows; nobody may read
-- others' rows via anon (no select policy = deny). Defense-in-depth in case an
-- anon key is ever exposed to the client — the table CHECK constraints already
-- enforce ranges, and this mirrors them at the policy layer.
create policy scans_insert_anon on public.scans
  for insert with check (
    total_score between 0 and 100
    and grade in ('A','B','C','D','F')
    and length(provider) between 1 and 64
    and length(model) between 1 and 128
  );
