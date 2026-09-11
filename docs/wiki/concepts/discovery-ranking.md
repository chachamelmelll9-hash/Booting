---
type: Concept
title: 추천 후보와 순서
description: GET /discovery 가 무엇을 빼고(제외 집합), 무엇으로 거르고(필터·동성 친구 규칙·반경), 어떤 순서로 내려주는가(궁합 높은 순, 200명 풀, 위치 커서).
tags: [discovery, ranking]
sources:
  - id: repo
    resource: /apps/server/src/discovery/discovery.repository.ts
  - id: svc
    resource: /apps/server/src/discovery/discovery.service.ts
  - id: cab09dfc
    resource: commit:ab09dfc
  - id: c9a43dac
    resource: commit:9a43dac
  - id: spec
    resource: /docs/features/profile-discovery.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 추천 후보와 순서

`DiscoveryService.recommend(userId, myProfileId, cursor, limit=10)` → `DiscoveryRepository.findCandidates` → 궁합 정렬 → `toItems`.

## 1. 제외 집합 — 서버에서만

```
내 프로필 ∪ 내가 하트 보낸 프로필(hearts) ∪ 내가 넘긴 프로필(passes)
∪ 차단(blocks 양방향, user 기준) ∪ status ≠ 'published'
```
클라이언트가 거르는 구조면 응답에 이미 정보가 실려 나간 뒤다 (`discovery.repository.ts` 주석). PostgREST `not.in` 은 빈 목록을 못 받아 절대 안 맞는 UUID 자리표시자를 넣는다.
`status ≠ published` 에는 미활동 60일 자동 `hidden`(`run_maintenance` 규칙 1, TODO-11)이 포함된다.

## 2. 필터 (`discovery_filters`, 사용자 1행)

| 항목 | 값 |
|---|---|
| 상대 성별 | 저장된 것이 없으면 **이성 기본** (`1ac9dfc`) |
| 나이 | `age_min`/`age_max` → `birth_date` 범위 |
| 지역·반경 | `region_code`(없으면 내 부모님 지역) + `radius_km` 10/30/50/null(전국), 기본 **30km**. `RegionsService.codesWithin` — 시·군·구 229개 대표 좌표 하버사인 `region_distance_km` |
| 혼인 | bereaved / divorced / any |
| 관계 목적 | `goals[]` 교집합 |
| 종교·음주·흡연·경제활동 | eq |

**없는 것**: 자녀 수·동거 가족(PRD 8.2, 상세에서만), **정렬·최소 궁합**(아래).

### 동성 친구 규칙 (`9a43dac`, 성별 필터보다 우선)

- 내 부모님 목적에 `same_sex_friend` 가 있으면 → **같은 성별** + 상대도 `same_sex_friend` 를 가진 프로필만
- 없으면 → 목적이 `same_sex_friend` **하나뿐**인 프로필은 제외, 그다음 `targetGender` 적용

이성 교제가 아닌 목적에 이성을 보여주면 양쪽 다 헛걸음이다. 대칭이다. 프로필 작성 화면에서 이 목적을 고르면 칩 아래에 즉시 안내한다.

## 3. 순서 — 궁합 높은 순 (`ab09dfc`)

- 후보를 `last_active_at DESC` 로 최대 **200명**(`COMPATIBILITY_POOL`) 받아, 내 부모님 사주가 있으면 전원의 궁합을 서버가 매겨 **점수 내림차순** 정렬. 동점은 안정 정렬로 최근 활동 순이 남는다.
- 궁합은 DB 가 모르는 값이라 SQL 로 못 정렬한다 → 상한이 필요하다. 홈이 하루 6장이라 200 이면 충분히 깊다.
- 커서는 타임스탬프가 아니라 **정렬된 목록의 위치** `o:20`. 옛 타임스탬프 커서가 들어오면 첫 페이지로 되돌린다.
- 팔자를 못 세우는 예외(날짜 손상·변환표 밖)는 점수 -1 로 **뒤로 밀릴 뿐 빠지지 않고**, 내 쪽이 그러면 최근 활동 순 경로(타임스탬프 커서)로 돌아간다.
- **사용자가 고르는 정렬·최소 점수는 없다.** "궁합 낮은 순으로 보고 싶다" 는 뜻이 없고, 최소 점수는 사주 안 쓴 분을 통째로 빼 선택 항목을 자격 요건으로 만든다 — [결정](../decisions/2026-09-09-saju-order-not-filter.md). 조건까지가 사용자 몫, 그 안의 순서는 서비스 몫.

## 4. 응답 (`DiscoveryItemDto`)

`profileId, nickname, age, region("서울 송파구"), distanceKm, maritalStatus, goals(≤2), primaryPhotoUrl(서명 URL), introExcerpt, badges{consent…}, height 없음, dayPillar, compatibility{score, reasons, confidence} | null`.
실명·생년월일·연락처·정확한 주소·증명서 경로는 **없다** — 같은 `toItems` 를 hearts·connections·부모님 웹도 쓴다 (마스킹이 두 벌이면 한쪽만 실명을 흘리는 사고가 난다).

## 홈에서의 소비

홈은 이 피드의 앞에서 하루 6장을 잘라 고정한다 — [daily-picks](daily-picks.md). 빈 상태에는 현재 조건을 함께 보여준다 ("조건에 맞는 분이 더 없습니다 / 현재 조건: 남성 · 50~60세 · 전국") — 무엇 때문에 비었는지 알아야 고친다.

## 관련

[saju-compatibility](saju-compatibility.md) · [privacy-rules](privacy-rules.md) · [결정 동성 친구](../decisions/2026-09-01-same-sex-friend-rule.md)
