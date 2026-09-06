-- =============================================================================
-- run_maintenance() 에 규칙 4를 더한다 — 받은 관심 2주 자동 삭제.
--
-- 화면(받은 관심)이 "모든 카드는 2주 뒤에 자동 삭제됩니다."라고 약속하는데
-- 실제로 지우는 곳이 없었다. 문구만 있고 동작이 없으면, 2주가 지나도 남아
-- 있는 카드를 보고 사용자는 앱을 못 믿게 된다.
--
-- **연결된 하트는 지우지 않는다.** 양쪽이 하트를 주고받아 connections 가
-- 생겼다면 그건 이미 대화로 넘어간 관계다. 그 하트를 지우면 상호 판정의
-- 근거가 사라지고, 남은 연결이 어디서 왔는지 설명할 수 없게 된다.
--
-- 부수 효과 하나를 의도적으로 받아들인다: 하트가 지워지면 추천 제외 목록에서도
-- 빠지므로, 2주 동안 답이 없던 상대가 다시 추천에 나올 수 있다. 답 없는 관심을
-- 영구 제외로 남겨 두는 것보다 다시 한 번 기회를 주는 편이 맞다.
-- =============================================================================

create or replace function public.run_maintenance()
returns jsonb
language plpgsql
as $$
declare
  got_lock        boolean;
  hidden_count    integer := 0;
  readonly_count  integer := 0;
  reminded_count  integer := 0;
  expired_count   integer := 0;
begin
  select pg_try_advisory_lock(hashtext('booting_maintenance')) into got_lock;
  if not got_lock then
    return jsonb_build_object('skipped', true);
  end if;

  -- 1) 미활동 60일 → 비공개 + 알림
  with h as (
    update parent_profiles
       set status = 'hidden', published_at = null
     where status = 'published'
       and last_active_at < now() - interval '60 days'
    returning id, user_id
  )
  insert into notifications (user_id, type, payload)
  select user_id, 'profile_auto_hidden', jsonb_build_object('profileId', id)
    from h;
  get diagnostics hidden_count = row_count;

  -- 2) 개설 90일 → 읽기 전용 + 참여자 2인 알림
  with ro as (
    update conversations
       set read_only_at = now()
     where read_only_at is null
       and opened_at < now() - interval '90 days'
    returning connection_id
  )
  insert into notifications (user_id, type, connection_id, payload)
  select u.user_id, 'conversation_read_only', ro.connection_id, '{}'::jsonb
    from ro
    join connections c on c.id = ro.connection_id
    cross join lateral (values (c.user_a_id), (c.user_b_id)) as u(user_id);
  get diagnostics readonly_count = row_count;

  -- 3) 만남 확인 3일 미응답 → 재알림 (같은 인연에 3일 내 재알림이 없을 때만)
  with pending as (
    select m.id as meeting_id, m.connection_id, u.user_id
      from meetings m
      join connections c on c.id = m.connection_id
      cross join lateral (values (c.user_a_id), (c.user_b_id)) as u(user_id)
     where m.status = 'confirm_pending'
       and m.meet_at < now() - interval '3 days'
       and not exists (
         select 1 from meeting_confirmations mc
          where mc.meeting_id = m.id and mc.user_id = u.user_id
       )
       and not exists (
         select 1 from notifications n
          where n.user_id = u.user_id
            and n.type = 'meeting_confirm_reminder'
            and n.connection_id = m.connection_id
            and n.created_at > now() - interval '3 days'
       )
  )
  insert into notifications (user_id, type, connection_id, payload)
  select user_id, 'meeting_confirm_reminder', connection_id,
         jsonb_build_object('meetingId', meeting_id)
    from pending;
  get diagnostics reminded_count = row_count;

  -- 4) 하트 14일 경과 → 삭제 (연결로 이어지지 않은 것만)
  --
  -- 알림을 만들지 않는다. 2주 동안 답하지 않기로 한 결과라 새 소식이 아니고,
  -- 사라진 카드마다 알림이 오면 그게 더 성가시다. 삭제 예고는 목록 화면의
  -- 안내 문구가 미리 하고 있다.
  with expired as (
    delete from hearts h
     using parent_profiles p
     where p.id = h.target_parent_profile_id
       and h.created_at < now() - interval '14 days'
       and not exists (
         select 1 from connections c
          where (c.user_a_id = h.sender_user_id and c.user_b_id = p.user_id)
             or (c.user_a_id = p.user_id and c.user_b_id = h.sender_user_id)
       )
    returning h.id
  )
  select count(*) into expired_count from expired;

  perform pg_advisory_unlock(hashtext('booting_maintenance'));

  return jsonb_build_object(
    'skipped', false,
    'hiddenProfiles', hidden_count,
    'readOnlyNotifications', readonly_count,
    'confirmReminders', reminded_count,
    'expiredHearts', expired_count
  );
end;
$$;

comment on function public.run_maintenance is
  '시간 기반 규칙 4종(비공개·읽기전용·만남재알림·하트 2주 만료). 서버가 주기적으로 rpc 로 호출한다. advisory lock 으로 단일 실행 보장.';
