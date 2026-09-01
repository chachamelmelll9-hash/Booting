-- =============================================================================
-- 별명(닉네임) 도입 — 공개 표기를 `김OO` 마스킹에서 별명으로 바꾼다
--
-- 왜 바꾸나:
--   `김OO`는 이름이 아니라 자리표시자다. 모든 프로필이 비슷해 보이고, 대화에서
--   상대를 부를 방법도 없다. 별명이 있으면 "텃밭 가꾸시는 분"처럼 남는다.
--
-- 프라이버시는 그대로다:
--   실명(display_name)은 여전히 어떤 공개 응답에도 실리지 않는다. 바뀌는 건
--   공개 자리에 마스킹 문자열 대신 **본인이 정한 별명**이 온다는 것뿐이다.
--   별명에 실명을 쓰는 건 막지 않는다 — 밝힐지 말지는 본인 선택이다. 다만
--   실수로 공개되지 않게 화면에서 경고하고 한 번 확인받는다.
--
-- 기존 행은 지금까지 노출되던 마스킹 문자열을 그대로 별명 초기값으로 삼는다 —
-- 화면 표기가 갑자기 달라지지 않게 하고, 사용자가 나중에 바꾸면 된다.
-- =============================================================================

alter table parent_profiles
  add column if not exists nickname text
  check (nickname is null or char_length(nickname) between 2 and 12);

update parent_profiles
   set nickname = left(display_name, 1) || repeat('O', greatest(char_length(display_name) - 1, 1))
 where nickname is null;

comment on column parent_profiles.nickname is
  '공개 표기용 별명. display_name(실명)은 계속 비공개이며 어떤 공개 DTO 에도 실리지 않는다.';
