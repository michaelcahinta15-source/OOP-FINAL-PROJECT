create table if not exists public.courtside_accounts (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null check (role in ('ADMIN', 'VIEWER')),
  salt text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.courtside_sessions (
  token_hash text primary key,
  user_id text not null references public.courtside_accounts(id) on delete cascade,
  expires_at timestamptz not null
);

create index if not exists courtside_sessions_expires_at_idx
  on public.courtside_sessions (expires_at);

alter table public.courtside_accounts enable row level security;
alter table public.courtside_sessions enable row level security;
