---
name: setup-icons
description: Replace all app icons across mobile and webview from a single source image. Use when the user wants to update app icons.
argument-hint: "[source-image-path]"
allowed-tools: Read, Glob, Bash(sips *), Bash(cp *), Bash(mkdir *), Bash(ls *), Bash(test *), Bash(echo *), Bash(node *)
---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:

- 이 스킬은 `build` phase의 **선택적** 첫 subphase다
- `$ARGUMENTS`가 비어 있으면 `preferences.icon_source` → 아래 관례 경로 순으로 소스 이미지를 탐색한다
- 소스 이미지를 찾지 못하면 **스킵**을 명시적으로 보고하고 `phase_skipped`를 기록한 뒤 종료한다 (템플릿 아이콘 유지 — 실패로 처리하지 않는다)
- 이 subphase만 끝내고 다음 스킬을 직접 호출하지 않는다 (Stop 훅 라우터가 다음 subphase를 지정한다)

**소스 이미지 탐색 순서:**

```bash
# 1) auto-mode.json의 preferences.icon_source
node -e "try{console.log(require('./docs/progress/auto-mode.json').preferences?.icon_source||'')}catch(e){}"

# 2) 관례 경로 (하나라도 있으면 사용)
ls assets/icon-source.{png,jpg,jpeg,webp} \
   assets/branding/icon-source.{png,jpg,jpeg,webp} \
   docs/branding/icon-source.{png,jpg,jpeg,webp} 2>/dev/null | head -1
```

> 탐색 경로는 `.codex/hooks/lib/common.py`의 `ICON_SOURCE_CANDIDATES`와 동일하게 유지한다 — Stop 훅 라우터가 이 목록으로 setup-icons의 필수 여부를 판정하므로 어긋나면 라우팅이 틀어진다.

**스킵 기록:**

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"build","skill":"setup-icons","event":"phase_skipped","detail":{"reason":"아이콘 소스 이미지 없음 — 템플릿 아이콘 유지"}}' >> docs/progress/pipeline.jsonl
```

**완료 기록** (아이콘 생성 성공 시):

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"build","skill":"setup-icons","event":"phase_completed","detail":{"artifacts":["apps/mobile/assets/images/icon.png","assets/store/icon-512x512.png"]}}' >> docs/progress/pipeline.jsonl
```

> `iter` 값은 출시 후 이터레이션에서 활성 iter로 치환한다 — `docs/progress/SCHEMA.md`의 "활성 iter 결정" 참조.

---

## Usage

The user will provide a source image path as argument: $ARGUMENTS

Auto mode에서 `$ARGUMENTS`가 비어 있으면 위 "Auto Mode" 섹션의 탐색 순서를 따른다.

## Instructions

1. **Validate the source image**
   - Read the image file at the provided path to verify it exists
   - Run `sips -g pixelWidth -g pixelHeight -g format <path>` to check dimensions
   - Warn if the image is smaller than 1024x1024 (recommended minimum for App Store)
   - Warn if the image is not PNG format

2. **Generate all icon variants** using `sips` (macOS built-in):

   | Target File | Size | Purpose |
   |-------------|------|---------|
   | `apps/mobile/assets/images/icon.png` | 1024x1024 | iOS App Store icon |
   | `apps/mobile/assets/images/adaptive-icon.png` | 1024x1024 | Android adaptive icon |
   | `apps/mobile/assets/images/splash-icon.png` | 200x200 | Splash screen icon |
   | `apps/mobile/assets/images/favicon.png` | 48x48 | Web favicon (Expo web) |
   | `assets/store/icon-512x512.png` | 512x512 | Play Store listing icon (uploaded by `scripts/upload-images.mjs`) |

   For each target:
   ```bash
   mkdir -p <target-dir>
   cp <source> <target>
   sips -z <height> <width> <target>
   ```

3. **Generate webview assets** (if `apps/webview/public/` exists):

   | Target File | Size | Purpose |
   |-------------|------|---------|
   | `apps/webview/public/logo.png` | 512x512 | Webview logo |
   | `apps/webview/public/favicon.ico` | 32x32 | Browser favicon |

   For favicon.ico:
   ```bash
   cp <source> apps/webview/public/favicon.ico
   sips -z 32 32 apps/webview/public/favicon.ico
   sips -s format ico apps/webview/public/favicon.ico 2>/dev/null || sips -s format png apps/webview/public/favicon.ico
   ```

4. **Verify all generated files**
   - Run `sips -g pixelWidth -g pixelHeight` on each generated file
   - Print a summary table showing file path, target size, and actual size
   - Confirm all sizes match expected dimensions

5. **Report completion**
   - List all files that were created/updated
   - Note if any webview assets were skipped (directory not found)
