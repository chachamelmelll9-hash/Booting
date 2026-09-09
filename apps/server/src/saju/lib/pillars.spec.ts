import { computePillars } from './pillars';
import { ipchunInstant, julianDayNumber } from './solar-terms';

const 갑 = 0;
const 을 = 1;
const 병 = 2;
const 기 = 5;
const 경 = 6;
const 임 = 8;
const 계 = 9;

const 자 = 0;
const 축 = 1;
const 인 = 2;
const 묘 = 3;
const 사 = 5;
const 오 = 6;
const 미 = 7;
const 술 = 10;
const 해 = 11;

describe('julianDayNumber', () => {
  // 이 값들은 korean-lunar-calendar 의 일 간지와 대조해 맞춘 것이다
  it.each([
    [1900, 1, 1, 2415021],
    [1984, 2, 2, 2445733],
    [2000, 1, 1, 2451545],
    [2024, 1, 1, 2460311],
  ])('%i-%i-%i → %i', (y, m, d, expected) => {
    expect(julianDayNumber(y, m, d)).toBe(expected);
  });
});

describe('ipchunInstant', () => {
  it('입춘은 늘 2월 3~5일이다', () => {
    for (let year = 1930; year <= 2030; year += 1) {
      const kstDay = new Date(ipchunInstant(year).getTime() + 9 * 3600000).getUTCDate();
      expect(kstDay).toBeGreaterThanOrEqual(3);
      expect(kstDay).toBeLessThanOrEqual(5);
    }
  });

  it('2024년 입춘은 2월 4일이다', () => {
    const kst = new Date(ipchunInstant(2024).getTime() + 9 * 3600000);
    expect(kst.getUTCMonth() + 1).toBe(2);
    expect(kst.getUTCDate()).toBe(4);
  });
});

describe('computePillars', () => {
  it('입춘 전에 태어나면 연주가 지난 해다', () => {
    // 2024-01-01 은 아직 계묘년(2023)이고, 절기로는 자월이다
    const p = computePillars({
      birthDate: '2024-01-01',
      calendarType: 'solar',
      birthTime: '12:00',
      birthTimeUnknown: false,
    });

    expect(p).not.toBeNull();
    expect(p!.year).toEqual({ stem: 계, branch: 묘 });
    expect(p!.month).toEqual({ stem: 갑, branch: 자 });
    expect(p!.day).toEqual({ stem: 갑, branch: 자 });
    expect(p!.hour).toEqual({ stem: 경, branch: 오 });
  });

  it('입춘을 넘기면 연주가 그 해로 바뀐다', () => {
    // 1984-02-02 은 아직 계해년 을축월, 1984-02-05 는 갑자년 병인월
    const before = computePillars({
      birthDate: '1984-02-02',
      calendarType: 'solar',
      birthTime: '10:00',
      birthTimeUnknown: false,
    })!;
    const after = computePillars({
      birthDate: '1984-02-05',
      calendarType: 'solar',
      birthTime: '10:00',
      birthTimeUnknown: false,
    })!;

    expect(before.year).toEqual({ stem: 계, branch: 해 });
    expect(before.month).toEqual({ stem: 을, branch: 축 });
    expect(before.day).toEqual({ stem: 병, branch: 인 });

    expect(after.year).toEqual({ stem: 갑, branch: 자 });
    expect(after.month).toEqual({ stem: 병, branch: 인 });
    expect(after.day).toEqual({ stem: 기, branch: 사 });
  });

  it('출생시각을 모르면 시주가 없다', () => {
    const p = computePillars({
      birthDate: '1984-02-05',
      calendarType: 'solar',
      birthTime: null,
      birthTimeUnknown: true,
    })!;

    expect(p.hour).toBeNull();
    // 연·월·일주는 시각을 몰라도 그대로 선다
    expect(p.day).toEqual({ stem: 기, branch: 사 });
  });

  it('23시 이후는 다음 날 자시로 넘어간다 (야자시)', () => {
    const p = computePillars({
      birthDate: '2024-01-01',
      calendarType: 'solar',
      birthTime: '23:30',
      birthTimeUnknown: false,
    })!;

    // 갑자일이 아니라 다음 날 을축일이 되고, 시주는 병자시다
    expect(p.day).toEqual({ stem: 을, branch: 축 });
    expect(p.hour).toEqual({ stem: 병, branch: 자 });
  });

  it('음력 생일을 양력으로 옮겨 세운다', () => {
    // 음력 1956-03-15 = 양력 1956-04-25 (임술일)
    const lunar = computePillars({
      birthDate: '1956-03-15',
      calendarType: 'lunar',
      birthTime: null,
      birthTimeUnknown: true,
    })!;
    const solar = computePillars({
      birthDate: '1956-04-25',
      calendarType: 'solar',
      birthTime: null,
      birthTimeUnknown: true,
    })!;

    expect(lunar).toEqual(solar);
    expect(lunar.day).toEqual({ stem: 임, branch: 술 });
  });

  it('1954~1961 년생은 표준시(UTC+8:30) 보정으로 시주가 옮겨간다', () => {
    // 이 시기 시계 12:50 은 실제로는 KST 13:20 이라 오시가 아니라 미시다
    const inPeriod = computePillars({
      birthDate: '1956-04-25',
      calendarType: 'solar',
      birthTime: '12:50',
      birthTimeUnknown: false,
    })!;
    // 같은 시각이라도 표준시가 +9 인 해에는 오시로 남는다
    const outOfPeriod = computePillars({
      birthDate: '1966-04-25',
      calendarType: 'solar',
      birthTime: '12:50',
      birthTimeUnknown: false,
    })!;

    expect(inPeriod.hour!.branch).toBe(미);
    expect(outOfPeriod.hour!.branch).toBe(오);
  });

  it('형식이 깨진 날짜는 null 이다', () => {
    expect(
      computePillars({
        birthDate: '1956/04/25',
        calendarType: 'solar',
        birthTime: null,
        birthTimeUnknown: true,
      })
    ).toBeNull();
  });

  it('50 년치 어느 날을 넣어도 기둥 인덱스가 범위 안이다', () => {
    for (let year = 1930; year <= 1980; year += 1) {
      for (const [month, day] of [
        [1, 1],
        [2, 4],
        [6, 15],
        [12, 31],
      ]) {
        const p = computePillars({
          birthDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          calendarType: 'solar',
          birthTime: '09:00',
          birthTimeUnknown: false,
        })!;
        for (const pillar of [p.year, p.month, p.day, p.hour!]) {
          expect(pillar.stem).toBeGreaterThanOrEqual(0);
          expect(pillar.stem).toBeLessThan(10);
          expect(pillar.branch).toBeGreaterThanOrEqual(0);
          expect(pillar.branch).toBeLessThan(12);
        }
      }
    }
  });
});
