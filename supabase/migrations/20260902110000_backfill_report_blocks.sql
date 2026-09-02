-- =============================================================================
-- 신고는 차단을 포함한다 — 이미 접수된 신고에 소급 적용한다.
--
-- 이 규칙이 들어오기 전에 낸 신고는 reports 행만 남기고 아무것도 끊지 않았다.
-- 그 결과 신고한 상대가 대화방과 추천에 그대로 남아 "신고했는데 왜 계속
-- 보이냐"가 된다. 기존 신고에도 차단을 채워 넣고 그 사이 인연을 종료한다.
-- =============================================================================

insert into blocks (user_id, blocked_user_id)
select distinct r.reporter_user_id, r.target_user_id
from reports r
where r.target_user_id is not null
  and r.target_user_id <> r.reporter_user_id
on conflict (user_id, blocked_user_id) do nothing;

update connections c
set status = 'ended',
    ended_reason = 'blocked',
    ended_at = now()
where c.status <> 'ended'
  and exists (
    select 1
    from blocks b
    where (b.user_id = c.user_a_id and b.blocked_user_id = c.user_b_id)
       or (b.user_id = c.user_b_id and b.blocked_user_id = c.user_a_id)
  );
