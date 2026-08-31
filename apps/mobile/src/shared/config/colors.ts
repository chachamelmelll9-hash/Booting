export const theme = {
  colors: {
    // Emerald accent — matches landing page
    primary: '#10B981',        // emerald-500
    primaryDark: '#059669',    // emerald-600
    primaryLight: '#D1FAE5',   // emerald-100
    primarySurface: '#ECFDF5', // emerald-50

    // Neutrals — Tailwind gray scale (aligned with landing page)
    background: '#F9FAFB',     // gray-50
    surface: '#FFFFFF',        // white
    surfaceSecondary: '#F3F4F6', // gray-100

    text: '#111827',           // gray-900
    textSecondary: '#374151',  // gray-700 (landing body text)
    textTertiary: '#6B7280',   // gray-500
    textMuted: '#9CA3AF',      // gray-400

    border: '#E5E7EB',        // gray-200
    borderFocused: '#10B981',  // emerald-500
    divider: '#F3F4F6',       // gray-100

    // Semantic
    error: '#EF4444',
    errorBg: '#FEF2F2',
    success: '#10B981',
    successBg: '#ECFDF5',
    warning: '#F59E0B',
    warningBg: '#FFFBEB',

    disabled: '#D1D5DB',      // gray-300
    placeholder: '#9CA3AF',   // gray-400

    // Social
    kakao: '#FEE500',
    kakaoText: '#191919',
    apple: '#000000',

    // Tab bar
    tabActive: '#10B981',
    tabInactive: '#9CA3AF',   // gray-400
    tabBarBg: '#FFFFFF',
    tabBarBorder: '#F3F4F6',  // gray-100
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
