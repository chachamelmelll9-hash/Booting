/**
 * 디자인 토큰 — 8dp 그리드, 타이포 스케일, 반경, 레이어, 모션.
 *
 * 기존 `colors.ts` 의 theme.spacing/radius 는 템플릿 값이라 그대로 두고,
 * 부팅 화면은 여기 값을 쓴다. 두 벌인 게 이상적이진 않지만, 템플릿 설정 화면
 * 20여 개를 건드리면 diff 가 통째로 커진다.
 */

/** 8dp 그리드. 4는 아이콘-텍스트 같은 미세 간격에만 쓴다 */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

/**
 * 타이포 스케일.
 *
 * 본문 최소 16 — 주 사용자가 40~60대 자녀이고, 부모님이 화면을 함께 보는
 * 경우가 많다. 14 이하는 캡션·메타 정보에만 쓴다.
 */
export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  subheading: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  micro: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

/** 반경. 16은 쓰지 않는다 — 어디에나 16을 두면 전부 같은 화면처럼 보인다 */
export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const zIndex = {
  base: 0,
  card: 1,
  sticky: 10,
  overlay: 100,
  modal: 200,
  toast: 300,
} as const;

/** 스프링 프리셋. damping 18 은 튀지 않으면서 죽지도 않는 지점이다 */
export const motion = {
  spring: { damping: 18, stiffness: 180, mass: 1 },
  springSoft: { damping: 22, stiffness: 140, mass: 1 },
  duration: { fast: 150, normal: 240, slow: 360 },
} as const;

/** 터치 목표 최소 크기 (iOS HIG 44pt / Material 48dp) */
export const HIT_SIZE = 44;

/** 상태 배지 색 */
export const statusTone = {
  neutral: { bg: '#F3F4F6', fg: '#374151' },
  active: { bg: '#ECFDF5', fg: '#059669' },
  pending: { bg: '#FFFBEB', fg: '#B45309' },
  success: { bg: '#ECFDF5', fg: '#047857' },
  muted: { bg: '#F9FAFB', fg: '#9CA3AF' },
} as const;
