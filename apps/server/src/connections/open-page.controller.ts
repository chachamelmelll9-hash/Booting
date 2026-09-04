import { Controller, Get, Header, Param } from '@nestjs/common';

/**
 * 카카오톡 카드의 버튼이 도착하는 자리.
 *
 * 왜 웹 페이지인가: 카드는 **부모님**이 받으신다. 부모님 폰에 이 앱이 깔려 있을
 * 거라고 기대할 수 없고, 아이폰이면 더 그렇다. 링크에 앱 실행 파라미터만 넣어
 * 두면 갈 곳이 없다고 판단한 카카오톡이 버튼을 **통째로 지운다** — 실제로
 * 아이폰에서 카드는 왔는데 '자세히 보기' 가 없었다 (실측).
 *
 * 그래서 어느 기기에서도 열리는 주소를 하나 두고, 앱이 있으면 앱으로 넘긴다.
 * 서버가 HTML 을 직접 그리는 이유는 동의 페이지와 같다 — 페이지 둘 때문에 웹앱을
 * 따로 띄울 이유가 없고, 카카오 콘솔에 등록할 도메인이 하나로 끝난다.
 *
 * 프로필 내용은 여기서 보여 주지 않는다. 이 주소는 카카오톡 대화방에 남아 누구든
 * 열 수 있는 반면, 프로필에는 부모님 사진과 사는 곳이 들어 있다. 내용은 앱에서
 * **부모님 코드**를 넣으신 분에게만 보여 드린다.
 */
@Controller('open')
export class OpenPageController {
  /**
   * 없는 연결이어도 이 페이지는 그대로 뜬다.
   *
   * 존재 여부를 알려 주면 이 주소로 연결 ID 를 하나씩 넣어 보며 무엇이 살아
   * 있는지 셀 수 있다. 부모님께는 어차피 같은 안내면 충분하다.
   */
  @Get(':connectionId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  page(@Param('connectionId') connectionId: string): string {
    return openPage(connectionId);
  }
}

// --- HTML ---------------------------------------------------------------------
// 부모님이 읽으신다. 글자를 키우고 버튼을 크게 둔다 (동의 페이지와 같은 규칙).

function esc(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
  );
}

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 48px 20px 40px;
    font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    background: #F0FDFA; color: #0F172A;
    font-size: 19px; line-height: 1.7;
  }
  .wrap { max-width: 480px; margin: 0 auto; text-align: center; }
  .mark {
    width: 76px; height: 76px; margin: 0 auto 20px;
    border-radius: 22px; background: #14B8A6; color: #fff;
    font-size: 40px; font-weight: 800; line-height: 76px;
  }
  h1 { font-size: 26px; line-height: 1.45; margin: 0 0 10px; }
  .lede { color: #334155; margin: 0 0 32px; }
  a.button {
    display: block; text-decoration: none;
    border-radius: 14px; padding: 18px;
    background: #14B8A6; color: #fff; font-size: 20px; font-weight: 700;
    margin-bottom: 12px;
  }
  section {
    background: #fff; border: 1px solid #CCFBF1; border-radius: 16px;
    padding: 20px; margin-top: 28px; text-align: left;
  }
  h2 { font-size: 18px; margin: 0 0 10px; color: #0D9488; }
  ol { margin: 0; padding-left: 22px; color: #334155; }
  li { margin-bottom: 6px; }
  li:last-child { margin-bottom: 0; }
  .quiet { color: #64748B; font-size: 16px; margin-top: 24px; }
`;

function openPage(connectionId: string): string {
  /**
   * 앱이 깔려 있으면 이 주소가 앱을 연다. 없으면 아무 일도 일어나지 않으므로,
   * 자동으로 튀지 않고 **누르셨을 때만** 시도한다 — 부모님 입장에서 화면이
   * 저절로 바뀌었다가 되돌아오는 것만큼 불안한 게 없다.
   */
  const appLink = `booting-mobile://parent/open?connectionId=${encodeURIComponent(connectionId)}`;

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>부팅 · 자녀분이 보내드린 프로필</title><style>${STYLE}</style></head>
<body><div class="wrap">
  <div class="mark">B</div>
  <h1>자녀분이<br>프로필을 보내드렸습니다</h1>
  <p class="lede">부팅 앱에서 열어보실 수 있습니다.</p>
  <a class="button" href="${esc(appLink)}">부팅 앱에서 열기</a>
  <section>
    <h2>앱이 없으시다면</h2>
    <ol>
      <li>자녀분께 <strong>부팅 앱</strong>과 <strong>부모님 코드</strong>를 여쭤보세요.</li>
      <li>앱을 열고 <strong>“부모님이신가요? 코드로 시작”</strong>을 누르세요.</li>
      <li>여덟 자리 숫자 코드를 넣으시면 이 프로필이 열립니다.</li>
    </ol>
  </section>
  <p class="quiet">프로필 내용은 코드를 넣으신 분에게만 보여 드립니다.</p>
</div></body></html>`;
}
