---
type: Schema
title: 위키 규약 (schema)
description: 이 위키의 구조·페이지 종류·frontmatter·링크·운영(ingest/query/lint) 규칙. LLM 과 사람이 함께 고친다.
tags: [meta, okf, llm-wiki]
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 위키 규약

부팅(Booting) 프로젝트의 **LLM 위키**다. [Karpathy 의 LLM Wiki 패턴](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)을 따르고,
페이지 형식은 [Open Knowledge Format v0.2](https://github.com/GoogleCloudPlatform/open-knowledge-format) 에 맞춘다.
코딩 에이전트가 이 위키를 메모리처럼 읽는 방식은 [LangChain OpenWiki](https://github.com/langchain-ai/openwiki) 를 참고했다
(`CLAUDE.md` / `AGENTS.md` 의 `<!-- LLM-WIKI:START -->` 블록).

## 세 층

| 층 | 위치 | 누가 고치나 |
|---|---|---|
| **원본(raw)** — 불변 | `prd.md`, `docs/features/*`, `docs/progress/*`, git 이력, Claude Code 세션 기록(`~/.claude/projects/C--proj-Booting/*.jsonl`) | 위키는 읽기만 한다. 고치지 않는다 |
| **위키** — LLM 소유 | `docs/wiki/**` | LLM 이 쓰고 갱신한다. 사람은 읽고 질문하고 소스를 준다 |
| **규약** | 이 파일 + `INSTRUCTIONS.md` | 사람과 LLM 이 함께 고친다 |

원본을 위키에 **복사하지 않는다.** 요약하고 링크한다. 원본과 위키가 어긋나면 원본이 맞고 위키를 고친다 —
단, 원본끼리 어긋나면 그 사실을 [open-questions.md](open-questions.md) 에 적는다 (lint 의 산출물이다).

## 디렉터리

```
docs/wiki/
  index.md            루트 목차 (OKF 예약 파일, okf_version 만 frontmatter 에 둔다)
  log.md              append-only 작업 기록 (OKF 예약 파일)
  schema.md           이 문서
  INSTRUCTIONS.md     사람이 쓰는 범위·우선순위 (LLM 은 읽기만)
  timeline.md         날짜별 흐름 — 커밋·세션·결정을 한 줄에 잇는다
  open-questions.md   미결·모순·리스크
  sources/            소스 요약 — 소스 하나당 페이지 하나
  concepts/           제품·도메인 개념 (규칙, 상태 기계, 정책)
  entities/           실체 — 앱, 모듈, DB, 외부 서비스, 도구, 환경
  decisions/          결정 기록 — 날짜-슬러그, 무엇을 왜 정했고 무엇을 버렸나
  lessons/            실측으로 배운 것 — 재발 방지용 gotcha
```

각 디렉터리에 `index.md` 가 있다 (OKF: 디렉터리 목록).

## 페이지 종류 (`type`)

| type | 디렉터리 | 무엇 |
|---|---|---|
| `Source` | sources/ | 원본 하나의 요약과 "이 소스가 말하는 것". 원본 위치를 `resource` 에 적는다 |
| `Concept` | concepts/ | 제품이 지키는 규칙·개념. "지금 어떻게 동작하나"를 현재형으로 쓴다 |
| `Entity` | entities/ | 코드·인프라·도구의 실체. 파일 경로와 버전을 적는다 |
| `Decision` | decisions/ | 한 번의 결정. 배경 → 결정 → 버린 대안 → 근거 → 이후 변경(있으면 `superseded_by`) |
| `Lesson` | lessons/ | 실측 gotcha. 증상 → 원인 → 조치 → 재발 조건 |
| `Schema` / `Instructions` | 루트 | 규약 |
| `Timeline` / `Questions` | 루트 | 종합 페이지 |

## frontmatter (OKF v0.2)

```yaml
---
type: Concept                       # 필수. 위 표의 값
title: 두 사람 규칙                   # 표시 이름
description: 한 줄 요약               # 목차·검색에 쓴다
tags: [matching, rule]
sources:                            # 이 페이지가 근거로 삼은 원본
  - id: prd
    resource: /prd.md
  - id: commit-70cd0ae
    resource: commit:70cd0ae
  - id: session-c1a1aa6b
    resource: session:c1a1aa6b-94cb-4bf4-989e-52e8e143eabf
generated:
  by: claude-code/claude-fable-5-1  # 생산자/모델 (OKF actor 규약)
  at: 2026-09-11T14:30:00+09:00     # 마지막 의미 있는 변경
status: stable                      # draft | stable | deprecated (생략 = stable)
superseded_by: ../decisions/2026-09-08-parent-web-not-app.md   # Decision 전용, 선택
---
```

`sources[].resource` 표기:

| 표기 | 뜻 |
|---|---|
| `/prd.md`, `/apps/server/src/...` | 저장소 루트 기준 절대 경로 |
| `commit:4e13b26` | git 커밋 (짧은 해시). `git show 4e13b26` 으로 본다 |
| `session:<uuid>` | Claude Code 세션. 파일은 `~/.claude/projects/C--proj-Booting/<uuid>.jsonl` (이동 전 세션은 `C--Users--------Desktop-parents--matching/`, `C--Users--------Desktop-shippen/`) |
| `https://...` | 외부 문서 |

사람이 확인한 페이지는 `verified: { by: human:<id>, at: ... }` 를 더한다. 없으면 OKF 기준 "unverified" 다 — 지금 전 페이지가 그렇다.

## 링크

- 페이지 사이는 **상대 마크다운 링크**를 쓴다: `[두 사람 규칙](../concepts/two-person-rule.md)`.
  OKF 가 마크다운 링크를 요구하고, GitHub 에서도 렌더되며, Obsidian 도 해석한다 (`[[위키링크]]` 는 GitHub 에서 죽는다).
- 원본 문서로는 `../../features/saju-compatibility.md` 처럼 **실제 파일**을 가리킨다. Obsidian 볼트 루트가 `docs/` 라 `docs/` 안의 원본은 그래프에 잡히고,
  `prd.md`·`apps/**` 처럼 `docs/` 밖은 Obsidian 에서는 미해결로 보이지만 GitHub 에서는 열린다. 그게 의도다.
- 코드는 `apps/server/src/saju/lib/pillars.ts:42` 처럼 경로+줄로 인용한다. 줄 번호는 빨리 낡으니 함수명을 함께 적는다.

## 이름

- 파일명은 `kebab-case.md`, 영문. 제목(`title`)은 한국어.
- Decision 은 `YYYY-MM-DD-slug.md` — 날짜는 **결정이 코드로 들어간 커밋 날짜(KST)**.
- Source 세션은 `session-YYYY-MM-DD-slug.md` — 세션 시작일(KST).

## 세 가지 작업

### ingest — 새 소스가 들어왔을 때

1. 원본을 읽는다 (커밋이면 `git log --format='%h %ad %s%n%b'`, 세션이면 jsonl 에서 user/assistant 텍스트만 뽑는다 — `scripts/wiki-extract-sessions.mjs`).
2. `sources/` 에 요약 페이지를 쓴다. 무엇이 결정됐고 무엇이 바뀌었는지를 적는다.
3. 영향받는 `concepts/` `entities/` 를 **현재형으로 갱신**한다. 옛 동작은 지우고, 바뀐 이유는 `decisions/` 로 보낸다.
4. 결정이 있었으면 `decisions/YYYY-MM-DD-slug.md` 를 만든다. 이전 결정을 뒤집었으면 그쪽에 `superseded_by` 를 단다.
5. 실측 gotcha 가 있으면 `lessons/` 에 더한다.
6. `timeline.md` 에 날짜 줄을 더하고, 각 `index.md` 를 갱신한다.
7. `log.md` 끝에 `## [YYYY-MM-DD] ingest | <소스> — <무엇을 건드렸나>` 한 줄을 붙인다.
8. `node scripts/wiki-lint.mjs` 를 돌려 깨진 링크·frontmatter 누락을 0 으로 만든다.

소스 하나가 페이지 10~15개를 건드리는 것이 정상이다. 한 페이지만 고치고 끝나면 대개 갱신을 빠뜨린 것이다.

### query — 질문을 받았을 때

`index.md` → 해당 디렉터리 `index.md` → 페이지 순으로 내려가 읽고, 답에 **페이지 링크를 인용**한다.
답이 위키에 없으면 원본을 읽어 답하고, 그 답이 다시 쓸 만하면 페이지로 남긴다 (query 가 위키를 키운다).

### lint — 주기적 점검

- 깨진 링크, `type` 없는 페이지 → `scripts/wiki-lint.mjs` 가 잡는다
- 고아 페이지 (어디서도 링크되지 않음)
- 원본과 어긋난 문장 — 특히 `concepts/` 의 현재형 서술이 코드와 맞는가
- **원본끼리의 모순** → 고치지 않고 `open-questions.md` 의 "문서 간 모순" 에 적는다
- 30일 넘게 안 건드린 `status: draft` 페이지

## 쓰지 않는 것

- **비밀값**: 토큰·API 키·DB 비밀번호·`.pem`. 세션 기록에 찍혔더라도 옮기지 않는다 — 대신 "노출됐으니 재설정" 을 open-questions 에 적는다.
- **개인정보**: 실명·전화번호·이메일(시드 계정 도메인 `@seed.booting.app` 은 예외)·카카오 앱 키.
- 코드 통째 복사. 경로와 함수명으로 가리킨다.
- 추측. 소스에 없으면 쓰지 않거나 "확인 필요" 로 표시한다.

## 문체

이 저장소의 커밋 메시지·스펙 문서와 같은 톤을 쓴다 — 결론 먼저, 그다음 **왜**. "~했다" 로 끝나는 짧은 문장. 형용사보다 실측 숫자.
