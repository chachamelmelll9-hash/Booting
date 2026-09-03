import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ParentSessionState {
  token: string | null;
  nickname: string | null;
  /** 저장소에서 복원이 끝났는가 — 끝나기 전에 라우팅하면 로그인 화면이 깜빡인다 */
  hydrated: boolean;
  signIn: (token: string, nickname: string) => void;
  signOut: () => void;
}

/**
 * 부모님 세션.
 *
 * 자녀용 `useAuthStore` 와 **완전히 분리**한다. 한 기기에서 두 역할이 섞이면
 * 자녀가 부모님 화면을, 부모님이 자녀 화면을 보게 된다. 토큰 저장 위치부터
 * 다르게 둬서 그 사고를 구조적으로 막는다.
 *
 * 만료를 두지 않는다 — 부모님이 코드를 다시 찾아 넣게 만드는 순간 이 서비스를
 * 못 쓰는 이유가 하나 생긴다.
 */
export const useParentSession = create<ParentSessionState>()(
  persist(
    (set) => ({
      token: null,
      nickname: null,
      hydrated: false,
      signIn: (token, nickname) => set({ token, nickname }),
      signOut: () => set({ token: null, nickname: null }),
    }),
    {
      name: 'parent-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ token: state.token, nickname: state.nickname }),
      // 복원이 끝나야 라우팅을 시작한다 (안 그러면 로그인 화면이 한 번 깜빡인다)
      onRehydrateStorage: () => () => useParentSession.setState({ hydrated: true }),
    }
  )
);
