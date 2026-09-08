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
-- 배포 전에 할 일: 번호 하나 = 계정 하나
--
-- 본인확인의 목적이 "이 사람이 실재하는 한 사람인가" 인데, 같은 번호로 여러
-- 계정을 인증할 수 있으면 계정을 몇 개든 만들 수 있어 목적이 사라진다. 그래서
-- 인증된 번호에는 유니크 인덱스가 있어야 한다.
--
-- 지금 걸지 않는 이유는 **스텁이 남긴 데이터** 때문이다. 문자를 보내지 않고
-- 아무 숫자나 통과시켰으므로 자리표시자 번호 하나에 계정이 여럿 붙어 있고
-- (실측: `01000000000` 에 14개), 인덱스 생성이 그 자리에서 실패한다.
--
-- 중복만 골라 인증을 푸는 방법도 있지만, 그렇게 하면 개발 중 화면 테스트에
-- 쓰는 계정들이 등록 첫 단계로 되돌아간다 (`nextSetupStep` 은 phoneVerified 가
-- false 면 프로필이 공개 상태여도 verification 으로 보낸다). 아직 실사용자가
-- 없는 단계에서 개발을 막을 이유가 없다.
--
-- 배포 직전에 아래를 한 번 돌린다. 그 시점의 '인증됨' 은 전부 검증된 적 없는
-- 값이므로 통째로 비우는 것이 맞다 — 남겨 두면 아무도 확인하지 않은 계정이
-- 확인된 것처럼 남는다.
--
--   update child_verifications
--      set phone_verified_at = null, updated_at = now()
--    where phone_verified_at is not null;
--
--   create unique index child_verifications_verified_phone_uniq
--     on child_verifications (phone)
--     where phone_verified_at is not null;
-- =============================================================================
