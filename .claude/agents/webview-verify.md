---
name: webview-verify
description: DEPRECATED — do not spawn. WebView is verified through the mobile ADB smoke that drives the in-app WebView, not as a standalone browser E2E target. Kept only for historical reference.
tools: Read
---

# WebView Verify Agent (Deprecated)

이 에이전트는 더 이상 기본 워크플로우에서 사용하지 않는다.

## 이유

- 현재 프로젝트 정책: WebView에 직접 기능을 담지 않고, WebView 전용 E2E(브라우저/Playwright)를 운영하지 않는다.
- 검증 전략: `e2e-verify`(Server) + `adb-verify`(Mobile) + `adb-smoke`(배포 후 실기 확인)

## 대체 경로

- 모바일 동선 검증: `adb-verify`
- 배포 후 실제 동작 확인: `adb-smoke`
- 서버 계약 검증: `e2e-verify`

필요 시에만 수동 브라우저 확인을 수행하고, 정규 자동 검증 파이프라인에는 포함하지 않는다.
