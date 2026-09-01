import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { AUTH_ERROR_CODES } from '../../auth/constants/auth-errors';

/** @types/express 가 없어 필요한 부분만 구조적으로 선언한다 */
interface JsonResponse {
  status(code: number): JsonResponse;
  json(body: unknown): void;
}

/**
 * 전역 예외 필터.
 *
 * 서비스가 던진 Supabase 에러를 그대로 두면 전부 `Internal server error` 로
 * 나가서, 클라이언트는 무엇이 잘못됐는지도 모르고 복구할 방법도 없다.
 * 여기서 알아볼 수 있는 실패는 뜻이 있는 상태 코드로 바꾼다.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<JsonResponse>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const message = exception instanceof Error ? exception.message : String(exception);

    /**
     * user_id 외래키 위반 = **토큰은 유효한데 그 계정이 없다.**
     *
     * JWT 는 서명이 맞으면 만료 전까지 통과하므로, 계정이 지워진 뒤에도
     * 요청이 들어온다. 이걸 500 으로 두면 사용자는 모든 쓰기가 실패하는
     * 앱에 갇힌다. 401 로 돌려보내면 클라이언트가 세션을 정리하고
     * 로그인 화면으로 내보낸다.
     */
    if (/violates foreign key constraint .*user_id_fkey/.test(message)) {
      this.logger.warn(`stale session — user row is gone: ${message}`);
      response.status(HttpStatus.UNAUTHORIZED).json({
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
        message: '세션이 만료되었습니다. 다시 로그인해주세요',
      });
      return;
    }

    this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'internal_error',
      message: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요',
    });
  }
}
