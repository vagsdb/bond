-- Bond v2.0 backend hardening before first real-user deployment

-- Decisions must flow through bond_record_decision() so state transitions,
-- expiry, mutual acceptance, and invisible rejection cannot be bypassed
-- by direct table writes from authenticated clients.
drop policy if exists decisions_participant_insert on public.introduction_decisions;
drop policy if exists decisions_own_update on public.introduction_decisions;

-- The matching service runs with service-role credentials, where auth.uid()
-- is not the end-user identity. Pass the authenticated requester explicitly
-- from trusted server code instead of relying on auth.uid() inside retrieval.
drop function if exists public.bond_candidate_pool(text, text, extensions.vector, integer);

create or replace function public.bond_candidate_pool(
  p_requesting_user uuid,
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
    and s.user_id <> p_requesting_user
    and exists (
      select 1
      from public.profiles requester
      where requester.id = p_requesting_user
        and requester.adult_confirmed_at is not null
        and requester.trust_state <> 'restricted'
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = p_requesting_user and b.blocked_id = s.user_id)
         or (b.blocker_id = s.user_id and b.blocked_id = p_requesting_user)
    )
    and not exists (
      select 1 from public.introductions i
      where (i.user_a = p_requesting_user and i.user_b = s.user_id)
         or (i.user_b = p_requesting_user and i.user_a = s.user_id)
    )
  group by s.user_id
  order by distance asc
  limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.bond_candidate_pool(uuid, text, text, extensions.vector, integer)
  from public, anon, authenticated;
grant execute on function public.bond_candidate_pool(uuid, text, text, extensions.vector, integer)
  to service_role;
