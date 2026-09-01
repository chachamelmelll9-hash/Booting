import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Photo } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { MAX_PROFILE_PHOTOS, MIN_PROFILE_PHOTOS } from '@shared/config/profileOptions';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  photos: Photo[];
  min?: number;
  max?: number;
  onAdd: () => void;
  onRemove: (photoId: string) => void;
  busy?: boolean;
}

export function PhotoUploader({
  photos,
  min = MIN_PROFILE_PHOTOS,
  max = MAX_PROFILE_PHOTOS,
  onAdd,
  onRemove,
  busy = false,
}: Props) {
  return (
    <View>
      <View style={styles.grid}>
        {photos.map((photo) => (
          <View key={photo.id} style={styles.cell}>
            <Image source={{ uri: photo.url }} style={styles.image} />
            {photo.isPrimary ? (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>대표</Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="사진 삭제"
              onPress={() => onRemove(photo.id)}
              style={styles.remove}
              hitSlop={8}
            >
              <FontAwesome name="times-circle" size={20} color={theme.colors.text} />
            </Pressable>
          </View>
        ))}

        {photos.length < max ? (
          <Pressable
            testID="photo-add"
            accessibilityRole="button"
            accessibilityLabel="사진 추가"
            onPress={onAdd}
            disabled={busy}
            style={({ pressed }) => [styles.cell, styles.addCell, pressed && styles.pressed]}
          >
            <FontAwesome name="plus" size={20} color={theme.colors.textTertiary} />
            <Text style={styles.addText}>사진 추가</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.counter}>
        {photos.length} / {max}장 (최소 {min}장) · 첫 장이 대표 사진입니다
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  cell: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  image: { width: '100%', height: '100%' },
  addCell: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    minHeight: HIT_SIZE,
  },
  addText: { ...typography.micro, color: theme.colors.textTertiary },
  primaryBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: theme.colors.primary,
  },
  primaryText: { ...typography.micro, color: '#FFFFFF' },
  remove: { position: 'absolute', top: 2, right: 2 },
  counter: { ...typography.caption, color: theme.colors.textTertiary, marginTop: spacing.xs },
  pressed: { opacity: 0.8 },
});
