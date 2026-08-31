import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { NativeModules, Platform } from 'react-native';

import { analytics, type AnalyticsProperties } from './analyticsService';

type InstallSource = 'play_referrer' | 'deep_link' | 'organic' | 'unknown';

type StoredAttributionProperties = Record<string, string>;

type InstallReferrerResponse = {
  installReferrer?: string | null;
  referrerClickTimestampSeconds?: number | null;
  installBeginTimestampSeconds?: number | null;
  referrerClickTimestampServerSeconds?: number | null;
  installBeginTimestampServerSeconds?: number | null;
  googlePlayInstantParam?: boolean | null;
  installVersion?: string | null;
};

type InstallReferrerNativeModule = {
  getInstallReferrer: () => Promise<InstallReferrerResponse | null>;
};

const { InstallReferrer } = NativeModules as {
  InstallReferrer?: InstallReferrerNativeModule;
};

const ATTRIBUTION_PROPERTIES_KEY = 'analytics_attribution_properties';
const ATTRIBUTION_INSTALL_EVENT_RECORDED_TS_KEY =
  'analytics_attribution_install_event_recorded_ts';

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

const CLICK_ID_KEYS = [
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'ttclid',
  'msclkid',
] as const;

const NUMERIC_PROPERTY_KEYS = new Set([
  'first_touch_ts',
  'referrer_click_ts',
  'install_begin_ts',
  'referrer_click_server_ts',
  'install_begin_server_ts',
]);

const normalizeQueryValue = (
  value: string | string[] | null | undefined,
): string | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return value;
};

