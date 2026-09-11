---
type: Concept
title: 부모님께 공유 — 카카오 카드와 서버 콜백
description: 매칭 카드의 [부모님께 공유]는 카카오톡 피드 카드를 연다. '공유 완료'는 앱이 아니라 카카오 서버가 메시지 전송 후 부르는 콜백만 찍는다. HMAC 서명으로 위조를 막고, 3초 안에 응답한다.
tags: [kakao, share, parent]
sources:
  - id: c20a1ee7
    resource: commit:20a1ee7
  - id: c3a3911e
    resource: commit:3a3911e
  - id: ca7f65b8
    resource: commit:a7f65b8
  - id: c05167a1
    resource: commit:05167a1
  - id: cfd26cb7
    resource: commit:fd26cb7
  - id: c4f463d3
    resource: commit:4f463d3
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 부모님께 공유

"이 앱의 마지막 한 걸음은 자녀가 상대 부모님 프로필을 **자기 부모님께 전달**하는 것이다." (`20a1ee7`)

## 흐름

```
매칭 탭 카드 [부모님께 공유]  (ParentShareButton — 카드를 여는 Pressable 밖에 둔다)
  → GET /connections/:id/share-token  → { token(HMAC t), userId, url }
  → shareFeedTemplate (@react-native-kakao/share)
      카드: 사진 + 별명·나이·지역 + 소개 + 찾으시는 인연
      buttons: [{ title, link: { webUrl: PUBLIC_BASE_URL/p/<token> } }]   ← 부모님 웹
      serverCallbackArgs: { connectionId, userId, t }
      useWebBrowserIfKakaoTalkNotAvailable: false
  → 카카오톡이 열린다 (OS 공유 시트 없음)
  → 부모님이 실제로 전송하면 카카오 서버가 POST(또는 GET) /api/kakao/share-callback 호출
      KakaoShareController (AuthGuard 없음) → verifyParentShareToken(timingSafeEqual) → 200 즉시
      → 비동기로 markParentShare: parent_shares insert(23505=이미) + 시스템 메시지 1회 + connection → parent_intent
  → 앱: "카카오톡 전송을 확인하는 중입니다…" 3초 × 10회 목록 재조회 → 카드 회색 + "✓ 부모님께 공유 완료"
```

## 규칙과 이유

- **카카오톡만.** OS 공유 시트를 열면 드라이브·클립보드·메모까지 나열되는데 이 버튼이 하려는 일은 하나고, 부모님께 닿는 통로도 사실상 카톡 하나다. 못 열면 그 사실을 말한다 (`3a3911e`). (동의 링크는 반대로 시트를 쓴다 — 거긴 링크가 닿는 것이 목적이고 카톡을 안 쓰는 부모님께는 문자가 낫다.)
- **완료는 앱이 찍지 않는다.** SDK 는 "카카오톡으로 넘겼다" 까지만 알려준다. 앱이 표시하면 카톡을 열었다 그냥 나와도 완료가 된다. 09-02 의 "보냈어요?" 다이얼로그도 09-03 에 콜백으로 대체됐고, 앱이 표시하던 `POST :id/parent-share` 는 지웠다 (개발 빌드 전용으로만 다시 살렸다). 소유자: "공유하기 버튼만 눌럿다고 공유완료되믄안대".
- **콜백은 공개 주소라 서명으로 막는다.** 없으면 아무나 남의 인연을 공유 완료로 바꿔 놓을 수 있다. `AuthGuard` 아래 두면 카카오가 401 을 받으므로 컨트롤러를 따로 뒀다.
- **3초 안에 2XX.** 카카오가 3초 안에 못 받으면 실패로 본다 → DB 기록을 기다리지 않고 응답 먼저, 실패는 로그 (`a7f65b8`). GET 등록도 허용.
- **기록은 `markParentShare` 한 곳.** 시스템 메시지 "{내 부모님 별명} 님의 자녀가 프로필을 공유했습니다." 가 컨트롤러에만 있어 콜백 경로에서 빠졌던 적이 있다 (`05167a1`). 카카오는 보낸 대화방 수만큼 콜백을 주므로 insert 로 첫 번째만 남긴다. `MessagesService` 를 주입하면 순환이라 직접 insert. 실패해도 던지지 않는다 — 곁들이는 알림 때문에 공유 완료가 안 찍히면 안 된다.
- **버튼은 명시한다.** `buttons: []` 로도 카카오 기본 '자세히 보기' 는 사라지지 않고(문서: buttons 없으면 기본 버튼 추가), `buttonTitle` 만 주면 아이폰에서 버튼이 아예 안 나왔다 (실측). 버튼과 갈 곳을 목록으로 적는다 (`fd26cb7`). 갈 곳은 부모님 웹.
- **회색 톤 다운.** 보낸 카드는 opacity 0.5 — 내 손을 떠난 건이라 아직 결정이 남은 카드들 사이에서 눈에 덜 걸려야 한다.

## 개발 빌드 전용

| 경로 | 왜 | 운영 |
|---|---|---|
| 콜백을 기다린 뒤에도 안 오면 앱이 대신 기록 (`fallbackInDev` → `POST :id/parent-share`) | 터널 주소가 바뀌면 콘솔의 콜백 URL 이 죽어 테스트가 막힌다. **기다린 뒤에** 하는 게 핵심 — 바로 기록하면 검증하려는 규칙을 개발에서 확인할 수 없다 (`70f70f2`) | 서버가 403 |
| "개발: 내 카카오톡으로 보내보기" — 카카오 REST '나에게 보내기'(`talk_message`) | 카톡은 폰 1대만 로그인되어 개발 기기에 로그인하면 본인 폰이 로그아웃된다. 카드 모양을 볼 유일한 길 (`4f463d3`). **공유 완료로 기록하지 않는다** | 줄 자체가 없음 |

## 콘솔 전제

네이티브 앱 키(env 주입, app.json 에는 플레이스홀더), 안드로이드 플랫폼 + 키 해시(디버그·릴리스 각각), **서버 콜백 URL**(제품설정 > 카카오톡 공유 — 개발은 터널 주소, 재시작마다 바뀐다), 카드 링크가 열리려면 **도메인 등록**, '나에게 보내기'는 `talk_message` 동의항목 — [kakao-developers](../entities/kakao-developers.md), [kakao-integration-gotchas](../lessons/kakao-integration-gotchas.md).

## 관련

[결정 2026-09-03](../decisions/2026-09-03-share-complete-only-via-kakao-callback.md) · [parent-web-view](parent-web-view.md) · [connection-state-machine](connection-state-machine.md) · 스펙 `docs/features/heart-conversation.md` Step 2
