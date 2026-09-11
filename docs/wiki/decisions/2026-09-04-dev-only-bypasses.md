---
type: Decision
title: 개발용 우회의 원칙 — 같은 경로를 밟고, 운영에서는 403
description: 에뮬레이터에는 문자도 부모님도 카톡 계정도 없다. 그래서 개발 빌드에만 우회를 두되, 규칙을 느슨하게 하지 않고 "사람이 하실 일을 대신 하는" 방식으로만 둔다. 화면에 '개발:' 을 밝히고 서버는 production 에서 막는다.
tags: [decision, dev, testing]
sources:
  - id: cc108038
    resource: commit:c108038
  - id: c444d142
    resource: commit:444d142
  - id: c2a78a18
    resource: commit:2a78a18
  - id: c57c32b2
    resource: commit:57c32b2
  - id: c70f70f2
    resource: commit:70f70f2
  - id: c4f463d3
    resource: commit:4f463d3
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 개발용 우회의 원칙

여러 커밋에 걸쳐 굳어진 규칙 세 개:

1. **판정 로직은 건드리지 않는다.** 조작하는 것은 "상대가 눌렀는가", "문자가 도착했는가" 같은 **입력 사실** 하나뿐이다.
2. **같은 경로를 밟는다.** 우회가 만든 기록은 진짜와 구분되지 않아야 한다 — 그래야 그 뒤 화면이 진짜와 같다.
3. **운영에서는 존재하지 않는다.** 서버는 `NODE_ENV === 'production'` 이면 403, 화면은 `__DEV__` 에서만 그리고 '개발:' 을 붙인다. 조용히 하면 운영에서도 되는 줄 안다.

| 우회 | 어디 | 대신 하는 일 | 커밋 |
|---|---|---|---|
| `POST /auth/dev-login` + 로그인 화면 '개발용 바로 시작' / '새 계정'(`?fresh=1`) | 서버·앱 | 고정 계정(등록 완료) 또는 새 계정을 만들고 자녀 확인까지 끝난 세션. 등록 흐름을 보려면 새 계정이 필요했다 | `c108038` `444d142` |
| 인증 코드 스텁(숫자면 통과) | 서버 | 문자를 못 받는 에뮬레이터용. 09-08 실물화로 제거, 대신 `SmsService` 가 개발에서 코드를 **로그에** 찍는다 | `2872f05`→`3995f52` |
| '부모님이 동의하신 것으로 처리' | 동의 화면 | 링크를 만들고 그 페이지의 `POST /consent/:token/agree` 를 부른다 | `2a78a18` |
| 상대 부모님 자동 동의 | 부모님 관심 기록 | 개발에서만 상대측 `interested` 를 함께 기록. 매칭 이후(연락처·성사 강조)를 보려면 필요 | `57c32b2` |
| 공유 콜백 폴백 | `ParentShareButton` → `POST :id/parent-share` | 콜백을 **기다린 뒤에도** 안 오면 기록. 바로 기록하면 검증하려는 규칙("보내야 완료")을 확인할 수 없다. 서버 production 403 | `70f70f2` |
| '개발: 내 카카오톡으로 보내보기' | 매칭 카드 | 카카오 REST '나에게 보내기' — 카드 모양 확인. **공유 완료로 기록하지 않는다** | `4f463d3` |
| 시드 `--heart-me`, `--scenarios`, `--partner-intent` | 스크립트 | 실제 API 로 인연을 만든다 | `1ac9dfc` `70cd0ae` |

## 그 밖의 개발 편의

- `scripts/dev-up.ps1` 독립 프로세스 (`70f70f2`) — 세션이 죽어도 서버가 산다.
- 개발 프로젝트 시드는 운영으로 옮기지 않는다 ([운영 프로젝트 분리](2026-09-09-supabase-prod-project.md)).

## 관련
[scripts-and-tooling](../entities/scripts-and-tooling.md) · [mobile-app](../entities/mobile-app.md) 개발 전용 절
