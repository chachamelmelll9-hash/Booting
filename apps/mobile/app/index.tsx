import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthColors } from '@shared/config/colors';

// 이 컴포넌트는 앱 진입점으로, 실제 라우팅은 _layout.tsx에서 처리합니다.
// 인증 상태에 따른 리다이렉트는 RootLayoutNav에서 수행됩니다.
export default function AppEntry() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={AuthColors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AuthColors.background,
  },
});
