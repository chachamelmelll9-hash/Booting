import { compatibility } from './compatibility';
import { computePillars } from './pillars';

/**
 * 점수 분포 검사.
 *
 * 궁합이 화면에서 쓸모 있으려면 **갈려야** 한다. 전부 70점대로 뭉치면 정렬이
 * 무의미해지고, 반대로 30점이 흔하면 누군가의 부모님에게 매번 낮은 점수가 붙는다.
 * 실제 등록 대상 연령(만 50세 이상)의 생일로 표본을 만들어 폭과 중심을 본다.
 */
describe('궁합 점수 분포', () => {
  const sample = (() => {
    const people = [];
    for (let year = 1945; year <= 1975; year += 2) {
      for (const [month, day] of [
        [2, 18],
        [5, 7],
        [8, 23],
        [11, 11],
      ]) {
        const pillars = computePillars({
          birthDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          calendarType: 'solar',
          birthTime: '08:20',
          birthTimeUnknown: false,
        });
        if (pillars) people.push(pillars);
      }
    }
    return people;
  })();

  const scores = (() => {
    const out: number[] = [];
    for (let i = 0; i < sample.length; i += 1) {
      for (let j = i + 1; j < sample.length; j += 1) {
        out.push(compatibility(sample[i], sample[j]).score);
      }
    }
    return out.sort((a, b) => a - b);
  })();

  // 실측(2026-09): n=2016, 최소 43 / 1사분위 64 / 중앙 69 / 3사분위 74 / 최대 92, 평균 69.0
  it('표본이 충분하다', () => {
    expect(scores.length).toBeGreaterThan(500);
  });

  it('평균이 중간대에 앉는다 (55~80)', () => {
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    expect(mean).toBeGreaterThan(55);
    expect(mean).toBeLessThan(80);
  });

  it('한 점수대에 뭉치지 않는다 — 사분위 폭이 10점 이상', () => {
    const q1 = scores[Math.floor(scores.length * 0.25)];
    const q3 = scores[Math.floor(scores.length * 0.75)];
    expect(q3 - q1).toBeGreaterThanOrEqual(10);
  });

  it('아주 낮은 점수는 드물다 — 40점 미만이 5% 이하', () => {
    const veryLow = scores.filter((s) => s < 40).length;
    expect(veryLow / scores.length).toBeLessThanOrEqual(0.05);
  });

  it('천생연분(90점 이상)도 드물다 — 10% 이하', () => {
    const veryHigh = scores.filter((s) => s >= 90).length;
    expect(veryHigh / scores.length).toBeLessThanOrEqual(0.1);
  });
});
