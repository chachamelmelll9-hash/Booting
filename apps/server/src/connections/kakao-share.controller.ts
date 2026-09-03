import { Body, Controller, Get, HttpCode, Logger, Post, Query } from '@nestjs/common';

import { ConnectionsService } from './connections.service';

/**
 * 카카오 서버 콜백 — **메시지가 실제로 전송됐을 때만** 카카오가 부른다.
 *
 * 앱은 "카카오톡으로 넘겼다"까지만 안다. 사용자가 대화방을 고르고 전송을
 * 눌렀는지는 SDK 가 돌려주지 않는다. 그래서 '부모님께 공유 완료' 표시는
 * 여기서만 한다 — 버튼만 눌러도 완료가 되는 걸 막는 유일한 방법이다.
 *
 * 별도 컨트롤러인 이유: 카카오 서버가 부르는 자리라 자녀 로그인 토큰이 없다.
 * `ConnectionsController` 의 `AuthGuard` 아래에 두면 401 로 막힌다.
 * 대신 인증이 없으니 서명(`t`)으로 위조를 막는다 — 없으면 아무나 남의 인연을
 * 공유 완료로 바꿔 놓을 수 있다.
 *
 * 선행 조건: 카카오 콘솔 > 카카오톡 공유 > 서버 콜백에 이 URL 을 등록하고,
 * 서버가 공개 도메인에 올라가 있어야 한다 (localhost 로는 카카오가 못 부른다).
 */
@Controller('kakao')
export class KakaoShareController {
  private readonly logger = new Logger(KakaoShareController.name);

  constructor(private readonly connections: ConnectionsService) {}

  @Post('share-callback')
  @HttpCode(200)
  async shareCallback(
    @Body() body: Record<string, string> = {},
    @Query() query: Record<string, string> = {}
  ) {
    // 콘솔에서 GET/POST 중 무엇으로 등록했든 받아 준다
    const args = { ...query, ...body };
    const { connectionId, userId, t: token } = args;

    if (!connectionId || !userId || !token) return { ok: false };
    if (!this.connections.verifyParentShareToken(connectionId, userId, token)) {
      return { ok: false };
    }

    /**
     * 카카오는 3초 안에 2XX 를 받지 못하면 실패로 본다.
     * 기록은 시작만 시키고 응답을 먼저 돌려준다 — DB 가 느린 날 웹훅이
     * 통째로 실패해 공유 완료가 영영 안 찍히는 것보다 낫다.
     */
    void this.connections
      .markParentShare(connectionId, userId)
      .catch((error) => this.logger.warn(`kakao share callback failed: ${String(error)}`));

    return { ok: true };
  }

  /** 콘솔에서 GET 으로 등록했을 때도 같은 처리를 한다 */
  @Get('share-callback')
  @HttpCode(200)
  shareCallbackGet(@Query() query: Record<string, string> = {}) {
    return this.shareCallback({}, query);
  }
}
