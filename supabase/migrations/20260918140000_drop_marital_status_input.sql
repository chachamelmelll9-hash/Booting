-- =============================================================================
-- 혼인 상태(사별/이혼)를 더 이상 입력받지 않는다 — 자격 확인만 남긴다
--
-- 왜: 사별인지 이혼인지는 부모님 입장에서 남에게 알리고 싶지 않은 가족사다.
-- 등록 자격(사별 또는 이혼만, 별거·혼인 중 제외 — PRD 원칙 4)은 자녀가
-- 시작 화면에서 문장을 읽고 "네, 해당됩니다" 로 확인하는 것으로 갈음한다.
-- 어느 쪽인지는 저장하지 않으므로 카드·상세·부모님 화면·추천 필터에서 모두 빠진다.
--
-- 컬럼은 지우지 않는다. 이전 버전(브랜치 `이혼사별여부있음`)이 넣어 둔 값과
-- 되돌릴 여지를 남기기 위해서다. 필수만 풀고, 확인 시각을 새로 기록한다.
-- =============================================================================

alter table parent_profiles
  alter column marital_status drop not null;

alter table parent_profiles
  add column if not exists eligibility_confirmed_at timestamptz;

-- 이미 등록된 프로필은 옛 화면에서 혼인 상태를 골라 통과했으니 확인한 것으로 본다
update parent_profiles
  set eligibility_confirmed_at = coalesce(eligibility_confirmed_at, created_at)
  where marital_status is not null;

comment on column parent_profiles.marital_status is
  '(2026-09-18 이후 입력받지 않음) 사별/이혼. 옛 데이터에만 값이 있고 어디에도 노출하지 않는다';
comment on column parent_profiles.eligibility_confirmed_at is
  '자녀가 "부모님은 사별 또는 이혼 상태(별거·혼인 중 아님)" 를 확인한 시각. 등록 자격의 근거';

-- 추천 필터의 혼인 조건도 뜻이 없어진다 — 값이 남아 있으면 옛 프로필만 걸러지므로 비운다
update discovery_filters set marital_filter = null where marital_filter is not null;
