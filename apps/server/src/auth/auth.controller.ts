import { Body, Controller, HttpCode, HttpStatus, Post, Req,UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto, OAuthCallbackDto,RefreshTokenDto, ResetPasswordDto, SignUpDto } from './dto';

const STRICT_THROTTLE = { default: { limit: 5, ttl: 60000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
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
}
