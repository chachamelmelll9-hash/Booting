# 부팅 소개 영상 (66초)

2026-10-01 다시 제작. 09-30 판은 스크린샷 위에 가짜 탭·스크롤을 얹은 것이라 **실제 화면과 맞지 않았고 목소리도 없었다.**
이번 판은 에뮬레이터에서 앱을 실제로 조작하며 녹화한 화면에 나레이션을 입힌다 — 폰 안의 움직임은 전부 앱이 실제로 한 것이다.

## 산출물

| 파일 | 용도 |
|---|---|
| `assets/marketing/booting-promo-9x16.mp4` | 1080×1920 · 66.3s · 30fps — 인스타 릴스, 유튜브 쇼츠, 스토어 프리뷰 |
| `assets/marketing/booting-promo-16x9.mp4` | 1920×1080 · 66.3s · 30fps — 발표·데모데이 프로젝터, 랜딩 임베드 |
| `assets/marketing/poster-9x16.jpg`, `poster-16x9.jpg` | 썸네일 (23.5초 시점) |

mp4 는 `.gitignore` 다. `scripts/promo-video` 로 재생성한다. 09-30 판(`booting-promo-60s-*.mp4`)은 로컬에 남아 있을 수 있다.

## 소리

- **나레이션**: Microsoft Edge 신경망 음성 `ko-KR-SunHiNeural`, 속도 +6% (`msedge-tts`). 문장은 `scenes.mjs` 의 `narration`.
- **음악**: 쇼팽 녹턴 Op.9 No.2 — Musopen 연주, **CC0 1.0 퍼블릭 도메인**.
  `https://archive.org/download/musopen-chopin/Nocturne Op. 9 no. 2 in E flat major.mp3` 을 `scripts/promo-video/music.mp3` 로 받는다.
  목소리 -16 LUFS, 음악 -27 LUFS. 음악을 -16 으로 두면 목소리와 싸운다.

## 구성

장면 길이는 **나레이션 길이 + 여유**로 정해진다 (`narrate.mjs` → `timeline.json`). 화면을 목소리에 맞추지, 그 반대가 아니다.

| # | 화면 | 나레이션 | 앱에서 실제로 하는 일 |
|---|---|---|---|
| 1 | 타이포 | 어머니가 혼자 되신 지 삼 년. 좋은 분을 만나셨으면 좋겠는데, 방법을 모르겠습니다. | — |
| 2 | 타이포 | 앱을 깔아 드려도, 가입부터 사진 등록까지 어머니께는 너무 멉니다. | — |
| 3 | 로고 | 그래서 부팅은, 자녀가 대신 찾아 드립니다. | — |
| 4 | 홈 | 매일 여섯 분의 추천이 도착합니다. 카드를 열면 나이와 지역, 사주 궁합까지 한눈에 보입니다. | 원석 카드 탭 → 카드가 뒤집히며 펼쳐짐 |
| 5 | 프로필 | 프로필에는 자녀가 직접 쓴 부모님 소개가 담겨 있습니다. 마음에 들면 관심을 보냅니다. | 스크롤 두 번 → "관심 보내기" 탭 → 시트 |
| 6 | 대화 연결 → 대화방 | 서로 관심이 닿으면, 먼저 자녀끼리 대화를 나눕니다. | "대화 시작하기" 탭 |
| 7 | 매칭 목록 | 괜찮은 분이다 싶으면, 카카오톡으로 부모님께 보내 드립니다. | "부모님께" 알약 탭 |
| 8 | 부모님 웹 (에뮬레이터 Chrome) | 부모님은 설치도 가입도 필요 없습니다. 큰 글씨 화면에서 버튼 하나로 정하십니다. | 결정 버튼까지 스크롤 |
| 9 | 부모님 웹 (매칭 성공) | 두 분 모두 원하실 때에만, 연락처가 열립니다. | 연락처 상자까지 스크롤 |
| 10 | CTA | 부모님의 다음 인연, 자녀의 손으로. 부팅. | — |

4~7 은 한 사람(녹화 당시 "캠핑목수")으로 이어진다: 카드 공개 → 프로필 → 관심 → 매칭 → 부모님께.

## 만드는 법

전제: 에뮬레이터 5554 에 시연 계정 로그인, 서버·Metro·터널 기동(`scripts\dev-up.ps1`), `PUBLIC_BASE_URL` 이 현재 터널 주소.

```powershell
cd scripts\promo-video
npm i                                   # ffmpeg-static, msedge-tts, puppeteer-core

node narrate.mjs                        # 나레이션 mp3 + timeline.json (문장을 고쳤으면 --force)
node record.mjs s4 s5                   # 앱을 조작하며 녹화 → takes/*.webm, clips/<id>/*.jpg
#   (s5 가 끝나면 "관심 보내기" 시트가 열려 있다 — 아래 "한 번뿐인 장면" 참고)
node record.mjs s6 s7
node record.mjs s8 s9
node capture.mjs --layout tall          # 프레임 1989장 (약 3분)
node capture.mjs --layout wide
node mix.mjs --layout tall              # 프레임 + 나레이션 + 음악 → mp4
node mix.mjs --layout wide
```

녹화가 끝날 때마다 `takes/<id>.sheet.jpg` (1초 간격 콘택트 시트)를 **꼭 본다.** 장면이 생각대로 잡혔는지는 그걸로만 안다.
한 프레임만 미리 보려면 `node capture.mjs --layout wide --at 31`.

