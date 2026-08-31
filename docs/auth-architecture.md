# Auth Architecture

## Overview

Mobile/WebView에서 Supabase SDK를 완전히 제거하고, Server만 Supabase와 통신하는 인증 아키텍처

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Mobile      │────▶│     Server      │────▶│    Supabase     │
│ (인증 관리자)    │◀────│   (API Layer)   │◀────│   (Auth DB)     │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
    Bridge (postMessage)
         │
         ▼
┌─────────────────┐
│    WebView      │
│   (소비자)       │
└─────────────────┘
```

---

## Core Principles

### 1. Responsibility Separation

| 책임 | WebView | Mobile | Server |
|------|---------|--------|--------|
| Access Token 사용 | ✅ | ✅ | ✅ (검증) |
| Refresh Token 보유 | ❌ | ✅ | ❌ |
| 토큰 갱신 | ❌ | ✅ | API 제공 |
| 401 판단 | ❌ | ✅ | 에러코드 제공 |
| 세션 종료 처리 | UI만 | 전체 책임 | - |

### 2. Key Principles

- **WebView = 소비자**: Access Token 사용만, 갱신/판단 안함
- **Mobile = 인증 관리자**: Refresh Token 보유, 갱신, 로그아웃 전체 책임
- **Server = 명확한 에러 코드 반환**: 401 원인 구분

---

## Token Flow

### Login Flow
```
Mobile → Server POST /auth/login → Supabase signInWithPassword
                                           ↓
Mobile ← { accessToken, refreshToken, expiresAt, user }
         ↓
    SecureStore에 저장
```

### API Call Flow
```
Mobile/WebView → Server (Authorization: Bearer {accessToken})
                        ↓
                  AuthGuard 검증
                        ↓
              성공 → 정상 응답
              실패 → 401 { code, message }
```

### Token Refresh Flow
```
Mobile → Server POST /auth/refresh { refreshToken }
                        ↓
              Supabase refreshSession
                        ↓
Mobile ← { accessToken, refreshToken, expiresAt }
         ↓
    SecureStore 업데이트
```

---

## 401 Error Code System

### Server Response Format

```typescript
// HTTP 401 Response Body
{
  "statusCode": 401,
  "code": "token_expired" | "token_invalid" | "token_revoked",
  "message": "Human readable message"
}
```

### Error Code Definitions

| Code | Meaning | Cause | Mobile Action |
|------|---------|-------|---------------|
| `token_expired` | Access Token 만료 | JWT exp 초과 | Refresh 시도 |
| `token_invalid` | 토큰 구조/서명 오류 | 위조, 손상, 형식 오류 | 즉시 로그아웃 |
| `token_revoked` | Refresh Token 폐기됨 | 다른 기기 로그인, 계정 위험 | 강제 로그아웃 |

> **Note**: 권한 부족(permission_denied)은 401이 아닌 403 Forbidden으로 별도 처리

### Mobile Error Handling Logic

```typescript
async function handle401(errorCode: string): Promise<Handle401Result> {
  switch(errorCode) {
    case 'token_expired':
      return await tryRefresh();

    case 'token_revoked':
    case 'token_invalid':
      await forceLogout();
      return { retry: false };

    default:
      return { retry: false };
  }
}
```

---

## WebView ↔ Mobile 401 Flow

### Sequence Diagram

```
WebView                     Mobile                      Server
   │                          │                           │
   │─── API 요청 (token) ────▶│                           │
   │                          │─── 전달 ─────────────────▶│
   │                          │◀── 401 {code} ───────────│
   │◀── 401 이벤트 ───────────│                           │
   │                          │                           │
   │                    [code 판단]                       │
   │                          │                           │
   │                   ┌──────┴──────┐                    │
   │                   │             │                    │
   │            (expired)    (invalid/revoked)            │
   │                   │             │                    │
   │                   │             ▼                    │
   │                   │      [forceLogout]               │
   │                   │             │                    │
   │                   ▼             │                    │
   │            [tryRefresh]         │                    │
   │                   │             │                    │
   │        ┌──────────┴──────────┐  │                    │
   │        │                     │  │                    │
   │   (success)              (fail) │                    │
   │        │                     │  │                    │
   │        ▼                     ▼  │                    │
   │◀── token-update      [logout]◀──┘                    │
   │        │                │                            │
   │   [재요청]          [UI 정리]                         │
