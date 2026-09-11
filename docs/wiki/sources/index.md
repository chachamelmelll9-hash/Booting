# 소스

원본 하나에 페이지 하나. 원본은 고치지 않고 요약·링크만 한다 ([schema.md](../schema.md)).

## 기획 정본

| 페이지 | 원본 | 한 줄 |
|---|---|---|
| [prd.md](prd.md) | `/prd.md` | 단일 기준 문서. 21장 + TODO 14개(대부분 확정) |
| [feature-specs.md](feature-specs.md) | `/docs/features/*` | 파이프라인 산출물 — 스펙 4+1, 데이터 모델, 페이지 맵, 와이어프레임 7, 아키텍처, 시나리오 71 |
| [progress-files.md](progress-files.md) | `/docs/progress/*` | 파이프라인 이벤트, auto-mode·preflight 설정, Windows 노트 |

## 이력

| 페이지 | 원본 | 한 줄 |
|---|---|---|
| [git-history.md](git-history.md) | `commit:5eb2b34..4e13b26` | 커밋 107개. 본문이 설계 문서 수준 — 결정 근거의 1차 소스 |

## Claude Code 세션 (KST 시작일)

| 페이지 | 세션 | 기간 | 한 줄 |
|---|---|---|---|
| [session-2026-08-31-prd-and-repo-split](session-2026-08-31-prd-and-repo-split.md) | shippen `8d60ecde` + parents--matching `ec4e37b1` | 08-31 10:07~16:24 | PRD 원문 입력, 저장소 분리, preflight 확정값, 한글 경로 차단 |
| [session-2026-08-31-setup-to-implement](session-2026-08-31-setup-to-implement.md) | `c6fa850d` | 08-31 17:05 ~ 09-01 16:27 | setup → 기획 5단계 → 구현 → 에뮬레이터 UX 반복 |
| [session-2026-09-02-safety-share-parent-surface](session-2026-09-02-safety-share-parent-surface.md) | `c1a1aa6b` | 09-02 09:04 ~ 09-04 18:07 | 신고=차단, 알림, 부모님께 공유, 부모님 화면(앱), 카카오 콜백·로그인·연결, 동의 링크, 숫자 코드 |
| [session-2026-09-07-release-prep-parent-web](session-2026-09-07-release-prep-parent-web.md) | `beebb230` | 09-07 09:05 ~ 09-09 11:34 | 실제 앨범, 릴리스 빌드, 부모님 웹 전환, 본인인증 실물화, 호스팅·AWS·운영 DB, 사주 논의 |
| [session-2026-09-09-saju-hermes-wiki](session-2026-09-09-saju-hermes-wiki.md) | `0f2f49fb` | 09-09 14:08 ~ (진행 중) | 사주 궁합 구현·노출 규칙 확정, 탭 헤더, 헤르메스 봇, 직전 6명 제외, 이 위키 |

`09-06 23:16` 커밋 `52a1f90`(원석 카드)은 **이 머신의 세션 기록에 없다** — 다른 환경에서 작업됐다. 커밋 본문만 소스다.

## 소스가 되지 못한 것

| 페이지 | 왜 |
|---|---|
| [claude-mem.md](claude-mem.md) | `~/.claude-mem/claude-mem.db` 전 테이블 0행, 백업 DB 도 0행 |
