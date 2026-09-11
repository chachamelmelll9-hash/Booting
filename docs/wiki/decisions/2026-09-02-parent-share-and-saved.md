---
type: Decision
title: 매칭 카드에 '부모님께 공유', 받은 관심에 '찜'
description: 앱의 마지막 한 걸음(상대 프로필을 내 부모님께 전달)을 매칭 카드 버튼으로 만들고, 되돌릴 수 없는 넘기기 사이를 메우는 찜(보관함)을 넣었다. 찜은 09-06 에 폐지됐고 완료 표시는 09-03 에 콜백으로 바뀌었다.
tags: [decision, share, hearts]
sources:
  - id: c20a1ee7
    resource: commit:20a1ee7
  - id: cfbd5315
    resource: commit:fbd5315
  - id: c756be1d
    resource: commit:756be1d
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
superseded_by: 2026-09-06-daily-6-gem-cards-remove-saved.md
---

# 부모님께 공유 + 찜

## 배경
소유자(09-02): "매칭이되면 대화가 시작되는게 아니라 매칭된프로필로 쌓이고, 프로필마다 하단에 부모님꼐 공유 눌러서 부모님 카톡으로 보낼수 있게끔 해줘 보내고 나면 회색음영처리되고 부모님께 공유완료 라고 뜨게끔", "좋아요 받은 프로필에서 자세히 대신 찜해놓기 버튼 추가, 오른쪽 상단 위에 보관함 … 찜은 매칭은 아니고 일단 보류", "부모님께 공유하기누르면 (닉네임)님의 자녀가 프로필을 공유했습니다. 가 대화창에 뜨게".

## 결정 (당시)
- 매칭 목록 카드 하단 `부모님께 공유` → OS 공유 시트(카톡 선택 가능) → 실제로 공유해야 기록. 카드 회색 + `✓ 부모님께 공유 완료`, 대화방에 시스템 한 줄(`messages.kind = system`, 가운데 회색). 버튼은 카드 Pressable **밖**.
- `parent_shares (connection_id, user_id)`.
- 받은 관심 가운데 버튼 `자세히` → `찜해놓기`, 헤더 보관함 아이콘(배지), `saved_profiles`. 찜한 상대는 받은 관심에서 빠지고 풀면 돌아온다. 매칭이 아니고 상대에게 알리지 않는다.
- 같은 날 수정 (`fbd5315`): 안드로이드는 공유 앱을 **고른 시점**에 성공을 돌려줘 "안 보냈는데 완료" 가 됐다 → 돌아온 뒤 "부모님께 보내셨나요? → 보냈어요" 확인. 보관함 배지는 담긴 개수가 아니라 "보고 나서 새로 담긴 개수"(`useSavedSeenStore`, 기기 로컬 — 서버에 둘 이유가 없다).
- 저녁 `756be1d`: 카카오 네이티브 키 등록, `shareFeedTemplate` 피드 카드(사진+이름+소개), 키는 env 주입, 카드 버튼 없음(갈 곳이 없다), `useWebBrowserIfKakaoTalkNotAvailable:false`, 호출 시점 require. Windows 네이티브 빌드는 prefab 에서 죽어 `chcp 65001 + --no-daemon` 으로 넘김(당시 진단).

## 이후
- 완료 표시는 다음 날 **서버 콜백만**으로 — [2026-09-03](2026-09-03-share-complete-only-via-kakao-callback.md). 확인 다이얼로그 폐기.
- 공유 시트 → **카카오톡만** (`3a3911e`).
- **찜·보관함 폐지** — 받은 관심이 2주 뒤 사라지므로 두는 것이 곧 보류다 — [2026-09-06](2026-09-06-daily-6-gem-cards-remove-saved.md). `saved_profiles` 테이블은 남아 있다.
- 카드 버튼은 다시 생겼다(부모님 웹으로) — [parent-share-kakao](../concepts/parent-share-kakao.md).
