import React from 'react';
import { Text, View, FlatList, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from '@product-engineer-community-service/i18n';

import { screenStyles } from '@shared/config/styles';

// Sample notification data - replace with real data from your backend
const SAMPLE_NOTIFICATIONS = [
  {
    id: '1',
    type: 'account',
    title: 'Welcome!',
    message: 'Your account has been created successfully.',
    timestamp: new Date().toISOString(),
    read: false,
  },
  {
    id: '2',
    type: 'system',
    title: 'System Update',
    message: 'A new version of the app is available.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: true,
  },
  {
    id: '3',
    type: 'general',
    title: 'Notification Example',
    message: 'This is a placeholder notification. Replace with your own data.',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    read: true,
  },
];

export default function NotificationsScreen() {
  const { t } = useTranslation('mobile');

  const renderNotification = ({ item }: { item: typeof SAMPLE_NOTIFICATIONS[0] }) => (
    <Pressable style={[styles.notificationCard, !item.read && styles.unread]}>
      <View style={styles.notificationHeader}>
        <Text style={styles.notificationType}>{item.type.toUpperCase()}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.message}>{item.message}</Text>
    </Pressable>
  );

  return (
    <View style={screenStyles.paddedContainer}>
      <Text style={screenStyles.title}>{t('notifications.title')}</Text>
      <FlatList
        data={SAMPLE_NOTIFICATIONS}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No notifications yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    marginTop: 16,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  unread: {
    backgroundColor: '#D1FAE5',
    borderLeftColor: '#059669',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notificationType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 40,
  },
});
