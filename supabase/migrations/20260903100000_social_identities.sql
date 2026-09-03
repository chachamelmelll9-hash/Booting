-- 소셜 계정 ↔ 부팅 계정 연결.
--
-- Supabase 는 이메일이 같으면 소셜 신원을 기존 계정에 알아서 붙여 준다. 그런데
-- 카카오는 이메일을 안 준다 — '카카오계정(이메일)' 동의항목은 비즈니스 앱
-- (사업자등록) 이라야 열린다. 그래서 이메일로 가입한 사람이 카카오로 들어오면
-- 같은 사람인지 알 방법이 없어 계정이 하나 더 생긴다.
--
-- 이메일 대신 카카오가 항상 주는 값으로 잇는다: id_token 의 `sub`(회원번호).
-- 사용자가 로그인한 상태에서 한 번 연결해 두면, 그다음부터 카카오로 들어와도
-- 서버가 이 표를 보고 원래 계정의 세션을 내준다.
create table social_identities (
  provider     text        not null,
  -- 카카오 회원번호. 서비스마다 다른 값이라 다른 앱과 겹치지 않는다.
  provider_uid text        not null,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  linked_at    timestamptz not null default now(),

  primary key (provider, provider_uid),
  constraint social_identities_provider_check check (provider in ('kakao'))
);

comment on table social_identities is
  '소셜 로그인과 부팅 계정의 연결. 카카오가 이메일을 주지 않아 sub 로 잇는다.';

-- 한 계정에 같은 소셜은 하나만. 두 개가 붙으면 어느 쪽으로 로그인했는지에 따라
-- 다른 계정이 열리는 것처럼 보인다.
create unique index social_identities_one_per_provider
  on social_identities (user_id, provider);

-- 계정 삭제·연결 해제에서 user_id 로 찾는다
create index social_identities_user_idx on social_identities (user_id);

-- 서버(service key)만 읽고 쓴다. 정책을 두지 않아 anon/authenticated 는 닿지
-- 못한다 — 이 표를 직접 쓸 수 있으면 남의 계정에 자기 카카오를 붙일 수 있다.
alter table social_identities enable row level security;