### 구조

| 파일 | 역할 |
|---|---|
| `scenes.mjs` | 유일한 원본. 장면마다 나레이션·자막·앱 조작(`pre`/`actions`/`post`) |
| `narrate.mjs` | 나레이션 합성, 길이를 재서 `timeline.json` 작성 |
| `record.mjs` | `adb emu screenrecord` 로 녹화하면서 `actions` 를 장면 시각에 맞춰 실행, 30fps JPEG 로 분해 |
| `parent-url.mjs` | 시연 계정의 `parent_intent` / `matched` 인연으로 부모님 웹 주소(`/p/<token>`) 생성 |
| `film.html` | `init(data)` + `seek(t)`. 폰 화면에는 녹화의 `floor(t×30)` 번째 프레임을 그대로 보여 준다 |
| `capture.mjs` | 설치된 Chrome 으로 `seek(t)` → 스크린샷 반복 (결정적) |
| `mix.mjs` | ffmpeg 로 프레임·나레이션·음악 합성 |
| `shot.ps1` | 스크린샷 + 화면 요소 좌표 덤프 (`-Dump`) — `actions` 의 좌표를 얻는다 |

### 한 번뿐인 장면

- **s4 카드 공개**: 원석 카드는 하루에 한 번만 뒤집힌다. 다시 찍으려면 `scenes.mjs` 의 `GEM` 을 아직 안 뒤집힌 카드 좌표로 바꾼다.
- **s6 대화 연결**: 상호 관심이 성사된 직후에만 뜨는 화면이다. s5 가 끝난 상태(시트 열림)에서
  `adb shell input tap 540 2127` ("관심만 보내기") → 8초쯤 기다려 화면이 다 뜬 뒤 `node record.mjs s6`.
  전송 자체는 3초쯤 걸려 장면에 넣지 않았다. **실제로 인연이 하나 생긴다** (받은 관심 1건 소모).
- 받은 관심이 떨어지면 `node scripts/seed-demo.mjs --heart-me dev.mu0ycqb3@seed.booting.app`.

### 걸렸던 것

- **`adb shell screenrecord` 는 못 쓴다** (소프트웨어 렌더러라 1프레임). **`adb emu screenrecord`** 는 에뮬레이터가 합성한 화면을 24fps 로 잡는다 — 09-30 에는 이걸 몰라서 스크린샷으로 움직임을 흉내 냈다.
- **`adb shell input` 은 0.9초 늦게 닿는다** (기기에서 JVM 을 띄운다). `record.mjs` 가 그만큼 일찍 쏜다(`INPUT_LAG`).
- **터치 표시**: `settings put system show_touches 1` 이면 주입한 탭에도 시스템 터치 점이 찍힌다. 가짜 탭 효과를 얹을 필요가 없다.
- **프로필 사진은 3초 뒤에 뜬다.** 프로필 진입을 장면에 넣으면 빈 사진 영역이 그대로 찍혀서, s5 는 진입 후 6초 기다렸다가 녹화를 시작한다.
- **"부모님께" 를 누르면 1초 안에 카카오톡 로그인 화면으로 넘어간다** (에뮬레이터의 카카오톡은 로그아웃 상태). s7 은 탭 0.45초 뒤에서 멈추고, 곧바로 앱을 강제 종료한다 — 10초 뒤 개발 빌드 fallback 이 "공유함" 으로 기록해 버리기 때문.
- **Chrome 번역 막대**: 한국어 페이지에 "Translate page?" 가 뜬다. ⋮ → "Never translate pages in Korean" 을 한 번 눌러 둔다.
- **LogBox 막대**: 개발 빌드는 리로드 뒤 탭바 위에 "Open debugger to view warnings" 를 띄운다. `record.mjs` 의 `{ app: true }` 가 닫는다.
- **마지막 대사가 잘렸다.** 목소리 버스의 `loudnorm` 을 최종 필터 그래프 안에 두면, 미리보기로 쥐고 있던 끝 3초가 스트림 종료 때 나오지 않는다 ("자녀의 손으로. 부팅." 이 -38dB 로 묻혔다). `mix.mjs` 는 목소리를 먼저 전체 길이 wav 로 뽑고(무음 패딩 후 정규화) 그걸 음악과 섞는다. 고치고 나면 끝 구간 음량을 `volumedetect` 로 재 본다.
- **Metro 가 죽는다.** `clips/`·`frames/` 에 JPEG 수천 장이 생기면 Metro 의 파일 감시가 네이티브 크래시한다 (`logs\metro.err.log`). 캡처 뒤 앱이 검은 화면이면 `dev-up.ps1` 을 다시 돌린다.
- **`dev-up.ps1` 출력을 파이프로 받지 않는다.** 분리 실행한 자식이 파이프를 잡아 명령이 끝나지 않는다.
- PowerShell 5.1 은 BOM 없는 UTF-8 `.ps1` 을 ANSI 로 읽는다 — 그래서 새 스크립트는 전부 `.mjs` 다.

## 다음에 손댈 것

- 60초 안으로 줄이기 (지금 66초 — 2번 장면을 덜어내면 된다)
- 15초·30초 컷다운, 영문 버전
- 시드 프로필 사진이 실루엣이다. 실제 같은 사진이 들어가면 영상이 훨씬 산다
