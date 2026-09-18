-- =============================================================================
-- 추천 필터에 키 범위 추가 — discovery_filters.height_min / height_max
--
-- 흡연 여부(smoking)는 초기 스키마부터 컬럼이 있었고 화면에만 없었다.
-- 키는 parent_profiles.height_cm 과 같은 범위(120~220cm)로 묶는다 — 프로필에
-- 넣을 수 없는 값으로 거르면 결과가 항상 비어 "앱이 고장났다" 로 읽힌다.
-- 자녀 수·동거 가족은 여전히 필터 항목이 아니다 (PRD: 필터 금지).
-- =============================================================================

alter table discovery_filters
  add column if not exists height_min integer
    check (height_min is null or height_min between 120 and 220),
  add column if not exists height_max integer
    check (height_max is null or height_max between 120 and 220);

comment on column discovery_filters.height_min is '상대 부모님 키 하한(cm). null = 제한 없음';
comment on column discovery_filters.height_max is '상대 부모님 키 상한(cm). null = 제한 없음';
