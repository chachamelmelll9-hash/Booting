---
type: Decision
title: 공개 표기를 마스킹(김OO)에서 별명으로
description: 실명은 확인용으로만 받고 다른 사용자에게는 사용자가 정한 별명을 보인다. 프라이버시는 그대로(실명은 서버 밖으로 안 나간다), 사람을 부를 이름이 생겼다.
tags: [decision, privacy, profile]
sources:
  - id: c7b5c76b
    resource: commit:7b5c76b
  - id: c56dcb48
    resource: commit:56dcb48
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 마스킹 대신 별명

## 배경
PRD 7장: 실명은 `김OO` 처럼 마스킹. 시드 23명을 에뮬레이터에 띄우자 전부 `김OO`·`이OO`. 소유자: "이름을 성ㅇㅇ보다는 실제이름받고 닉네임 사용하게 하는것어떄".

## 결정
- `parent_profiles.nickname` (2~12자, 필수) 신설, 기존 행은 종전 마스킹 문자열로 백필.
- `DiscoveryItemDto.maskedName → nickname`. `display_name`(실명) 은 어떤 공개 DTO 에도 안 실린다. 별명 없는 옛 데이터만 `maskName` 폴백.
- 별명이 실명을 포함하면 **화면이 경고하고 저장 시 한 번 확인**받는다. 서버는 막지 않는다 — 밝힐지 말지는 본인 선택이고 서비스가 대신 금지할 성질이 아니다.
- 시드 별명은 3~6자 + 숫자 (`40년이발사`, `마라톤10년`) — 설명형("산책하는 아버지")은 카드에서 두 줄로 밀리고 서로 비슷해져 결국 `김OO` 신세가 된다 (`56dcb48`).

## 근거
"`김OO` 는 이름이 아니라 자리표시자였다. 23명이 전부 비슷해 보이고 대화에서 상대를 부를 방법도 없었다." 프라이버시 보장은 변하지 않는다.

## 이후
알림·시스템 메시지·부모님 웹까지 전부 별명으로 부른다. PRD 7장 표는 여전히 `김OO` 마스킹을 말한다 — [open-questions](../open-questions.md) 는 이걸 모순 목록에 넣지 않았다(PRD 취지 '실명 비공개' 는 지켜지므로). 관련: [nickname-privacy](../concepts/nickname-privacy.md).
