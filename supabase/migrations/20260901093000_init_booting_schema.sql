-- =============================================================================
-- 부팅(Booting) — 초기 스키마
--
-- 설계 근거: docs/features/data-model.md, docs/features/architecture.md
--
-- 원칙
--   1. 표시 문구는 저장하지 않는다. enum 코드값만 저장하고 문구는 클라이언트
--      shared/config/* 단일 소스에서 온다 (PRD 10.3 '매칭 성공' 오용 방지).
--   2. 부모님은 계정이 없다. parent_profiles + parent_consents 로만 존재한다.
--   3. RLS 는 2차 방어선이다. 서버는 service-role 로 붙되 모든 쿼리에 userId 를
--      직접 넣는다 (IDOR). RLS 는 클라이언트 직결·키 유출 시의 최후 방어다.
--   4. 위치는 GPS 가 아니라 region_code(시·군·구)로만 저장한다 (PRD 비공개 규칙).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. 공통
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. 열거형
-- -----------------------------------------------------------------------------
-- 별거(separated)는 등록 자격이 없다 — 클라이언트 maritalStatus.ts 가 차단 사유로
-- 처리하고 DB 에는 자격을 통과한 두 값만 들어온다.
create type marital_status as enum ('bereaved', 'divorced');

create type profile_status as enum (
  'draft', 'consent_pending', 'review', 'published', 'hidden', 'rejected'
);

create type relationship_goal as enum (
  'remarriage', 'serious', 'casual', 'travel_hobby',
  'same_sex_friend', 'meal_walk', 'undecided'
);

create type connection_status as enum (
  'mutual_heart', 'chatting', 'parent_intent',
  'meeting_scheduled', 'meeting_confirm_pending', 'matched', 'ended'
);

create type parent_intent_kind as enum ('willing', 'thinking', 'declined');

create type meeting_feedback_kind as enum ('continue', 'friends', 'thinking', 'no_more');

create type family_doc_status as enum ('none', 'pending', 'approved', 'rejected');

create type consent_method as enum ('sms', 'in_person');

create type review_status as enum ('pending', 'approved', 'rejected');

create type meeting_status as enum ('proposed', 'accepted', 'confirm_pending', 'completed', 'cancelled');

create type report_status as enum ('pending', 'reviewing', 'resolved', 'dismissed');

create type calendar_type as enum ('solar', 'lunar');

create type notification_kind as enum (
  'heart_received', 'mutual_heart', 'message', 'parent_intent',
  'meeting_proposed', 'meeting_accepted', 'meeting_confirm_request',
  'meeting_confirm_reminder', 'matched', 'profile_approved',
  'profile_rejected', 'profile_auto_hidden', 'conversation_read_only'
);

-- -----------------------------------------------------------------------------
-- 2. 참조 데이터 — regions (시·군·구)
-- -----------------------------------------------------------------------------
create table regions (
  code      text primary key,
  sido      text not null,
  sigungu   text not null,
  lat       double precision not null,
  lng       double precision not null,
  sort_order integer not null default 0
);
comment on table regions is '시·군·구 참조 데이터. 좌표는 반경 필터 계산용 대표점이며 사용자 실위치가 아니다.';

alter table regions enable row level security;
create policy regions_read_all on regions for select using (true);

-- -----------------------------------------------------------------------------
-- 3. 자녀 인증 — child_verifications
-- -----------------------------------------------------------------------------
create table child_verifications (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  phone              text,
  phone_verified_at  timestamptz,
  family_doc_status  family_doc_status not null default 'none',
  family_doc_path    text,
  family_verified_at timestamptz,
  reject_reason      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on column child_verifications.family_doc_path is
  '가족관계증명서 비공개 버킷 경로. 어떤 공개 DTO 에도 실리지 않는다 (PRD 비공개 규칙).';

create trigger child_verifications_updated_at
  before update on child_verifications
  for each row execute function public.set_updated_at();

alter table child_verifications enable row level security;
create policy child_verifications_own on child_verifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. 부모님 프로필 — parent_profiles
-- -----------------------------------------------------------------------------
create table parent_profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references auth.users(id) on delete cascade,
  display_name         text not null,
  gender               text not null check (gender in ('male', 'female')),
  birth_date           date not null,
  region_code          text not null references regions(code),
  marital_status       marital_status not null,
  marital_since        date,
  children_count       text,
  living_with          text,
  religion             text,
  occupation           text,
  retired_occupation   text,
  economically_active  boolean,
  drinking             text,
  smoking              text,
  hobbies              text[] not null default '{}',
  motto                text,
  intro_by_child       text,
  desired_partner      text,
  parent_message       text,
  status               profile_status not null default 'draft',
  published_at         timestamptz,
  last_active_at       timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
comment on table parent_profiles is
  'TODO-07: 자녀 1인당 부모님 프로필 1개 (user_id unique). display_name 은 실명이며 서버가 마스킹해서 내려준다.';

-- 만 50세 이상 (TODO-02).
-- CHECK 제약은 current_date 가 STABLE 이라 쓸 수 없다 (42P17) — 트리거로 강제한다.
create or replace function public.enforce_parent_min_age()
returns trigger
language plpgsql
as $$
begin
  if new.birth_date > (current_date - interval '50 years') then
    raise exception 'PARENT_MIN_AGE: 부모님은 만 50세 이상이어야 합니다'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger parent_profiles_min_age
  before insert or update of birth_date on parent_profiles
  for each row execute function public.enforce_parent_min_age();

create trigger parent_profiles_updated_at
  before update on parent_profiles
  for each row execute function public.set_updated_at();

create index profiles_discovery_idx
  on parent_profiles (status, region_code, gender, birth_date);
create index profiles_last_active_idx
  on parent_profiles (status, last_active_at desc);

alter table parent_profiles enable row level security;
create policy parent_profile_owner on parent_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy parent_profile_public_read on parent_profiles
  for select using (status = 'published');

-- -----------------------------------------------------------------------------
-- 5. 사진 — parent_photos
-- -----------------------------------------------------------------------------
create table parent_photos (
  id                uuid primary key default gen_random_uuid(),
  parent_profile_id uuid not null references parent_profiles(id) on delete cascade,
  storage_path      text not null,
  is_primary        boolean not null default false,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);

create index parent_photos_profile_idx on parent_photos (parent_profile_id, sort_order);
-- 대표 사진은 프로필당 한 장
create unique index parent_photos_one_primary
  on parent_photos (parent_profile_id) where is_primary;

alter table parent_photos enable row level security;
create policy parent_photos_owner on parent_photos
  for all
  using (exists (select 1 from parent_profiles p
                 where p.id = parent_profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from parent_profiles p
                      where p.id = parent_profile_id and p.user_id = auth.uid()));
create policy parent_photos_public_read on parent_photos
  for select
  using (exists (select 1 from parent_profiles p
                 where p.id = parent_profile_id and p.status = 'published'));

-- -----------------------------------------------------------------------------
-- 6. 부모님 동의 — parent_consents
-- -----------------------------------------------------------------------------
create table parent_consents (
  id                uuid primary key default gen_random_uuid(),
  parent_profile_id uuid not null references parent_profiles(id) on delete cascade,
  method            consent_method not null,
  parent_name       text not null,
  phone             text,
  token             text,
  sent_at           timestamptz,
  consented_at      timestamptz,
  revoked_at        timestamptz,
  created_at        timestamptz not null default now()
);
comment on table parent_consents is
  '부모님 동의 없이는 published 로 갈 수 없다. 철회(revoked_at)는 프로필을 즉시 hidden 으로 되돌린다.';

create index parent_consents_profile_idx on parent_consents (parent_profile_id, created_at desc);

alter table parent_consents enable row level security;
create policy parent_consents_owner on parent_consents
  for all
  using (exists (select 1 from parent_profiles p
                 where p.id = parent_profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from parent_profiles p
                      where p.id = parent_profile_id and p.user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 7. 사주 — saju_infos
-- -----------------------------------------------------------------------------
create table saju_infos (
  id                 uuid primary key default gen_random_uuid(),
  parent_profile_id  uuid not null unique references parent_profiles(id) on delete cascade,
  birth_date         date not null,
  calendar_type      calendar_type not null default 'solar',
  birth_time         time,
  birth_time_unknown boolean not null default false,
  is_public          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger saju_infos_updated_at
  before update on saju_infos
  for each row execute function public.set_updated_at();

alter table saju_infos enable row level security;
create policy saju_owner on saju_infos
  for all
  using (exists (select 1 from parent_profiles p
                 where p.id = parent_profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from parent_profiles p
                      where p.id = parent_profile_id and p.user_id = auth.uid()));
create policy saju_public_read on saju_infos
  for select
  using (is_public
         and exists (select 1 from parent_profiles p
                     where p.id = parent_profile_id and p.status = 'published'));

-- -----------------------------------------------------------------------------
-- 8. 관계 목적 — relationship_goals
-- -----------------------------------------------------------------------------
create table relationship_goals (
  id                uuid primary key default gen_random_uuid(),
  parent_profile_id uuid not null references parent_profiles(id) on delete cascade,
  goal              relationship_goal not null,
  unique (parent_profile_id, goal)
);

-- PRD 6장: 최대 2개, 'undecided' 는 단독 선택만
create or replace function public.enforce_relationship_goal_rules()
returns trigger
language plpgsql
as $$
declare
  total integer;
  has_undecided boolean;
begin
  select count(*), bool_or(goal = 'undecided')
    into total, has_undecided
    from relationship_goals
   where parent_profile_id = new.parent_profile_id;

  if total > 2 then
    raise exception 'GOALS_MAX_2: 관계 목적은 최대 2개까지 선택할 수 있습니다'
      using errcode = 'check_violation';
  end if;
  if has_undecided and total > 1 then
    raise exception 'GOALS_UNDECIDED_ALONE: 아직 모르겠음은 단독으로만 선택할 수 있습니다'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger relationship_goals_rules
  after insert or update on relationship_goals
  deferrable initially deferred
  for each row execute function public.enforce_relationship_goal_rules();

alter table relationship_goals enable row level security;
create policy relationship_goals_owner on relationship_goals
  for all
  using (exists (select 1 from parent_profiles p
                 where p.id = parent_profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from parent_profiles p
                      where p.id = parent_profile_id and p.user_id = auth.uid()));
create policy relationship_goals_public_read on relationship_goals
  for select
  using (exists (select 1 from parent_profiles p
                 where p.id = parent_profile_id and p.status = 'published'));

-- -----------------------------------------------------------------------------
-- 9. 검수 — profile_reviews
-- -----------------------------------------------------------------------------
create table profile_reviews (
  id                uuid primary key default gen_random_uuid(),
  parent_profile_id uuid not null references parent_profiles(id) on delete cascade,
  status            review_status not null default 'pending',
  reject_reason     text,
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now()
);
comment on table profile_reviews is
  'TODO-05: MVP 는 가족관계 확인을 자동 승인한다. 상태 기계는 실심사로 교체 가능하게 유지한다.';

create index profile_reviews_profile_idx on profile_reviews (parent_profile_id, created_at desc);

alter table profile_reviews enable row level security;
-- insert/update 는 service-role 전용 (정책 없음 = 클라이언트 차단)
create policy profile_reviews_owner_read on profile_reviews
  for select
  using (exists (select 1 from parent_profiles p
                 where p.id = parent_profile_id and p.user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 10. 추천 필터 — discovery_filters
-- -----------------------------------------------------------------------------
create table discovery_filters (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  target_gender       text check (target_gender in ('male', 'female')),
  age_min             integer,
  age_max             integer,
  region_code         text references regions(code),
  radius_km           integer not null default 30,  -- TODO-06 기본 30km
  marital_filter      marital_status,
  goals               relationship_goal[] not null default '{}',
  religion            text,
  drinking            text,
  smoking             text,
  economically_active boolean,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint radius_allowed check (radius_km in (10, 30, 50, 0))  -- 0 = 전국
);
comment on table discovery_filters is
  '자녀 수·동거 가족은 필터 컬럼이 없다 — 필터 금지 규칙을 스키마로 강제한다 (PRD).';

create trigger discovery_filters_updated_at
  before update on discovery_filters
  for each row execute function public.set_updated_at();

alter table discovery_filters enable row level security;
create policy discovery_filters_own on discovery_filters
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 11. 하트 / 넘기기 / 차단 / 신고
-- -----------------------------------------------------------------------------
create table hearts (
  id                       uuid primary key default gen_random_uuid(),
  sender_user_id           uuid not null references auth.users(id) on delete cascade,
  target_parent_profile_id uuid not null references parent_profiles(id) on delete cascade,
  read_at                  timestamptz,
  created_at               timestamptz not null default now(),
  unique (sender_user_id, target_parent_profile_id)
);
create index hearts_target_idx on hearts (target_parent_profile_id, created_at desc);

alter table hearts enable row level security;
create policy hearts_sender on hearts
  for all using (sender_user_id = auth.uid()) with check (sender_user_id = auth.uid());
create policy hearts_received_read on hearts
  for select
  using (exists (select 1 from parent_profiles p
                 where p.id = target_parent_profile_id and p.user_id = auth.uid()));

create table passes (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  target_parent_profile_id uuid not null references parent_profiles(id) on delete cascade,
  created_at               timestamptz not null default now(),
  unique (user_id, target_parent_profile_id)
);
create index passes_user_idx on passes (user_id, target_parent_profile_id);

alter table passes enable row level security;
create policy passes_own on passes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table blocks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (user_id, blocked_user_id),
  constraint block_not_self check (user_id <> blocked_user_id)
);
create index blocks_user_idx on blocks (user_id, blocked_user_id);
create index blocks_blocked_idx on blocks (blocked_user_id);

alter table blocks enable row level security;
create policy blocks_own on blocks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table reports (
  id                       uuid primary key default gen_random_uuid(),
  reporter_user_id         uuid not null references auth.users(id) on delete cascade,
  target_user_id           uuid references auth.users(id) on delete set null,
  target_parent_profile_id uuid references parent_profiles(id) on delete set null,
  reason                   text not null,
  detail                   text,
  status                   report_status not null default 'pending',
  created_at               timestamptz not null default now()
);
create index reports_reporter_idx on reports (reporter_user_id, created_at desc);

alter table reports enable row level security;
create policy reports_reporter on reports
  for select using (reporter_user_id = auth.uid());
create policy reports_reporter_insert on reports
  for insert with check (reporter_user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 12. 인연 — connections / conversations / messages
-- -----------------------------------------------------------------------------
create table connections (
  id                 uuid primary key default gen_random_uuid(),
  user_a_id          uuid not null references auth.users(id) on delete cascade,
  user_b_id          uuid not null references auth.users(id) on delete cascade,
  parent_profile_a_id uuid not null references parent_profiles(id) on delete cascade,
  parent_profile_b_id uuid not null references parent_profiles(id) on delete cascade,
  status             connection_status not null default 'mutual_heart',
  ended_reason       text,
  ended_at           timestamptz,
  matched_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint connection_distinct_users check (user_a_id <> user_b_id)
);
comment on column connections.status is
  'matched 로의 전이는 서버 meetings/match.service.ts 한 곳에서만 일어난다. 모바일에 쓰기 경로 없음.';

-- 같은 두 사람 사이에 인연은 하나 (순서 무관)
create unique index connections_pair_uniq
  on connections (least(user_a_id, user_b_id), greatest(user_a_id, user_b_id));
create index connections_user_a_idx on connections (user_a_id, status);
create index connections_user_b_idx on connections (user_b_id, status);

create trigger connections_updated_at
  before update on connections
  for each row execute function public.set_updated_at();

alter table connections enable row level security;
create policy connections_participants on connections
  for select using (user_a_id = auth.uid() or user_b_id = auth.uid());

create table conversations (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null unique references connections(id) on delete cascade,
  opened_at     timestamptz not null default now(),
  read_only_at  timestamptz,   -- TODO-12: 90일 경과 시 읽기 전용
  created_at    timestamptz not null default now()
);

alter table conversations enable row level security;
create policy conversations_participants on conversations
  for select
  using (exists (select 1 from connections c
                 where c.id = connection_id
                   and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())));

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_user_id  uuid not null references auth.users(id) on delete cascade,
  body            text not null check (length(body) between 1 and 2000),
  sent_at         timestamptz not null default now(),
  read_at         timestamptz
);
create index messages_conv_idx on messages (conversation_id, sent_at desc);

alter table messages enable row level security;
create policy messages_participants_read on messages
  for select
  using (exists (select 1 from conversations cv
                 join connections c on c.id = cv.connection_id
                 where cv.id = conversation_id
                   and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())));
create policy messages_own_insert on messages
  for insert
  with check (sender_user_id = auth.uid()
              and exists (select 1 from conversations cv
                          join connections c on c.id = cv.connection_id
                          where cv.id = conversation_id
                            and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())));

-- -----------------------------------------------------------------------------
-- 13. 만남 — parent_intents / meetings / meeting_confirmations / meeting_feedbacks
-- -----------------------------------------------------------------------------
create table parent_intents (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  intent        parent_intent_kind not null,
  responded_at  timestamptz not null default now(),
  unique (connection_id, user_id)
);

alter table parent_intents enable row level security;
create policy parent_intents_participants on parent_intents
  for select
  using (exists (select 1 from connections c
                 where c.id = connection_id
                   and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())));
create policy parent_intents_own_write on parent_intents
  for insert with check (user_id = auth.uid());

create table meetings (
  id                  uuid primary key default gen_random_uuid(),
  connection_id       uuid not null references connections(id) on delete cascade,
  proposed_by_user_id uuid not null references auth.users(id) on delete cascade,
  meet_at             timestamptz not null,
  place               text not null,
  child_accompanied   boolean not null default true,
  solo_reason         text,
  safety_ack_at       timestamptz,
  status              meeting_status not null default 'proposed',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- 자녀 미동행이면 사유와 안전수칙 확인이 반드시 있어야 한다 (TODO-03/14)
  constraint solo_requires_reason check (
    child_accompanied or (solo_reason is not null and safety_ack_at is not null)
  )
);
create index meetings_connection_idx on meetings (connection_id, created_at desc);
create index meetings_confirm_pending_idx on meetings (status, meet_at) where status = 'confirm_pending';

create trigger meetings_updated_at
  before update on meetings
  for each row execute function public.set_updated_at();

alter table meetings enable row level security;
create policy meetings_participants on meetings
  for select
  using (exists (select 1 from connections c
                 where c.id = connection_id
                   and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())));

create table meeting_confirmations (
  id           uuid primary key default gen_random_uuid(),
  meeting_id   uuid not null references meetings(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  reminded_at  timestamptz,
  unique (meeting_id, user_id)
);
comment on table meeting_confirmations is
  '참여자당 1건. 2건이 모여야 서버가 connections.status = matched 로 전이한다 (PRD: 한쪽 확인은 매칭이 아니다).';

alter table meeting_confirmations enable row level security;
create policy meeting_confirmations_participants on meeting_confirmations
  for select
  using (exists (select 1 from meetings m
                 join connections c on c.id = m.connection_id
                 where m.id = meeting_id
                   and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())));
create policy meeting_confirmations_own_insert on meeting_confirmations
  for insert with check (user_id = auth.uid());

create table meeting_feedbacks (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  response   meeting_feedback_kind not null,
  created_at timestamptz not null default now(),
  unique (meeting_id, user_id)
);
comment on table meeting_feedbacks is
  'PRD 12.3: 사후 응답은 상대에게 절대 공개되지 않는다. 작성자 본인만 select 한다.';

alter table meeting_feedbacks enable row level security;
create policy meeting_feedback_own on meeting_feedbacks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 14. 알림 — notifications
-- -----------------------------------------------------------------------------
create table notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          notification_kind not null,
  connection_id uuid references connections(id) on delete cascade,
  payload       jsonb not null default '{}'::jsonb,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

alter table notifications enable row level security;
create policy notifications_own on notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 15. Storage 버킷 — 둘 다 비공개. 조회는 서명 URL 로만.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('parent-photos', 'parent-photos', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('family-docs',   'family-docs',   false, 10485760,
   array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

-- 두 버킷 모두 "자기 폴더(user_id/...)"만 접근 가능
create policy parent_photos_own_objects on storage.objects
  for all to authenticated
  using (bucket_id = 'parent-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'parent-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy family_docs_own_objects on storage.objects
  for all to authenticated
  using (bucket_id = 'family-docs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'family-docs' and (storage.foldername(name))[1] = auth.uid()::text);
