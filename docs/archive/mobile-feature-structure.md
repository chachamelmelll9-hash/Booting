# Mobile App Feature Structure

apps/mobile의 기능 중심 폴더 구조 설계 문서

## 핵심 원칙

- **Route는 얇게**: app/ 폴더는 라우팅만, 로직은 features로
- **Feature 격리**: 기능별 코드는 해당 feature 안에
- **Shared 최소화**: 재사용 "확정"만 shared로
- **WebView Entry는 features 불필요**: RN 로직 없으면 app/에서 직접 처리

---

## 폴더 구조

```
apps/mobile/
├── app/                          # Expo Router (화면 컴포넌트)
│   ├── (auth)/
│   ├── (tabs)/
│   └── ...
│
├── src/
│   ├── app/                      # 앱 부트스트랩
│   │   ├── providers/
│   │   └── config/
│   │
│   ├── features/                 # 기능별 모듈 (RN 로직 있는 것만)
│   │   ├── auth/
│   │   ├── device-register/
│   │   ├── device-control/
│   │   ├── profile/
│   │   ├── settings/
│   │   └── webview-entry/        # WebView 공통 래퍼 + 경로 매핑
│   │
│   └── shared/                   # 공유 모듈 (목적별 분리)
│       ├── ui/                   # 범용 UI (Button, Modal)
│       ├── lib/                  # 유틸/헬퍼
│       ├── api/                  # API 클라이언트
│       ├── config/               # 환경/상수
│       └── types/                # 전역 타입 (최소화)
│
└── assets/
```

---

## Feature 내부 구조 (통일 템플릿)

```
features/auth/
├── ui/              # feature 전용 컴포넌트
│   ├── LoginForm.tsx
│   └── SignupForm.tsx
├── model/           # state, types, selectors
│   ├── useAuthStore.ts
│   └── types.ts
├── api/             # data fetching
│   └── auth.ts
├── lib/             # feature 내부 유틸
│   └── validation.ts
└── index.ts         # public exports
```

---

## WebView Entry 처리

### webview-entry feature (공통 래퍼)

```
features/webview-entry/
├── ui/
│   └── WebViewEntryScreen.tsx    # 공통 래퍼 (로딩/에러/헤더/브릿지)
├── lib/
│   └── routes.ts                 # 전체 WebView 경로 매핑
└── index.ts
```

### app/ 폴더에서 직접 사용

WebView Entry 화면은 features 없이 app/에서 직접:

```tsx
// app/(tabs)/profile/statistics/index.tsx
import { WebViewEntryScreen } from '@/features/webview-entry';

export default function StatisticsEntry() {
  return <WebViewEntryScreen path="/profile/statistics" title="통계" />;
}
```

```tsx
// app/(tabs)/notifications/records/index.tsx
import { WebViewEntryScreen } from '@/features/webview-entry';

export default function RecordsEntry() {
  return <WebViewEntryScreen path="/notifications/records" title="배변 기록" />;
}
```

---

## Features 목록

### RN 로직 있는 Features (6개)

| Feature | Screens | 설명 |
|---------|---------|------|
| auth | 3 | 로그인, 회원가입, 비밀번호 찾기 |
| device-register | 4 | BLE/WiFi 디바이스 등록 플로우 |
| device-control | 4 | 대시보드, 스케줄, 라이브 스트리밍 |
| profile | 7 | 프로필, 계정 관리 |
| settings | 4 | 언어, 권한, 알림, 기기 정보 |
| webview-entry | - | WebView 공통 래퍼 |

### WebView Entry 화면 (features 없음, app/에서 직접)

| 화면 | Route | Title |
|------|-------|-------|
| Records Entry | /notifications/records | 배변 기록 |
| Health Entry | /notifications/health | 건강 분석 |
| Alerts Entry | /notifications/device-alerts | 기기 알림 |
| Statistics Entry | /profile/statistics | 통계 |
| Help Entry | /profile/help | 도움말 |

---

## 총계

- **6개 features** (RN 로직 있는 것만)
- **25개 RN screens**
- **6개 WebView Entry screens** (features 없이 app/에서 직접)

---

## 리팩토링 계획

현재 역할 중심 구조에서 기능 중심 구조로 전환하기 위한 작업 계획.

### 현재 → 목표 매핑

```
현재 (역할 중심)              →  목표 (기능 중심)
├── components/              →  src/shared/ui/ + src/features/*/ui/
├── constants/               →  src/shared/config/ + src/features/*/ui/
├── hooks/                   →  src/features/*/model/
├── lib/                     →  src/shared/api/ + src/features/*/lib/
├── stores/                  →  src/features/*/model/
└── app/ (유지)              →  app/ (유지)
```

### 파일 이동 계획

#### shared/ui (범용 UI)
| 현재 | 이동 후 |
|------|---------|
| `components/form/ControlledInput.tsx` | `src/shared/ui/form/ControlledInput.tsx` |
| `components/form/ControlledPasswordInput.tsx` | `src/shared/ui/form/ControlledPasswordInput.tsx` |
| `components/form/FormButton.tsx` | `src/shared/ui/form/FormButton.tsx` |
| `components/Themed.tsx` | `src/shared/ui/Themed.tsx` |

#### shared/lib (유틸/헬퍼)
| 현재 | 이동 후 |
|------|---------|
| `components/useColorScheme.ts` | `src/shared/lib/useColorScheme.ts` |
| `components/useClientOnlyValue.ts` | `src/shared/lib/useClientOnlyValue.ts` |

#### shared/api (API 클라이언트)
| 현재 | 이동 후 |
|------|---------|
| `lib/supabase.ts` | `src/shared/api/supabase.ts` |

#### shared/config (환경/상수)
| 현재 | 이동 후 |
|------|---------|
| `constants/Colors.ts` | `src/shared/config/colors.ts` |
| `constants/Styles.ts` | `src/shared/config/styles.ts` |

#### features/auth
| 현재 | 이동 후 |
|------|---------|
| `stores/useAuthStore.ts` | `src/features/auth/model/useAuthStore.ts` |
| `hooks/useAuth.ts` | `src/features/auth/model/useAuth.ts` |
| `lib/auth-errors.ts` | `src/features/auth/lib/auth-errors.ts` |
| `constants/AuthStyles.ts` | `src/features/auth/ui/styles.ts` |

#### features/webview-entry
| 현재 | 이동 후 |
|------|---------|
| `components/WebViewScreen.tsx` | `src/features/webview-entry/ui/WebViewEntryScreen.tsx` |

### 삭제 대상

- `app/modal.tsx`
- `components/ExternalLink.tsx`
- `components/EditScreenInfo.tsx`
- `components/StyledText.tsx`
- `components/useColorScheme.web.ts`
- `components/useClientOnlyValue.web.ts`

### tsconfig paths 설정

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

### 작업 순서

1. 폴더 구조 생성
2. shared 파일 이동
3. auth feature 파일 이동
4. webview-entry feature 파일 이동
5. 삭제
6. tsconfig paths 설정
7. index.ts 생성
8. import 경로 수정
9. 빈 폴더 삭제 및 린트
