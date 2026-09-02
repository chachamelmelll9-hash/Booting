import { Platform, StyleSheet, Text } from 'react-native';

interface Props {
  /** 탭 틴트 — 활성이면 민트, 아니면 슬레이트 */
  color: string;
  size?: number;
}

/**
 * 부팅 심볼 마크 — 워드마크(`booting`)의 첫 글자.
 *
 * 홈 탭에 집 아이콘 대신 이걸 둔다. 홈은 '집'이 아니라 **추천이 오는 곳**이고,
 * 탭 하나가 브랜드를 들고 있으면 앱이 자기 이름을 계속 말하게 된다.
 *
 * 글자는 시스템 서체를 그대로 쓴다 — 직접 그린 글자는 어느 각도로든 어색해
 * 보이고, 옆에 선 다른 탭 아이콘들과 톤이 어긋난다. 워드마크와 같은 굵기(800)와
 * 자간으로만 맞춘다.
 *
 * `fontSize` 를 아이콘 크기보다 키우는 이유: 26px 글자의 대문자 높이는 18px 쯤
 * 이라, 26px 를 꽉 채우는 옆 아이콘들 사이에서 혼자 작아 보인다.
 */
export function BootingMark({ color, size = 26 }: Props) {
  return (
    <Text
      allowFontScaling={false}
      style={[
        styles.mark,
        { fontSize: size * 1.18, lineHeight: size * 1.32, color },
      ]}
    >
      B
    </Text>
  );
}

const styles = StyleSheet.create({
  mark: {
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    // Android 는 글자 위아래에 기본 여백을 넣어 탭바에서 아래로 처진다
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
});