```

### Bridge Message Types

```typescript
// WebView → Mobile
interface WebViewToMobile {
  '401': {
    code: 'token_expired' | 'token_invalid' | 'token_revoked';
    message: string;
  };
}

// Mobile → WebView
interface MobileToWebView {
  'session': { accessToken: string } | null;
  'token-update': { accessToken: string };
  'logout': {};
}
```

---

## API Endpoints

### Auth Controller

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | ❌ | 이메일/비밀번호 로그인 |
| POST | `/auth/signup` | ❌ | 회원가입 |
| POST | `/auth/logout` | ❌ | 로그아웃 (refreshToken 무효화) |
| POST | `/auth/refresh` | ❌ | 토큰 갱신 |
| POST | `/auth/reset-password` | ❌ | 비밀번호 재설정 이메일 |

### Request/Response Examples

#### Login
```typescript
// Request
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response 200
{
  "accessToken": "eyJhbG...",
  "refreshToken": "v1.abc...",
  "expiresAt": 1704067200,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}

// Response 400
{
  "statusCode": 400,
  "code": "invalid_credentials",
  "message": "이메일 또는 비밀번호가 올바르지 않습니다"
}
```

#### Signup
```typescript
// Request
POST /auth/signup
{
  "email": "user@example.com",
  "password": "password123"
}

// Response 201
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
  // 이메일 인증이 필요한 경우 토큰 없음
}

// Response 400
{
  "statusCode": 400,
  "code": "user_already_exists",
  "message": "이미 등록된 이메일입니다"
}
```

#### Refresh
```typescript
// Request
POST /auth/refresh
{
  "refreshToken": "v1.abc..."
}

// Response 200
{
  "accessToken": "eyJhbG...",
  "refreshToken": "v1.xyz...",
  "expiresAt": 1704067200
}

// Response 401
{
  "statusCode": 401,
  "code": "token_revoked",
  "message": "세션이 만료되었습니다. 다시 로그인해주세요"
}
```

#### Logout
```typescript
// Request
POST /auth/logout
{
  "refreshToken": "v1.abc..."
}

// Response 200
{
  "success": true
}
```

#### Reset Password
```typescript
// Request
POST /auth/reset-password
{
  "email": "user@example.com",
  "redirectTo": "booting-mobile://reset-password"
}

// Response 200
{
  "success": true
}
```

---

## Token Storage (Mobile)

### SecureStore Structure

```typescript
// Key: 'auth_tokens'
interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (ms)
}

// Key: 'auth_user'
interface StoredUser {
  id: string;
  email: string;
}
```

### Token Storage API

```typescript
// apps/mobile/src/features/auth/lib/tokenStorage.ts

const TOKENS_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';

export async function saveTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}): Promise<void>;

export async function getTokens(): Promise<StoredTokens | null>;

export async function getAccessToken(): Promise<string | null>;

export async function getRefreshToken(): Promise<string | null>;

export async function clearTokens(): Promise<void>;

export async function saveUser(user: StoredUser): Promise<void>;

export async function getUser(): Promise<StoredUser | null>;

export async function clearUser(): Promise<void>;

export async function clearAll(): Promise<void>;
```

---

## Auth State (Mobile)

### Zustand Store Interface

```typescript
// apps/mobile/src/features/auth/model/useAuthStore.ts

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

interface Handle401Result {
  retry: boolean;
  newToken?: string;
  error?: 'logout';
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthActions {
  // Initialization
  initialize(): Promise<void>;

  // Auth Actions
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<AuthResult>;

  // Token Management
  handle401(errorCode: string): Promise<Handle401Result>;
  tryRefresh(): Promise<Handle401Result>;
  forceLogout(): Promise<void>;
}
```

### Auth Store Implementation

```typescript
export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // Initial State
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  // Initialize - 앱 시작 시 호출
  initialize: async () => {
    set({ isLoading: true });

    const tokens = await getTokens();
    const user = await getUser();

    if (tokens && user) {
      // 토큰이 곧 만료되면 갱신
      if (Date.now() > tokens.expiresAt - 5 * 60 * 1000) {
        const result = await get().tryRefresh();
        if (!result.retry) {
          set({ isInitialized: true, isLoading: false });
          return;
        }
      }
      set({ user, isAuthenticated: true });
    }

    set({ isInitialized: true, isLoading: false });
  },

