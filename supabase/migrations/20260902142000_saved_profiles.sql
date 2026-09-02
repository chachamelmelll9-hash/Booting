-- =============================================================================
-- saved_profiles — 찜(보류).
--
-- 받은 관심을 볼 때 선택지가 '관심 보내기'와 '넘기기' 둘뿐이면, 확신이 서지
-- 않는 분을 넘겨 버리게 된다. 넘기기는 되돌릴 수 없다(추천에서 영구 제외).
-- 찜은 그 사이를 메운다 — 지금 결정하지 않고 보관함에 두었다가 다시 본다.
--
-- 매칭이 아니다. 상대는 찜당한 사실을 알지 못하고, 알림도 가지 않는다.
-- =============================================================================

create table saved_profiles (
  user_id                  uuid not null references auth.users(id) on delete cascade,
  target_parent_profile_id uuid not null references parent_profiles(id) on delete cascade,
  created_at               timestamptz not null default now(),
  primary key (user_id, target_parent_profile_id)
);

create index saved_profiles_user_idx on saved_profiles (user_id, created_at desc);

comment on table saved_profiles is
  '찜(보류)한 상대 부모님 프로필. 넘기기와 달리 되돌릴 수 있고 상대에게 알리지 않는다.';

alter table saved_profiles enable row level security;
create policy saved_profiles_own on saved_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
