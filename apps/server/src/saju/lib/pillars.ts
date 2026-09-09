/**
 * 사주팔자(四柱八字) 세우기.
 *
 * 입력은 프로필에 저장된 생년월일·양음력·출생시각 세 가지뿐이다.
 * 여기서 나오는 네 기둥이 궁합 계산의 유일한 입력이며, **원본 생년월일은
 * 이 모듈 밖으로 나가지 않는다.**
 */
import KoreanLunarCalendar from 'korean-lunar-calendar';

import type { Pillar } from './ganji';
import {
  apparentSolarLongitude,
  ipchunInstant,
  julianDay,
  julianDayNumber,
  KST_OFFSET_MS,
  monthBranchFromLongitude,
} from './solar-terms';

export interface SajuBirth {
  /** 'YYYY-MM-DD' — calendarType 이 lunar 면 음력 날짜다 */
  birthDate: string;
  calendarType: 'solar' | 'lunar';
  /** 'HH:mm' — 모르면 null */
  birthTime: string | null;
  birthTimeUnknown: boolean;
  /** 음력 윤달 여부. 스키마에 없어 현재는 항상 false 다 */
  leapMonth?: boolean;
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  /** 출생시각을 모르면 null — 시주 없이 세 기둥으로만 본다 */
  hour: Pillar | null;
}

/** 출생시각을 모를 때 절기 판정에 쓰는 시각. 하루 한가운데라 경계에서 가장 덜 튄다 */
const UNKNOWN_TIME_HOUR = 12;

/**
 * 한국 표준시 변천.
 *
 * 1954-03-21 ~ 1961-08-09 사이 한국은 **UTC+8:30**(동경 127.5°)을 썼다.
 * 이 기간에 적어 둔 시계 시각을 그냥 KST(+9)로 읽으면 30분이 밀려 시주가
 * 통째로 어긋난다 — 지금 만 65~72세인 분들이 정확히 이 구간에 태어났다.
 *
 * 경도(지방시) 보정은 **하지 않는다.** 서울 기준 −32분을 적용하는 유파가 있지만
 * 한국천문연구원 만세력은 표준시를 그대로 쓰고, 유파에 따라 갈리는 값을
 * 서버가 임의로 고를 이유가 없다.
 */
function koreaStandardOffsetMinutes(year: number, month: number, day: number): number {
  const ymd = year * 10000 + month * 100 + day;
  if (ymd >= 19080401 && ymd <= 19111231) return 8 * 60 + 30;
  if (ymd >= 19540321 && ymd <= 19610809) return 8 * 60 + 30;
  return 9 * 60;
}

/** 'HH:mm' → 분. 형식이 어긋나면 null */
function parseMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/** 'YYYY-MM-DD' → [y, m, d]. 형식이 어긋나면 null */
function parseDate(date: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return [y, m, d];
}

/** 음력이면 양력으로 옮긴다. 변환표(1391~2050) 밖이면 null */
function toSolarDate(birth: SajuBirth): [number, number, number] | null {
  const parsed = parseDate(birth.birthDate);
  if (!parsed) return null;
  if (birth.calendarType === 'solar') return parsed;

  const [y, m, d] = parsed;
  const calendar = new KoreanLunarCalendar();
  if (!calendar.setLunarDate(y, m, d, birth.leapMonth ?? false)) return null;

  const solar = calendar.getSolarCalendar();
  return [solar.year, solar.month, solar.day];
}

/**
 * 연간(年干)·연지(年支).
 * 서기 4년이 갑자년이라 (year − 4) 를 나눈 나머지가 그대로 인덱스가 된다.
 */
function yearPillar(sajuYear: number): Pillar {
  const base = sajuYear - 4;
  return {
    stem: ((base % 10) + 10) % 10,
    branch: ((base % 12) + 12) % 12,
  };
}

/**
 * 월간(月干) — 오호둔(五虎遁).
 *
 * 연간이 갑·기면 인월이 병인월, 을·경이면 무인월 … 로 시작한다.
 * 시작 천간은 (연간 % 5) × 2 + 2 로 떨어진다.
 */
