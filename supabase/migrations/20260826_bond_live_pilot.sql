-- Bond v2 live pilot: low-friction device-bound identity, real introductions and messaging.
-- The browser keeps a high-entropy random secret. Only its SHA-256 digest is stored.

create table if not exists public.pilot_participants (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  city text not null default 'Athens' check (char_length(trim(city)) between 1 and 120),
  broad_world text,
  secret_hash bytea not null,
  adult_confirmed_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_models (
  participant_id uuid primary key references public.pilot_participants(id) on delete cascade,
  model_json jsonb not null,
  semantic_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_introductions (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.pilot_participants(id) on delete cascade,
  participant_b uuid not null references public.pilot_participants(id) on delete cascade,
  pair_key text generated always as (
    least(participant_a::text, participant_b::text) || ':' || greatest(participant_a::text, participant_b::text)
  ) stored,
  hypothesis text not null,
  score smallint not null check (score between 0 and 100),
  status text not null default 'pending'
    check (status in ('pending','mutual_accept','declined','expired','conversation_open','closed')),
  reveal_level text not null default 'hypothesis_only'
    check (reveal_level in ('hypothesis_only','minimal_identity','full_conversation')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  opened_at timestamptz,
  closed_at timestamptz,
  check (participant_a <> participant_b),
  unique (pair_key)
);

create index if not exists pilot_introductions_a_idx on public.pilot_introductions(participant_a, created_at desc);
create index if not exists pilot_introductions_b_idx on public.pilot_introductions(participant_b, created_at desc);

create table if not exists public.pilot_decisions (
  introduction_id uuid not null references public.pilot_introductions(id) on delete cascade,
  participant_id uuid not null references public.pilot_participants(id) on delete cascade,
  decision text not null check (decision in ('accept','decline')),
  decided_at timestamptz not null default now(),
  primary key (introduction_id, participant_id)
);

create table if not exists public.pilot_conversations (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null unique references public.pilot_introductions(id) on delete cascade,
  opening_prompt text not null default 'Before talking normally: each choose one place in Athens you would show someone who had never really seen the city. Do not explain why until you have both answered.',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.pilot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.pilot_conversations(id) on delete cascade,
  sender_id uuid not null references public.pilot_participants(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists pilot_messages_conversation_idx
  on public.pilot_messages(conversation_id, created_at);

alter table public.pilot_participants enable row level security;
alter table public.pilot_models enable row level security;
alter table public.pilot_introductions enable row level security;
alter table public.pilot_decisions enable row level security;
alter table public.pilot_conversations enable row level security;
alter table public.pilot_messages enable row level security;

-- No direct client table access. Every public operation goes through a narrowly scoped RPC.
revoke all on table public.pilot_participants from anon, authenticated;
revoke all on table public.pilot_models from anon, authenticated;
revoke all on table public.pilot_introductions from anon, authenticated;
revoke all on table public.pilot_decisions from anon, authenticated;
revoke all on table public.pilot_conversations from anon, authenticated;
revoke all on table public.pilot_messages from anon, authenticated;

grant all on table public.pilot_participants to service_role;
grant all on table public.pilot_models to service_role;
grant all on table public.pilot_introductions to service_role;
grant all on table public.pilot_decisions to service_role;
grant all on table public.pilot_conversations to service_role;
grant all on table public.pilot_messages to service_role;

create or replace function public.bond_pilot_secret_ok(p_participant_id uuid, p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.pilot_participants p
    where p.id = p_participant_id
      and p.active = true
      and p.secret_hash = digest(p_secret, 'sha256')
  );
$$;
revoke all on function public.bond_pilot_secret_ok(uuid, text) from public, anon, authenticated;
grant execute on function public.bond_pilot_secret_ok(uuid, text) to service_role;

create or replace function public.bond_pilot_register(
  p_first_name text,
  p_city text,
  p_secret text,
  p_adult_confirmed boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if p_adult_confirmed is not true then
    raise exception 'Bond pilot is 18+ only';
  end if;
  if char_length(trim(coalesce(p_first_name, ''))) < 1 then
    raise exception 'First name is required';
  end if;
  if char_length(coalesce(p_secret, '')) < 32 then
    raise exception 'Invalid pilot key';
  end if;

  insert into public.pilot_participants(first_name, city, secret_hash, adult_confirmed_at)
  values (trim(p_first_name), coalesce(nullif(trim(p_city), ''), 'Athens'), digest(p_secret, 'sha256'), now())
  returning id into v_id;

  return v_id;
end;
$$;
revoke all on function public.bond_pilot_register(text, text, text, boolean) from public;
grant execute on function public.bond_pilot_register(text, text, text, boolean) to anon, authenticated;

create or replace function public.bond_pilot_save_model(
  p_participant_id uuid,
  p_secret text,
  p_model jsonb,
  p_semantic jsonb,
  p_broad_world text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.bond_pilot_secret_ok(p_participant_id, p_secret) then
    raise exception 'Pilot identity not recognized';
  end if;

  update public.pilot_participants
  set broad_world = nullif(trim(p_broad_world), ''), updated_at = now()
  where id = p_participant_id;

  insert into public.pilot_models(participant_id, model_json, semantic_json)
  values (p_participant_id, p_model, p_semantic)
  on conflict (participant_id)
  do update set model_json = excluded.model_json,
                semantic_json = excluded.semantic_json,
                updated_at = now();
end;
$$;
revoke all on function public.bond_pilot_save_model(uuid, text, jsonb, jsonb, text) from public;
grant execute on function public.bond_pilot_save_model(uuid, text, jsonb, jsonb, text) to anon, authenticated;

create or replace function public.bond_pilot_visible_introductions(
  p_participant_id uuid,
  p_secret text
)
returns table (
  id uuid,
  visible_status text,
  hypothesis text,
  expires_at timestamptz,
  my_decision text,
  mutual boolean,
  other_participant_id uuid,
  reveal_level text,
  conversation_id uuid
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    i.id,
    case when i.status in ('mutual_accept','conversation_open') then i.status else 'pending' end,
    i.hypothesis,
    i.expires_at,
    coalesce(mine.decision, 'pending'),
    i.status in ('mutual_accept','conversation_open'),
    case
      when i.status in ('mutual_accept','conversation_open')
      then case when p_participant_id = i.participant_a then i.participant_b else i.participant_a end
      else null
    end,
    i.reveal_level,
    c.id
  from public.pilot_introductions i
  left join public.pilot_decisions mine
    on mine.introduction_id = i.id and mine.participant_id = p_participant_id
  left join public.pilot_conversations c on c.introduction_id = i.id
  where public.bond_pilot_secret_ok(p_participant_id, p_secret)
    and p_participant_id in (i.participant_a, i.participant_b)
    and i.status not in ('declined','expired','closed')
    and i.expires_at > now()
    and not exists (
      select 1 from public.pilot_decisions other
      where other.introduction_id = i.id
        and other.participant_id <> p_participant_id
        and other.decision = 'decline'
    )
  order by i.created_at desc;
$$;
revoke all on function public.bond_pilot_visible_introductions(uuid, text) from public;
grant execute on function public.bond_pilot_visible_introductions(uuid, text) to anon, authenticated;

create or replace function public.bond_pilot_record_decision(
  p_participant_id uuid,
  p_secret text,
  p_introduction_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_intro public.pilot_introductions%rowtype;
  v_accepts integer;
  v_declines integer;
begin
  if not public.bond_pilot_secret_ok(p_participant_id, p_secret) then
    raise exception 'Pilot identity not recognized';
  end if;
  if p_decision not in ('accept','decline') then
    raise exception 'Invalid decision';
  end if;

  select * into v_intro
  from public.pilot_introductions
  where id = p_introduction_id
  for update;

  if v_intro.id is null or p_participant_id not in (v_intro.participant_a, v_intro.participant_b) then
    raise exception 'Introduction not found';
  end if;
  if v_intro.status <> 'pending' or v_intro.expires_at <= now() then
    raise exception 'Introduction is no longer actionable';
  end if;

  insert into public.pilot_decisions(introduction_id, participant_id, decision)
  values (p_introduction_id, p_participant_id, p_decision)
  on conflict (introduction_id, participant_id)
  do update set decision = excluded.decision, decided_at = now();

  select
    count(*) filter (where decision = 'accept'),
    count(*) filter (where decision = 'decline')
  into v_accepts, v_declines
  from public.pilot_decisions
  where introduction_id = p_introduction_id;

  if v_declines > 0 then
    update public.pilot_introductions
    set status = 'declined', closed_at = now()
    where id = p_introduction_id;
  elsif v_accepts = 2 then
    update public.pilot_introductions
    set status = 'mutual_accept', reveal_level = 'minimal_identity', opened_at = now()
    where id = p_introduction_id;
  end if;
end;
$$;
revoke all on function public.bond_pilot_record_decision(uuid, text, uuid, text) from public;
grant execute on function public.bond_pilot_record_decision(uuid, text, uuid, text) to anon, authenticated;

create or replace function public.bond_pilot_revealed_profile(
  p_participant_id uuid,
  p_secret text,
  p_introduction_id uuid
)
returns table (participant_id uuid, first_name text, city text, broad_world text)
language sql
security definer
set search_path = public, extensions
as $$
  select p.id, p.first_name, p.city, p.broad_world
  from public.pilot_introductions i
  join public.pilot_participants p
    on p.id = case when p_participant_id = i.participant_a then i.participant_b else i.participant_a end
  where public.bond_pilot_secret_ok(p_participant_id, p_secret)
    and i.id = p_introduction_id
    and p_participant_id in (i.participant_a, i.participant_b)
    and i.status in ('mutual_accept','conversation_open')
    and i.reveal_level in ('minimal_identity','full_conversation');
$$;
revoke all on function public.bond_pilot_revealed_profile(uuid, text, uuid) from public;
grant execute on function public.bond_pilot_revealed_profile(uuid, text, uuid) to anon, authenticated;

create or replace function public.bond_pilot_open_conversation(
  p_participant_id uuid,
  p_secret text,
  p_introduction_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_intro public.pilot_introductions%rowtype;
  v_conversation uuid;
begin
  if not public.bond_pilot_secret_ok(p_participant_id, p_secret) then
    raise exception 'Pilot identity not recognized';
  end if;

  select * into v_intro from public.pilot_introductions
  where id = p_introduction_id for update;

  if v_intro.id is null or p_participant_id not in (v_intro.participant_a, v_intro.participant_b) then
    raise exception 'Introduction not found';
  end if;
  if v_intro.status not in ('mutual_accept','conversation_open') then
    raise exception 'Mutual acceptance is required';
  end if;

  insert into public.pilot_conversations(introduction_id)
  values (p_introduction_id)
  on conflict (introduction_id) do update set introduction_id = excluded.introduction_id
  returning id into v_conversation;

  update public.pilot_introductions
  set status = 'conversation_open', reveal_level = 'full_conversation'
  where id = p_introduction_id;

  return v_conversation;
end;
$$;
revoke all on function public.bond_pilot_open_conversation(uuid, text, uuid) from public;
grant execute on function public.bond_pilot_open_conversation(uuid, text, uuid) to anon, authenticated;

create or replace function public.bond_pilot_messages(
  p_participant_id uuid,
  p_secret text,
  p_introduction_id uuid
)
returns table (id uuid, mine boolean, sender_name text, body text, created_at timestamptz, opening_prompt text)
language sql
security definer
set search_path = public, extensions
as $$
  select m.id,
         m.sender_id = p_participant_id,
         s.first_name,
         m.body,
         m.created_at,
         c.opening_prompt
  from public.pilot_conversations c
  join public.pilot_introductions i on i.id = c.introduction_id
  left join public.pilot_messages m on m.conversation_id = c.id
  left join public.pilot_participants s on s.id = m.sender_id
  where public.bond_pilot_secret_ok(p_participant_id, p_secret)
    and i.id = p_introduction_id
    and p_participant_id in (i.participant_a, i.participant_b)
    and i.status = 'conversation_open'
  order by m.created_at asc nulls first;
$$;
revoke all on function public.bond_pilot_messages(uuid, text, uuid) from public;
grant execute on function public.bond_pilot_messages(uuid, text, uuid) to anon, authenticated;

create or replace function public.bond_pilot_send_message(
  p_participant_id uuid,
  p_secret text,
  p_introduction_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_conversation uuid;
  v_message uuid;
begin
  if not public.bond_pilot_secret_ok(p_participant_id, p_secret) then
    raise exception 'Pilot identity not recognized';
  end if;
  if char_length(trim(coalesce(p_body, ''))) < 1 then
    raise exception 'Message is empty';
  end if;

  select c.id into v_conversation
  from public.pilot_conversations c
  join public.pilot_introductions i on i.id = c.introduction_id
  where i.id = p_introduction_id
    and p_participant_id in (i.participant_a, i.participant_b)
    and i.status = 'conversation_open';

  if v_conversation is null then
    raise exception 'Conversation is not open';
  end if;

  insert into public.pilot_messages(conversation_id, sender_id, body)
  values (v_conversation, p_participant_id, trim(p_body))
  returning id into v_message;

  return v_message;
end;
$$;
revoke all on function public.bond_pilot_send_message(uuid, text, uuid, text) from public;
grant execute on function public.bond_pilot_send_message(uuid, text, uuid, text) to anon, authenticated;
