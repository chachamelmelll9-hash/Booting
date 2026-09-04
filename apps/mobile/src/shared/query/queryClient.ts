import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1분

      /**
       * 재시도는 **오류 종류를 보고** 정한다.
       *
       * 예전에는 무조건 한 번만 다시 물었다. 통신이 잠깐 끊기면 그 한 번마저
       * 실패해 곧바로 오류 화면이 떴다 — 부모님 화면에서는 그게 "자녀분이
       * 거두었습니다" 로 읽혀서, 멀쩡한 프로필을 두고 오해하시게 됐다 (실측).
       *
       * 4xx 는 다시 물어도 같은 답이다. 없는 것을 세 번 더 묻는 건 사용자를
       * 기다리게만 한다. 반대로 통신·서버 문제는 대개 잠깐이라 몇 번 더 시도할
       * 값어치가 있다 — 지하철에서 신호가 끊긴 부모님이 대상이다.
       */
      retry: (failureCount, error) => {
        const status = (error as { status?: number } | null)?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 3;
      },
      // 1초 → 2초 → 4초. 끊긴 신호가 돌아올 시간을 준다
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});
