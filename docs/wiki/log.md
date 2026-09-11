# 작업 기록

append-only. 형식: `## [YYYY-MM-DD] operation | description`. 최근 것을 보려면 `grep "^## \[" docs/wiki/log.md | tail -5`.

## [2026-09-11] create | 위키 부트스트랩 — schema.md·INSTRUCTIONS.md·index.md 작성. 볼트 루트는 `docs/`, `apps/wiki` 정션으로 연결 (`scripts/link-wiki.ps1`)
## [2026-09-11] ingest | git 이력 107 커밋 (5eb2b34 → 4e13b26) — timeline, decisions 31건, concepts 17건의 1차 근거
## [2026-09-11] ingest | session c6fa850d (08-31~09-01, 파이프라인 setup → implement) — Windows 빌드 교훈, 구현 UX 결정들
## [2026-09-11] ingest | session c1a1aa6b (09-02~09-04, 신고·공유·부모님 화면·카카오) — 콜백 규칙, 동의 링크, 계정 연결
## [2026-09-11] ingest | session beebb230 (09-07~09-09, 출시 준비·부모님 웹·호스팅) — AWS 크레딧 정정, 운영 Supabase 프로젝트, 사주 외부 API 논의
## [2026-09-11] ingest | session 0f2f49fb (09-09~, 사주·헤르메스·위키) — 사주 노출 규칙 확정, 탭 헤더, 직전 6명 제외
## [2026-09-11] ingest | 이동 전 세션 2건 (shippen 8d60ecde, parents--matching ec4e37b1) — PRD 원문 입력, 저장소 분리, 비ASCII 경로 차단
## [2026-09-11] ingest | prd.md + docs/features/* + docs/progress/* — 기획 정본 요약과 코드와의 차이 기록
## [2026-09-11] ingest | claude-mem (~/.claude-mem/claude-mem.db) — 전 테이블 0행. 백업 DB 도 0행. 소스 없음으로 기록
## [2026-09-11] lint | 원본 간 모순 3건 발견 → open-questions.md "문서 간 모순" (PRD 8.4 내부 모순, feature-summary 사주 문단, architecture.md DTO)
## [2026-09-11] create | concepts 18 · entities 13 · lessons 7 · decisions 31 (superseded 2건: 부모님 앱 화면, 8자리 코드) · timeline · open-questions
## [2026-09-11] create | 도구 — scripts/wiki-lint.mjs (깨진 링크·type 누락·고아), scripts/wiki-extract-sessions.mjs (세션 jsonl → md), scripts/link-wiki.ps1 (apps/wiki 정션), docs/.obsidian/app.json
## [2026-09-11] lint | wiki-lint 90 페이지, 깨진 링크 0, type 누락 0, 고아 0. CLAUDE.md·AGENTS.md 에 LLM-WIKI 포인터 블록 추가
