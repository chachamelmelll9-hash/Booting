---
type: Decision
title: 탭 첫 화면은 뒤로가기 대신 부팅 로고를 단다
description: 탭 안에 Stack 을 중첩한 탓에 매칭·관심·내 정보 첫 화면에 갈 곳 없는 'Navigate up' 화살표가 붙었다. 네 탭 첫 화면의 네이티브 헤더를 끄고 TabHeader(워드마크 + 제목)를 그린다. 뒤로가기는 대화방에만.
tags: [decision, navigation, ui]
sources:
  - id: c9bc0510
    resource: commit:9bc0510
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 탭 헤더

## 배경
소유자(09-10): "매칭 탭에 뒤로가기는 없애야지 뒤로가기는 대화 탭에서만 잇어야하는거아니야? 그리고 각 탭마다 다 부팅 로고 왼쪽 상단에 넣어줘(대화방뺴고)".

## 결정
- `(tabs)/{connections,hearts,profile}/_layout.tsx` 의 index 화면 `headerShown: false`. 홈은 원래 로고만 있던 헤더를 같은 컴포넌트로.
- `shared/ui/TabHeader.tsx` — 좌상단 `BootingLogo`, 아래 제목(홈은 제목 없음 — '오늘의 추천 프로필' 이 맡는다).
- **대화방은 손대지 않았다** — `connections/[id]/_layout.tsx` 가 이미 `headerLeft` 로 뒤로가기(`매칭 목록으로`, `router.navigate('/(tabs)/connections')`)를 직접 달고 있고 제목 `대화`. 처음엔 화면 안에 뒤로가기를 또 넣으려다 확인 후 되돌렸다.

## 검증
uiautomator 덤프: 홈·관심·매칭·내 정보 = 로고 O·뒤로가기 X, 대화방 = `대화 / 매칭 목록으로 / 대화방 메뉴`, 로고 X. Metro 가 stale 번들을 내주어 로고가 안 보이던 것은 `--clear` + 미리 워밍으로.

## 곁들여
lint 게이트를 막고 있던 unused import 3건(`radius`, `useState`, `Linking`) 정리 `fa53cf6`; 에뮬레이터 안 잠들게 `4ec206e`.
