import { useAuthStore } from '@features/auth';
import { deleteAccountApi,logoutApi } from '@features/auth/api';
import { useParentProfile } from '@features/parent-profile';
import { useTranslation } from '@chachamelmelll9-hash-service/i18n';
import { screenStyles } from '@shared/config/styles';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet,Text, View } from 'react-native';

const PARENT_STATUS_LABEL: Record<string, string> = {
  draft: '작성 중',
  consent_pending: '동의 대기',
  review: '검수 중',
  published: '공개 중',
  hidden: '공개 중단',
  rejected: '검수 반려',
};

export default function ProfileScreen() {
  const { t } = useTranslation('ui');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { data: parentProfile } = useParentProfile();

  const logoutMutation = useMutation({
    mutationFn: () => logoutApi(),
    onSettled: async () => {
      // 성공이든 실패든 로컬 정리
      await clearAuth();
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => deleteAccountApi(),
    onSuccess: async () => {
      await clearAuth();
    },
    onError: () => {
      Alert.alert(t('delete_account_failed', { ns: 'auth' }));
    },
  });

  const handleSignOut = () => {
    Alert.alert(
      t('logout', { ns: 'auth' }),
      t('logout_confirm_message', {
        ns: 'auth',
        defaultValue: '정말 로그아웃하시겠습니까?',
      }),
      [
        {
          text: t('cancel', { ns: 'common' }),
          style: 'cancel',
        },
        {
          text: t('logout', { ns: 'auth' }),
          style: 'destructive',
          onPress: () => logoutMutation.mutate(),
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('delete_account_confirm_title', { ns: 'auth' }),
      t('delete_account_confirm_message', { ns: 'auth' }),
      [
        {
          text: t('cancel', { ns: 'common' }),
          style: 'cancel',
        },
        {
          text: t('delete_account', { ns: 'auth' }),
          style: 'destructive',
          onPress: () => deleteAccountMutation.mutate(),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={screenStyles.paddedContainer}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={screenStyles.title}>내 정보</Text>

      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      )}

      {/* 부모님 프로필이 이 앱의 중심이라 가장 위에 둔다 */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>부모님</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="부모님 프로필"
          style={styles.menuItem}
          testID="profile-parent-entry"
          onPress={() => router.push('/(tabs)/profile/parent')}
        >
          <Text style={styles.menuItemText}>부모님 프로필</Text>
          <Text style={styles.menuItemStatus}>
            {parentProfile
              ? (PARENT_STATUS_LABEL[parentProfile.status] ?? parentProfile.status)
              : '미등록'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>안전</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="차단 목록"
          style={styles.menuItem}
          testID="profile-blocked-entry"
          onPress={() => router.push('/(tabs)/profile/blocked')}
        >
          <Text style={styles.menuItemText}>차단 목록</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="신고 내역"
          style={[styles.menuItem, styles.menuItemSpaced]}
          testID="profile-reports-entry"
          onPress={() => router.push('/(tabs)/profile/reports')}
        >
          <Text style={styles.menuItemText}>신고 내역</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </Pressable>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>{t('preferences')}</Text>

        <Pressable accessibilityRole="button"
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/profile/preferences/language')}
        >
          <Text style={styles.menuItemText}>{t('language_settings')}</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </Pressable>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>{t('help')}</Text>

        <Pressable accessibilityRole="button"
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/profile/help')}
        >
          <Text style={styles.menuItemText}>{t('help')}</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button"
        style={styles.signOutButton}
        onPress={handleSignOut}
        disabled={logoutMutation.isPending}
      >
        <Text style={styles.signOutText}>
          {logoutMutation.isPending ? t('logging_out', { ns: 'auth' }) : t('logout', { ns: 'auth' })}
        </Text>
      </Pressable>

      <Pressable accessibilityRole="button"
        style={styles.deleteAccountButton}
        onPress={handleDeleteAccount}
        disabled={deleteAccountMutation.isPending}
      >
        <Text style={styles.deleteAccountText}>
          {deleteAccountMutation.isPending
            ? t('deleting_account', { ns: 'auth' })
            : t('delete_account', { ns: 'auth' })}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 48 },
  menuItemSpaced: { marginTop: 8 },
  menuItemStatus: {
    fontSize: 14,
    color: '#6B7280',
  },
  userInfo: {
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  email: {
    fontSize: 16,
    color: '#111827',
  },
  menuSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItemText: {
    fontSize: 16,
    color: '#111827',
  },
  menuItemArrow: {
    fontSize: 18,
    color: '#10B981',
  },
  signOutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  deleteAccountButton: {
    marginTop: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAccountText: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
});
