---
type: Concept
title: 용어집
description: 화면 문구·도메인 용어·코드 식별자가 서로 어떻게 대응하는지. 문서마다 헷갈리는 것(인연/매칭, 대화 연결/매칭 성공)을 한 곳에 못박는다.
tags: [glossary]
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 용어집

| 용어 | 뜻 | 코드/화면 |
|---|---|---|
| **부팅 / Booting** | 서비스명. 부모님 + 소개팅. 홈 표시명 `부팅`, 번들 `com.booting.app`, scheme `booting-mobile` | `app.json` |
| **자녀** | 앱 사용자. 계정(`auth.users`)을 가진 유일한 주체 | `User` |
| **부모님** | 등록 대상. 계정 없음. `parent_profiles` + `parent_consents` 로만 존재. 앱을 쓰지 않고 카톡 링크로 웹을 본다 | `ParentProfile` |
| **인연** | 두 자녀 사이의 관계 (`connections`). 도메인 용어 | `Connection` |
| **매칭 (탭)** | 인연 목록을 보는 탭의 이름. '인연' 과 같은 것을 가리킨다 (`dffea8c`) | `(tabs)/connections` |
| **관심 / 하트** | 자녀가 상대 부모님 프로필에 보내는 것. 화면 문구는 '관심', 코드는 `hearts` | `POST /hearts` |
| **인사말** | 관심과 함께 보내는 1~200자. 상호 하트 시 첫 메시지로 복사 | `hearts.message` |
| **넘기기 / 패스** | 이번 추천에서 영구 제외. 되돌리기 없음 | `passes` |
| **대화 연결** | 상호 하트가 성립한 상태. **'매칭 성공' 이 아니다** | `mutual_heart` |
| **대화 중** | 메시지가 오간 상태 | `chatting` |
| **부모님 확인 중** | 부모님께 공유한 뒤 | `parent_intent` |
| **매칭 성공** | 양쥑 부모님이 각자 '대화해보고 싶어요' 를 누른 상태. 종착 | `matched` |
| **두 사람 규칙** | 위 판정에 양쪽이 필요하다는 규칙 (위키 용어) | [two-person-rule](two-person-rule.md) |
| **부모님께 공유** | 매칭 카드에서 상대 프로필을 카카오 카드로 내 부모님께 보내는 것 | `ParentShareButton` |
| **공유 완료** | 카카오 서버 콜백이 도착해 `parent_shares` 가 생긴 상태. 앱이 찍지 않는다 | `sharedWithParent` |
| **부모님 웹** | `/p/:token` — 부모님이 받은 프로필을 보고 결정하는 서버 렌더 페이지 | `parent-view.controller.ts` |
| **동의 링크** | `/consent/:token` — 부모님이 등록 동의를 직접 누르는 페이지 (3일) | `consent-page.controller.ts` |
| **계정 확인** | 옛 '본인인증'. 한 사람이 계정을 여러 개 못 만들게 하는 절차. 지금은 카카오 연결 | `canCreateProfile` |
| **카카오 연결** | 카카오 `sub` 를 부팅 계정에 붙이는 것 | `social_identities` |
| **별명** | 공개 이름 2~12자. 실명(`display_name`)은 비공개 | `nickname` |
| **원석 카드 / 젬 카드** | 홈·받은 관심의 뒤집는 카드. 모양 6종 | `GemCard` |
| **오늘의 추천** | 하루 6장, 로컬 자정 갱신 | `useDailyPicks` |
| **일주** | 그 사람 출생일의 60갑자 (`을사일주`). 카드에 나가는 사주 값 중 하나 | `dayPillar` |
| **궁합 점수** | 두 부모님 사주로 낸 30~99 점 | `compatibility.score` |
| **찜 / 보관함** | 받은 관심을 보류해 두던 기능. **폐지** (`52a1f90`) | (없음) |
| **검수** | 운영 심사 상태. 화면에 안 그린다 | `badges.review` |
| **시드 / 데모 계정** | `scripts/seed-demo.mjs` 가 만드는 테스트 프로필·계정 (`@seed.booting.app`) | |
| **dev-login** | 개발 빌드 전용 즉시 로그인. 운영 403 | `POST /auth/dev-login` |
| **터널** | `cloudflared` quick tunnel — 개발 서버를 인터넷에 노출. 재시작마다 주소가 바뀐다 | `dev-up.ps1` |
| **`PUBLIC_BASE_URL`** | 부모님께 가는 링크의 바깥 주소. 바뀌면 이미 보낸 링크가 죽는다 | 서버 env |
| **실측** | 커밋 본문에서 "추정이 아니라 에뮬레이터·API 로 확인했다" 는 표시 | |
| **auto mode** | shippen 파이프라인의 자율 진행 모드 (`/setup auto:`). 이 머신에선 `implement` 까지만 돌았다 | [shippen-pipeline](../entities/shippen-pipeline.md) |
