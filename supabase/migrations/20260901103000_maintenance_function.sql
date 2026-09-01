-- =============================================================================
-- run_maintenance() — 시간 기반 규칙 3종
--
--   1. 미활동 60일 프로필 자동 비공개            (TODO-11)
--   2. 개설 90일 지난 대화방 읽기 전용 전환       (TODO-12)
--   3. 만남 확인 3일 미응답 재알림
--
-- 서버가 여러 인스턴스로 뜨면 중복 실행되므로 advisory lock 으로 단일 실행을
-- 보장한다. 세 규칙을 애플리케이션이 아니라 한 SQL 함수에 둔 이유:
-- 각 규칙이 "상태 변경 + 알림 발행"의 쌍이라, 둘 사이에서 프로세스가 죽으면
-- 알림 없이 조용히 비공개되는 프로필이 생긴다.
--
-- 최종 매칭 전이는 여기 없다 — matched 로 쓰는 곳은 meetings/match.service.ts 뿐이다.
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

  perform pg_advisory_unlock(hashtext('booting_maintenance'));

  return jsonb_build_object(
    'skipped', false,
    'hiddenProfiles', hidden_count,
    'readOnlyNotifications', readonly_count,
    'confirmReminders', reminded_count
  );
end;
$$;

comment on function public.run_maintenance is
  '시간 기반 규칙 3종. 서버가 주기적으로 rpc 로 호출한다. advisory lock 으로 단일 실행 보장.';
