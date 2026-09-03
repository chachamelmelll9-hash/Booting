import { Body, Controller, Delete,Get, HttpCode, HttpStatus, Post, Req,UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { KakaoIdTokenDto,LoginDto, OAuthCallbackDto,RefreshTokenDto, ResetPasswordDto, SignUpDto } from './dto';
import { KakaoLinkService } from './kakao-link.service';

const STRICT_THROTTLE = { default: { limit: 5, ttl: 60000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly kakaoLink: KakaoLinkService
  ) {}

  @Post('login')
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /**
   * 개발용 즉시 로그인. production 에서는 서비스가 403 을 던진다.
   * 에뮬레이터 테스트에서 로그인·인증 단계를 건너뛰기 위한 통로다.
   */
  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  async devLogin() {
    return this.authService.devLogin();
  }

  @Post('signup')
  @Throttle(STRICT_THROTTLE)
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
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: { user: { id: string } }) {
    return this.authService.logout(req.user.id);
  }

  @Post('delete-account')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Req() req: { user: { id: string } }) {
    return this.authService.deleteAccount(req.user.id);
  }

  @Post('oauth-callback')
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async oauthCallback(@Body() dto: OAuthCallbackDto) {
    return this.authService.oauthCallback(dto.accessToken, dto.refreshToken);
  }

  @Post('reset-password')
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.redirectTo);
  }

  /**
   * 카카오로 로그인할 때 앱이 가장 먼저 묻는 자리.
   *
   * 연결해 둔 계정이 있으면 그 계정의 세션을 내준다. 없으면 `linked: false` 만
   * 돌려주고 앱이 하던 대로(Supabase 카카오 provider) 진행한다.
   *
   * 로그인 전이라 인증이 없다. 대신 id_token 을 카카오 공개키로 검증한다.
   */
  @Post('kakao/resolve')
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async kakaoResolve(@Body() dto: KakaoIdTokenDto) {
    return this.kakaoLink.resolve(dto.idToken);
  }

  @Get('kakao/link')
  @UseGuards(AuthGuard)
  async kakaoLinkStatus(@Req() req: { user: { id: string } }) {
    return this.kakaoLink.status(req.user.id);
  }

  @Post('kakao/link')
  @UseGuards(AuthGuard)
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async linkKakao(@Req() req: { user: { id: string } }, @Body() dto: KakaoIdTokenDto) {
    return this.kakaoLink.link(req.user.id, dto.idToken);
  }

  @Delete('kakao/link')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlinkKakao(@Req() req: { user: { id: string } }) {
    return this.kakaoLink.unlink(req.user.id);
  }
}
