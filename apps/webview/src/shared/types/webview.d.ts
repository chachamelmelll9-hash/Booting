// React Native WebView의 postMessage를 위한 타입 선언
interface Window {
  ReactNativeWebView?: {
    postMessage: (message: string) => void;
  };
}
