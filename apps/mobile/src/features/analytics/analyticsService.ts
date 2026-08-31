import type PostHog from 'posthog-react-native';

export type AnalyticsProperties = Record<string, string | number | boolean | null>;

let posthogClient: PostHog | null = null;

export function setPostHogClient(client: PostHog) {
  posthogClient = client;
}

export const analytics = {
  isReady() {
    return posthogClient !== null;
  },

  capture(event: string, properties?: AnalyticsProperties) {
    void posthogClient?.capture(event, properties);
  },

  screen(screenName: string, properties?: AnalyticsProperties) {
    void posthogClient?.screen(screenName, properties);
  },

  identify(userId: string, properties?: AnalyticsProperties) {
    void posthogClient?.identify(userId, properties);
  },

  reset() {
    void posthogClient?.reset();
  },

  register(properties: AnalyticsProperties) {
    void posthogClient?.register(properties);
  },

  async flush() {
    if (!posthogClient) {
      return false;
    }

    try {
      await posthogClient.flush();
      return true;
    } catch (error) {
      console.error('PostHog flush failed:', error);
      return false;
    }
  },
};
