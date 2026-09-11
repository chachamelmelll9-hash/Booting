---
type: Concept
title: 두 사람 규칙
description: 이 앱에서 오해가 가장 비싼 지점. 상호 하트는 '대화 연결'일 뿐이고, 매칭은 양쪽 부모님이 각자 누른 뒤에만 서버가 판정한다. 한쪽만 누른 상태는 상대에게 알리지도 않는다.
tags: [matching, rule, core]
sources:
  - id: prd
    resource: /prd.md
  - id: c70cd0ae
    resource: commit:70cd0ae
  - id: c7f03bb1
    resource: commit:7f03bb1
  - id: c51850a2
    resource: commit:51850a2
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 두 사람 규칙

## 규칙

1. **상호 하트 = 대화 연결.** 자녀 둘이 서로 관심을 보내면 대화방이 열린다. 이걸 '매칭'·'매칭 성공' 이라 부르지 않는다 (PRD 10.1·16장). 상호 하트 시트 문구는 "서로 관심이 있어요".
2. **매칭 성공 = 양쪽 부모님이 각자 "대화해보고 싶어요"를 누른 순간.** 서버 `ParentService.recordInterest` 가 두 `parent_interests` 행을 보고 `connections.status = 'matched'` 로 올린다. 앱·웹 어디에도 이 상태를 쓰는 코드가 없다.
3. **한쪽만 누른 동안은 상대에게 알리지 않는다.** 누른 쪽 화면은 "마음을 전해드렸습니다. {별명} 님의 답을 기다리고 있습니다" 다. 거절이 드러나지 않아야 두 분 다 편하게 정하신다 (`7f03bb1`).
4. **연락처는 매칭된 뒤에만, 양쪽에 동시에** 열린다. 그 전에는 어떤 응답에도 전화번호가 없다.
5. **`matched` 는 종착점.** 이후 어떤 API(일정·확인)를 부르든 되돌아가지 않는다 — 한 번 본 '매칭 성공'이 취소된 것처럼 보이면 안 된다 (`ConnectionsService.setStatus`).

## 왜 여기에 박아 뒀나

한쪽 답변으로 '매칭 성공'을 띄우면 **상대 부모님은 아무 말도 안 했는데 성사된 것처럼 보인다.** 그래서 두 사람 규칙을 상태 하나(`matched`)의 전이 조건에 그대로 넣었다 (`70cd0ae`).

## 판정 주체가 바뀐 이력

| 시점 | 누가 누르나 | 커밋 |
|---|---|---|
| 08-31 PRD | 만남 후 양측 자녀가 '부모님끼리 만났어요' (`meeting_confirmations` 2건) | 설계 |
| 09-01 | **자녀**가 앱에서 '부모님 의사 확인' — `parent_intents.willing` 2건이면 matched. 일정 단계를 동선에서 뺐다 | `70cd0ae` |
| 09-03 | **부모님 본인**이 앱 부모님 화면에서 — 자녀 버튼 삭제. "그 결정이 누구 것인지 아무도 몰랐다" | `7f03bb1` |
| 09-08 | 부모님이 **웹**(`/p/:token`)에서. 판정 함수는 앱/웹 공용 `recordInterest` | `51850a2` |

"버튼을 부모님이 직접 누르시게 한 이유: 웹을 보기 전용으로 두면 부모님의 답을 자녀가 대신 눌러야 하고, 그러면 그 결정의 주인이 자녀가 된다." (`51850a2`)

## 어떻게 검증하나

- `scripts/smoke-api.mjs`: 한쪽 확인 ≠ matched 검사, SEC 응답 부재 검사
- `test-scenarios.md` S14.2·S19.2: uiautomator 덤프에 "매칭 성공" 이 **없음**을 grep
- 개발 빌드에서만 상대 부모님을 자동으로 누른 것으로 둔다 — 판정 로직은 그대로, '상대가 눌렀는가' 하나만 조작 (`57c32b2`)

## 관련

[connection-state-machine](connection-state-machine.md) · [parent-web-view](parent-web-view.md) · [hearts-and-greeting](hearts-and-greeting.md)
