-- =============================================================================
-- 부모님 화면 — 접속 코드 · 세션 · 결정.
--
-- 부모님은 계정이 없다(스키마 원칙 2). 그래서 회원가입도 비밀번호도 없이
-- **자녀가 알려준 6자리 코드**만으로 들어온다. 코드는 부모님 프로필 하나에
-- 붙고 만료되지 않는다 — 부모님이 매번 다른 코드를 받아 적어야 하면 그 자체가
-- 이 서비스를 못 쓰는 이유가 된다.
--
-- 부모님이 하는 일은 둘뿐이다: 자녀가 보내준 프로필을 보고
--   - '대화해보고 싶어요'  → parent_interests.kind = 'interested'
--   - '다른 프로필 볼래요' → parent_interests.kind = 'declined' (인연 종료)
-- 양쪽 부모님이 모두 interested 면 그때 연락처를 서로 공개한다.
-- =============================================================================

-- --- 1. 접속 코드 ------------------------------------------------------------
-- 헷갈리는 글자(0/O, 1/I/L)를 뺀 32자 알파벳. 부모님이 전화로 불러 주기도 한다.
create or replace function generate_parent_access_code() returns text as $$
declare
  alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  end loop;
  return result;
end;
$$ language plpgsql volatile;

alter table parent_profiles
  add column access_code text unique;

comment on column parent_profiles.access_code is
  '부모님 접속 코드 6자리. 자녀 화면에서 확인해 부모님께 알려준다. 만료 없음.';

-- 이미 만들어진 프로필에도 채워 넣는다 (충돌하면 다시 뽑는다)
do $$
declare
  row_id uuid;
  candidate text;
begin
  for row_id in select id from parent_profiles where access_code is null loop
    loop
      candidate := generate_parent_access_code();
      exit when not exists (select 1 from parent_profiles where access_code = candidate);
    end loop;
    update parent_profiles set access_code = candidate where id = row_id;
  end loop;
end $$;

-- 새 프로필은 만들어질 때 자동으로 받는다
create or replace function set_parent_access_code() returns trigger as $$
declare
  candidate text;
begin
  if new.access_code is null then
    loop
      candidate := generate_parent_access_code();
      exit when not exists (select 1 from parent_profiles where access_code = candidate);
    end loop;
    new.access_code := candidate;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger parent_profiles_access_code
  before insert on parent_profiles
  for each row execute function set_parent_access_code();

-- --- 2. 부모님 세션 ----------------------------------------------------------
-- 부모님은 auth.users 가 없어 Supabase JWT 를 발급할 수 없다. 서버가 직접
-- 불투명 토큰을 발급하고 이 표로 검증한다.
create table parent_sessions (
  token             text primary key,
  parent_profile_id uuid not null references parent_profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  last_seen_at      timestamptz not null default now()
);
create index parent_sessions_profile_idx on parent_sessions (parent_profile_id);

comment on table parent_sessions is
  '부모님 접속 토큰. 서버가 service-role 로만 읽고 쓴다 (클라이언트 직결 없음).';

alter table parent_sessions enable row level security;
-- 정책 없음 = 클라이언트 직결로는 아무것도 못 읽는다. 서버만 접근한다.

-- --- 3. 부모님이 본 시각 -----------------------------------------------------
-- 확인하지 않은 프로필을 초록으로 강조한다. 자녀가 공유한 건(parent_shares)에
-- 붙는 값이라 별도 표를 만들지 않는다.
alter table parent_shares
  add column parent_viewed_at timestamptz;

comment on column parent_shares.parent_viewed_at is
  '부모님이 이 프로필을 연 시각. null 이면 부모님 화면에서 초록 강조.';

-- --- 4. 부모님의 결정 --------------------------------------------------------
create type parent_interest_kind as enum ('interested', 'declined');

create table parent_interests (
  connection_id     uuid not null references connections(id) on delete cascade,
  parent_profile_id uuid not null references parent_profiles(id) on delete cascade,
  kind              parent_interest_kind not null,
  created_at        timestamptz not null default now(),
  primary key (connection_id, parent_profile_id)
);
create index parent_interests_connection_idx on parent_interests (connection_id);

comment on table parent_interests is
  '부모님이 상대 프로필에 대해 내린 결정. 양쪽이 interested 면 연락처를 공개한다.';

alter table parent_interests enable row level security;
-- 서버만 접근한다 (부모님은 Supabase 계정이 없어 auth.uid() 가 없다)
