---
type: Source
title: git 이력 (107 커밋)
description: 2026-08-31 5eb2b34 ~ 2026-09-11 4e13b26. 커밋 본문이 "무엇을·왜·무엇을 실측했나" 를 담는 설계 문서라 결정 근거의 1차 소스다.
tags: [source, git]
resource: commit:5eb2b34..4e13b26
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# git 이력

`git log --reverse --format='%h %ad %s%n%b' --date=iso` 로 전체를 읽었다. 원격 `git@github.com:chachamelmelll9-hash/Booting.git`, 브랜치 `main` 하나.

## 읽는 법

- **제목**: `type(scope): 한국어 한 문장`. type 은 feat/fix/refactor/chore/docs/style/copy/revert.
- **본문**: 문제 → 왜 문제인가 → 무엇을 바꿨나 → 버린 대안 → **실측**(에뮬레이터·API 로 확인한 것). "(실측)" 이 붙은 문장은 추측이 아니다.
- 09-06 이후 커밋은 `Co-Authored-By: Claude …` 와 `Claude-Session:` 줄을 단다. 그 앞은 표기 없이 같은 방식으로 작성됐다.
- 마이그레이션이 들어간 커밋은 본문에 파일명을 적는다. 적용된 마이그레이션은 고쳐 쓰지 않고 되돌리는 마이그레이션을 새로 넣는다 (`20260909170000_drop_discovery_saju_sort.sql`).

## 하루 단위 분포

| 날짜 | 커밋 | 무게 중심 |
|---|---|---|
| 08-31 | 10 | 저장소 분리, Windows 경로, 기획 문서 |
| 09-01 | 21 | DB·서버·앱 구현, 에뮬레이터 UX 반복 |
| 09-02 | 11 | 안전·알림·공유 |
| 09-03 | 15 | 부모님 화면(앱), 카카오 콜백·로그인·연결, 동의 링크 |
| 09-04 | 12 | 숫자 코드, 증명서 폐지, 개발 우회 |
| 09-06 | 1 | 원석 카드 (다른 환경) |
| 09-07 | 4 | 실제 앨범, Gradle |
| 09-08 | 8 | 부모님 웹, 본인인증 |
| 09-09 | 9 | AWS, env, 사주 7건 |
| 09-10 | 5 | 사주 전 화면, 에뮬레이터, 탭 헤더 |
| 09-11 | 1 | 직전 6명 제외 |

## 결정을 담은 커밋 (위키가 Decision 페이지로 옮긴 것)

`5eb2b34` `b03ff40`+`e72ddee` `7b5c76b` `2fe3f17` `9a43dac` `70cd0ae` `7623282` `1997184` `2ced22e`+`cc70db2`+`b4fa7ff` `20a1ee7` `3a3911e` `7f03bb1` `7f93c40` `aae19f6` `70f70f2` `2a78a18` `444d142`+`57c32b2`+`4f463d3` `52a1f90` `e477b74` `51850a2` `3995f52`+`46a5735` `798b4e1` `b268b8b` `ab09dfc` `4d30c04` `0bf9813`+`fa732ae` `af83491` `9bc0510` `4e13b26` — 각각 [decisions/](../decisions/index.md).

## 이 소스로 알 수 없는 것

- 왜 그 결정이 **요청됐는지** (소유자의 말) — 세션 기록이 맡는다
- 09-06 `52a1f90` 의 작업 과정 — 세션 없음
- 커밋되지 않은 로컬 파일: `apps/mobile/.env.production`, `logs/`, `infra/oracle/.deploy-state`
