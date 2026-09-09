-- =============================================================================
-- 추천 정렬·최소 궁합 조건 (사주 궁합 매칭)
--
-- 궁합 점수는 DB 가 모르는 값이다 — 생년월일·출생시각에서 절기로 사주팔자를
-- 세워야 나오므로 서버가 계산한다. 그래서 여기 저장하는 것은 **점수가 아니라
-- 조건**뿐이다.
--
-- sort            : 'recent'(최근 활동 순, 기존 동작) | 'compatibility'(궁합 높은 순)
-- min_compatibility: 이 점수 미만 제외. null 이면 제한 없음.
--                   화면이 칩으로 고르는 값만 받는다 — 자유 정수를 허용하면
--                   칩 구성을 바꿨을 때 저장된 값이 화면 어디에도 안 보인다.
--
-- 우리 부모님 사주가 없으면 궁합을 낼 수 없으므로, 그때는 서버가 이 두 값을
-- **무시하고** 최근 활동 순으로 돌려준다 (사주 미입력이 홈을 비우면 안 된다).
-- =============================================================================

alter table discovery_filters
  add column if not exists sort text not null default 'recent'
  check (sort in ('recent', 'compatibility'));

alter table discovery_filters
  add column if not exists min_compatibility smallint
  check (min_compatibility is null or min_compatibility in (50, 60, 70, 80));

comment on column discovery_filters.sort is
  '추천 정렬. compatibility 는 우리 부모님과의 사주 궁합이 높은 순 (PRD 5.3 / TODO-13).';
comment on column discovery_filters.min_compatibility is
  '최소 궁합 점수. null 이면 제한 없음. 사주를 적지 않은 프로필도 함께 제외된다.';
