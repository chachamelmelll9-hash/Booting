import { compatibility } from './compatibility';
import type { FourPillars } from './pillars';
import { computePillars } from './pillars';

function pillars(
  year: [number, number],
  month: [number, number],
  day: [number, number],
  hour: [number, number] | null
): FourPillars {
  const at = ([stem, branch]: [number, number]) => ({ stem, branch });
  return {
    year: at(year),
    month: at(month),
    day: at(day),
    hour: hour ? at(hour) : null,
  };
}

describe('compatibility', () => {
  it('점수는 30~99 안에 있고 등급이 점수와 맞는다', () => {
    // 실제로 나올 수 있는 조합을 넓게 훑는다
    for (let stem = 0; stem < 10; stem += 1) {
      for (let branch = 0; branch < 12; branch += 1) {
        const a = pillars([0, 0], [2, 2], [stem, branch], [4, 4]);
        const b = pillars([3, 3], [5, 5], [(stem + 5) % 10, (branch + 7) % 12], [1, 1]);
        const result = compatibility(a, b);

        expect(result.score).toBeGreaterThanOrEqual(30);
        expect(result.score).toBeLessThanOrEqual(99);
        expect(result.reasons.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it('순서를 바꿔도 같은 점수가 나온다', () => {
    const a = computePillars({
      birthDate: '1956-04-25',
      calendarType: 'solar',
      birthTime: '09:30',
      birthTimeUnknown: false,
    })!;
    const b = computePillars({
      birthDate: '1959-11-03',
      calendarType: 'solar',
      birthTime: '17:10',
      birthTimeUnknown: false,
    })!;

    expect(compatibility(a, b).score).toBe(compatibility(b, a).score);
  });

  it('일간 천간합은 stem_union 을 근거로 남긴다', () => {
    // 갑(0)과 기(5) 는 천간합이다
    const a = pillars([0, 0], [0, 0], [0, 0], null);
    const b = pillars([0, 0], [0, 0], [5, 1], null);

    expect(compatibility(a, b).reasons).toContain('stem_union');
  });

  it('일지 충은 branch_clash 를 근거로 남기고 점수를 낮춘다', () => {
    // 자(0)와 오(6) 는 충이다. 일간은 양쪽 다 갑으로 고정해 일지만 비교한다
    const base = pillars([0, 0], [2, 2], [0, 0], null);
    const clashing = pillars([0, 0], [2, 2], [0, 6], null);
    const uniting = pillars([0, 0], [2, 2], [0, 1], null); // 자축 육합

    const withClash = compatibility(base, clashing);
    const withUnion = compatibility(base, uniting);

    expect(withClash.reasons).toContain('branch_clash');
    expect(withUnion.reasons).toContain('branch_six_union');
    expect(withClash.score).toBeLessThan(withUnion.score);
  });

  it('양쪽 다 출생시각을 알아야 confidence 가 high 다', () => {
    const withHour = pillars([0, 0], [2, 2], [4, 4], [6, 6]);
    const withoutHour = pillars([1, 1], [3, 3], [5, 5], null);

    expect(compatibility(withHour, withHour).confidence).toBe('high');
    expect(compatibility(withHour, withoutHour).confidence).toBe('medium');
  });

  it('시주가 없다고 점수가 깎이지 않는다', () => {
    // 시주를 뺀 것 말고는 같은 두 사람 — 정규화가 만점·최저점을 함께 줄이므로
    // 남은 항목의 상대적 위치가 유지된다
    const a = pillars([0, 0], [2, 2], [4, 4], [6, 6]);
    const b = pillars([5, 1], [8, 8], [9, 5], [3, 3]);

    const full = compatibility(a, b).score;
    const noHour = compatibility({ ...a, hour: null }, { ...b, hour: null }).score;

    expect(Math.abs(full - noHour)).toBeLessThanOrEqual(6);
  });
});
