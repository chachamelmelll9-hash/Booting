---
type: Decision
title: 공유 완료는 카카오 서버 콜백만 찍는다
description: 앱은 카카오톡으로 넘겼는지까지만 알 수 있다. 실제 전송은 카카오 서버가 콜백으로 알려주므로 그때만 기록한다. 카카오톡만 열고, HMAC 서명으로 위조를 막고, 3초 안에 응답한다.
tags: [decision, share, kakao]
sources:
  - id: c3a3911e
    resource: commit:3a3911e
  - id: ca7f65b8
    resource: commit:a7f65b8
  - id: c05167a1
    resource: commit:05167a1
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 공유 완료 = 콜백

## 배경
소유자(09-03): "부모님꼐 공유하기 하면 다른 건 다 뺴고 딱 카톡공유만 뜨게 하고 카톡 공유된거(메세지 발송) 확인되면 바로 부모님꼐 공유 완료로 바뀌는거 어때 물어보지않고" + "대신 카카오톡 메세지 발송된거 제대로 확인되어야함 공유하기 버튼만 눌럿다고 공유완료되믄안대". 전날의 "보냈어요?" 다이얼로그는 사용자 진술에 의존했다.

## 결정
- **OS 공유 시트 제거, 카카오톡만.** 못 열면 그 사실을 말한다.
- 완료 표시를 앱에서 떼어내 **카카오 서버 콜백** `POST /api/kakao/share-callback` 으로. 카카오는 메시지가 실제 전송됐을 때만 부른다. 앱은 "카카오톡 전송을 확인하는 중입니다" 를 띄우고 목록을 3초×10 회 재조회.
- 콜백은 인증 없는 공개 자리 → **HMAC 서명 `t`** (`GET /connections/:id/share-token` 에서 자녀 토큰으로 받아 `serverCallbackArgs` 에 실음). `AuthGuard` 밖의 별도 컨트롤러.
- 카카오 규격: **3초 안에 2XX** — DB 기록을 시작만 시키고 응답 먼저, 실패는 로그. GET 등록도 허용 (`a7f65b8`).
- 기록은 `markParentShare` 한 곳: `parent_shares` insert(23505 = 이미), 시스템 메시지 1회, 인연 `parent_intent`. 앱이 완료를 표시하던 `POST :id/parent-share` 와 클라이언트 훅 삭제 — 남겨 두면 다시 쓰인다 (`05167a1`). 다음 날 개발 빌드 전용으로만 부활 (production 403).
- 카드의 죽은 '자세히 보기' 는 `buttons: []` 로 시도 — 실제로는 안 사라졌다, [09-04 `fd26cb7`](../concepts/parent-share-kakao.md) 에서 버튼을 명시.

## 버린 대안
- 앱이 SDK 결과로 표시 → 카톡을 열었다 그냥 나와도 완료.
- "보냈어요?" 확인 다이얼로그 → 사용자 진술이지 전송 증명이 아니다.

## 검증
cloudflared 터널로 콘솔에 웹훅 등록 → 위조 서명 거부, 진짜 전송에서만 콜백 도착 → 묻지 않고 카드가 공유 완료로 전환 (실측). 관련: [parent-share-kakao](../concepts/parent-share-kakao.md), [kakao-integration-gotchas](../lessons/kakao-integration-gotchas.md).
