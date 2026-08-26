-- Bond v2.0 production data foundation
-- Apply with the Supabase CLI or SQL editor in a dedicated Bond project.

create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

create or replace function public.bond_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 80),
  city text not null,
  broad_world text,
  photo_url text,
  adult_confirmed_at timestamptz,
  trust_state text not null default 'unverified'
    check (trust_state in ('unverified','basic','verified','restricted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.human_models (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  model_version integer not null default 1,
  model_json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.semantic_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  dimension text not null check (dimension in (
    'curiosity','desired_exposure','conversation_style','temperament',
    'wants','not_this','social_intention','life_chapter'
  )),
  content text not null check (char_length(content) between 1 and 5000),
  confidence text not null default 'direct'
    check (confidence in ('direct','tentative','unknown')),
  explanation_eligible boolean not null default false,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists semantic_segments_user_dimension_idx
  on public.semantic_segments(user_id, dimension);

create table if not exists public.intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  embedding extensions.vector(1536),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  retired_at timestamptz
);

create unique index if not exists one_active_intention_per_user
  on public.intentions(user_id) where active;

create table if not exists public.exclusions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  hard boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.introductions (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  city text not null,
  proposer_score smallint not null check (proposer_score between 0 and 100),
  critic_risk smallint not null check (critic_risk between 0 and 100),
  survival_score smallint not null check (survival_score between 0 and 100),
  final_decision text not null check (final_decision in ('introduce','hold','reject')),
  status text not null default 'pending'
    check (status in ('pending','mutual_accept','declined','expired','conversation_open','closed')),
  hypothesis text,
  hypothesis_released boolean not null default false,
  reveal_level text not null default 'hypothesis_only'
    check (reveal_level in ('hypothesis_only','minimal_identity','full_conversation')),
  proposer_json jsonb not null default '{}'::jsonb,
  critic_json jsonb not null default '{}'::jsonb,
  gate_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  opened_at timestamptz,
  closed_at timestamptz,
  check (user_a <> user_b),
  check (hypothesis_released = false or final_decision = 'introduce')
);

create index if not exists introductions_a_idx on public.introductions(user_a, created_at desc);
create index if not exists introductions_b_idx on public.introductions(user_b, created_at desc);

create table if not exists public.introduction_decisions (
  introduction_id uuid not null references public.introductions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  decision text not null check (decision in ('accept','decline')),
  decided_at timestamptz not null default now(),
  primary key (introduction_id, user_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null unique references public.introductions(id) on delete cascade,
  opening_prompt text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 8000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at);

create table if not exists public.outcomes (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null references public.introductions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'introduction_released','mutual_accept','conversation_started','offline_met',
    'glad_we_met','continued_contact','not_worthwhile','blocked','reported'
  )),
  value_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists outcomes_intro_idx on public.outcomes(introduction_id, created_at);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  introduction_id uuid references public.introductions(id) on delete set null,
  category text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.bond_set_updated_at();

create trigger human_models_set_updated_at
before update on public.human_models
for each row execute function public.bond_set_updated_at();

create trigger semantic_segments_set_updated_at
before update on public.semantic_segments
for each row execute function public.bond_set_updated_at();

alter table public.profiles enable row level security;
alter table public.human_models enable row level security;
alter table public.semantic_segments enable row level security;
alter table public.intentions enable row level security;
alter table public.exclusions enable row level security;
alter table public.blocks enable row level security;
alter table public.introductions enable row level security;
alter table public.introduction_decisions enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.outcomes enable row level security;
alter table public.reports enable row level security;

-- Private profile/model tables are owner-only. Matching uses trusted backend/service-role code.
create policy profiles_owner_select on public.profiles for select using (auth.uid() = id);
create policy profiles_owner_insert on public.profiles for insert with check (auth.uid() = id);
create policy profiles_owner_update on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy human_models_owner_all on public.human_models
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy semantic_segments_owner_all on public.semantic_segments
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy intentions_owner_all on public.intentions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy exclusions_owner_all on public.exclusions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy blocks_owner_all on public.blocks
for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- Users can read only their own decision, never the other person's decision.
create policy decisions_own_select on public.introduction_decisions
for select using (auth.uid() = user_id);

create policy decisions_participant_insert on public.introduction_decisions
for insert with check (
  auth.uid() = user_id and exists (
    select 1 from public.introductions i
    where i.id = introduction_id
      and auth.uid() in (i.user_a, i.user_b)
      and i.status = 'pending'
      and i.expires_at > now()
  )
);

create policy decisions_own_update on public.introduction_decisions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Conversation/message access begins only after mutual acceptance.
create policy conversations_participant_select on public.conversations
for select using (exists (
  select 1 from public.introductions i
  where i.id = introduction_id
    and auth.uid() in (i.user_a, i.user_b)
    and i.status in ('mutual_accept','conversation_open','closed')
));

create policy messages_participant_select on public.messages
for select using (exists (
  select 1
  from public.conversations c
  join public.introductions i on i.id = c.introduction_id
  where c.id = conversation_id and auth.uid() in (i.user_a, i.user_b)
));

create policy messages_participant_insert on public.messages
for insert with check (
  auth.uid() = sender_id and exists (
    select 1
    from public.conversations c
    join public.introductions i on i.id = c.introduction_id
    where c.id = conversation_id
      and auth.uid() in (i.user_a, i.user_b)
      and i.status = 'conversation_open'
  )
);

create policy outcomes_own_select on public.outcomes for select using (auth.uid() = user_id);
create policy outcomes_own_insert on public.outcomes for insert with check (auth.uid() = user_id);

create policy reports_own_select on public.reports for select using (auth.uid() = reporter_id);
create policy reports_own_insert on public.reports for insert with check (auth.uid() = reporter_id);

-- Introductions deliberately have no direct SELECT policy. This RPC masks the other
-- participant's decision and makes rejection invisible.
create or replace function public.bond_visible_introductions()
returns table (
  id uuid,
  visible_status text,
  hypothesis text,
  expires_at timestamptz,
  my_decision text,
  mutual boolean,
  other_user_id uuid,
  reveal_level text
)
language sql
security definer
set search_path = public
as $$
  select
    i.id,
    case when i.status in ('mutual_accept','conversation_open') then i.status else 'pending' end,
    case when i.hypothesis_released then i.hypothesis else null end,
    i.expires_at,
    coalesce(mine.decision, 'pending'),
    i.status in ('mutual_accept','conversation_open'),
    case
      when i.status in ('mutual_accept','conversation_open')
      then case when auth.uid() = i.user_a then i.user_b else i.user_a end
      else null
    end,
    i.reveal_level
  from public.introductions i
  left join public.introduction_decisions mine
    on mine.introduction_id = i.id and mine.user_id = auth.uid()
  where auth.uid() in (i.user_a, i.user_b)
    and i.final_decision = 'introduce'
    and i.hypothesis_released = true
    and i.status not in ('declined','expired','closed')
    and not exists (
      select 1 from public.introduction_decisions other
      where other.introduction_id = i.id
        and other.user_id <> auth.uid()
        and other.decision = 'decline'
    );
$$;

revoke all on function public.bond_visible_introductions() from public;
grant execute on function public.bond_visible_introductions() to authenticated;

-- Decision mutation keeps the other person's response private.
create or replace function public.bond_record_decision(p_introduction_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intro public.introductions%rowtype;
  v_accept_count integer;
  v_decline_count integer;
begin
  if p_decision not in ('accept','decline') then
    raise exception 'Invalid decision';
  end if;

  select * into v_intro from public.introductions
  where id = p_introduction_id for update;

  if v_intro.id is null or auth.uid() not in (v_intro.user_a, v_intro.user_b) then
    raise exception 'Introduction not found';
  end if;

  if v_intro.status <> 'pending' or v_intro.expires_at <= now() then
    raise exception 'Introduction is no longer actionable';
  end if;

  insert into public.introduction_decisions(introduction_id, user_id, decision)
  values (p_introduction_id, auth.uid(), p_decision)
  on conflict (introduction_id, user_id)
  do update set decision = excluded.decision, decided_at = now();

  select
    count(*) filter (where decision = 'accept'),
    count(*) filter (where decision = 'decline')
  into v_accept_count, v_decline_count
  from public.introduction_decisions where introduction_id = p_introduction_id;

  if v_decline_count > 0 then
    update public.introductions
    set status = 'declined', closed_at = now()
    where id = p_introduction_id;
  elsif v_accept_count = 2 then
    update public.introductions
    set status = 'mutual_accept', reveal_level = 'minimal_identity', opened_at = now()
    where id = p_introduction_id;
  end if;
end;
$$;

revoke all on function public.bond_record_decision(uuid, text) from public;
grant execute on function public.bond_record_decision(uuid, text) to authenticated;

-- Candidate retrieval stays server-side. The authenticated client cannot enumerate private vectors.
create or replace function public.bond_candidate_pool(
  p_city text,
  p_dimension text,
  p_query extensions.vector(1536),
  p_limit integer default 50
)
returns table (candidate_user_id uuid, distance double precision)
language sql
security definer
set search_path = public, extensions
as $$
  select s.user_id, min(s.embedding <=> p_query)::double precision as distance
  from public.semantic_segments s
  join public.profiles p on p.id = s.user_id
  where s.embedding is not null
    and s.dimension = p_dimension
    and p.city = p_city
    and p.adult_confirmed_at is not null
    and p.trust_state <> 'restricted'
    and s.user_id <> auth.uid()
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = s.user_id)
         or (b.blocker_id = s.user_id and b.blocked_id = auth.uid())
    )
    and not exists (
      select 1 from public.introductions i
      where (i.user_a = auth.uid() and i.user_b = s.user_id)
         or (i.user_b = auth.uid() and i.user_a = s.user_id)
    )
  group by s.user_id
  order by distance asc
  limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.bond_candidate_pool(text, text, extensions.vector, integer) from public, anon, authenticated;
grant execute on function public.bond_candidate_pool(text, text, extensions.vector, integer) to service_role;
