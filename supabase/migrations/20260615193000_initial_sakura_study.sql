create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  xp integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cards (
  id text primary key,
  japanese text not null,
  kana text not null,
  romaji text not null,
  english text not null,
  category text not null,
  card_type text not null default 'vocabulary',
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  correct boolean not null,
  answer text not null,
  expected text not null,
  mode text not null,
  category text not null,
  xp integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.mastery (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  attempts integer not null default 0,
  correct integer not null default 0,
  wrong integer not null default 0,
  last_reviewed timestamptz,
  difficulty numeric not null default 0.5,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table public.users enable row level security;
alter table public.cards enable row level security;
alter table public.attempts enable row level security;
alter table public.streaks enable row level security;
alter table public.mastery enable row level security;

create policy "Users can read their profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can upsert their profile" on public.users
  for insert with check (auth.uid() = id);

create policy "Users can update their profile" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Authenticated users can read cards" on public.cards
  for select to authenticated using (true);

create policy "Users can read own attempts" on public.attempts
  for select using (auth.uid() = user_id);

create policy "Users can insert own attempts" on public.attempts
  for insert with check (auth.uid() = user_id);

create policy "Users can read own streaks" on public.streaks
  for select using (auth.uid() = user_id);

create policy "Users can upsert own streaks" on public.streaks
  for insert with check (auth.uid() = user_id);

create policy "Users can update own streaks" on public.streaks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can read own mastery" on public.mastery
  for select using (auth.uid() = user_id);

create policy "Users can upsert own mastery" on public.mastery
  for insert with check (auth.uid() = user_id);

create policy "Users can update own mastery" on public.mastery
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists attempts_user_created_idx on public.attempts (user_id, created_at desc);
create index if not exists attempts_card_idx on public.attempts (card_id);
create index if not exists mastery_user_difficulty_idx on public.mastery (user_id, difficulty desc);
