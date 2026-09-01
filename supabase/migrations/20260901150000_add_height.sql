-- =============================================================================
-- 부모님 키(cm) 추가
--
-- 범위 제약을 두는 이유: 자유 입력이면 170 을 1.7 이나 5'7" 로 쓰는 사람이
-- 반드시 나오고, 그 값이 그대로 상세 화면에 노출된다.
-- 상한/하한은 사람 키로 가능한 범위만 통과시킨다.
-- =============================================================================

alter table parent_profiles
  add column if not exists height_cm integer
  check (height_cm is null or height_cm between 120 and 220);

comment on column parent_profiles.height_cm is
  '부모님 키(cm). 상세 화면에서만 노출한다 — 카드는 간결하게 유지한다 (PRD 8.2).';