function monthPillar(yearStem: number, monthBranch: number): Pillar {
  const startStem = ((yearStem % 5) * 2 + 2) % 10;
  const monthsFromTiger = (monthBranch - 2 + 12) % 12;
  return {
    stem: (startStem + monthsFromTiger) % 10,
    branch: monthBranch,
  };
}

/** 일주(日柱) — 율리우스일수로 끊는 60갑자. 기원은 연속이라 보정이 없다 */
function dayPillar(year: number, month: number, day: number): Pillar {
  const jdn = julianDayNumber(year, month, day);
  return {
    stem: (jdn + 9) % 10,
    branch: (jdn + 1) % 12,
  };
}

/**
 * 시주(時柱) — 오서둔(五鼠遁).
 *
 * 시지는 23시부터 두 시간씩 끊는다(23~01시 자시). 시간은 일간이 갑·기면
 * 자시가 갑자시로 시작해 (일간 % 5) × 2 로 떨어진다.
 */
function hourPillar(dayStem: number, kstHour: number): Pillar {
  const branch = Math.floor(((kstHour + 1) % 24) / 2);
  const startStem = ((dayStem % 5) * 2) % 10;
  return {
    stem: (startStem + branch) % 10,
    branch,
  };
}

/**
 * 사주팔자를 세운다. 날짜가 깨졌거나 음력 변환표 밖이면 null.
 *
 * 연·월주는 **실제 순간**으로 절기를 보고, 일·시주는 **한국시 기준 날짜**로 센다.
 * 23시 이후 출생은 다음 날 자시로 넘긴다(야자시) — 명리에서 하루가 자시에
 * 시작하기 때문이며, 이 규칙 때문에 일주와 달력 날짜가 하루 어긋날 수 있다.
 */
export function computePillars(birth: SajuBirth): FourPillars | null {
  const solar = toSolarDate(birth);
  if (!solar) return null;
  const [year, month, day] = solar;

  const knownTime =
    !birth.birthTimeUnknown && birth.birthTime ? parseMinutes(birth.birthTime) : null;
  const clockMinutes = knownTime ?? UNKNOWN_TIME_HOUR * 60;

  // 적어 둔 시계 시각 → 실제 순간 (그 시절 한국이 쓰던 표준시로 읽는다)
  const offset = koreaStandardOffsetMinutes(year, month, day);
  const instant = new Date(
    Date.UTC(year, month - 1, day, 0, clockMinutes) - offset * 60000
  );
  if (Number.isNaN(instant.getTime())) return null;

  // 실제 순간을 KST 로 다시 읽는다 — 표준시가 +8:30 이던 시기에는 30분이 옮겨진다
  const kst = new Date(instant.getTime() + KST_OFFSET_MS);
  const kstYear = kst.getUTCFullYear();
  const kstMonth = kst.getUTCMonth() + 1;
  const kstDay = kst.getUTCDate();
  const kstHour = kst.getUTCHours();

  // --- 연주: 입춘 전이면 아직 지난 해다 ---
  const sajuYear = instant < ipchunInstant(kstYear) ? kstYear - 1 : kstYear;
  const yp = yearPillar(sajuYear);

  // --- 월주: 절기로 끊는다 ---
  const longitude = apparentSolarLongitude(julianDay(instant));
  const mp = monthPillar(yp.stem, monthBranchFromLongitude(longitude));

  // --- 일주: 야자시면 다음 날로 넘어간다 ---
  const dayShift = knownTime !== null && kstHour >= 23 ? 1 : 0;
  const dayDate = new Date(Date.UTC(kstYear, kstMonth - 1, kstDay + dayShift));
  const dp = dayPillar(
    dayDate.getUTCFullYear(),
    dayDate.getUTCMonth() + 1,
    dayDate.getUTCDate()
  );

  return {
    year: yp,
    month: mp,
    day: dp,
    hour: knownTime !== null ? hourPillar(dp.stem, kstHour) : null,
  };
}
