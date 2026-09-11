---
type: Timeline
title: 타임라인
description: 2026-08-31 PRD 입력부터 2026-09-11 까지. 날짜별로 무엇이 들어왔고(커밋) 왜 그랬는지(세션·결정)를 잇는다.
tags: [history]
sources:
  - id: git
    resource: commit:5eb2b34..4e13b26
  - id: pipeline
    resource: /docs/progress/pipeline.jsonl
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 타임라인

시각은 전부 KST. 세션 ID 는 [sources/](sources/index.md) 에서 찾는다. 12일 동안 커밋 107개.

## 08-31 (일) — PRD, 저장소 분리, 경로 지옥

- 10:07 shippen 저장소에서 버블민트(다른 앱) 에뮬레이터 확인 중, 소유자가 **PRD 원문**을 붙였다 → `prd.md` 작성. 가칭 "우리 부모님을 소개합니다". 미확정 14항목을 `TODO-01~14` 로 표시 — [sources](sources/session-2026-08-31-prd-and-repo-split.md)
- 11:32 "새 저장소로 분리" → shippen `e4a2cb3`(깨끗한 템플릿) 기준으로 `parents-_matching` 생성, `5eb2b34` — [결정](decisions/2026-08-31-split-repo-from-shippen.md)
- 14:17 `/setup auto: @prd.md` → `/preflight` 에서 소유자가 TODO-01~07·10~12·14 확정 (이름 **부팅(Booting)**, 만 50세, 전면 무료 …) → Android 빌드가 **한글 경로**에 막혀 `phase_blocked` (15:55)
- 16:50 저장소를 `C:\proj\Booting` 으로 이동, 앱 이름 부팅 확정 `b03ff40` → 18:09 MAX_PATH 260 우회 플러그인 `e72ddee` — [결정](decisions/2026-08-31-repo-to-ascii-path.md) · [교훈](lessons/windows-build-gotchas.md)
- 18:13~18:25 `/start` → `/clarify-core-feature`(기능 스펙 4 + 데이터 모델 21 엔티티 `9f8043b`) → `/define-pages`(탭 4·페이지 41 `539905a`)

## 09-01 (월) — 설계 → 구현 → 에뮬레이터 UX 반복

- 05:50~06:07 와이어프레임 24화면 `58427c7`, 아키텍처 `8f85860`, E2E 시나리오 71개 `b63c857`
- 09:22 구현 시작 (서브에이전트 없이 직접). 09:29 DB 21테이블+RLS+시군구 229 `d0fa30a` → 09:51 서버 9모듈 스모크 61/61 `b5862ff` → 10:14 앱 24화면 `bde3706`
- 10:50~16:21 소유자가 에뮬레이터를 보며 연속 요청: '가벼운 만남' 제거·동성친구 규칙 `9a43dac`, 사진 3장·동거가족 선택지 `93047b0`, **민트 팔레트**·탭 라벨 제거 `7623282`, 인증 스텁 `2872f05`, dev-login `c108038`, 시드 23명, 키·직업(은퇴) 합치기·스와이프 덱 `701d594`, **관심에 인사말** `2fe3f17`, **마스킹 → 별명** `7b5c76b`, 받은 관심 제외·대화방 뒤로가기 `c659a05` `ec28e88`, **부모님 의사 단계에서 매칭 확정**·칩 2개 `70cd0ae`, 탭 이름 '매칭' `dffea8c`, 문서 동기화 `01a12f9`
- 결정: [별명](decisions/2026-09-01-nickname-instead-of-masking.md) · [인사말](decisions/2026-09-01-heart-with-greeting.md) · [동성친구](decisions/2026-09-01-same-sex-friend-rule.md) · [매칭 지점](decisions/2026-09-01-matching-at-parent-intent.md) · [민트](decisions/2026-09-01-mint-palette-no-tab-labels.md)

## 09-02 (화) — 안전, 알림, 부모님께 공유

- 10:30 대화방 ⋯ 에 신고(금전요구/부적절/사기) `b2067de` → 10:52 **신고 = 차단** `1997184` — [결정](decisions/2026-09-02-report-implies-block.md)
- 10:53 홈 탭 아이콘 집 → `B` `6f2103a`; 11:21 알림에 이름·`conversation_reads`·매칭 탭 배지 `2ced22e`; 11:33 종 아이콘 제거 `cc70db2`; 12:48 배지 빨강 → 민트 `b4fa7ff` — [결정](decisions/2026-09-02-no-notification-tab-mint-badges.md)
- 14:01 실패 문구 구분(403/404 vs 통신) `89dcca4`; 16:03 종료 인연 목록 제외 `3dea3e2`; 16:04 뒤로가기 재진입 크래시 `2052a2f`
- 16:40 **부모님께 공유 + 찜(보관함)** `20a1ee7` → 17:21 "안 보냈는데 완료" 수정 `fbd5315` → 18:46 카카오 피드 템플릿 `756be1d` — [결정](decisions/2026-09-02-parent-share-and-saved.md)

