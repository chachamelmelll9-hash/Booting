import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKENS_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (ms)
}

export interface StoredUser {
  id: string;
  /** 소셜 로그인은 비어 있을 수 있다 (카카오는 이메일 동의가 없으면 안 준다) */
  email: string;
  /**
   * 이메일이 없을 때 대신 부를 이름 — 카카오 닉네임.
   *
   * 선택 필드로 둔다. 이미 로그인해 둔 사람의 저장본에는 이 값이 없어서,
   * 다시 로그인하기 전까지는 `undefined` 로 읽힌다.
   */
  displayName?: string;
}

// Web fallback using in-memory storage (for Expo Web)
const memoryStorage: Record<string, string> = {};

const webStorage = {
  getItem: (key: string): string | null => {
    return memoryStorage[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    memoryStorage[key] = value;
  },
  removeItem: (key: string): void => {
    delete memoryStorage[key];
  },
};

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  const value = JSON.stringify(tokens);

  if (Platform.OS === 'web') {
    webStorage.setItem(TOKENS_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(TOKENS_KEY, value);
}

export async function getTokens(): Promise<StoredTokens | null> {
  try {
    let value: string | null;

    if (Platform.OS === 'web') {
      value = webStorage.getItem(TOKENS_KEY);
    } else {
      value = await SecureStore.getItemAsync(TOKENS_KEY);
    }

    if (!value) return null;
    return JSON.parse(value) as StoredTokens;
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  return tokens?.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const tokens = await getTokens();
  return tokens?.refreshToken ?? null;
}

export async function clearTokens(): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.removeItem(TOKENS_KEY);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
  } catch {
    // Ignore errors
  }
}

export async function saveUser(user: StoredUser): Promise<void> {
  const value = JSON.stringify(user);

  if (Platform.OS === 'web') {
    webStorage.setItem(USER_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(USER_KEY, value);
}

export async function getUser(): Promise<StoredUser | null> {
  try {
    let value: string | null;

    if (Platform.OS === 'web') {
      value = webStorage.getItem(USER_KEY);
    } else {
      value = await SecureStore.getItemAsync(USER_KEY);
    }

    if (!value) return null;
    return JSON.parse(value) as StoredUser;
  } catch {
    return null;
  }
}

export async function clearUser(): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.removeItem(USER_KEY);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch {
    // Ignore errors
  }
}

export async function clearAll(): Promise<void> {
  await Promise.all([clearTokens(), clearUser()]);
}
