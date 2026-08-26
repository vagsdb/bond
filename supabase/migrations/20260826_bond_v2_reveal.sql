-- Bond v2.0 progressive reveal and conversation transition

create or replace function public.bond_revealed_profile(p_introduction_id uuid)
returns table (
  user_id uuid,
  first_name text,
  broad_world text,
  photo_url text,
  trust_state text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.first_name,
    p.broad_world,
    case when i.reveal_level = 'full_conversation' then p.photo_url else null end,
    p.trust_state
  from public.introductions i
  join public.profiles p
    on p.id = case when auth.uid() = i.user_a then i.user_b else i.user_a end
  where i.id = p_introduction_id
    and auth.uid() in (i.user_a, i.user_b)
    and i.status in ('mutual_accept','conversation_open')
    and i.reveal_level in ('minimal_identity','full_conversation');
$$;

revoke all on function public.bond_revealed_profile(uuid) from public;
grant execute on function public.bond_revealed_profile(uuid) to authenticated;

create or replace function public.bond_open_conversation(
  p_introduction_id uuid,
  p_opening_prompt text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intro public.introductions%rowtype;
  v_conversation_id uuid;
begin
  select * into v_intro
  from public.introductions
  where id = p_introduction_id
  for update;

  if v_intro.id is null or auth.uid() not in (v_intro.user_a, v_intro.user_b) then
    raise exception 'Introduction not found';
  end if;

  if v_intro.status not in ('mutual_accept','conversation_open') then
    raise exception 'Mutual acceptance is required';
  end if;

  insert into public.conversations(introduction_id, opening_prompt)
  values (p_introduction_id, nullif(trim(p_opening_prompt), ''))
  on conflict (introduction_id)
  do update set opening_prompt = coalesce(public.conversations.opening_prompt, excluded.opening_prompt)
  returning id into v_conversation_id;

  update public.introductions
  set status = 'conversation_open', reveal_level = 'full_conversation'
  where id = p_introduction_id;

  return v_conversation_id;
end;
$$;

revoke all on function public.bond_open_conversation(uuid, text) from public;
grant execute on function public.bond_open_conversation(uuid, text) to authenticated;
