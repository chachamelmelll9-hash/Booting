-- =============================================================================
-- messages.kind — 사람이 친 말과 앱이 남긴 기록을 구분한다.
--
-- "부모님께 공유했습니다" 같은 줄은 대화방에 남아야 하지만 말풍선이면 안 된다.
-- 보낸 사람 말풍선으로 찍으면 자녀가 직접 한 말처럼 읽히고, 상대는 답을 해야
-- 하는지 헷갈린다. 가운데 회색 한 줄로 렌더한다.
--
-- sender_user_id 는 그대로 채운다 — 누가 한 행동인지는 남아야 한다.
-- =============================================================================

create type message_kind as enum ('text', 'system');

alter table messages
  add column kind message_kind not null default 'text';

comment on column messages.kind is
  'text = 사람이 친 메시지, system = 앱이 남긴 기록(부모님 공유 등). 렌더가 다르다.';
