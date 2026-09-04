import { IsString, Length, Matches } from 'class-validator';

import { DiscoveryItemDto, PublicProfileDto } from '../../discovery/dto/discovery.dto';

export class ParentLoginDto {
  /**
   * 숫자 8자리 접속 코드.
   *
   * 영문을 섞지 않는다 — 어르신께는 대소문자를 가려 누르는 것도, 전화로
   * "비(B)요 디(D)요" 를 되묻는 것도 벽이다. 숫자는 평생 다뤄 오신 형식이다.
   * 여섯이 아니라 여덟인 이유는 자릿수가 아니라 안전 때문이다 (100만 → 1억).
   */
  @IsString()
  @Length(8, 8)
  @Matches(/^[0-9]{8}$/, { message: '코드가 올바르지 않습니다' })
  code!: string;
}

export interface ParentLoginResponse {
  token: string;
  /** 부모님 본인 별명 — "○○님, 안녕하세요" 인사에 쓴다 */
  nickname: string;
}

/** 부모님 화면에 쌓이는 카드 한 장 */
export interface ParentInboxItemDto {
  connectionId: string;
  /** 상대 부모님 프로필 */
  profile: DiscoveryItemDto;
  sharedAt: string;
  /** 아직 열어보지 않았다 — 초록 강조 */
  unseen: boolean;
  /** 내가 이미 '대화해보고 싶어요' 를 눌렀다 */
  interested: boolean;
  /** 양쪽 부모님이 모두 원해 연락처가 열렸다 */
  matched: boolean;
  /** 매칭됐을 때만 채워진다. 그 전에는 절대 내려보내지 않는다 */
  partnerPhone: string | null;
  partnerName: string | null;
}

/**
 * 부모님이 여시는 상세 — 카드보다 훨씬 많이 담는다.
 *
 * 부모님은 이 한 장으로 판단하신다. 자녀처럼 여러 사람을 훑어보는 화면이
 * 아니라서, 아낄 이유가 없다.
 */
export interface ParentProfileDetailDto extends Omit<ParentInboxItemDto, 'profile'> {
  profile: PublicProfileDto;
}

export interface ParentInterestResponse {
  matched: boolean;
  /** 매칭이 성립한 순간에만 채워진다 */
  partnerPhone: string | null;
  partnerName: string | null;
  partnerNickname: string | null;
}
