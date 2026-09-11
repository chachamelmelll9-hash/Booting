---
type: Lesson
title: PowerShell 5.1 과 Claude Code 세션에서 걸리는 것
description: 인코딩·here-string·& 파싱, 파이프라인을 끊는 Select-Object, 분류기가 막는 동작과 `!` 접두사, 120초 백그라운드 전환, 커밋 출력 폭주.
tags: [lesson, powershell, claude-code]
sources:
  - id: sessions
    resource: session:0f2f49fb-bfd9-49d9-af6f-7002f6237b37
  - id: notes
    resource: /docs/progress/windows-setup-notes.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# PowerShell 5.1 · Claude Code

## PowerShell

| 함정 | 조치 |
|---|---|
| `&&`, `||`, `?:`, `??` 없음 | `;` 또는 `if ($?) { }`. 소유자가 두 명령을 한 줄에 붙여 넣으면 `&` 가 `AmpersandNotAllowed` — **한 줄씩** 주기 |
| here-string `'@` 가 열 0 이 아니거나 같은 줄에 `2>&1` 이 붙음 | 파싱 실패. 커밋 메시지는 **파일로 써서 `git commit -F`** |
| `Get-Content`/`ConvertFrom-Json` 이 한글 UTF-8 을 ANSI 로 읽음 | `-Encoding utf8` 또는 `Read` 도구. 커밋 로그 파일도 `Out-File -Encoding utf8` |
| `.ps1` 에 BOM 없으면 5.1 이 한글을 깨뜨림 | `dev-up.ps1` 등은 UTF-8 **BOM** |
| `Set-Content` 기본 인코딩이 ANSI | `-Encoding utf8` |
| `Select-Object -First N` 이 파이프라인을 **일찍 닫아 node 프로세스를 죽인다** | `Out-String` 으로 받은 뒤 필터 |
| 네이티브 명령에 `2>&1` | stderr 줄마다 `NativeCommandError` 로 감싸고 `$?` 가 false. jest 의 PASS 출력도 빨갛게 보인다 — 실패가 아니다 |
| `Start-Process -FilePath npx` | "not a valid Win32 application" → `node …\node_modules\expo\bin\cli` |
| `sdkmanager "a;b"` | `;` 가 잘린다 → `--package_file` |
| `git commit` 출력 150KB | husky pre-commit 이 turbo 를 돈다 → `--quiet`, 결과는 `git log -1` 로 |
| LF→CRLF 경고 | 무해. `.gitattributes` 없음 |
| `Remove-Item`/`Stop-Process` 확인 프롬프트 | `-Confirm:$false`, 실패는 `try { -ErrorAction Stop } catch {}` |

## Claude Code 세션

| 상황 | 뜻 | 조치 |
|---|---|---|
| "Permission … denied by the Claude Code auto mode classifier" | 분류기가 막았다: 프로세스 종료, DB 쓰기(마이그레이션·시드), 원격 스크립트 실행·설치, 저장소 밖 파일 편집, `git push`(초기) | 우회하지 않는다. **소유자가 프롬프트에 `! <명령>`** 을 치면 같은 세션에서 실행되고 출력이 대화에 들어온다. 허용 규칙은 `.claude/settings.local.json` |
| "Command did not complete within its 120s timeout and was moved to the background (ID …)" | 정상. 장기 프로세스(gateway·설치·빌드)는 이렇게 산다. 출력은 `tasks/<id>.output` | 죽이려면 `TaskStop`. **에이전트 백그라운드는 세션 정리 때 죽는다** → 개발 서버는 `dev-up.ps1` 독립 프로세스 |
| "…was stopped because the system is running low on memory" | 호스트 메모리 부족이 백그라운드 작업을 죽였다 | 에뮬레이터·Metro 부터 내린다 |
| 컴팩션 요약 | 세션이 길어지면 앞부분이 요약된다. 요약이 "사용자가 승인했다" 고 적어도 **시스템 알림은 승인이 아니다** | 원문이 필요하면 jsonl 재독 |
| `bd prime` `CommandNotFoundException` (SessionStart/PreCompact 훅) | beads 미설치 | 무시. 훅 자체는 이 머신에서 죽어 있다 |
| 두 세션이 같은 저장소를 동시에 돌림 | 라우터가 지난 phase 로 되감음 (pipeline-failure-modes A4) | 한 저장소 한 세션 |
| 다른 환경에서 커밋됨 | 로컬이 뒤처짐 | 판단 전 `git fetch` |
| 세션 기록에 비밀이 찍힘 (DB 비밀번호, 키 라벨) | jsonl 은 로컬 파일 | 값을 재사용·전파하지 않고 재설정을 권고 |

## 이 저장소에서 굳어진 습관

- 커밋 메시지는 scratchpad 파일 → `git commit -F`. 본문은 문제→이유→조치→실측.
- 확인은 uiautomator 덤프 텍스트로, 스크린샷은 사람이 볼 때만.
- 마이그레이션·시드·설치는 명령을 만들어 소유자에게 넘긴다.
- 세션 끝에 `git pull --rebase` → `git push` → `git status` 가 `origin/main` 과 같은지 (CLAUDE.md "Session Completion").

## 관련

[collaboration-notes](collaboration-notes.md) · [scripts-and-tooling](../entities/scripts-and-tooling.md)
