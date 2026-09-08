-- =============================================================================
-- 휴대폰 본인인증을 **실제로** 한다.
--
-- 지금까지는 개발 스텁이었다 — 문자를 보내지 않고, 숫자이기만 하면 통과시켰다
-- (`TODO-04`). 화면은 "자녀분 본인 확인"이라고 말하는데 실제로는 아무도 확인하지
-- 않았다. 이 앱에서 본인확인은 **남의 부모님을 함부로 등록하지 못하게 하는**
-- 유일한 사전 장치라, 비어 있으면 그 뒤의 모든 안전 장치가 종이다.
--
-- 인증번호는 발급한 값을 그대로 두지 않고 해시로 둔다. DB 를 읽을 수 있는 사람이
-- 남의 인증을 대신 끝낼 수 있으면 인증이 아니다.
-- =============================================================================

alter table child_verifications
  add column if not exists code_hash       text,
  add column if not exists code_expires_at timestamptz,
  add column if not exists code_attempts   smallint not null default 0,
  add column if not exists code_sent_at    timestamptz;

comment on column child_verifications.code_hash is
  '발급한 인증번호의 해시. 평문은 어디에도 저장하지 않는다.';
comment on column child_verifications.code_attempts is
  '이번 번호에 대한 시도 횟수. 상한을 넘으면 다시 받아야 한다 (무차별 대입 차단).';
comment on column child_verifications.code_sent_at is
  '마지막 발송 시각. 재발송 간격을 여기서 잰다 (문자 비용·문자 폭탄 차단).';

-- =============================================================================
-- 인증된 번호 하나는 계정 하나에만 붙는다.
--
-- 본인확인의 목적이 "이 사람이 실재하는 한 사람인가" 인데, 같은 번호로 여러
-- 계정을 인증할 수 있으면 계정을 몇 개든 만들 수 있어 목적이 사라진다.
-- 아직 인증되지 않은 행(phone_verified_at is null)은 제약을 받지 않는다 —
-- 인증 도중인 번호까지 막으면 번호를 잘못 눌렀다 고치는 것도 막힌다.
-- =============================================================================
create unique index if not exists child_verifications_verified_phone_uniq
  on child_verifications (phone)
  where phone_verified_at is not null;