  // Sign In
  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await loginApi(email, password);
      if (response.error) {
        return { success: false, error: parseAuthError(response.error) };
      }

      await saveTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        expiresAt: response.data.expiresAt,
      });
      await saveUser(response.data.user);

      set({ user: response.data.user, isAuthenticated: true });
      return { success: true };
    } finally {
      set({ isLoading: false });
    }
  },

  // Handle 401
  handle401: async (errorCode) => {
    switch(errorCode) {
      case 'token_expired':
        return get().tryRefresh();
      case 'token_revoked':
      case 'token_invalid':
        await get().forceLogout();
        return { retry: false, error: 'logout' };
      default:
        return { retry: false };
    }
  },

  // Try Refresh
  tryRefresh: async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await get().forceLogout();
      return { retry: false, error: 'logout' };
    }

    const response = await refreshApi(refreshToken);
    if (response.error) {
      await get().forceLogout();
      return { retry: false, error: 'logout' };
    }

    await saveTokens({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      expiresAt: response.data.expiresAt,
    });

    return { retry: true, newToken: response.data.accessToken };
  },

  // Force Logout
  forceLogout: async () => {
    await clearAll();
    set({ user: null, isAuthenticated: false });
  },
}));
```

---

## Mobile API Client

### Server Fetch with 401 Handling

```typescript
// apps/mobile/src/shared/api/server.ts

import { getAccessToken } from '@features/auth/lib/tokenStorage';
import { useAuthStore } from '@features/auth/model/useAuthStore';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3000/api';

export class AuthenticationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  skipAuth?: boolean;
}

export async function serverFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!options.skipAuth) {
    const accessToken = await getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(`${SERVER_URL}${endpoint}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    const error = await response.json();
    const result = await useAuthStore.getState().handle401(error.code);

    if (result.retry) {
      // 새 토큰으로 재시도
      return serverFetch(endpoint, options);
    }

    throw new AuthenticationError(error.message, error.code);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}
```

---

## WebView Session Store

### Session Store Interface

```typescript
// apps/webview/src/features/session/model/useSessionStore.ts

interface SessionState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

interface SessionActions {
  setAccessToken(token: string): void;
  clearSession(): void;
  handleLogout(): void;
  initializeTimeout(): void;
}
```

### Session Store Implementation

```typescript
export const useSessionStore = create<SessionState & SessionActions>((set) => ({
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,

  setAccessToken: (token) => {
    set({ accessToken: token, isAuthenticated: true, isInitialized: true });
  },

  clearSession: () => {
    set({ accessToken: null, isAuthenticated: false });
  },

  handleLogout: () => {
    set({ accessToken: null, isAuthenticated: false });
    // 로그아웃 UI 표시 또는 리다이렉트
  },

  initializeTimeout: () => {
    // 3초 후에도 세션을 못 받으면 초기화 완료 처리
    setTimeout(() => {
      set((state) => ({ ...state, isInitialized: true }));
    }, 3000);
  },
}));
```

---

## WebView API Client

### WebView는 401을 처리하지 않는다

```typescript
// apps/webview/src/shared/api/server.ts

import { useSessionStore } from '@features/session/model/useSessionStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

export async function serverFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { accessToken } = useSessionStore.getState();

  const response = await fetch(`${SERVER_URL}${endpoint}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    const error = await response.json();

    // 401 발생 시 Native에 신호만 전달 (판단/처리 안함)
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: '401',
        code: error.code,
        message: error.message,
      }));
    }

    // Promise를 pending 상태로 유지 (Native가 처리 후 재요청)
    return new Promise(() => {});
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}
```

---

## WebView Bridge Handler

### Message Listener

```typescript
// apps/webview/src/shared/lib/bridge.ts

import { useSessionStore } from '@features/session/model/useSessionStore';

