import * as SecureStore from 'expo-secure-store';

const LAST_LOGIN_METHOD_KEY = 'last_login_method';

export type LoginMethod = 'email' | 'kakao' | 'apple';

export async function saveLastLoginMethod(method: LoginMethod): Promise<void> {
  await SecureStore.setItemAsync(LAST_LOGIN_METHOD_KEY, method);
}

export async function getLastLoginMethod(): Promise<LoginMethod | null> {
  const value = await SecureStore.getItemAsync(LAST_LOGIN_METHOD_KEY);
  if (value === 'email' || value === 'kakao' || value === 'apple') return value;
  return null;
}
