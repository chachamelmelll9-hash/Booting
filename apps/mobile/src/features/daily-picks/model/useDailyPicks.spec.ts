import type { DiscoveryItem } from '@shared/api/booting.types';

import { DAILY_PICK_COUNT, todayKey, useDailyPicksStore } from './useDailyPicks';

const item = (profileId: string) => ({ profileId, nickname: profileId }) as DiscoveryItem;
const ids = (items: DiscoveryItem[]) => items.map((i) => i.profileId);
const many = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => item(`${prefix}${i}`));

const YESTERDAY = '2026-09-10';
const TODAY = '2026-09-11';

beforeEach(() => {
  useDailyPicksStore.setState({
    date: null,
    items: [],
    previous: [],
    revealed: [],
    hearted: [],
    hydrated: true,
  });
});

describe('refill — 직전 몫 제외', () => {
  it('날이 바뀌면 직전에 뽑힌 여섯 명이 오늘 후보에서 빠진다', () => {
    const yesterday = many('y', DAILY_PICK_COUNT);
    useDailyPicksStore.setState({ date: YESTERDAY, items: yesterday });

    // 서버 후보는 그대로다 — 하트도 패스도 안 했으니 어제 여섯이 여전히 앞에 있다
    useDailyPicksStore.getState().refill(TODAY, [...yesterday, ...many('n', DAILY_PICK_COUNT)]);

    const state = useDailyPicksStore.getState();
    expect(ids(state.items)).toEqual(['n0', 'n1', 'n2', 'n3', 'n4', 'n5']);
    expect(state.previous).toEqual(['y0', 'y1', 'y2', 'y3', 'y4', 'y5']);
  });

  it('새 얼굴이 모자라면 직전 카드로 뒤를 채운다 — 빈 화면을 만들지 않는다', () => {
    const yesterday = many('y', DAILY_PICK_COUNT);
    useDailyPicksStore.setState({ date: YESTERDAY, items: yesterday });

    useDailyPicksStore.getState().refill(TODAY, [...yesterday, item('n0'), item('n1')]);

    const picked = ids(useDailyPicksStore.getState().items);
    expect(picked).toHaveLength(DAILY_PICK_COUNT);
    // 새 얼굴이 먼저, 모자란 만큼만 어제 카드로 채운다
    expect(picked.slice(0, 2)).toEqual(['n0', 'n1']);
    expect(picked.slice(2)).toEqual(['y0', 'y1', 'y2', 'y3']);
  });

  it('같은 날 보충에서는 오늘 뽑은 카드가 제외 목록에 들어가지 않는다', () => {
    useDailyPicksStore.setState({ date: YESTERDAY, items: [item('y0')] });

    // 후보가 둘뿐이라 오늘 몫이 두 장으로 시작한다
    useDailyPicksStore.getState().refill(TODAY, [item('n0'), item('n1')]);
    expect(ids(useDailyPicksStore.getState().items)).toEqual(['n0', 'n1']);
    expect(useDailyPicksStore.getState().previous).toEqual(['y0']);

    // 후보가 늘어 같은 날 보충 — n0·n1 이 스스로를 제외하면 안 된다
    useDailyPicksStore.getState().refill(TODAY, many('n', DAILY_PICK_COUNT));

    const state = useDailyPicksStore.getState();
    expect(ids(state.items)).toEqual(['n0', 'n1', 'n2', 'n3', 'n4', 'n5']);
    expect(state.previous).toEqual(['y0']);
  });

  it('이미 여섯 장이 찼으면 아무것도 하지 않는다', () => {
    const today = many('t', DAILY_PICK_COUNT);
    useDailyPicksStore.setState({ date: TODAY, items: today, previous: ['y0'] });

    useDailyPicksStore.getState().refill(TODAY, many('n', DAILY_PICK_COUNT));

    expect(ids(useDailyPicksStore.getState().items)).toEqual(ids(today));
  });

  it('날이 바뀌면 뒤집힘·관심 표시도 함께 비운다', () => {
    useDailyPicksStore.setState({
      date: YESTERDAY,
      items: many('y', DAILY_PICK_COUNT),
      revealed: ['y0', 'y1'],
      hearted: ['y2'],
    });

    useDailyPicksStore.getState().refill(TODAY, many('n', DAILY_PICK_COUNT));

    const state = useDailyPicksStore.getState();
    expect(state.revealed).toEqual([]);
    expect(state.hearted).toEqual([]);
  });

  it('첫 실행이면 제외할 직전 몫이 없다', () => {
    useDailyPicksStore.getState().refill(TODAY, many('n', DAILY_PICK_COUNT));

    const state = useDailyPicksStore.getState();
    expect(ids(state.items)).toEqual(['n0', 'n1', 'n2', 'n3', 'n4', 'n5']);
    expect(state.previous).toEqual([]);
  });
});

describe('todayKey', () => {
  it('로컬 날짜를 쓴다 — UTC 로 바꾸면 한국에서 오전 9시까지 어제가 된다', () => {
    expect(todayKey(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
    expect(todayKey(new Date(2026, 8, 11, 23, 59))).toBe('2026-09-11');
  });
});
