-- Bond v2.0 conviviality semantic dimension + RPC privilege hardening

alter table public.semantic_segments
  drop constraint if exists semantic_segments_dimension_check;

alter table public.semantic_segments
  add constraint semantic_segments_dimension_check
  check (dimension in (
    'curiosity','desired_exposure','conversation_style','temperament',
    'conviviality','wants','not_this','social_intention','life_chapter'
  ));

-- Keep the trigger helper deterministic with an explicit search path.
alter function public.bond_set_updated_at() set search_path = public;

-- SECURITY DEFINER RPCs are intended for signed-in participants only.
-- Explicit anon revokes avoid relying on inherited/default function privileges.
revoke execute on function public.bond_visible_introductions() from anon;
revoke execute on function public.bond_record_decision(uuid, text) from anon;
revoke execute on function public.bond_revealed_profile(uuid) from anon;
revoke execute on function public.bond_open_conversation(uuid, text) from anon;

-- Reassert the intended authenticated surface.
grant execute on function public.bond_visible_introductions() to authenticated;
grant execute on function public.bond_record_decision(uuid, text) to authenticated;
grant execute on function public.bond_revealed_profile(uuid) to authenticated;
grant execute on function public.bond_open_conversation(uuid, text) to authenticated;
