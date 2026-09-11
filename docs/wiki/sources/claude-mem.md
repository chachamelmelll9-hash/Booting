---
type: Source
title: claude-mem (비어 있음)
description: 소유자 PC 의 claude-mem 플러그인 DB 를 확인했다. 관측·요약·프롬프트 테이블이 전부 0행이라 소스로 쓸 것이 없다.
tags: [source, empty]
resource: ~/.claude-mem/claude-mem.db
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# claude-mem

`C:\Users\<user>\.claude-mem\claude-mem.db` (SQLite, `node:sqlite` 읽기 전용으로 열었다).

| 테이블 | 행 |
|---|---|
| `observations` | 0 |
| `session_summaries` | 0 |
| `user_prompts` | 0 |
| `sdk_sessions` | 0 |
| `pending_messages` | 0 |
| `schema_versions` | 34 (스키마만 최신) |

백업 `backups/claude-mem-pre-12.4.3-2026-08-12T06-12-28-732Z.db` 도 같은 세 테이블이 0행. `logs/` 는 8-12~8-27 의 워커 기동 로그만 있고(이 프로젝트 시작 전), `corpora/` 는 비어 있다.
`settings.json` 은 `CLAUDE_MEM_RUNTIME: worker` — 워커는 설치돼 있지만 이 프로젝트 기간(08-31~) 에 아무것도 기록하지 않았다.

**결론**: "claude mem 기록" 은 존재하지 않는다. 같은 역할은 Claude Code 세션 jsonl 이 대신했다 — [sources/index.md](index.md).

이 프로젝트 자체의 메모리 디렉터리(`~/.claude/projects/C--proj-Booting/memory/`)에는 09-11 에 쓴 `hermes-discord-bot.md` 하나가 있다. 내용은 [entities/hermes-discord-bot.md](../entities/hermes-discord-bot.md) 에 흡수했다.
