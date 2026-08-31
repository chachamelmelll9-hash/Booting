import { StyleSheet } from 'react-native';

export const STYLE_COLORS = {
  background: '#F9FAFB', // gray-50
  textPrimary: '#111827', // gray-900
  textSecondary: '#374151', // gray-700
  linkGreen: '#10B981', // emerald-500
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
