-- 부모님 동의를 링크로 받는다.
--
-- 지금까지는 자녀가 "직접 여쭤봤습니다" 를 눌러 스스로 기록했다. 그건 자녀의
-- 진술이지 부모님의 동의가 아니다. 개인정보보호법이 요구하는 것은 정보주체
-- 본인의 동의이고, 분쟁이 생기면 "동의를 받았음" 을 처리자가 증명해야 한다
-- (제15조·제17조, 제22조). 자녀가 누른 버튼으로는 증명할 수 없다.
--
-- 그래서 부모님께 링크를 보내고, 부모님이 그 페이지에서 직접 누르신 기록을
-- 남긴다. 누가·언제·어떤 문안에 동의했는지가 함께 남아야 증명이 된다.

-- 링크로 받은 동의
alter type consent_method add value if not exists 'link';

alter table parent_consents
  -- 동의 링크 만료. 무기한 유효한 링크는 유출되면 계속 쓰인다
  add column if not exists expires_at timestamptz,
  -- 어떤 문안에 동의했는지. 문안이 바뀌면 예전 동의가 무엇에 대한 것이었는지
  -- 알 수 없게 된다 — 재동의를 받아야 할지 판단하는 근거다
  add column if not exists consent_version text,
  -- 동의 사실의 증빙. 누가 눌렀는지는 알 수 없어도 언제 어디서인지는 남긴다
  add column if not exists agreed_ip text,
  add column if not exists agreed_user_agent text;

comment on column parent_consents.token is
  '동의 링크의 열쇠. 부모님은 로그인하지 않으므로 이 값이 곧 신원이다 — 추측 불가능해야 한다.';
comment on column parent_consents.consent_version is
  '동의받은 문안의 버전. 문안이 바뀌면 이 값으로 재동의 대상을 가른다.';

-- 토큰 조회는 링크를 열 때마다 일어난다
create index if not exists parent_consents_token_idx on parent_consents (token);
