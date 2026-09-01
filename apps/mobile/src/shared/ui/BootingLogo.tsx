import { theme } from '@shared/config/colors';
import { typography } from '@shared/config/tokens';
import { StyleSheet, Text } from 'react-native';

interface Props {
  size?: 'md' | 'lg';
}

/**
 * 부팅 워드마크.
 *
 * 배경 도형 없이 글자만 둔다 — 알약 배지를 두면 로고가 아니라 버튼처럼 보인다.
 * 둥근 인상은 굵은 두께 + 좁은 자간 + 소문자로 낸다.
 *
 * (진짜 라운드 서체를 쓰려면 폰트 파일이 필요하다. Android 기본 폰트에는
 *  라운드 산세리프가 없어서 fontFamily 만으로는 바꿀 수 없다.)
 */
export function BootingLogo({ size = 'md' }: Props) {
  return (
    <Text style={[styles.mark, size === 'lg' && styles.markLg]} accessibilityRole="header">
      booting
    </Text>
  );
}

const styles = StyleSheet.create({
  mark: {
    ...typography.title,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -0.8,
  },
  markLg: { ...typography.display, fontWeight: '800', letterSpacing: -1 },
});

/**
 * 태그라인 — '부팅'이라는 이름이 **부**모님 + 소개**팅**에서 왔다는 걸
 * 두 글자만 민트로 남겨 보여준다. 이름의 유래가 곧 서비스 설명이 된다.
 */
export function BootingTagline({ size = 'md' }: Props) {
  return (
    <Text style={[taglineStyles.text, size === 'lg' && taglineStyles.textLg]}>
      우리 <Text style={taglineStyles.accent}>부</Text>모님 소개
      <Text style={taglineStyles.accent}>팅</Text>,{'\n'}직접 주선해주세요
    </Text>
  );
}

const taglineStyles = StyleSheet.create({
  text: { ...typography.subheading, color: theme.colors.text },
  textLg: { ...typography.title, color: theme.colors.text },
  accent: { color: theme.colors.primary },
});