export function initBridgeListener() {
  const handleMessage = (event: MessageEvent) => {
    try {
      const message = typeof event.data === 'string'
        ? JSON.parse(event.data)
        : event.data;

      switch (message.type) {
        case 'session':
          if (message.payload?.accessToken) {
            useSessionStore.getState().setAccessToken(message.payload.accessToken);
          } else {
            useSessionStore.getState().clearSession();
          }
          break;

        case 'token-update':
          useSessionStore.getState().setAccessToken(message.payload.accessToken);
          // TODO: pending API 재시도
          break;

        case 'logout':
          useSessionStore.getState().handleLogout();
          break;
      }
    } catch (e) {
      console.error('Bridge message parse error:', e);
    }
  };

  window.addEventListener('message', handleMessage);

  // iOS WebView 지원
  document.addEventListener('message', handleMessage as EventListener);

  return () => {
    window.removeEventListener('message', handleMessage);
    document.removeEventListener('message', handleMessage as EventListener);
  };
}
```

---

## Mobile Bridge Handler

### WebView Message Handler

```typescript
// apps/mobile/src/features/webview/hooks/useBridgeHandler.ts

import { useRef, useCallback } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useAuthStore } from '@features/auth/model/useAuthStore';

export function useBridgeHandler() {
  const webViewRef = useRef<WebView>(null);

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === '401') {
        const result = await useAuthStore.getState().handle401(message.code);

        if (result.retry && result.newToken) {
          // 갱신 성공: WebView에 새 토큰 전달
          webViewRef.current?.postMessage(JSON.stringify({
            type: 'token-update',
            payload: { accessToken: result.newToken },
          }));
        } else {
          // 로그아웃: WebView에 로그아웃 명령
          webViewRef.current?.postMessage(JSON.stringify({
            type: 'logout',
          }));
        }
      }
    } catch (e) {
      console.error('Bridge message parse error:', e);
    }
  }, []);

  const sendSession = useCallback((accessToken: string | null) => {
    webViewRef.current?.postMessage(JSON.stringify({
      type: 'session',
      payload: accessToken ? { accessToken } : null,
    }));
  }, []);

  return {
    webViewRef,
    handleMessage,
    sendSession,
  };
}
```

---

## Server Implementation

### Auth Error Codes

```typescript
// apps/server/src/auth/constants/auth-errors.ts

export const AUTH_ERROR_CODES = {
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
  TOKEN_REVOKED: 'token_revoked',
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  token_expired: '토큰이 만료되었습니다',
  token_invalid: '유효하지 않은 토큰입니다',
  token_revoked: '세션이 만료되었습니다. 다시 로그인해주세요',
};
```

### Auth Guard with Error Codes

```typescript
// apps/server/src/auth/auth.guard.ts

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { ConfigService } from '@nestjs/config';
import { AUTH_ERROR_CODES, AUTH_ERROR_MESSAGES } from './constants/auth-errors';

@Injectable()
export class AuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getJwks() {
    if (!this.jwks) {
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      this.jwks = createRemoteJWKSet(
        new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
      );
    }
    return this.jwks;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
        message: AUTH_ERROR_MESSAGES.token_invalid,
      });
    }

    const token = authHeader.substring(7);
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');

    try {
      const { payload } = await jwtVerify(token, this.getJwks(), {
        issuer: `${supabaseUrl}/auth/v1`,
      });

      request.user = {
        id: payload.sub,
        email: (payload as any).email,
        role: (payload as any).role,
      };

      return true;
    } catch (error: any) {
      // JWT 만료
      if (error.code === 'ERR_JWT_EXPIRED') {
        throw new UnauthorizedException({
          code: AUTH_ERROR_CODES.TOKEN_EXPIRED,
          message: AUTH_ERROR_MESSAGES.token_expired,
        });
      }

      // 기타 JWT 오류 (서명 오류, 형식 오류 등)
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
        message: AUTH_ERROR_MESSAGES.token_invalid,
      });
    }
  }
}
```

### Auth DTOs

```typescript
// apps/server/src/auth/dto/index.ts

import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  redirectTo?: string;
}
```

### Auth Service

```typescript
// apps/server/src/auth/auth.service.ts

