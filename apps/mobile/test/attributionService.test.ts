import { analytics } from '@features/analytics/analyticsService';
import {
  initializeAttributionTracking,
  parseQueryString,
  toAnalyticsProperties,
} from '@features/analytics/attributionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(async () => null),
  parse: jest.fn((url: string) => {
    const queryParams: Record<string, string> = {};
    const queryString = url.split('?')[1] ?? '';
    for (const pair of queryString.split('&')) {
      const [key, value = ''] = pair.split('=');
      if (key) {
        queryParams[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
    return { queryParams };
  }),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const mockGetInitialURL = Linking.getInitialURL as jest.Mock;

describe('parseQueryString', () => {
  it('parses key-value pairs', () => {
    expect(parseQueryString('utm_source=google&utm_medium=cpc')).toEqual({
      utm_source: 'google',
      utm_medium: 'cpc',
    });
  });

  it('strips a leading ? or # prefix', () => {
    expect(parseQueryString('?utm_source=google')).toEqual({
      utm_source: 'google',
    });
    expect(parseQueryString('#utm_source=google')).toEqual({
      utm_source: 'google',
    });
  });

  it('decodes URL-encoded values and plus-as-space', () => {
    expect(
      parseQueryString('utm_campaign=spring%20sale&utm_term=running+shoes')
    ).toEqual({
      utm_campaign: 'spring sale',
      utm_term: 'running shoes',
    });
  });

  it('returns an empty object for an empty string', () => {
    expect(parseQueryString('')).toEqual({});
  });

  it('keeps raw values when decoding fails', () => {
    expect(parseQueryString('utm_source=%E0%A4%A')).toEqual({
      utm_source: '%E0%A4%A',
    });
  });

  it('ignores pairs without a key', () => {
    expect(parseQueryString('=value&utm_source=google')).toEqual({
      utm_source: 'google',
    });
  });
});

describe('toAnalyticsProperties', () => {
  it('converts known timestamp keys to numbers', () => {
    expect(
      toAnalyticsProperties({
        first_touch_ts: '1700000000000',
        utm_source: 'google',
      })
    ).toEqual({
      first_touch_ts: 1_700_000_000_000,
      utm_source: 'google',
    });
  });

  it('keeps non-numeric timestamp values as strings', () => {
    expect(toAnalyticsProperties({ first_touch_ts: 'not-a-number' })).toEqual({
      first_touch_ts: 'not-a-number',
    });
  });

  it('converts boolean-like strings to booleans', () => {
    expect(
      toAnalyticsProperties({
        google_play_instant: 'true',
        some_flag: 'false',
        utm_source: 'google',
      })
    ).toEqual({
      google_play_instant: true,
      some_flag: false,
      utm_source: 'google',
    });
  });
});

describe('initializeAttributionTracking', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('registers deep link attribution from the initial URL', async () => {
    mockGetInitialURL.mockResolvedValue(
      'myapp-mobile://home?utm_source=google&utm_medium=cpc&gclid=abc123'
    );
    const registerSpy = jest.spyOn(analytics, 'register');

    await initializeAttributionTracking();

    expect(registerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        install_source: 'deep_link',
        utm_source: 'google',
        utm_medium: 'cpc',
        click_id: 'abc123',
        click_id_type: 'gclid',
        first_touch_ts: expect.any(Number),
      })
    );
  });

  it('falls back to a non-attributed first touch without marketing params', async () => {
    mockGetInitialURL.mockResolvedValue(null);
    const registerSpy = jest.spyOn(analytics, 'register');

    await initializeAttributionTracking();

    const registered = registerSpy.mock.calls[0][0];
    expect(registered.install_source).toMatch(/^(organic|unknown)$/);
    expect(registered.utm_source).toBeUndefined();
  });

  it('does not overwrite stored first-touch attribution on later launches', async () => {
    mockGetInitialURL.mockResolvedValue(
      'myapp-mobile://home?utm_source=first-campaign'
    );
    await initializeAttributionTracking();

    mockGetInitialURL.mockResolvedValue(
      'myapp-mobile://home?utm_source=second-campaign'
    );
    const registerSpy = jest.spyOn(analytics, 'register');
    await initializeAttributionTracking();

    expect(registerSpy).toHaveBeenCalledWith(
      expect.objectContaining({ utm_source: 'first-campaign' })
    );
  });
});
