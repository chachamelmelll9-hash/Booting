---
type: Entity
title: Hermes Agent 디스코드 봇 (앱 밖 도구)
description: 소유자가 09-10~11 에 자기 PC 에 붙인 Nous Research Hermes Agent. 디스코드 봇 Booting_Hermes 로 대화한다. 부팅 앱 코드와 무관하며, 켜 두려면 gateway 프로세스가 살아 있어야 한다.
tags: [entity, tool, external]
sources:
  - id: session
    resource: session:0f2f49fb-bfd9-49d9-af6f-7002f6237b37
  - id: hermes-docs
    resource: https://hermes-agent.nousresearch.com/docs/user-guide/messaging/discord
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# Hermes Agent 디스코드 봇

부팅 앱의 일부가 아니다. 소유자가 "hermes agent 설치해줘 … 디스코드에서 앱으로 쓸 수 있도록 최소한의 설치만" 이라고 해서 붙였다. 기록하는 이유는 같은 PC 자원(메모리)을 쓰고, 다시 켜는 법을 다음 세션이 묻기 때문이다.

| 항목 | 값 |
|---|---|
| 프로젝트 | [NousResearch/hermes-agent](https://github.com/nousresearch/hermes-agent) v0.21.1 (2026-09-07) — 공식. 처음 "비공식 브릿지" 라고 짚은 것은 틀렸다 |
| 설치 | `iex (irm https://hermes-agent.nousresearch.com/install.ps1)` (Windows 네이티브). 분류기가 원격 스크립트 실행·`hermes gateway` 실행·프로젝트 밖 파일 편집을 막아 **소유자가 `!` 로 직접 실행** |
| 홈 | `%LOCALAPPDATA%\hermes` (문서의 `~/.hermes` 가 아니다). 실행 파일 `%LOCALAPPDATA%\hermes\bin\hermes.exe`, 설정 `config.yaml`, 크레덴셜 `.env`, 로그 `logs\gateway.log` |
| 봇 | `Booting_Hermes#3060`. `DISCORD_BOT_TOKEN` + `DISCORD_ALLOWED_USERS`(**fail-closed** — 없으면 모든 메시지 무시). 슬래시 명령 69개 |
| 모델 | `model.provider: openrouter`, `model.default: z-ai/glm-5.3` (크레딧 충전). 비용 감각: `glm-5.3-flash` 가 9배 싸다 — `/model z-ai/glm-5.3-flash` 로 즉시 전환 가능 |
| 켜기 | `& "$env:LOCALAPPDATA\hermes\bin\hermes.exe" gateway` — 프로세스가 살아 있는 동안만 온라인. **새 셸에서는 `hermes` 만으로도 된다**(설치가 PATH 에 넣었지만 기존 셸엔 반영 안 됨 → `CommandNotFoundException`) |

## 겪은 것

- 설치 마법사가 `NoConsoleScreenBufferError` 로 죽어 exit 1 — 설치는 성공, 마법사는 진짜 콘솔이 필요. 설정은 `hermes config set …` 과 메모장으로.
- `.env` 편집 시 줄 앞에 `# ` 가 붙어 두 번 인식 안 됨.
- **OpenCode 무료 티어는 막혔다** — `MissingSessionID: OpenCode's free tier can only be used in OpenCode`. Hermes 에 들어 있던 안내가 낡았다. 내장 보조 모델 기본값 `laguna-s-2.1-free` 도 목록에 없음.
- OpenRouter 무료 모델 중 실제 응답한 것: `nvidia/nemotron-3-ultra-550b-a55b:free`, `nvidia/nemotron-3.5-lightning:free` (무료 티어 하루 50회).
- 설치에 **`cua-driver`**(trycua, Computer Use 드라이버)가 딸려 왔다 — 최고 권한 자동시작 작업·텔레메트리 기본 on. 09-11 소유자 동의로 `telemetry disable` + `reset-id` + `autostart disable`. 바이너리·PATH 는 남김.
- npm 브라우저 도구·TUI 설치 실패(타임아웃), ripgrep·ffmpeg 미설치 — 텍스트 대화엔 무관.
- 09-11 13:51 **시스템 메모리 부족으로 gateway 가 killed** (여유 2.0GB: 에뮬레이터 2.5GB, Metro 783MB, Edge, Claude). 에뮬레이터를 내려 5.6GB 확보.

## 비밀

봇 토큰·OpenRouter 키는 `%LOCALAPPDATA%\hermes\.env` 에만. 세션 기록·위키에 값 없음(키 라벨 `sk-or-v1-3cb…43a` 만 찍혔다).
