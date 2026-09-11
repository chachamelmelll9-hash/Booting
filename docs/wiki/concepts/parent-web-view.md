---
type: Concept
title: 부모님 웹 (/p/:token)
description: 부모님은 앱 없이 카톡 카드 → 웹에서 받은 프로필을 보고 결정한다. 서버가 HTML 을 그리고, 신원은 링크 서명(HMAC, 30일)이 대신한다. 매칭되면 그 페이지에 상대 연락처가 뜬다.
tags: [parent, web, server-render]
sources:
  - id: c51850a2
    resource: commit:51850a2
  - id: c605267c
    resource: commit:605267c
  - id: caf83491
    resource: commit:af83491
  - id: ceac0e7c
    resource: commit:eac0e7c
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 부모님 웹

코드: `apps/server/src/parent/parent-view.controller.ts` (HTML 렌더), `parent.service.ts` (`webInbox`, `webParties`, `recordInterest`, `recordDecline`).
링크는 `ConnectionsService.parentShareToken` 이 만들고 `PUBLIC_BASE_URL` 아래에 붙는다.

## 페이지

| 경로 | 무엇 |
|---|---|
| `GET /p/:token` | 카드가 가리키는 그 인연의 상대 프로필 상세 — 사진 전부(가로 스트립), 별명·나이·지역, **`을사일주 · 궁합 72점`**, 자녀 소개글, 부모님의 말, 만나고 싶은 분, 생활 정보(키·종교·직업·가족·음주·흡연·취미) |
| `GET /p/:token/all` | 자녀분이 지금까지 보내드린 프로필 **전부** — 링크 하나로 지난 프로필까지. 없으면 새 카드마다 지난 카톡을 뒤지셔야 한다 |
| `GET /p/:token/c/:connectionId` | 목록에서 고른 인연의 상세 |
| `POST /p/:token/c/:id/interest` | **[대화해보고 싶어요]** |
| `GET /p/:token/c/:id/decline` → `POST …/decline` | **[아니요]** — GET 은 확인 안내, POST 가 실행. 링크를 미리 읽는 메신저가 대신 지우지 못하게 (`605267c`) |

## 신원 = 서명

토큰은 `connectionId.userId.만료` 를 서버 비밀(`SUPABASE_SECRET_KEY`)로 HMAC 한 값이다. DB 에 저장하지 않는다 — 서명에 필요한 것이 다 들어 있고, 공유 버튼이 DB 쓰기를 기다리지 않는다. 철회할 수 없으므로 **수명 30일**.
`parent_shares` 행을 요구하지 않는다 — 그 행은 카카오 콜백이 도착해야 생기는데 링크는 공유 직전에 만들어진다. 대신 서명이 가리키는 사람이 그 인연의 당사자인지, 목록에서 고른 인연이 실제로 공유된 것인지를 확인한다.

**비밀키를 바꾸면 이미 보낸 링크가 전부 무효**다 (`infra/oracle/.env.example`).

## 결정 규칙

- [두 사람 규칙](two-person-rule.md) 그대로: 양쪽이 모두 누르면 `matched` → 이 페이지에 **상대 부모님 성함·전화번호 전체**(28px, `tel:` 링크)와 "두 분 모두 대화를 원하셨습니다. 편하실 때 연락해 보세요." 안심번호는 유료라 쓰지 않는다 (09-10 결정). 
- 한쪽만: "마음을 전해드렸습니다 — 상대분도 원하시면 그때 연락처를 알려드립니다."
- 매칭된 카드는 민트로 채우고 "{별명} 님과 마음이 통했습니다". 안 본 카드는 흰 바탕 + 민트 윤곽선 — 채움/윤곽으로 두 강조를 가른다 (`c8dac1f`)
- 이미 답한 카드에는 버튼을 다시 내밀지 않는다. 끝난 질문을 계속 내밀면 부모님은 자기가 뭘 잘못 눌렀나 하신다
- **거절은 그 인연 하나만 닫는다.** 신원 확인(`webParties`)이 `ended` 를 만나도 null 을 주지 않는다 — 한 분을 거절했더니 받으신 세 분이 다 사라진 실측 버그 (`605267c`)
- '봤다'(`parent_viewed_at`)는 상세를 내주는 요청 안에서 서버가 찍는다. 별도 요청이면 신호 끊김에 유실됐다 (`c8dac1f`)

## 크기

부모님 기준. 본문 19px/행간 32, 사주 줄 19px·`#0D9488`·굵게 (앱보다 한 단계 크다). 돋보기 없이 읽히는 크기를 먼저 잡고 나머지를 맞췄다.

## 없어진 것

- 앱의 부모님 화면 (`(parent)/`, 8자리 코드 로그인, `parent-view` feature) — `eac0e7c`. 서버 `/api/parent/*` 와 `parent_profiles.access_code` 는 남아 있다 (되돌릴 일에 대비, 앱만 지우면 서버는 조용히 놀 뿐)
- `/open/:connectionId` 안내 페이지("앱을 받아 코드를 넣으세요") — `51850a2`
- 카카오 카드의 `androidExecutionParams` — 남겨 두면 앱이 깔린 부모님만 앱이 열려 자녀 로그인 화면을 보신다

## 개발에서 보는 법

터널(`cloudflared`) 주소 + `/p/<token>`. `scripts/dev-up.ps1` 이 터널을 띄운다. 09-10 부터는 에뮬레이터 대신 **PC 크롬**으로 연다 (메모리). 토큰은 `GET /connections/:id/share-token` 응답의 `url`.

## 관련

[결정 2026-09-08](../decisions/2026-09-08-parent-web-not-app.md) · [parent-share-kakao](parent-share-kakao.md) · [saju-compatibility](saju-compatibility.md)