import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';
import { AUTH_ERROR_CODES, AUTH_ERROR_MESSAGES } from './constants/auth-errors';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthUser {
  id: string;
  email: string;
}

interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

interface SignUpResponse {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new BadRequestException({
        code: 'invalid_credentials',
        message: '이메일 또는 비밀번호가 올바르지 않습니다',
      });
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at! * 1000, // Convert to ms
      user: {
        id: data.user.id,
        email: data.user.email!,
      },
    };
  }

  async signUp(email: string, password: string): Promise<SignUpResponse> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new BadRequestException({
          code: 'user_already_exists',
          message: '이미 등록된 이메일입니다',
        });
      }
      throw new BadRequestException({
        code: 'signup_failed',
        message: error.message,
      });
    }

    const response: SignUpResponse = {
      user: {
        id: data.user!.id,
        email: data.user!.email!,
      },
    };

    // 이메일 인증이 필요 없는 경우 세션 포함
    if (data.session) {
      response.accessToken = data.session.access_token;
      response.refreshToken = data.session.refresh_token;
      response.expiresAt = data.session.expires_at! * 1000;
    }

    return response;
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.TOKEN_REVOKED,
        message: AUTH_ERROR_MESSAGES.token_revoked,
      });
    }

    return {
      accessToken: data.session!.access_token,
      refreshToken: data.session!.refresh_token,
      expiresAt: data.session!.expires_at! * 1000,
    };
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    // Supabase Admin API로 세션 무효화 가능
    // 현재는 클라이언트에서 토큰 삭제로 충분
    return { success: true };
  }

  async resetPassword(email: string, redirectTo?: string): Promise<{ success: boolean }> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo ?? 'booting-mobile://reset-password',
    });

    if (error) {
      throw new BadRequestException({
        code: 'reset_password_failed',
        message: error.message,
      });
    }

    return { success: true };
  }
}
```

### Auth Controller

```typescript
// apps/server/src/auth/auth.controller.ts

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, SignUpDto, RefreshTokenDto, ResetPasswordDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.redirectTo);
  }
}
```

### Auth Module

```typescript
// apps/server/src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthGuard, AuthService],
  exports: [AuthGuard],
})
export class AuthModule {}
```

---

## File Structure

### Server
```
apps/server/src/auth/
├── constants/
│   └── auth-errors.ts      # 에러 코드 상수
├── dto/
│   └── index.ts            # LoginDto, SignUpDto, etc.
├── auth.controller.ts      # API 엔드포인트
├── auth.service.ts         # 비즈니스 로직
├── auth.guard.ts           # JWT 검증 (수정)
├── auth.module.ts          # 모듈 정의 (수정)
└── user.decorator.ts       # @User() 데코레이터
```

### Mobile
```
apps/mobile/src/features/auth/
├── api/
│   ├── authApi.ts          # Server API 클라이언트
│   └── index.ts
├── lib/
│   ├── tokenStorage.ts     # SecureStore 래퍼
│   └── auth-errors.ts      # 에러 메시지 (수정)
├── model/
│   ├── useAuthStore.ts     # Zustand 스토어 (수정)
│   └── useAuth.ts          # Hook 래퍼
└── index.ts

apps/mobile/src/shared/api/
├── server.ts               # 401 처리 포함 (수정)
└── index.ts                # supabase 제거 (수정)

apps/mobile/src/features/webview/
└── hooks/
    └── useBridgeHandler.ts # 401 메시지 핸들러 (수정)
```

### WebView
```
apps/webview/src/features/session/
└── model/
    └── useSessionStore.ts  # 세션 스토어 (수정)

apps/webview/src/shared/
├── api/
│   └── server.ts           # API 클라이언트 (신규)
└── lib/
    └── bridge.ts           # Bridge 핸들러 (수정)