## 09-03 (수) — 부모님 화면(앱), 카카오 콜백, 계정 연결, 동의 링크

- 10:36 **부모님 화면 — 코드 로그인·프로필 스택·대화해보고 싶어요·연락처 공개** `7f03bb1` (자녀의 '부모님 의사 확인' 버튼 제거) — [결정](decisions/2026-09-03-parent-surface-in-app.md)
- 11:09 카카오톡만 + **완료 표시는 서버 콜백만** `3a3911e` → 11:27 3초 응답·GET `a7f65b8` → 11:52 기록을 콜백 한 곳으로 `05167a1` — [결정](decisions/2026-09-03-share-complete-only-via-kakao-callback.md)
- 13:12 카카오 로그인 버튼을 공유 키에서 분리 `277ced2` → 13:25 KOE004 진단 `b0cac4d` → 14:10 **카카오 계정 연결(sub)** `7f93c40` — [결정](decisions/2026-09-03-kakao-account-link-by-sub.md)
- 14:58 부스터 인사 화면 `6c26f8a` → 15:14 `0c4c86d`
- 15:56 **동의를 부모님께 직접 (카톡 링크, 법적 고지)** `aae19f6` → 16:48 카드 대신 메시지로 `dfb7e40` — [결정](decisions/2026-09-03-parent-consent-by-link.md)
- 18:03 카톡 카드 → 앱 딥링크 `76b1657` (네이티브 빌드는 prefab LF 버그로 미반영)

## 09-04 (목) — 숫자 코드, 증명서 폐지, 개발용 우회 정리

- 11:37 부모님 코드 **숫자 8자리**·재시도 정책·`dev-up.ps1` `70f70f2` — [결정](decisions/2026-09-04-numeric-8-digit-parent-code.md)
- 13:42 '봤다' 기록을 상세 응답 안으로, 강조 두 종류 구분 `c8dac1f`
- 14:33 부모님 세션이 자녀 로그인을 납치하던 것·카톡 로그아웃 폴백·기본 한국어 `f4fc66e`
- 14:58 개발 빌드 '내 카카오톡으로 보내보기' `4f463d3`; 15:41 카드 버튼용 `/open/:id` 웹 페이지 `fd26cb7`
- 16:18 **가족관계증명서 폐지, 배지는 '부모님 동의' 하나** `2a78a18` — [결정](decisions/2026-09-04-drop-family-certificate.md)
- 17:05 하다 만 사람 라우팅 `f621ef9`; 17:30 부스터 액체 → 하트 `fe238d6`; 17:53 개발 빌드 상대 부모님 자동 동의 `57c32b2`; 18:06 받은 관심 캐시 `880121d` — [결정: 개발용 우회 원칙](decisions/2026-09-04-dev-only-bypasses.md)

## 09-06 (토) — 다른 환경에서

- 23:16 **오늘의 추천 원석 카드 6장, 보관함 제거, 받은 관심 2주 삭제** `52a1f90`. 이 머신의 세션 기록에 없다 — 다른 환경에서 작업됐다 — [결정](decisions/2026-09-06-daily-6-gem-cards-remove-saved.md)

## 09-07 (일) — 두 대의 에뮬레이터, 실제 앨범, 출시 질문

- 09:05 자녀/부모 에뮬레이터 2대. 로컬이 `52a1f90` 뒤에 있어 "왜 반영 안 됐냐" — `git pull` 로 해결. 마이그레이션 `20260906120000` 소유자가 적용
- 14:18 동의 실패 = `PUBLIC_BASE_URL` 이 죽은 터널 주소 — [교훈](lessons/metro-and-dev-servers.md)
- 17:25 **expo-image-picker 실제 앨범** `e477b74` (릴리스 AAB 64.8MB 첫 성공), 한글 사용자명 Gradle 깨짐 수정 `5a8ed05` — [결정](decisions/2026-09-07-real-image-picker.md)
- 17:46 "실제 배포하면 다 작동하는 거지? 부모님은 앱 안 받아도 되는 거야?" → 앱 설치·코드 요구가 PRD 에 없던 요구임을 확인

## 09-08 (월) — 부모님은 웹으로, 본인인증 실물화

