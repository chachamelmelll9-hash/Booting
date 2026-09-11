---
type: Entity
title: 디자인 시스템
description: 민트(teal) 팔레트 + slate 중립색, 4/8 배수 토큰, 텍스트 워드마크 Booting, 홈 탭 'B', 원석 카드, 민트 배지. 빨강은 위험 전용.
tags: [entity, design, ui]
sources:
  - id: colors
    resource: /apps/mobile/src/shared/config/colors.ts
  - id: tokens
    resource: /apps/mobile/src/shared/config/tokens.ts
  - id: c7623282
    resource: commit:7623282
  - id: c52a1f90
    resource: commit:52a1f90
  - id: c6f2103a
    resource: commit:6f2103a
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 디자인 시스템

## 색 (`shared/config/colors.ts`)

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `primary` | `#14B8A6` (teal-500) | 버튼, 선택 칩, 카드 테두리 |
| `primaryDark` | `#0D9488` | **배지 숫자 배경, 사주 한 줄(흰 바탕), 부모님 웹 강조** — primary 는 10sp 흰 글자 대비가 모자라다 |
| `primaryLight` | `#CCFBF1` | 원석의 밝은 면, **사진 위 일주 글자** |
| `primarySurface` | `#F0FDFA` | 강조 카드 배경(unseen), 필터 칩 배경 |
| 중립 slate | bg `#F8FAFC`, text `#0F172A`, border `#E2E8F0`, secondary `#64748B`… | |
| `error` | `#E11D48` | **신고·차단·나가기·탈퇴만.** 새 관심·새 대화는 민트 |

왜 민트: 초록(emerald)은 성공 신호로 이미 쓰는 색이라 브랜드색이면 "완료됨" 처럼 읽히고, 따뜻한 회색 위의 민트는 탁해 보여 중립도 slate 로 (`7623282`). 소유자 "전체적으로 민트 세련된 UI".

## 토큰 (`tokens.ts`)

`spacing` 4/8/16/24/32/48/64 (xxs…) · `typography` 스케일(`caption`, `bodyStrong`, `subheading`, `micro`…) · `radius` 0/4/8/12/`pill`(999) — **16 금지** · `HIT_SIZE` 44 · zIndex · motion spring damping 18. 8dp 그리드. 파생 규칙은 shippen 의 `mobile-ux-ui-design` 스킬(anti-slop: 터치 44, 상태 매트릭스, 색 단독 정보 금지).

## 브랜드

- **워드마크 `Booting`** — 텍스트만, 민트, 굵기 800, 배경 도형 없음 (알약 배지는 버튼처럼 보였다). 첫 글자만 대문자 (`bdb52dc`). 각 탭 첫 화면 좌상단 `TabHeader` (`9bc0510`).
- **태그라인** "우리 **부**모님 소개**팅**, / 직접 주선해주세요" — 부/팅만 민트. **등록 안내 화면에만**. 홈에서 반복하면 광고 문구처럼 읽힌다.
- **홈 탭 아이콘 `B`** (`BootingMark`) — 시스템 서체, 배지·테두리 없음, 굵기 800·자간 워드마크와 동일, fontSize 는 아이콘보다 키움(26px 글자의 대문자 높이는 18px). 집 아이콘은 이 앱에서 아무것도 가리키지 않았다. 소유자: "주변에 사각형 이런건 뺴줘 딱 B로만" → "B로고 이상해 그냥 정직한 폰트로".
- **탭 라벨 없음**, 아이콘만. `tabBarAccessibilityLabel` 로 스크린리더 유지.
- **부스터 인사 화면** (`(parent-setup)/welcome.tsx`, `6c26f8a` `fe238d6`): 민트 병이 차오르다 뚜껑이 톡 튕겨 옆으로 굴러떨어지고 하트 18개가 600ms 에 걸쳐 쏟아진다 → "Booting은 부모님의 새 인연을 응원합니다" → [다음]. RN `Animated` 만, 높이 바뀌는 둘만 JS 드라이버. 로그인 직후 한 번, 등록 안 마친 사람에게만.

## 카드

- **원석 카드** (`GemCard`, `52a1f90`): 뒷면 흰 바탕 + 민트 테두리, 색은 원석 하나에만 — 카드를 민트로 채우면 여섯 장이 화면 절반을 덮어 브랜드색이 배경색이 된다. 구분은 **모양 6종**(하트·다이아·원·사각·별·물방울). 탭으로 뒤집혀 최대로 펼쳐짐(`ExpandedGemCard`).
- **`ParentProfileCard`** variant `deck|list|preview` — 매칭 목록·미리보기·상태. 미리보기와 실제 노출이 같은 컴포넌트.
- 사진 위 텍스트는 그라디언트 오버레이로 대비 확보. 시드 아바타는 단순 색 실루엣(`1c5abf5`, 사람처럼 그리려다 만 도형이 더 눈에 걸렸다).

## 신호

- 배지 `primaryDark` + **흰 테두리 2px** (활성 아이콘과 같은 색이라 테두리 없으면 녹는다).
- 강조 두 종류는 **채움 vs 윤곽**으로 가른다 — 안 본 것: 흰 바탕 민트 윤곽 / 성사됨: 민트 채움 (`c8dac1f`).
- 카드 테두리는 평소에도 투명하게 깔아 둔다 (사라질 때 레이아웃 안 밀림).

## 부모님 웹 (서버 CSS)

본문 19px/행간 32, 항목은 이름·값 두 칸 표, 코드 시절 40sp. `.saju { color:#0D9488; font-weight:700; font-size:19px }`. 매칭 카드 민트 채움, 연락처 28px 굵게.

## 관련

[mobile-app](mobile-app.md) · [notifications-badges](../concepts/notifications-badges.md) · [결정 민트](../decisions/2026-09-01-mint-palette-no-tab-labels.md) · 와이어프레임 `docs/features/wireframe-index.md`
