---
type: Decision
title: 부모님 사진은 기기 앨범에서 고른다 (expo-image-picker)
description: 목업 앨범 시트를 걷어내고 시스템 사진 선택기 → 1:1 자르기 → Storage 업로드로. 정사각 자르기는 얼굴이 잘리지 않게 올리는 사람이 정하는 것이고, 재인코딩으로 위치 EXIF 도 떨어진다.
tags: [decision, profile, native]
sources:
  - id: ce477b74
    resource: commit:e477b74
  - id: c2b95909
    resource: commit:2b95909
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 실제 앨범

## 배경
09-01 에는 pnpm 가상 스토어가 깨져 새 네이티브 의존성을 설치할 수 없어 `MockAlbumSheet`(1×1 자리표시자 PNG)를 붙였다(`2b95909`) — "같은 자리에서 같은 모양으로 고르는 임시 시트. 실 피커가 붙으면 `pickImage()` 하나만 갈아끼우면 된다". 소유자(09-07): "부모님 사진 등록할떄 실제 앨범에 접근하게 고쳐줘 이제 진짜 앱 배포할거야".

## 결정
- `expo-image-picker` ~17. `pickImage()` 만 교체 — 설계대로.
- **정사각형으로 잘라 받는다.** 카드·목록·미리보기가 전부 정사각 썸네일이라 원본 비율이면 화면마다 다른 곳이 잘려 얼굴이 사라진다. 어디를 남길지는 올리는 사람이 정하는 게 맞다. 자르며 재인코딩되므로 촬영 위치 EXIF 도 떨어진다.
- 기본 정보 검증은 **앨범을 열기 전에** — 고르게 해놓고 되돌리면 방금 고른 사진이 버려진 것처럼 보인다.
- 권한: 카메라·마이크 차단(앨범만). `READ/WRITE_EXTERNAL_STORAGE` 는 **남긴다** — Android 12 이하에서 `getMediaLibraryPermissions()` 가 WRITE 를 함께 요청하므로 차단하면 구형 기기에서 사진 추가가 영구히 막힌다. (처음 차단했다가 되돌림 — 실측.)
- 릴리스 번들 엔트리 해석(모노레포 `serverRoot`)도 함께 고쳐 **첫 스토어 AAB**(64.8MB, arm64 포함) 성공. `versionCode` 1 이 말해 주듯 이전엔 한 번도 성공한 적이 없었다.

## 부수 작업
네이티브 모듈이 늘어 `prebuild --clean` + 재빌드 필수. 그 과정에서 한글 사용자명 Gradle 캐시 문제(`5a8ed05`)를 잡았다. 설치된 옛 APK 는 `Cannot find native module 'ExponentImagePicker'` 로 죽는다 — 앱 버그가 아니다.

관련: [windows-build-gotchas](../lessons/windows-build-gotchas.md), [mobile-app](../entities/mobile-app.md).
