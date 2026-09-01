import type { ParentProfile } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { VerificationBadgeRow } from '@shared/ui/VerificationBadgeRow';
import { StyleSheet, Text, View } from 'react-native';

import { missingLabel } from '../lib/profileValidation';

const STATUS_TEXT: Record<ParentProfile['status'], { title: string; body: string }> = {
  draft: {
    title: '작성 중',
    body: '아직 공개되지 않았습니다. 필수 항목을 채우고 제출해주세요.',
  },
  consent_pending: {
    title: '부모님 동의 대기',
    body: '부모님 동의가 확인되면 제출할 수 있습니다.',
  },
  review: {
    title: '검수 중',
    body: '프로필을 확인하고 있습니다. 잠시만 기다려주세요.',
  },
  published: {
    title: '공개 중',
    body: '다른 자녀분들에게 부모님 프로필이 보이고 있습니다.',
  },
  hidden: {
    title: '공개 중단',
    body: '현재 다른 사람에게 보이지 않습니다. 언제든 다시 공개할 수 있습니다.',
  },
  rejected: {
    title: '검수 반려',
    body: '아래 사유를 확인하고 수정한 뒤 다시 제출해주세요.',
  },
};

export function ProfileStatusPanel({ profile }: { profile: ParentProfile }) {
  const status = STATUS_TEXT[profile.status];

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{status.title}</Text>
      <Text style={styles.body}>{status.body}</Text>

      {profile.review?.rejectReason ? (
        <View style={styles.reject}>
          <Text style={styles.rejectText}>{profile.review.rejectReason}</Text>
        </View>
      ) : null}

      {profile.missing.length ? (
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>남은 항목</Text>
          {profile.missing.map((key) => (
            <Text key={key} style={styles.missingItem}>
              · {missingLabel(key)}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.badges}>
        <VerificationBadgeRow badges={profile.badges} scope="owner" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: spacing.xxs,
  },
  title: { ...typography.subheading, color: theme.colors.text },
  body: { ...typography.body, color: theme.colors.textSecondary },
  reject: {
    marginTop: spacing.xs,
    backgroundColor: theme.colors.errorBg,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  rejectText: { ...typography.caption, color: theme.colors.error },
  missing: { marginTop: spacing.xs, gap: 2 },
  missingTitle: { ...typography.caption, color: theme.colors.textTertiary },
  missingItem: { ...typography.caption, color: theme.colors.textSecondary },
  badges: { marginTop: spacing.sm },
});
