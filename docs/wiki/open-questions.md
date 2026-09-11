---
type: Questions
title: 미결 사항·리스크·문서 간 모순
description: 배포를 막고 있는 것, 아직 안 정해진 것, 알려진 버그, 원본 문서끼리 어긋나는 곳. 다음 세션은 여기서 시작한다.
tags: [status, risk, lint]
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 미결 사항

## 배포를 막고 있는 것 (순서대로)

| # | 항목 | 상태 | 근거 |
|---|---|---|---|
| 1 | **도메인** | 없음. 소유자 "고민좀해볼게" (09-11). 없으면 HTTPS 불가 → 부모님 카톡 링크·안드로이드 통신·Let's Encrypt 전부 막힘. EC2 기본 주소로는 인증서를 못 받는다 | [deploy-infra](entities/deploy-infra.md), `infra/EC2_GUIDE.md` 4장 |
| 2 | **EC2 미생성** | 의도적으로 보류 — 도메인·`.env.production` 준비 전에 켜면 크레딧만 축난다. 계정은 **크레딧 $100 / 182일** 방식(12개월 무료가 아니다). 리전은 **서울**로, `t4g.micro`(ARM, 월 ~$6) 권고 → 워크플로 `platforms: linux/arm64` 한 줄 변경 필요. 공인 IPv4 도 과금(월 ~$3.6) | [session beebb230](sources/session-2026-09-07-release-prep-parent-web.md) |
| 3 | **운영 Supabase `booting-prod`** | 프로젝트는 생성됨(`vyiauclgelpuxitsoeii`). **마이그레이션 적용 여부 미확인** — 소유자에게 `SUPABASE_PROJECT_REF=vyiauclgelpuxitsoeii node scripts/db-migrate.mjs` 를 부탁한 뒤 대화가 사주로 넘어갔다. Auth 설정(이메일 확인 on/off, Redirect URL `booting-mobile://reset-password`) 미이전. **DB 비밀번호가 세션 기록에 평문으로 찍혔다 → 대시보드에서 재설정할 것** | [supabase-projects](entities/supabase-projects.md) |
| 4 | `apps/mobile/.env.production` | 로컬에만 있고 `EXPO_PUBLIC_SERVER_URL`·`EXPO_PUBLIC_WEBVIEW_URL` 비어 있음. 도메인·웹뷰 배포지 결정 대기 | `8d2cf5e` |
| 5 | 웹뷰 배포지 | Cloudflare Pages 예정이나 미프로비저닝(`preflight.json` T2_PAGES). `CORS_ORIGINS` 도 그때 정해진다 | |
| 6 | 카카오 콘솔 | ① 서버 콜백 URL 이 개발 터널 주소(재시작마다 바뀜) → 배포 도메인으로 교체 ② 카드 링크가 열리려면 **도메인 등록** ③ 릴리스 키스토어 키 해시 등록 | [kakao-developers](entities/kakao-developers.md) |
| 7 | `docs/store-declarations.yaml` | `business.*` 가 `TODO(user)` — 선언값은 AI 가 만들지 않는다 | `preflight.json` T2_DECL_BUSINESS |
| 8 | iOS | 이 머신에 Xcode 없음 → 빌드·제출 불가. 소유자 본인 폰이 아이폰이라 카카오 카드 버튼의 iOS 동작은 실기기 확인이 필요 | |

## 정해지지 않은 제품 규칙

