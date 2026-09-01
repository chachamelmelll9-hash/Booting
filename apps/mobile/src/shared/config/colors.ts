/**
 * 부팅 컬러 팔레트 — 민트 액센트 + 슬레이트 중립색.
 *
 * 민트(teal)를 고른 이유: 초록(emerald)은 성공·확인 신호로 이미 쓰이는 색이라
 * 브랜드 색으로 쓰면 "완료됨"처럼 읽힌다. 민트는 차분하면서 의료·돌봄 톤이
 * 있어 40~60대 자녀가 부모님 일을 다루는 화면에 어울린다.
 *
 * 중립색을 gray 가 아니라 slate(살짝 푸른 회색)로 맞춘 이유: 따뜻한 회색 위의
 * 민트는 탁해 보인다. 같은 온도의 중립색이어야 액센트가 선명하게 남는다.
 */
export const theme = {
  colors: {
    // Mint accent
    primary: '#14B8A6',        // teal-500
    primaryDark: '#0D9488',    // teal-600
    primaryLight: '#CCFBF1',   // teal-100
    primarySurface: '#F0FDFA', // teal-50

    // Neutrals — slate (민트와 같은 쿨 톤)
    background: '#F8FAFC',     // slate-50
    surface: '#FFFFFF',        // white
    surfaceSecondary: '#F1F5F9', // slate-100

    text: '#0F172A',           // slate-900
    textSecondary: '#334155',  // slate-700
    textTertiary: '#64748B',   // slate-500
    textMuted: '#94A3B8',      // slate-400

    border: '#E2E8F0',        // slate-200
    borderFocused: '#14B8A6',  // teal-500
    divider: '#F1F5F9',       // slate-100

    // Semantic — 성공은 브랜드색과 구분되게 살짝 더 진한 민트를 쓴다
    error: '#E11D48',         // rose-600 (붉은 경고, 민트와 대비가 크다)
    errorBg: '#FFF1F2',       // rose-50
    success: '#0D9488',       // teal-600
    successBg: '#F0FDFA',     // teal-50
    warning: '#D97706',       // amber-600
    warningBg: '#FFFBEB',     // amber-50

    disabled: '#CBD5E1',      // slate-300
    placeholder: '#94A3B8',   // slate-400

    // Social
    kakao: '#FEE500',
    kakaoText: '#191919',
    apple: '#000000',

    // Tab bar
    tabActive: '#0D9488',
    tabInactive: '#94A3B8',   // slate-400
    tabBarBg: '#FFFFFF',
    tabBarBorder: '#F1F5F9',  // slate-100
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
} as const;

export default {
  light: {
    text: theme.colors.text,
    background: theme.colors.background,
    tint: theme.colors.primary,
    tabIconDefault: theme.colors.tabInactive,
    tabIconSelected: theme.colors.primary,
  },
  dark: {
    text: theme.colors.text,
    background: theme.colors.background,
    tint: theme.colors.primary,
    tabIconDefault: theme.colors.tabInactive,
    tabIconSelected: theme.colors.primary,
  },
};

export const AuthColors = {
  primary: theme.colors.primary,
  primaryDark: theme.colors.primaryDark,
  background: theme.colors.background,
  surface: theme.colors.surface,
  text: theme.colors.text,
  textSecondary: theme.colors.textSecondary,
  border: theme.colors.border,
  borderFocused: theme.colors.borderFocused,
  error: theme.colors.error,
  errorBg: theme.colors.errorBg,
  success: theme.colors.success,
  successBg: theme.colors.successBg,
  inputBg: theme.colors.surface,
  placeholder: theme.colors.placeholder,
  disabled: theme.colors.disabled,
};
