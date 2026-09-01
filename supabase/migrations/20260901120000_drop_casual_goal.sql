-- =============================================================================
-- 관계 목적에서 '가벼운 만남'(casual) 제거 — 사용자 결정 (2026-09-01)
--
-- enum 값을 그냥 남겨두면 서버 검증만 막고 DB 는 계속 허용하는 상태가 된다.
-- 나중에 service-role 경로로 들어올 수 있으므로 타입 자체를 다시 만든다.
--
-- 기존 데이터에 casual 이 있으면 'serious' 로 옮긴 뒤 진행한다 (유실 방지).
-- =============================================================================

-- 1) 남아 있는 casual 행을 먼저 정리한다
update relationship_goals set goal = 'serious'
 where goal = 'casual'
   and not exists (
     select 1 from relationship_goals other
      where other.parent_profile_id = relationship_goals.parent_profile_id
        and other.goal = 'serious'
   );
delete from relationship_goals where goal = 'casual';

update discovery_filters
   set goals = array_remove(goals, 'casual'::relationship_goal)
 where 'casual' = any(goals);

-- 2) 타입 재생성
alter type relationship_goal rename to relationship_goal_old;

create type relationship_goal as enum (
  'remarriage', 'serious', 'travel_hobby', 'same_sex_friend', 'meal_walk', 'undecided'
);

alter table discovery_filters alter column goals drop default;

alter table relationship_goals
  alter column goal type relationship_goal using goal::text::relationship_goal;

alter table discovery_filters
  alter column goals type relationship_goal[] using goals::text[]::relationship_goal[];

alter table discovery_filters alter column goals set default '{}';

drop type relationship_goal_old;