- 11:08 **부모님이 앱 없이 웹에서 보고 결정** `51850a2` → 11:20 거절해도 목록 유지 `605267c` — [결정](decisions/2026-09-08-parent-web-not-app.md)
- 11:34 **휴대폰 본인인증 실물화**(해시 저장·3분·5회) `3995f52` → 12:56 유니크 인덱스는 배포 직전으로 `e944130` → 14:43 **카카오 연결로도 확인** `46a5735` → 15:30 문자 사업자 없으면 항목 감춤 `45900cf` — [결정](decisions/2026-09-08-real-phone-verification-then-kakao-check.md)
- 16:59 **앱의 부모님 화면 전부 제거** `eac0e7c` (서버는 둔다)

## 09-09 (화) — 호스팅, 운영 DB, 사주

- 09:29 "고정 도메인 어떻게 만들어?" → 터널/Render/Railway/Oracle/Vercel 비교 → Oracle 가입 실패 → **AWS** → 10:07 배포 업체 중립화 + EC2 가이드 `798b4e1` → 10:39 운영 환경변수 정리 `8d2cf5e` — [결정](decisions/2026-09-09-aws-ec2-vendor-neutral-deploy.md)
- 10:25 AWS 계정이 **크레딧 $100/182일** 방식임을 확인 — "12개월 무료" 정정. EC2 는 준비 후 켜기로
- 10:54 **운영 Supabase 프로젝트 `booting-prod` 생성** — 마이그레이션 적용은 소유자 몫으로 남김 — [결정](decisions/2026-09-09-supabase-prod-project.md)
- 11:28 "사주기반 매칭 넣을 수 있겠어?" → 외부 API(B) 검토 → 제3자 제공 문제 지적 → 14:20 새 세션 "무료로 넣어주랑" → 15:05 **서버 직접 계산, 무료** `b268b8b` — [결정](decisions/2026-09-09-saju-free-in-mvp.md)
- 16:30 필터에서 빼고 **순서**로 `ab09dfc` → 17:07 **일주 + 점수, 등급 문구 제거** `4d30c04` → 17:18 상세 풀이 제거 `7e2b263` → 17:26 펼친 카드·민트 `e674b00` → 17:41 **모든 프로필에 사주** `0bf9813` → 18:03 생년월일 아래로, **`is_public` 항상 false** `fa732ae`
- 결정: [순서](decisions/2026-09-09-saju-order-not-filter.md) · [두 값만](decisions/2026-09-09-saju-show-day-pillar-and-score-only.md) · [전원 사주·비공개](decisions/2026-09-09-saju-everyone-has-saju-is-public-false.md)

## 09-10 (수) — 매칭·부모님 화면에도 사주, 헤르메스

- 09:36 **매칭·대화방·부모님 웹에도 일주·궁합** `af83491` (전날 "인연 뒤에는 안 넣는다" 를 뒤집음) — [결정](decisions/2026-09-10-saju-on-all-partner-screens.md)
- 09:52 에뮬레이터 여러 대 시리얼 버그 `1c56708`; 메모리 부족(Metro 2.4GB 누수) 정리
- 09:53 "안심번호로 보여줄 수 있나?" → 유료 → 안 함. 전화번호는 웹에서 전체 노출 유지
- 14:28 Hermes Agent 설치 요청 — [entity](entities/hermes-discord-bot.md)
- 17:28 **탭 첫 화면 로고, 뒤로가기는 대화방만** `9bc0510`, lint `fa53cf6`, 에뮬레이터 안 잠들게 `4ec206e` — [결정](decisions/2026-09-10-tab-header-logo-no-back.md)

## 09-11 (목) — 봇 연결, 도메인 고민, 직전 6명 제외, 위키

- 09:25~10:30 디스코드 봇 `Booting_Hermes` 연결 (OpenCode 무료 티어 막힘 → OpenRouter `z-ai/glm-5.3`)
- 10:45 "AWS 서버가 고민" → 도메인이 병목. 결론: 도메인은 사야 한다(부모님이 카톡에서 여는 링크), `api.` 대신 루트 도메인 제안. 소유자 "고민좀해볼게"
- 11:19 "추천 카드 몇 시 기준?" → 로직 설명 → 11:27 **직전에 뽑힌 6명 제외 + 다음 쪽 당겨오기** `4e13b26`, 첫 모바일 jest 7건 — [결정](decisions/2026-09-11-exclude-previous-daily-picks.md)
- 13:51 봇이 메모리 부족으로 죽음 → 에뮬레이터 내림
- 14:00 이 위키 요청
