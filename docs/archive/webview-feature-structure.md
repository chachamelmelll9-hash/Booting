# WebView App Feature Structure

apps/webview의 기능 중심 폴더 구조 설계 문서

## 핵심 원칙

- **Route는 얇게**: pages/ 폴더는 라우팅만, 로직은 features로
- **Feature 격리**: 기능별 코드는 해당 feature 안에
- **Shared 최소화**: 재사용 "확정"만 shared로

---

## 폴더 구조

```
apps/webview/
├── src/
│   ├── app/                      # 라우팅, providers
│   │
│   ├── pages/                    # 페이지 컴포넌트
│   │   ├── notifications/
│   │   │   ├── records/
│   │   │   ├── health/
│   │   │   └── device-alerts/
│   │   └── profile/
│   │       ├── device/
│   │       ├── statistics/
│   │       ├── help/
│   │       └── app-info/
│   │
│   ├── features/                 # 기능별 모듈
│   │   ├── session/              # ★ auth-bridge (RN 세션 연동)
│   │   ├── elimination-records/
│   │   ├── notifications/
│   │   ├── device-settings/
│   │   ├── analytics/
│   │   └── support/
│   │
│   ├── shared/                   # 공유 모듈 (목적별 분리)
│   │   ├── ui/                   # 범용 UI
│   │   ├── lib/                  # 유틸/헬퍼
│   │   ├── api/                  # API 클라이언트
│   │   ├── config/               # 환경/상수
│   │   └── types/                # 전역 타입 (최소화)
│   │
│   └── styles/
│
└── public/
```

---

## Feature 내부 구조 (통일 템플릿)

```
features/elimination-records/
├── ui/              # feature 전용 컴포넌트
│   ├── RecordCard.tsx
│   └── VideoPlayer.tsx
├── model/           # state, types, selectors
│   ├── useRecordsStore.ts
│   └── types.ts
├── api/             # data fetching
│   └── records.ts
├── lib/             # feature 내부 유틸
└── index.ts         # public exports
```

---

## Session Feature (Auth Bridge)

`features/session/`으로 RN 세션 연동 처리:

```
features/session/
├── ui/
│   └── SessionGuard.tsx          # 인증 상태 체크 래퍼
├── model/
│   ├── useSessionStore.ts        # 토큰 상태
│   └── types.ts
├── api/
│   └── exchange.ts               # code → token 교환
├── lib/
│   └── bridge.ts                 # RN 브릿지 메시지 핸들러
└── index.ts
```

---

## 경로 정규화 (리스트는 base path)

| 패턴   | 경로                                    | 설명               |
| ------ | --------------------------------------- | ------------------ |
| 리스트 | `/notifications/records`                | base path = 리스트 |
| 상세   | `/notifications/records/:eventId`       | 리소스 ID          |
| 하위   | `/notifications/records/:eventId/video` | 하위 리소스        |

---

## Features 목록

### session/ (auth-bridge)

| 기능          | 설명                              |
| ------------- | --------------------------------- |
| code 교환     | RN에서 받은 auth code로 토큰 발급 |
| 토큰 관리     | 메모리/스토리지 저장 전략         |
| 401 처리      | 재교환 or RN에 재인증 요청        |
| 브릿지 핸들러 | postMessage 통신                  |

### elimination-records/ (4 screens)

| Screen          | Route                                    |
| --------------- | ---------------------------------------- |
| Record List     | /notifications/records                   |
| Record Detail   | /notifications/records/:eventId          |
| Video Player    | /notifications/records/:eventId/video    |
| Timeline Editor | /notifications/records/:eventId/timeline |

### notifications/ (3 screens)

| Screen        | Route                                 |
| ------------- | ------------------------------------- |
| Health Detail | /notifications/health                 |
| Alert List    | /notifications/device-alerts          |
| Alert Detail  | /notifications/device-alerts/:alertId |

### device-settings/ (2 screens)

| Screen            | Route                    |
| ----------------- | ------------------------ |
| Device Logs       | /profile/device/logs     |
| Advanced Settings | /profile/device/advanced |

### analytics/ (2 screens)

| Screen           | Route                        |
| ---------------- | ---------------------------- |
| Stats Overview   | /profile/statistics          |
| Pattern Insights | /profile/statistics/patterns |

### support/ (6 screens)

| Screen        | Route                       |
| ------------- | --------------------------- |
| Announcements | /profile/help/notice        |
| Guides        | /profile/help/guide         |
| FAQ           | /profile/help/faq           |
| Terms         | /profile/help/policy        |
| Company       | /profile/app-info/company   |
| Agreement     | /profile/app-info/agreement |

---

## 총계

- **6개 features** (session 포함)
- **17개 screens**