```

### Bridge Package
```
packages/webview-bridge/src/
└── types.ts                # 메시지 타입 정의 (수정)
```

---

## Implementation Phases

### Phase 1: Server
1. `auth/constants/auth-errors.ts` - 에러 코드 상수 정의
2. `auth/dto/index.ts` - DTO 생성
3. `auth/auth.service.ts` - AuthService 구현
4. `auth/auth.controller.ts` - AuthController 구현
5. `auth/auth.guard.ts` - 에러 코드 반환하도록 수정
6. `auth/auth.module.ts` - Controller, Service 등록
7. **테스트**: curl/Postman으로 API 테스트

### Phase 2: Mobile
8. `features/auth/lib/tokenStorage.ts` - 토큰 저장소 구현
9. `features/auth/api/authApi.ts` - Auth API 클라이언트 구현
10. `features/auth/api/index.ts` - export
11. `features/auth/lib/auth-errors.ts` - 에러 메시지 수정
12. `features/auth/model/useAuthStore.ts` - handle401 로직 추가
13. `shared/api/server.ts` - 401 처리 로직 추가
14. `shared/api/supabase.ts` - 삭제
15. `shared/api/index.ts` - supabase export 제거
16. **테스트**: 로그인/회원가입/토큰갱신 테스트

### Phase 3: WebView & Bridge
17. `packages/webview-bridge/src/types.ts` - Bridge 타입 정의
18. `features/webview/hooks/useBridgeHandler.ts` - Mobile Bridge 핸들러 수정
19. `shared/api/server.ts` - WebView API 클라이언트 생성
20. `features/session/model/useSessionStore.ts` - 세션 스토어 수정
21. `shared/lib/bridge.ts` - Bridge 핸들러 수정
22. `shared/api/supabase.ts` - 삭제
23. **테스트**: WebView 401 처리 플로우 테스트

### Phase 4: Integration Test
24. 전체 로그인 플로우
25. token_expired → 갱신 → 재요청
26. token_invalid/revoked → 로그아웃
27. WebView ↔ Mobile 통신

---

## Security Considerations

### 1. Token Security
- Refresh Token은 Mobile의 SecureStore에만 저장
- WebView는 Access Token만 메모리에 보유
- Access Token 만료 시간: 1시간 (Supabase 기본값)

### 2. Error Handling
- `token_invalid`: 위조/손상 가능성 → 즉시 로그아웃
- `token_revoked`: 다른 기기 로그인 가능성 → 강제 로그아웃
- 무한 Refresh 방지: expired만 갱신 시도

### 3. Bridge Security
- WebView는 토큰 갱신 권한 없음
- 모든 인증 결정은 Mobile에서 수행

---

## Migration Notes

### Breaking Changes
- Mobile/WebView에서 Supabase SDK 직접 호출 제거
- WebView는 refreshToken을 더 이상 받지 않음

### Backward Compatibility
- 기존 AuthGuard는 Supabase JWT 검증 로직 유지
- 기존 @User() 데코레이터 동작 유지

---

## Testing Checklist

### Phase 1: Server API Test
- [ ] POST /auth/login - 정상 로그인
- [ ] POST /auth/login - 잘못된 비밀번호 → 400
- [ ] POST /auth/signup - 정상 회원가입
- [ ] POST /auth/signup - 중복 이메일 → 400
- [ ] POST /auth/refresh - 정상 갱신
- [ ] POST /auth/refresh - 만료된 refreshToken → 401
- [ ] AuthGuard - 만료된 accessToken → 401 token_expired
- [ ] AuthGuard - 잘못된 accessToken → 401 token_invalid

### Phase 2: Mobile Test
- [ ] 앱 시작 시 토큰 복원
- [ ] 로그인 → 토큰 저장
- [ ] 회원가입 → 성공 메시지
- [ ] 로그아웃 → 토큰 삭제
- [ ] API 호출 → 401 expired → 자동 갱신 → 재시도
- [ ] API 호출 → 401 invalid → 로그아웃

### Phase 3: WebView Test
- [ ] Mobile에서 세션 수신
- [ ] API 호출 → 401 → Mobile에 신호 전달
- [ ] token-update 수신 → 토큰 업데이트
- [ ] logout 수신 → UI 정리

### Phase 4: Integration Test
- [ ] 전체 로그인 플로우 (Mobile → Server → Supabase)
- [ ] WebView에서 API 호출 → 토큰 만료 → 갱신 → 재요청
- [ ] 다른 기기에서 로그인 → 기존 세션 무효화 → 로그아웃
