---
type: Decision
title: 부모님은 앱이 아니라 웹에서 보고 결정한다
description: 앱 설치와 8자리 코드를 요구하던 부모님 화면을 걷어내고, 카카오 카드의 버튼이 서버가 그린 웹 프로필로 바로 간다. 신원은 링크 서명(30일). 앱의 부모님 화면은 삭제, 서버는 유지.
tags: [decision, parent, web]
sources:
  - id: c51850a2
    resource: commit:51850a2
  - id: c605267c
    resource: commit:605267c
  - id: ceac0e7c
    resource: commit:eac0e7c
  - id: session
    resource: session:beebb230-c0d5-44e2-8b3c-4b26fcc4e1ca
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 부모님은 웹으로

## 배경
09-03~04 의 부모님 화면은 앱 + 코드 로그인이었다. 소유자(09-07 17:46): "그리구 궁금한데 부모님은 앱 다운안받아도되는거야?" → "그럼 부모님이 앱없이 자녀가 보낸 링크 클릭하면 앱을 다운받아주세요 화면이 뜨는거야? 나는 그거 기획한적이없는데". 선택지 a(앱 유지+안내 개선)/b(웹) 중 (09-08) "b로 가줘 본인인증 스텁도 해주고 완성하면 부모화면 웹도 보여줘".

## 결정
- 카카오 카드 버튼 → **`/p/:token`** (서버 렌더 HTML). 목록 `/p/:token/all`, 상세, `[대화해보고 싶어요]` / `[아니요]`. 규칙은 앱과 같은 `recordInterest`/`recordDecline` — 앱과 웹이 갈리는 것은 **누구인지 알아내는 방법**뿐.
- 신원 = HMAC 서명(connectionId·userId·만료), DB 저장 없음, **30일**. `parent_shares` 행을 요구하지 않는다(콜백보다 링크가 먼저 만들어진다).
- 버튼을 부모님이 직접 누르게 한 이유: 웹을 보기 전용으로 두면 부모님의 답을 자녀가 대신 눌러야 하고, 그러면 결정의 주인이 자녀가 된다. 법적 동의도 이미 같은 방식.
- 거절은 그 인연 하나만 (`605267c` — 링크가 가리키는 프로필을 거절하면 목록 전체가 죽던 실측 버그).
- **앱의 `(parent)/`·`parent-view` feature·부모님 세션 라우팅·'부모님이신가요?' 버튼·접속 코드 안내 전부 삭제** (`eac0e7c`). 카드의 `androidExecutionParams` 도 제거 — 남기면 앱이 깔린 부모님만 앱이 열려 자녀 로그인 화면을 본다. **서버 `/api/parent/*` 와 `access_code` 는 둔다** — 되돌릴 일에 대비, 앱만 지우면 서버는 조용히 놀 뿐.

## 버린 대안
`/open/:connectionId` "앱을 받아 코드를 넣으세요" 안내 페이지 (`fd26cb7`, 하루 살았다) — 삭제.

## 근거
"부모님께 앱 설치와 8자리 코드를 요구하던 길을 걷어낸다. 그건 PRD 에 없던 요구다 — PRD 의 부모님 접점은 동의 하나이고, 프로필은 자녀가 보여 드리는 것으로 돼 있다. 60~70대에게 스토어 설치와 코드 입력을 요구하면 이 서비스의 마지막 한 걸음에서 대부분이 멈춘다." 같은 데이터를 같은 규칙으로 다루는 화면이 둘이면 고칠 때마다 두 곳을 고쳐야 한다.

## 이후
사주 한 줄이 부모님 웹에도 들어갔다 (`af83491`). `withKakaoLinkScheme.js` 는 미사용으로 남았다. 관련: [parent-web-view](../concepts/parent-web-view.md), 대체된 [09-03 앱 화면](2026-09-03-parent-surface-in-app.md).
