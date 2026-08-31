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
  email: string;
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
