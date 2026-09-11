---
type: Decision
title: shippen 저장소에서 새 저장소로 분리한다
description: 버블민트가 들어 있는 shippen 저장소에 부팅을 얹지 않고, 버블민트 직전의 깨끗한 템플릿 커밋을 기준으로 새 저장소를 만들었다.
tags: [decision, repo]
sources:
  - id: c5eb2b34
    resource: commit:5eb2b34
  - id: session
    resource: session:8d60ecde-de2a-41d3-b5e4-9d90df7164e4
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# shippen 에서 새 저장소로

## 배경
소유자가 PRD 를 붙인 자리는 `Desktop\shippen` — 다른 앱(버블민트: webview 페이지 20여 개, `bubblemint` 서버 모듈, 마이그레이션)이 이미 들어 있었다. 그 위에 부팅을 구현하면 충돌한다.

## 결정
① 브랜치에서 버블민트를 걷어내고 교체 ② **새 저장소로 분리** ③ 같은 앱 안에 공존 — 소유자가 **②**. 기준점은 shippen `e4a2cb3`(버블민트 커밋 `dd1747c` 의 부모 = 버블민트가 하나도 없는 템플릿). 첫 커밋 `5eb2b34`.

가져온 것: `scripts/ensure-emulator.ps1`(버블민트 커밋에 있던 Windows 에뮬레이터 스크립트 — 이 PC 에 필수), `prd.md`(이동). 비운 것: `.beads/issues.jsonl` 43건(shippen 자체 이슈). 실행 비트 34개 복원. 원격 `origin`(소유자가 미리 만든 `parents-_matching`, 뒤에 `Booting` 으로 리네임) + `upstream`(shippen — 템플릿 개선 pull 용).

## 짚어 둔 것
- 저장소가 **public** — 민감 도메인(동의·인증 기록)의 스키마와 인증 흐름이 코드에 드러난다. private 전환 명령을 안내했고 판단은 소유자에게 (현재 상태는 미확인).
- 폴더명 ≠ 저장소명 → "폴더먕 깃헙명으로 바꿔주셈" 으로 맞춤.
- push 는 분류기가 막아 소유자가 실행 (HTTPS 토큰에 `workflow` 스코프가 없어 SSH 로 전환).

## 이후
같은 날 저장소를 `C:\proj\Booting` 으로 옮기고 이름을 부팅으로 — [다음 결정](2026-08-31-repo-to-ascii-path.md).
