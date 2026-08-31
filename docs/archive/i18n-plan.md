# MyApp i18n 구현 가이드

## 1. 설계 결정 배경

### 왜 공유 패키지(`packages/i18n`)를 만들었는가?

- **중복 제거**: Mobile, Webview, Mall 세 앱에서 공통으로 사용하는 번역(로그인, 에러 메시지 등)을 한 곳에서 관리
- **일관성**: 모든 앱에서 동일한 용어와 문구 사용
- **유지보수성**: 번역 수정 시 한 곳만 변경하면 세 앱 모두 반영

### 왜 Namespace를 7개로 나눴는가?

| Namespace | 용도 | 공유 범위 |
|-----------|------|----------|
| `common.json` | 공통 UI (확인, 취소, 저장 등) | 전체 앱 |
| `auth.json` | 인증 관련 (로그인, 회원가입 등) | 전체 앱 |
| `ui.json` | 폼/설정 관련 | 전체 앱 |
| `errors.json` | 에러 메시지 | 전체 앱 |
| `mobile.json` | Mobile 전용 (BLE, WiFi 등) | Mobile만 |
| `webview.json` | Webview 전용 | Webview만 |
| `mall.json` | Mall 전용 (제품 정보) | Mall만 |

**이유**:
- 너무 큰 JSON 파일 하나보다 기능별로 분리하면 관리가 쉬움
- 앱별로 필요한 namespace만 로드하여 번들 사이즈 최적화
- 특정 기능(예: 인증) 번역만 수정하고 싶을 때 파일 찾기 쉬움

### 왜 Framework별 Config를 분리했는가?

- **mobile.ts**: React Native는 `expo-localization`, `compatibilityJSON: 'v3'` 필요
- **web.ts**: Vite 웹앱은 `navigator.language` 사용
- **next.ts**: Next.js는 별도 초기화 방식 필요

각 프레임워크의 특성에 맞게 초기화하되, 번역 파일은 공유

---

## 2. 현재 구조

### 디렉토리 구조

```
packages/i18n/
├── src/
│   ├── locales/
│   │   ├── ko/          # 한국어 (7개 JSON)
│   │   └── en/          # 영어 (7개 JSON)
│   ├── config/
│   │   ├── mobile.ts    # React Native/Expo 초기화
│   │   ├── web.ts       # Vite 초기화
│   │   └── next.ts      # Next.js 초기화
│   ├── hooks/
│   │   └── useI18n.ts   # Custom hook
│   ├── types/
│   │   └── resources.d.ts  # TypeScript 타입
│   └── index.ts
```

### 지원 언어

- **한국어 (ko)**: 기본 언어 ✅ 완료
- **영어 (en)**: ✅ 완료
- **일본어 (ja)**: ⏳ 미완료
- **중국어 (zh)**: ⏳ 미완료

### 앱별 통합 상태

| 앱 | 의존성 설치 | 초기화 | 화면 마이그레이션 | 언어 전환 | 상태 |
|----|------------|--------|-----------------|----------|------|
| Mobile | ✅ | ✅ | 🔄 일부 완료 | ✅ | 진행 중 |
| Webview | ✅ | ✅ | ✅ | ✅ (Mobile 동기화) | 완료 |
| Mall | ❌ | ❌ | ❌ | ❌ | 미착수 |

---

## 3. 실제 적용 예시

### 3.1 Mobile 화면에서 사용

**기본 패턴**:

```typescript
import { useTranslation } from '@product-engineer-community-service/i18n';

export default function LoginScreen() {
  const { t } = useTranslation('auth');  // namespace 지정

  return (
    <>
      <Text>{t('login')}</Text>
      <Text>{t('login_subtitle')}</Text>
      <ControlledInput
        label={t('email')}
        placeholder={t('email_placeholder')}
      />
    </>
  );
}
```

**여러 namespace 사용**:

```typescript
const { t } = useTranslation(['auth', 'common']);

<Text>{t('auth:login')}</Text>
<Button title={t('common:confirm')} />
```

### 3.2 에러 메시지 처리

**파일**: `apps/mobile/src/features/auth/lib/auth-errors.ts`

```typescript
import { i18n } from 'i18next';

export function getAuthErrorMessage(errorCode: string | undefined): string {
  if (!errorCode) return i18n.t('errors:default_error');

  const key = `errors:auth.${errorCode}`;
  const translated = i18n.t(key);

  // 번역이 없으면 key 자체가 반환되므로, 기본 에러로 fallback
  return translated !== key ? translated : i18n.t('errors:default_error');
}
```

**사용 예시**:
```typescript
// errors.json: { "auth": { "invalid_credentials": "이메일 또는 비밀번호가 올바르지 않습니다" } }
getAuthErrorMessage('invalid_credentials')  // → "이메일 또는 비밀번호가 올바르지 않습니다"
getAuthErrorMessage('unknown_error')        // → "오류가 발생했습니다. 다시 시도해주세요"
```

### 3.3 Webview 언어 동기화

**Mobile → Webview 언어 전송**:

```typescript
// Mobile: apps/mobile/src/features/webview/WebViewEntryScreen.tsx
const language = useLanguageStore((s) => s.language);

const initMessage = {
  type: 'LANGUAGE_UPDATE',
  language: language,  // 'ko', 'en', 'ja', 'zh'
};
webViewRef.current?.postMessage(JSON.stringify(initMessage));
```

**Webview: 언어 수신 및 변경**:

```typescript
// Webview: apps/webview/src/features/session/lib/useBridge.ts
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'LANGUAGE_UPDATE') {
      i18n.changeLanguage(event.data.language);
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

### 3.4 언어 전환 UI

**파일**: `apps/mobile/app/(tabs)/profile/preferences/language.tsx`

```typescript
import { useTranslation } from '@product-engineer-community-service/i18n';
import { useLanguageStore } from '@features/settings';

