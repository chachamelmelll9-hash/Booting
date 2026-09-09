/**
 * 절기(節氣) 계산 — 태양의 겉보기황경.
 *
 * 사주의 연주는 **입춘**(황경 315°)에, 월주는 **12절**(입춘부터 30° 간격)에
 * 걸려 있다. 음력 초하루가 아니라 절기가 기준이라 달력만으로는 세울 수 없다.
 *
 * 알고리즘은 Meeus 『Astronomical Algorithms』 25장의 저정밀 태양 위치식이다.
 * 황경 오차 약 0.01° = **시각으로 약 15분**. 절입 시각과 15분 안쪽으로 태어난
 * 경우 인쇄된 만세력과 월주가 갈릴 수 있다 — 이 기능은 재미로 보는 참고
 * 정보이고, 출생시각을 '모름'으로 두는 분이 많아 이 정밀도로 충분하다.
 * (더 올리려면 VSOP87 급수를 들여와야 하는데, 얻는 것에 비해 표가 너무 크다.)
 *
 * ΔT(TT−UTC)는 무시한다. 1950~2030 구간에서 30~70초이고, 황경으로는 1분 남짓이라
 * 위 오차에 묻힌다.
 */

const RAD = Math.PI / 180;

/** 하루가 태양황경 0.9856° 정도를 지난다 — 뉴턴 반복의 보폭 */
const DEGREES_PER_DAY = 0.9856473;

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** UTC 순간 → 율리우스일 (소수 포함) */
export function julianDay(instant: Date): number {
  return instant.getTime() / 86400000 + 2440587.5;
}

export function fromJulianDay(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

/**
 * 그레고리력 → 율리우스일수(정수, 정오 기준).
 * 일주(日柱)의 60갑자를 끊는 데 쓴다.
 */
export function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** 태양의 겉보기황경 (도, 0~360) */
export function apparentSolarLongitude(jd: number): number {
  const t = (jd - 2451545.0) / 36525;

  // 기하평균황경
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  // 평균근점이각
  const m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
  // 중심차
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m * RAD) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m * RAD) +
    0.000289 * Math.sin(3 * m * RAD);

  // 장동·광행차 보정 → 겉보기황경
  const omega = 125.04 - 1934.136 * t;
  const apparent = l0 + c - 0.00569 - 0.00478 * Math.sin(omega * RAD);

  return ((apparent % 360) + 360) % 360;
}

/**
 * `near` 근처에서 태양황경이 `targetLongitude` 가 되는 순간.
 *
 * 황경은 단조증가하므로 뉴턴법이 몇 번이면 수렴한다. `near` 는 그 절기의
 * 통상 날짜(예: 입춘이면 2월 4일)면 충분하다 — 15일 이상 빗나가면 옆 절기로
 * 수렴할 수 있으니 호출부가 날짜를 제대로 넘겨야 한다.
 */
export function solarTermInstant(near: Date, targetLongitude: number): Date {
  let jd = julianDay(near);

  for (let i = 0; i < 12; i += 1) {
    const longitude = apparentSolarLongitude(jd);
    // -180~180 으로 접어야 0°/360° 경계에서 한 바퀴를 돌지 않는다
    const diff = ((targetLongitude - longitude + 540) % 360) - 180;
    if (Math.abs(diff) < 1e-8) break;
    jd += diff / DEGREES_PER_DAY;
  }

  return fromJulianDay(jd);
}

/** 그 해의 입춘(황경 315°) 순간. 입춘은 늘 2월 3~5일이다 */
export function ipchunInstant(year: number): Date {
  return solarTermInstant(new Date(Date.UTC(year, 1, 4)), 315);
}

/**
 * 절기로 끊은 월지(月支).
 *
 * 입춘(315°)이 인월(寅月)의 시작이고 30° 마다 다음 지지로 넘어간다.
 * 인월의 지지 인덱스가 2 이므로 거기서부터 센다.
 */
export function monthBranchFromLongitude(longitude: number): number {
  const fromIpchun = (((longitude - 315) % 360) + 360) % 360;
  return (2 + Math.floor(fromIpchun / 30)) % 12;
}
