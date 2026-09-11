---
type: Source
title: 세션 2026-08-31 — PRD 입력, 저장소 분리, 첫 setup 차단
description: 저장소를 C:\proj\Booting 으로 옮기기 전의 두 세션. PRD 가 어떻게 들어왔고, 왜 새 저장소가 됐고, 첫 auto 파이프라인이 어디서 막혔나.
tags: [source, session]
resource: session:8d60ecde-de2a-41d3-b5e4-9d90df7164e4
sources:
  - id: shippen-session
    resource: session:8d60ecde-de2a-41d3-b5e4-9d90df7164e4
  - id: pm-session
    resource: session:ec4e37b1-e25e-41ca-886b-a5037810b7e4
  - id: pipeline
    resource: /docs/progress/pipeline.jsonl
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 세션 2026-08-31 (이동 전)

파일 위치: `~/.claude/projects/C--Users--------Desktop-shippen/8d60ecde-….jsonl`, `~/.claude/projects/C--Users--------Desktop-parents--matching/ec4e37b1-….jsonl` (+ 같은 폴더의 짧은 세션 2개, 메시지 각 1~2개).

## shippen 세션 10:07~12:39 — PRD 와 분리

1. "버블민트 에뮬레이터에 불러와줘" — 다른 앱(버블민트, webview 앱) 확인 중이었다.
2. 11:29 "새로운 앱 만들건데 … 프로젝트 루트에 `prd.md` 파일을 생성해줘 … 임의로 핵심 기능을 삭제하거나 변경하지 말고, 아직 결정되지 않은 사항은 임의로 확정하지 말고 '추후 결정사항'으로" — 21장 원문 전체를 붙였다 (가칭 "우리 부모님을 소개합니다").
3. `prd.md` 작성 후 "이 저장소는 버블민트가 들어 있어 충돌한다 — ① 브랜치에서 교체 ② 새 저장소 ③ 공존" → **"새 저장소로 분리 부탁합니다"**.
4. shippen `e4a2cb3`(버블민트 커밋의 부모) 스냅샷으로 새 폴더 생성, `scripts/ensure-emulator.ps1` 만 가져옴, `.beads/issues.jsonl` 비움, `5eb2b34` 커밋. GitHub 저장소는 소유자가 미리 만든 `parents-_matching`(public). push 는 분류기에 막혀 소유자가 실행.
5. 두 가지를 짚었다: 폴더명/저장소명 불일치(→ "폴더명 깃헙명으로 바꿔주셈"), **저장소가 public** 이라는 점(민감 도메인). 판단은 소유자에게 맡김.

## parents--matching 세션 14:16~16:24 — `/setup auto:` 첫 시도

- `/setup auto: @prd.md` → `/preflight` 에서 소유자가 TODO 확정값을 답했다 (`preflight.json` decisions: 부팅(Booting), 만 50세, 전면 무료 …, `developer_type: 개인 개발자`).
- Supabase 클라우드 프로젝트 `ifkazhqwjbtxkmppsedi`(ap-northeast-2) 생성. MCP 는 사용자 스코프.
- Android 네이티브 빌드가 **한글 프로젝트 경로**(`C:\Users\한화손해보험\Desktop\parents-_matching`)에 막혔다. `GRADLE_USER_HOME`/`TEMP`/`JAVA_HOME` 을 ASCII 로 옮겨도 `:app` 의 `build\intermediates\cxx` 경로가 배치 파일에서 깨진다 → 15:55 `phase_blocked`, 수동 조치로 "저장소를 ASCII 경로로 옮기라" 기록.
- 16:04 "push 승인할게, 진행해줘".

## 이 세션이 남긴 것

- [결정: 저장소 분리](../decisions/2026-08-31-split-repo-from-shippen.md)
- [결정: ASCII 경로 이동](../decisions/2026-08-31-repo-to-ascii-path.md) (이동 자체는 다음 세션 `b03ff40`)
- [교훈: Windows 빌드](../lessons/windows-build-gotchas.md)
- 저장소 이름 `Booting` 은 이동 후 리네임 — 원격은 지금 `chachamelmelll9-hash/Booting`
