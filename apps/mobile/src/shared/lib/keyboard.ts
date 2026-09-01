import { type KeyboardTypeOptions,Platform } from 'react-native';

/**
 * 이메일 입력용 키보드 타입.
 *
 * Android 에서 `email-address` 는 자판 배열만 바꿀 뿐 IME 언어를 바꾸지 않는다.
 * 시스템 로케일이 한국어면 이메일 칸에서도 한글이 조합돼 `rlacdudtn@...` 같은
 * 값이 들어간다.
 *
 * `visible-password` 는 Android 가 ASCII 자판을 강제하는 몇 안 되는 타입이라
 * (이름과 달리 글자는 그대로 보인다) 이메일·비밀번호 칸에 쓴다.
 * iOS 는 `email-address` 로 두는 편이 @ · .com 키가 나와서 낫다.
 */
export const EMAIL_KEYBOARD_TYPE: KeyboardTypeOptions = Platform.select({
  android: 'visible-password',
  default: 'email-address',
});
