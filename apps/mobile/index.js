/**
 * 앱 엔트리.
 *
 * `package.json` 의 main 을 `expo-router/entry` 로 두면 릴리스 번들이 깨진다.
 * pnpm 모노레포에서 그 파일은 저장소 루트(`<repo>/node_modules/expo-router/entry.js`)로
 * 호이스팅되는데, Metro 의 projectRoot 는 `apps/mobile` 이라 엔트리가 프로젝트
 * **바깥**에 놓인다. `expo export:embed` 는 그 경로를 `../../node_modules/...` 로
 * 상대화한 뒤 저장소 루트를 기준으로 다시 풀어서, 존재하지 않는 `C:\node_modules\...`
 * 를 찾다가 죽는다 (실측):
 *
 *   Unable to resolve module ./../../node_modules/expo-router/entry.js
 *   from C:\proj\Booting/.
 *
 * 엔트리를 프로젝트 안에 두면 상대 경로가 `./index.js` 가 되어 이 불일치가 사라진다.
 * 개발 서버는 원래도 잘 돌았고, 이 파일은 동작을 바꾸지 않는다 — 같은 모듈을 그대로 부른다.
 */
import 'expo-router/entry';
