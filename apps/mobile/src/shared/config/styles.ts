import { StyleSheet } from 'react-native';

// 템플릿 화면(설정 20여 개)이 공유하는 값 — colors.ts 의 민트/슬레이트와 맞춘다
export const STYLE_COLORS = {
  background: '#F8FAFC', // slate-50
  textPrimary: '#0F172A', // slate-900
  textSecondary: '#334155', // slate-700
  linkGreen: '#0D9488', // teal-600 (민트)
} as const;

export const STYLE_ALIGN = {
  center: 'center',
} as const;

export const STYLE_FONT_WEIGHTS = {
  bold: 'bold',
  bold700: '700',
} as const;

export const STYLE_WIDTHS = {
  eightyPercent: '80%',
} as const;

export const screenStyles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: STYLE_ALIGN.center,
    justifyContent: STYLE_ALIGN.center,
    backgroundColor: STYLE_COLORS.background,
  },
  paddedContainer: {
    flex: 1,
    backgroundColor: STYLE_COLORS.background,
    padding: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: STYLE_FONT_WEIGHTS.bold700,
    color: STYLE_COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16,
    color: STYLE_COLORS.textSecondary,
    lineHeight: 24,
  },
  link: {
    color: STYLE_COLORS.linkGreen,
    fontSize: 16,
    paddingVertical: 8,
  },
});
