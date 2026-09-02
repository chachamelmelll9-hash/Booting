-- =============================================================================
-- parent_shares — "이 인연의 프로필을 부모님께 보냈는가".
--
-- 이 앱의 마지막 한 걸음은 자녀가 상대 부모님 프로필을 **자기 부모님께 전달**
-- 하는 것이다. 보냈는지 아닌지는 앱이 대신 기억해 줘야 한다 — 자녀가 여러
-- 인연을 동시에 들고 있으면 누구를 이미 보여드렸는지 금방 헷갈린다.
--
-- 인연 하나에 참여자가 둘이고 각자 자기 부모님께 따로 보내므로 (연결, 사용자)
-- 두 컬럼이 키다. conversation_reads 와 같은 모양이다.
-- =============================================================================

create table parent_shares (
  connection_id uuid not null references connections(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  shared_at     timestamptz not null default now(),
  primary key (connection_id, user_id)
);

comment on table parent_shares is
  '자녀가 상대 부모님 프로필을 자기 부모님께 공유한 시각. 매칭 목록의 공유 완료 표시 기준.';

alter table parent_shares enable row level security;
create policy parent_shares_own on parent_shares
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
