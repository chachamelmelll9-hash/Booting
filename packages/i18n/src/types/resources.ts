import common from '../locales/ko/common.json';
import auth from '../locales/ko/auth.json';
import ui from '../locales/ko/ui.json';
import errors from '../locales/ko/errors.json';
import mobile from '../locales/ko/mobile.json';
import webview from '../locales/ko/webview.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      auth: typeof auth;
      ui: typeof ui;
      errors: typeof errors;
      mobile: typeof mobile;
      webview: typeof webview;
    };
  }
}