const LANGUAGES = [
  { code: 'ko' as const, nativeName: '한국어' },
  { code: 'en' as const, nativeName: 'English' },
];

export default function LanguageScreen() {
  const { t } = useTranslation('ui');
  const { language, setLanguage } = useLanguageStore();

  return (
    <>
      <Text>{t('language_settings')}</Text>
      {LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          onPress={() => setLanguage(lang.code)}
        >
          <Text>{lang.nativeName}</Text>
          {language === lang.code && <Text>✓</Text>}
        </TouchableOpacity>
      ))}
    </>
  );
}
```

**Zustand Store**:

```typescript
// apps/mobile/src/features/settings/model/useLanguageStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupportedLanguage } from '@product-engineer-community-service/i18n';

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'ko',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### 3.5 TypeScript 자동완성

**타입 정의 파일**: `packages/i18n/src/types/resources.d.ts`

```typescript
import common from '../locales/ko/common.json';
import auth from '../locales/ko/auth.json';
// ...

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      auth: typeof auth;
      // ...
    };
  }
}
```

**효과**:
- `t('auth:login')` ← IDE에서 자동완성
- `t('auth:invalid_key')` ← TypeScript 에러 발생
- 오타 방지 및 리팩토링 시 안전성

---

## 4. 번역 파일 추가 가이드

### 새로운 번역 키 추가

1. **한국어 먼저 추가**: `packages/i18n/src/locales/ko/[namespace].json`
   ```json
   {
     "new_feature": {
       "title": "새 기능",
       "description": "설명"
     }
   }
   ```

2. **영어 번역 추가**: `packages/i18n/src/locales/en/[namespace].json`
   ```json
   {
     "new_feature": {
       "title": "New Feature",
       "description": "Description"
     }
   }
   ```

3. **i18n 패키지 빌드**:
   ```bash
   pnpm nx build @product-engineer-community-service/i18n
   ```

4. **코드에서 사용**:
   ```typescript
   const { t } = useTranslation('namespace');
   <Text>{t('new_feature.title')}</Text>
   ```

### 새로운 언어 추가 (일본어 예시)

1. 디렉토리 생성: `packages/i18n/src/locales/ja/`
2. 7개 JSON 파일 복사 후 번역
3. Config 파일에 import 추가:
   ```typescript
   // packages/i18n/src/config/mobile.ts
   import jaCommon from '../locales/ja/common.json';
   // ...

   export const resources = {
     ko: { /* ... */ },
     en: { /* ... */ },
     ja: {  // 추가
       common: jaCommon,
       auth: jaAuth,
       // ...
     },
   };
   ```

---

## 5. 남은 작업

### 우선순위 1: Mobile 앱 완성

**하드코딩 문자열 마이그레이션 필요**:

```bash
# 남은 한국어 문자열 검색
grep -r "[가-힣]" apps/mobile/app --include="*.tsx" --include="*.ts"
grep -r "[가-힣]" apps/mobile/src --include="*.tsx" --include="*.ts"
```

**주요 파일**:
- `app/(auth)/signup.tsx` - 회원가입 화면
- `app/(auth)/forgot-password.tsx` - 비밀번호 재설정
- `app/(tabs)/home/device-register/_layout.tsx` - 기기 등록 타이틀
- `src/features/device-register/ui/DeviceList.tsx` - 기기 선택
- `src/features/device-register/ui/WifiForm.tsx` - WiFi 설정
- `src/features/auth/lib/auth-errors.ts` - 에러 메시지

### 우선순위 2: Mall 앱 통합

1. 의존성 설치:
   ```bash
   cd apps/mall
   pnpm add react-i18next
   ```

2. Layout 초기화:
   ```typescript
   // apps/mall/src/app/layout.tsx
   import { initI18nNext } from '@product-engineer-community-service/i18n';

   useEffect(() => {
     initI18nNext().then(() => setI18nReady(true));
   }, []);
   ```

3. 컴포넌트 마이그레이션:
   - `src/components/ReservationSection.tsx`
   - `src/components/Modal.tsx`
   - `src/app/page.tsx`

### 우선순위 3: 일본어/중국어 번역

1. `packages/i18n/src/locales/ja/` 생성 (7개 JSON)
2. `packages/i18n/src/locales/zh/` 생성 (7개 JSON)
3. Config 파일에 import 추가
4. 빌드 및 테스트

---

## 6. 검증 체크리스트

### Mobile
- [ ] 언어 전환 (Profile > Preferences > Language)
- [ ] 앱 재시작 후 언어 유지
- [ ] Auth 화면 (login, signup, forgot-password)
- [ ] Device registration flow
- [ ] 에러 메시지 표시
- [ ] TypeScript 컴파일: `cd apps/mobile && npx tsc -p tsconfig.app.json --noEmit`

### Webview
- [ ] Mobile 언어 동기화
- [ ] 모든 페이지 한국어/영어 전환
- [ ] TypeScript 컴파일: `cd apps/webview && npx tsc --noEmit`

### Mall
- [ ] 빌드 성공: `pnpm nx build mall`
- [ ] 한국어/영어 표시
- [ ] TypeScript 컴파일: `cd apps/mall && npx tsc --noEmit`

---

## 7. 참고사항

### 프로젝트 규칙
- **Mobile**: `npx expo install`
- **Webview/Mall**: `pnpm add`

### React Native 호환성
- `compatibilityJSON: 'v3'` 필수
- `useSuspense: false` 필수

### Fallback 전략
- 번역 키 없으면 한국어로 fallback
- 네임스페이스 없으면 기본값 표시
