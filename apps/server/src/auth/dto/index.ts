import { IsEmail, IsOptional,IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요' })
  email!: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다' })
  password!: string;
}

export class SignUpDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요' })
  email!: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다' })
  password!: string;
}

export class RefreshTokenDto {
  @IsString({ message: 'refreshToken이 필요합니다' })
  refreshToken!: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요' })
  email!: string;

  @IsOptional()
  @IsString()
  redirectTo?: string;
}

export class OAuthCallbackDto {
  @IsString({ message: 'accessToken이 필요합니다' })
  accessToken!: string;

  @IsString({ message: 'refreshToken이 필요합니다' })
  refreshToken!: string;
}
