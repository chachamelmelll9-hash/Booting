---
type: Concept
title: 부모님 동의 — 링크로 직접
description: 자녀가 '여쭤봤습니다'를 누르는 것은 동의가 아니다. 서버가 그린 동의 페이지 링크를 카톡으로 보내고, 부모님이 직접 누른 기록만 동의로 인정한다. 개인정보보호법 고지 항목을 그대로 담는다.
tags: [consent, legal, parent]
sources:
  - id: caae19f6
    resource: commit:aae19f6
  - id: cdfb7e40
    resource: commit:dfb7e40
  - id: c2a78a18
    resource: commit:2a78a18
  - id: c7f03bb1
    resource: commit:7f03bb1
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 부모님 동의

## 지금 동작

1. 등록 4/5 단계에서 자녀가 **[부모님 동의 받기]** → `POST /parent-profile/consent` (`createConsentLink`) → 32바이트 난수 토큰, **3일 만료**, `{PUBLIC_BASE_URL}/consent/{token}`.
2. 앱은 OS 공유 시트(`Share.share`)로 링크를 **일반 메시지**로 보낸다 — 카톡이든 문자든. 카카오 카드로 보내지 않는 이유: 카드 링크는 콘솔에 등록된 도메인만 열리고(`INTENT_NOT_RESOLVED` 실측), 카톡을 안 쓰는 부모님께는 문자가 낫다 (`dfb7e40`). 시트를 그냥 닫으면 기다림을 시작하지 않는다.
3. 부모님이 링크를 열면 서버가 HTML 을 그린다 — `GET /consent/:token` (`consent-page.controller.ts`, `/api` prefix 제외). 항상 200 — 브라우저 오류 페이지는 안내를 가린다.
4. **[동의합니다]** → `POST /consent/:token/agree` → `parent_consents` 에 `consented_at`·`agreed_ip`·`agreed_user_agent`·`consent_version` 기록, `method = 'link'`.
5. 자녀 앱은 5초 간격으로 24번 물어보다 "{성함} 님이 직접 동의해 주셨습니다" 로 전환.

부모님 **연락처는 동의 방법과 무관하게 필수**다 (`7f03bb1`) — 그 번호가 매칭 시 서로에게 열리는 값이라 비어 있으면 서비스의 목적지가 없다.

## 왜 링크인가

"자녀가 '직접 여쭤봤습니다' 를 눌러 스스로 기록했다. 그건 자녀의 진술이지 부모님의 동의가 아니다. 개인정보보호법이 요구하는 것은 정보주체 본인의 동의이고, 다투게 되면 동의를 받았다는 사실을 증명해야 하는 쪽은 우리다." (`aae19f6`)

부모님께 계정이 없으니 **토큰이 곧 신원**이다. 무기한이면 유출된 링크가 언제까지고 쓰이고, 너무 짧으면 다음 날 카톡을 보신 부모님이 못 누르신다 → 사흘.

## 동의 문안 (`consent-document.ts`)

`CONSENT_VERSION = '2026-09-03'`, 섹션 6개. 법이 요구하는 고지를 항목별로 나눴다:

- 목적·항목·보유기간을 **각각** (제15조 2항)
- 제3자 제공은 받는 자·목적·항목·기간을 따로 (제17조 2항) — 상대 자녀·상대 부모님에게 공개되는 것
- 거부권과 그때의 불이익
- 열람·정정·삭제·처리정지·**철회** 권리 (제35~37조, 제39조의7)

부모님이 읽으신다는 전제로 글자를 키우고 문장을 짧게 썼다. **문안을 고치면 `CONSENT_VERSION` 을 반드시 올린다** — 예전 동의가 무엇에 대한 것이었는지가 그 값으로만 남는다.

동의 페이지 하단 문구: "실명·생년월일·연락처·정확한 주소는 공개되지 않습니다." — 이 약속이 [privacy-rules](privacy-rules.md) 의 기준이다.

## 철회

부모님은 언제든 철회할 수 있고 철회하면 **즉시 비공개** (PRD 4.3, `POST /parent-profile/consent/revoke` → `hidden`). 받은 하트·대화는 유지되되 새 추천에서 빠진다.

## 배지

공개 프로필에 남는 신뢰 배지는 **'부모님 동의' 하나**다 (`2a78a18`). '자녀 인증'·'가족관계'는 공개 프로필에 늘 켜져 있어 아무것도 알려주지 않았고, '검수 완료'는 운영 용어라 원래 화면에 없다.

## 개발 빌드

부모님도 카톡 계정도 없는 에뮬레이터를 위해 **"부모님이 동의하신 것으로 처리"** 버튼이 있다. 우회가 아니라 부모님이 하실 일을 그대로 한다 — 링크를 만들고 그 페이지의 `agree` 를 부른다. 서버가 보기에 진짜 동의와 같은 경로·같은 기록. 운영 빌드에는 없다 (`2a78a18`). `PUBLIC_BASE_URL` 이 죽은 터널 주소면 여기서 "동의 처리 실패" 가 난다 — [lesson](../lessons/metro-and-dev-servers.md).

## 관련

[결정 2026-09-03](../decisions/2026-09-03-parent-consent-by-link.md) · [verification-account-check](verification-account-check.md) · [privacy-rules](privacy-rules.md) · 스펙 `docs/features/parent-profile-consent.md`
