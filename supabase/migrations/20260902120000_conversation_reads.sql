-- =============================================================================
-- conversation_reads — "이 사람이 이 대화방을 한 번이라도 열어봤는가".
--
-- 안 읽은 표시를 messages.read_at 로만 세면 **메시지가 하나도 없는 새 대화방**을
-- 잡지 못한다. 인사말 없이 관심만 보내고 상호 하트가 되면 그런 방이 생기는데,
-- 목록에서 아무 표시가 없어 사용자는 새 대화가 열린 줄 모른다.
--
-- 방을 열면(메시지 목록 조회) 이 행이 생기고, 그때 하이라이트와 탭 배지가 꺼진다.
-- conversations 에 컬럼 두 개(user_a/user_b)로 넣지 않은 이유: 참여자가 두 명인
-- 걸 컬럼 이름에 박으면 RLS 정책이 "내 컬럼만" 을 표현할 수 없다.
-- =============================================================================

create table conversation_reads (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

comment on table conversation_reads is
  '사용자가 대화방을 마지막으로 연 시각. 새 대화방 하이라이트·탭 배지의 기준.';

alter table conversation_reads enable row level security;
create policy conversation_reads_own on conversation_reads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