- **문자 사업자** 없음 → 문자 인증은 운영에서 fail-closed, 화면에서도 감춤. 지금 계정 확인의 유일한 문은 카카오 연결이다. 사업자 계약 시 `SMS_PROVIDER` 만 채우면 살아난다 — [verification-account-check](concepts/verification-account-check.md)
- **가족관계 인증(TODO-05)** — 증명서 제출을 폐지했다(`2a78a18`). PRD 4.2·4.4·14장은 여전히 "가족관계증명서 인증" 을 말한다. PRD 를 현실에 맞출지, 실심사를 붙일지 미결
- **부모님 웹 링크 30일 만료** 뒤 재발급 경로가 없다 — 자녀가 다시 공유해야 한다
- **카카오 콜백 유실**(운영) — 카카오가 3초 안에 2XX 를 못 받으면 실패로 보고, 재시도 경로가 없다. 개발 빌드만 대안 경로가 있다
- **오늘의 추천 상태가 기기 로컬**(AsyncStorage) — 앱 재설치·기기 시간 변경·기기 2대에서 각각 다르게 뽑힌다. 서버 발급으로 옮길지 미결 — [daily-picks](concepts/daily-picks.md)
- **연락처는 실제 번호 전체 노출** — 안심번호는 유료라 소유자가 보류(09-10). 그대로 간다

## 알려진 버그·기술 부채

- **Windows prefab LF 배치 버그** — AGP 가 LF 로 쓰는 `prefab_command.bat` 을 cmd 가 잘못 읽는다. 원인 규명은 됐고 해결은 없다. 우회: `configureCMakeDebug` up-to-date 유지, x86_64 만 빌드, Gradle 홈 ASCII — [lessons](lessons/windows-build-gotchas.md)
- `apps/mobile/plugins/withKakaoLinkScheme.js` — 앱 부모님 화면 제거 후 아무도 안 쓰는 인텐트 필터. 지우려면 prebuild+네이티브 재빌드
- `.claude/settings.json` 훅이 이 머신에서 전부 죽어 있다: `bd prime`(미설치, `CommandNotFoundException`), Stop auto-commit(bash), `/usr/bin/env python3` 라우터. **커밋은 수동**. CLAUDE.md 의 "bd 로 이슈 관리" 지시와 현실이 어긋난다
- `docs/features/test-scenarios.md` Step 18/19(일정·만남 확인)는 'API 전용' — 앱 동선에 없다
- 릴리스 빌드 `versionCode` 가 1 — 스토어 빌드가 한 번도 성공한 적이 없었다가 09-07 첫 AAB 성공

## 문서 간 모순 (lint 2026-09-11)

원본끼리 어긋난다. 위키는 **코드/최신 커밋**을 따랐고, 원본은 소유자가 정리할 몫이다.

1. **`prd.md` 8.4 내부 모순** — 첫 문단 "5.3 의 사주 정보를 **양쪽 다 입력한 경우에만** 계산" vs 5.3 "**모든 프로필에 사주가 있다**". 또 8.4 노출 절에 "네 기둥 전체는 어디로도 내보내지 않는다" 와 "상대의 네 기둥은 상대가 사주를 공개했을 때만 보여준다" 가 **둘 다** 있다. 코드는 전자(`7e2b263` 에서 `PublicProfileDto.sajuPillars` 제거). 후자 문단과 "궁합이 없는 프로필에는 배지를 그리지 않는다" 는 `0bf9813` 이전 잔재.
2. **`docs/features/feature-summary.md` 사주 절** — "양쪽 다 사주를 입력했을 때만 점수가 나오며, 없으면 배지 자체를 그리지 않는다", "상세의 점수·근거·네 기둥" 은 옛 동작. 같은 문단 Key Decisions 는 최신이다.
3. **`docs/features/architecture.md`** — `PublicProfileDto.saju: SajuDto | null` (제거됨), `maintenance` 가 `@nestjs/schedule` 크론(실제는 `setInterval` + advisory lock — pnpm 스토어가 깨져 설치 못 했다), 서버 모듈 9개(실제 15개 — `parent`, `saju`, `regions` 등 추가), `parent_intents` 기반 매칭 서술(실제는 `parent_interests` + 부모님 웹). 초기 설계 문서라 스냅샷으로 두는 게 맞지만 "현재 구조" 로 읽으면 틀린다.
4. `prd.md` 4.2·4.4·14장의 가족관계증명서 — 위 "정해지지 않은 제품 규칙" 참조.
5. `docs/features/page-map.md` 에 `hearts/saved.tsx`(보관함) 가 남아 있다 — `52a1f90` 에서 제거됨.
