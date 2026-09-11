---
type: Concept
title: 제품 원칙과 집 규칙
description: PRD 핵심 원칙 7, 전 기능 공통 제약 6, 그리고 코드 구조로 그 제약을 지키는 방법(문구 단일 소스, 서버 판정, DTO 정제).
tags: [product, rules]
sources:
  - id: prd
    resource: /prd.md
  - id: summary
    resource: /docs/features/feature-summary.md
  - id: arch
    resource: /docs/features/architecture.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 제품 원칙

## PRD 1.4 핵심 원칙 (그대로)

1. 자녀가 부모님의 프로필을 작성하고 상대 프로필을 탐색한다.
2. 프로필 공개와 실제 만남에는 부모님의 **명시적인 동의**가 필요하다.
3. 자녀 본인인증(+가족관계 인증)을 완료해야 이용할 수 있다. — 가족관계 인증은 폐지됨, [결정](../decisions/2026-09-04-drop-family-certificate.md)
4. 등록할 수 있는 부모님의 혼인 상태는 **사별 또는 이혼**으로 제한한다.
5. 첫 만남은 **자녀와 함께**하는 것을 기본 원칙으로 한다. (강력 권장, TODO-03)
6. 양측 자녀의 상호 하트는 '매칭 성공'이 아니라 **'대화 연결'**이다.
7. 최종 매칭 성공은 부모님이 실제로 만난 뒤 — 코드에서는 **양쪽 부모님이 각자 '대화해보고 싶어요'를 누른 시점** ([결정](../decisions/2026-09-01-matching-at-parent-intent.md))

## 전 기능 공통 제약 6 (feature-summary.md — 다운스트림이 반드시 지킬 것)

1. **'매칭 성공'은 양쪽 부모님 의사가 모인 뒤에만 쓴다.** 상호 하트 단계의 화면·알림·푸시에 등장하면 결함이다. 테스트 S14.2/S19.2 가 uiautomator 덤프에서 그 문구의 **부재**를 검증한다.
2. **부모님 동의 없이 공개되는 경로를 만들지 않는다.** 철회 시 즉시 비공개.
3. **민감정보 비공개** — 실명·생년월일·연락처·정확한 주소·증명서. 공개 이름은 별명. → [privacy-rules](privacy-rules.md)
4. **자녀 수·동거 가족은 필터로 쓰지 않는다.** 상세에서만.
5. **전면 무료, 광고 없음** (TODO-10). 인앱결제·AdMob UI 없음. 다만 '광고 없음'을 문구로 내세우지 않는다 — 정책은 지키되 홍보하지 않는다. "전면 무료입니다" 도 인사 화면에서 뺐다 (`0c4c86d`).
6. **접근성 기본값** — 터치 44×44 이상, 대비 4.5:1, 색 단독 정보 전달 금지, **스와이프 전용 조작 금지**(손 떨림 사용자). 카드 조작은 전부 탭이다.

## 코드 구조로 지키는 집 규칙 (architecture.md 설계 원칙 + 실제)

| 규칙 | 어디서 |
|---|---|
| PRD 문구는 코드 한 곳 | `apps/mobile/src/shared/config/connectionStatus.ts`(상태 문구), `safetyRules.ts`, `relationshipGoals.ts`, `profileOptions.ts`, `saju.ts`(천간·지지 한글) |
| 매칭 전이는 서버만 | `ParentService.recordInterest` — 앱에 `matched` 를 쓰는 코드가 없다. `ConnectionsService.setStatus` 가 `matched` 를 종착점으로 지킨다 |
| 실명·생년월일은 DTO 에 아예 담지 않는다 | `DiscoveryService.toItems`, `PublicProfileDto` — 클라이언트 가공은 API 를 직접 부르면 우회된다 |
| 모든 조회에 `userId` 스코프 | 서비스 쿼리마다 where. RLS 는 2차 방어선 |
| feature 간 직접 import 금지 | 공유는 `shared/` 로 내린다 (`safety` 가 독립 feature 인 이유) |
| 미리보기와 실제 노출은 같은 컴포넌트 | `ParentProfileCard` |
| 상대가 보이는 모든 화면은 같은 글자 | 사주 한 줄이 카드·상세·매칭·대화방·부모님 웹에서 동일 (`af83491`) |
| 빨강은 위험·되돌릴 수 없음 전용 | 신고·차단·나가기·탈퇴만. 새 관심·새 대화 배지는 민트 (`b4fa7ff`) |
| 서비스가 두 사람을 판정하는 문장을 쓰지 않는다 | 궁합 등급 문구 제거 (`4d30c04`). "점수가 낮게 나온 상대도 누군가의 부모님이다" |
| 개발용 우회는 **같은 경로**를 밟고 운영에서 403 | dev-login, 개발 동의 통과, 개발 공유 폴백 — [결정](../decisions/2026-09-04-dev-only-bypasses.md) |
| 부모님이 보는 화면은 글자를 키운다 | 본문 19sp/행간 32, 코드 40sp — 돋보기 없이 읽히는 크기를 먼저 잡았다 |

## 관련

[child-driven-matching](child-driven-matching.md) · [two-person-rule](two-person-rule.md) · [design-system](../entities/design-system.md)