export const parseQueryString = (queryString: string): Record<string, string> => {
  const query = queryString.replace(/^[?#]/, '');
  if (!query) {
    return {};
  }

  return query.split('&').reduce<Record<string, string>>((acc, pair) => {
    const [rawKey, rawValue = ''] = pair.split('=');
    if (!rawKey) {
      return acc;
    }

    try {
      const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
      const value = decodeURIComponent(rawValue.replace(/\+/g, ' '));
      acc[key] = value;
    } catch {
      acc[rawKey] = rawValue;
    }

    return acc;
  }, {});
};

const getStoredAttributionProperties =
  async (): Promise<StoredAttributionProperties> => {
    try {
      const stored = await AsyncStorage.getItem(ATTRIBUTION_PROPERTIES_KEY);
      return stored ? (JSON.parse(stored) as StoredAttributionProperties) : {};
    } catch {
      return {};
    }
  };

const setStoredAttributionProperties = async (
  properties: StoredAttributionProperties,
) => {
  await AsyncStorage.setItem(
    ATTRIBUTION_PROPERTIES_KEY,
    JSON.stringify(properties),
  );
};

const getStoredInt = async (key: string) => {
  const value = await AsyncStorage.getItem(key);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const setStoredInt = async (key: string, value: number) => {
  await AsyncStorage.setItem(key, String(value));
};

const getClickId = (
  queryParams: Record<string, string | string[] | null | undefined>,
) => {
  for (const key of CLICK_ID_KEYS) {
    const value = normalizeQueryValue(queryParams[key]);
    if (value) {
      return { clickId: value, clickIdType: key };
    }
  }

  return { clickId: null, clickIdType: null };
};

const hasMarketingParams = (
  queryParams: Record<string, string | string[] | null | undefined>,
) =>
  [...UTM_KEYS, ...CLICK_ID_KEYS].some((key) =>
    Boolean(normalizeQueryValue(queryParams[key])),
  );

const withFirstTouch = (
  properties: StoredAttributionProperties,
  installSource: InstallSource,
): StoredAttributionProperties => ({
  ...properties,
  install_source: installSource,
  first_touch_ts: String(Date.now()),
  first_touch_iso: new Date().toISOString(),
});

const propertiesFromQueryParams = (
  queryParams: Record<string, string | string[] | null | undefined>,
  installSource: InstallSource,
  referrerUrl?: string,
): StoredAttributionProperties | null => {
  if (!hasMarketingParams(queryParams)) {
    return null;
  }

  const properties: StoredAttributionProperties = {};
  for (const key of UTM_KEYS) {
    const value = normalizeQueryValue(queryParams[key]);
    if (value) {
      properties[key] = value;
    }
  }

  const { clickId, clickIdType } = getClickId(queryParams);
  if (clickId && clickIdType) {
    properties.click_id = clickId;
    properties.click_id_type = clickIdType;
  }

  if (referrerUrl) {
    properties.referrer_url = referrerUrl;
  }

  return withFirstTouch(properties, installSource);
};

const getPropertiesFromUrl = (
  url: string,
  installSource: InstallSource,
): StoredAttributionProperties | null => {
  try {
    const parsed = Linking.parse(url);
    return propertiesFromQueryParams(
      parsed.queryParams ?? {},
      installSource,
      url,
    );
  } catch (error) {
    console.error('Failed to parse attribution URL:', error);
    return null;
  }
};

const getAndroidInstallReferrerProperties =
  async (): Promise<StoredAttributionProperties | null> => {
    if (Platform.OS !== 'android' || !InstallReferrer) {
      return null;
    }

    try {
      const referrer = await InstallReferrer.getInstallReferrer();
      const installReferrer = referrer?.installReferrer;

      if (!installReferrer) {
        return null;
      }

      const properties = propertiesFromQueryParams(
        parseQueryString(installReferrer),
        'play_referrer',
        installReferrer,
      );

      if (!properties) {
        return null;
      }

      if (typeof referrer.referrerClickTimestampSeconds === 'number') {
        properties.referrer_click_ts = String(
          referrer.referrerClickTimestampSeconds * 1000,
        );
      }

      if (typeof referrer.installBeginTimestampSeconds === 'number') {
        properties.install_begin_ts = String(
          referrer.installBeginTimestampSeconds * 1000,
        );
      }

      if (typeof referrer.referrerClickTimestampServerSeconds === 'number') {
        properties.referrer_click_server_ts = String(
          referrer.referrerClickTimestampServerSeconds * 1000,
        );
      }

      if (typeof referrer.installBeginTimestampServerSeconds === 'number') {
        properties.install_begin_server_ts = String(
          referrer.installBeginTimestampServerSeconds * 1000,
        );
      }

      if (typeof referrer.googlePlayInstantParam === 'boolean') {
        properties.google_play_instant = String(
          referrer.googlePlayInstantParam,
        );
      }

      if (referrer.installVersion) {
        properties.install_version = referrer.installVersion;
      }

      return properties;
    } catch (error) {
      console.error('Failed to read Android install referrer:', error);
      return null;
    }
  };

const getInitialDeepLinkProperties =
  async (): Promise<StoredAttributionProperties | null> => {
    const initialUrl = await Linking.getInitialURL();
    if (!initialUrl) {
      return null;
    }

    return getPropertiesFromUrl(initialUrl, 'deep_link');
  };

export const toAnalyticsProperties = (
  properties: StoredAttributionProperties,
): AnalyticsProperties =>
  Object.entries(properties).reduce<AnalyticsProperties>((acc, [key, value]) => {
    if (NUMERIC_PROPERTY_KEYS.has(key)) {
      const parsed = Number(value);
      acc[key] = Number.isFinite(parsed) ? parsed : value;
      return acc;
    }

    if (value === 'true') {
      acc[key] = true;
      return acc;
    }

    if (value === 'false') {
      acc[key] = false;
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});

const ensureFirstTouchAttribution = async () => {
  const stored = await getStoredAttributionProperties();
  if (stored.first_touch_ts) {
    return toAnalyticsProperties(stored);
  }

  const attributionProperties =
    (await getAndroidInstallReferrerProperties()) ??
    (await getInitialDeepLinkProperties()) ??
    withFirstTouch({}, Platform.OS === 'ios' ? 'unknown' : 'organic');

  await setStoredAttributionProperties(attributionProperties);
  return toAnalyticsProperties(attributionProperties);
};

const trackInstallAttributionOnce = async (
  properties: AnalyticsProperties,
) => {
  if (!analytics.isReady()) {
    return;
  }

  const recordedTs = await getStoredInt(
    ATTRIBUTION_INSTALL_EVENT_RECORDED_TS_KEY,
  );
  if (recordedTs > 0) {
    return;
  }

  analytics.capture('app_install_attributed', properties);
  const flushed = await analytics.flush();
  if (flushed) {
    await setStoredInt(ATTRIBUTION_INSTALL_EVENT_RECORDED_TS_KEY, Date.now());
  }
};

export const initializeAttributionTracking = async (): Promise<void> => {
  const properties = await ensureFirstTouchAttribution();
  analytics.register(properties);
  await trackInstallAttributionOnce(properties);
};

export const subscribeToAttributionLinks = () => {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    void (async () => {
      const properties = getPropertiesFromUrl(url, 'deep_link');
      if (!properties) {
        return;
      }

      const stored = await getStoredAttributionProperties();
      if (!stored.first_touch_ts) {
        await setStoredAttributionProperties(properties);
        analytics.register(toAnalyticsProperties(properties));
      } else {
        analytics.register(toAnalyticsProperties(stored));
      }

      analytics.capture('deep_link_opened', {
        ...toAnalyticsProperties(properties),
        link_url: url,
      });
      await analytics.flush();
    })();
  });

  return () => subscription.remove();
};
