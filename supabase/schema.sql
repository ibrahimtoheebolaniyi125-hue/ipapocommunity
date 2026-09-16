create extension if not exists pgcrypto;

create table if not exists public.news_stories (
  id text primary key,
  title text not null,
  source text not null,
  link text not null,
  summary text not null default '',
  content text not null default '',
  image text not null default '',
  published_at timestamptz,
  category text not null default 'World',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  scam_score integer not null default 0,
  scam_risk text not null default 'low',
  scam_label text not null default 'Likely safe',
  scam_reasons jsonb not null default '[]'::jsonb,
  is_scam boolean not null default false,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_stories add column if not exists image text not null default '';

create table if not exists public.news_alerts (
  id text primary key,
  title text not null,
  risk text not null,
  score integer not null default 0,
  reasons jsonb not null default '[]'::jsonb,
  source text not null default 'news-fetcher',
  created_at timestamptz not null default now()
);

create table if not exists public.user_seen_news (
  user_email text not null,
  story_id text not null references public.news_stories(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_email, story_id)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_deliveries (
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  story_id text not null references public.news_stories(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (subscription_id, story_id)
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  title text not null,
  message text not null default '',
  actor_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists news_stories_status_idx on public.news_stories(status);
create index if not exists news_stories_fetched_at_idx on public.news_stories(fetched_at desc);
create index if not exists user_seen_news_email_idx on public.user_seen_news(user_email);
create index if not exists push_subscriptions_email_idx on public.push_subscriptions(user_email);
create index if not exists activity_events_created_at_idx on public.activity_events(created_at desc);

alter table public.news_stories enable row level security;
alter table public.news_alerts enable row level security;
alter table public.user_seen_news enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;
alter table public.activity_events enable row level security;

revoke all on public.news_stories from anon, authenticated;
revoke all on public.news_alerts from anon, authenticated;
revoke all on public.user_seen_news from anon, authenticated;
revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.push_deliveries from anon, authenticated;
revoke all on public.activity_events from anon, authenticated;
