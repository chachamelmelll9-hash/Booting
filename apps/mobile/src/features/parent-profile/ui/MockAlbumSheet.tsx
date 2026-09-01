import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { BottomSheet } from '@shared/ui/BottomSheet';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SAMPLE_IMAGES, type SampleImage } from '../lib/photoUpload';

interface Props {
  visible: boolean;
  title?: string;
  onSelect: (sample: SampleImage) => void;
  onDismiss: () => void;
}

/**
 * 개발용 앨범.
 *
 * 실제 갤러리 접근은 `expo-image-picker`(네이티브 모듈)가 필요해 앱 재빌드를
 * 동반한다. 그때까지 등록 동선을 막지 않으려고 같은 자리에서 같은 모양으로
 * 고르게 하는 임시 시트를 둔다 — 업로드·서버 기록은 실제로 일어난다.
 *
 * 실 피커가 붙으면 이 컴포넌트를 지우고 `pickImage()` 만 호출하면 된다.
 */
export function MockAlbumSheet({ visible, title = '앨범', onSelect, onDismiss }: Props) {
  return (
    <BottomSheet visible={visible} title={title} onDismiss={onDismiss} testID="mock-album">
      <Text style={styles.note}>
        개발용 앨범입니다. 실제 갤러리 연결은 앱 재빌드가 필요해 임시로 샘플을 제공합니다.
      </Text>

      <View style={styles.grid}>
        {SAMPLE_IMAGES.map((sample) => (
          <Pressable
            key={sample.id}
            testID={`album-${sample.id}`}
            accessibilityRole="button"
            accessibilityLabel={sample.label}
            onPress={() => onSelect(sample)}
            style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
          >
            <View style={[styles.thumb, { backgroundColor: sample.tint }]}>
              <FontAwesome name="file-image-o" size={22} color={theme.colors.textTertiary} />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {sample.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  note: { ...typography.caption, color: theme.colors.textTertiary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingVertical: spacing.xs },
  cell: { width: 100, gap: spacing.xxs },
  thumb: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.micro, color: theme.colors.textSecondary },
  pressed: { opacity: 0.8 },
});
