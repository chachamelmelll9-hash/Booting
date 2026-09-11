---
type: Decision
title: 부모님 접속 코드는 숫자 8자리
description: 영문이 섞인 6자리를 숫자 8자리로. 자릿수가 늘어난 것은 안전 때문(6자리 100만 가지는 무작위 대입에 열린다), 숫자인 것은 어르신 때문. 앱 부모님 화면이 사라져 지금은 서버에만 남아 있다.
tags: [decision, parent, auth]
sources:
  - id: c70f70f2
    resource: commit:70f70f2
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: deprecated
superseded_by: 2026-09-08-parent-web-not-app.md
---

# 숫자 8자리 코드 — 사실상 폐기

## 배경
09-03 코드는 헷갈리는 글자를 뺀 영숫자 6자리. 소유자(09-04): "코드는 어르신들은 어려울수잇으니 숫자로만 만들어줘".

## 결정 (당시)
- **숫자 8자리** (`generate_parent_access_code()`, `20260904020000`). 숫자 자판. 8인 이유는 6자리 100만 가지로는 남의 부모님 프로필(사진, 성사되면 연락처)이 무작위 대입으로 열리기 때문 — 1억 가지 + 로그인 시도 제한 분당 10회.
- 같은 커밋: 부모님 상세의 실패 문구를 403/404("자녀분이 거두었습니다")와 통신 오류로 갈라 "잠시 불러오지 못했습니다 + 다시 시도"; React Query 재시도 4xx 없음·그 외 1·2·4초 3회; 개발 빌드 콜백 폴백; `dev-up.ps1`.

## 교훈
마이그레이션이 **배포 DB 에만 적용되고 커밋되지 않아** 앱·서버는 6자리를 검사하고 DB 는 8자리를 발급 → 부모님 로그인 불가. `52a1f90` 이 파일을 복원해 양쪽을 8자리로 맞췼다 ([supabase-and-migrations](../lessons/supabase-and-migrations.md)).

## 이후
[09-08 부모님 웹](2026-09-08-parent-web-not-app.md) 으로 코드 입력 자체가 없어졌다. `parent_profiles.access_code`·`/api/parent/login` 은 서버에 남아 있고 호출자가 없다.
