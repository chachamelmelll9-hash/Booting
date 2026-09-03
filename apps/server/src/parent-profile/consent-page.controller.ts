import { Controller, Get, Header, Headers as ReqHeaders, HttpCode, Ip, Param, Post } from '@nestjs/common';

import { ConsentService } from './consent.service';
import {
  CONSENT_AGREE_LABEL,
  CONSENT_SECTIONS,
  CONSENT_SERVICE_NAME,
  type ConsentSection,
} from './consent-document';

/**
 * 부모님이 여시는 동의 페이지.
 *
 * 앱이 아니라 **웹 페이지**인 이유: 부모님은 이 앱을 설치하지 않으신다. 카카오톡
 * 으로 받은 링크를 눌러 바로 읽고 누르실 수 있어야 한다.
 *
 * 인증이 없다. 부모님께는 계정이 없으므로 링크의 토큰이 곧 신원이다 — 그래서
 * 토큰은 추측할 수 없어야 하고(32바이트 난수) 기한이 있어야 한다.
 *
 * 서버가 HTML 을 직접 그린다. 이 페이지 하나 때문에 웹앱을 따로 띄우고 배포
 * 경로를 늘릴 이유가 없고, 링크가 서버와 같은 도메인이라 카카오 콘솔에 도메인을
 * 하나만 등록하면 된다.
 */
@Controller('consent')
export class ConsentPageController {
  constructor(private readonly consent: ConsentService) {}

  /**
   * 못 쓰는 링크에도 200 을 돌려준다.
   *
   * 이 주소를 여는 분은 부모님이지 프로그램이 아니다. 상태 코드로 알려 줄
   * 상대가 없고, 브라우저가 오류 화면을 대신 그려 버리면 "자녀분께 다시 보내
   * 달라고 하세요" 라는 정작 필요한 안내가 가려진다.
   */
  @Get(':token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async page(@Param('token') token: string): Promise<string> {
    const found = await this.consent.findByToken(token);

    if (!found) {
      return notice(
        '링크를 찾을 수 없습니다',
        '주소가 잘못되었거나 이미 처리된 요청입니다. 자녀분께 다시 보내 달라고 말씀해 주세요.'
      );
    }
    if (found.revoked_at) {
      return notice('취소된 요청입니다', '자녀분께 다시 보내 달라고 말씀해 주세요.');
    }
    if (found.consented_at) {
      return notice(
        '이미 동의하셨습니다',
        `${String(found.parent_name)} 님, 감사합니다. 이 창은 닫으셔도 됩니다.`,
        true
      );
    }
    if (found.expires_at && new Date(String(found.expires_at)) < new Date()) {
      return notice(
        '기한이 지난 링크입니다',
        '안전을 위해 일정 시간이 지나면 링크가 만료됩니다. 자녀분께 다시 보내 달라고 말씀해 주세요.'
      );
    }

    return consentPage(String(found.parent_name));
  }

  /**
   * 동의 기록. 누가 눌렀는지는 알 수 없지만 언제·어디서인지는 남긴다 —
   * 나중에 "동의를 받았다"를 증명해야 하는 쪽은 우리다.
   */
  @Post(':token/agree')
  @HttpCode(200)
  @Header('Content-Type', 'text/html; charset=utf-8')
  async agree(
    @Param('token') token: string,
    @Ip() ip: string,
    @ReqHeaders('user-agent') userAgent: string
  ): Promise<string> {
    const ok = await this.consent.agreeByToken(token, { ip, userAgent });
    if (!ok) {
      return notice('처리하지 못했습니다', '링크가 만료되었거나 이미 처리된 요청입니다.');
    }
    return notice(
      '동의해 주셔서 감사합니다',
      '자녀분께 바로 알려드렸습니다. 이 창은 닫으셔도 됩니다.',
      true
    );
  }
}

// --- HTML ---------------------------------------------------------------------
// 부모님이 읽으신다. 글자를 키우고, 줄 간격을 넓히고, 버튼을 크게 둔다.

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

/** 문안의 `**강조**` 만 굵게 바꾼다 (HTML 주입을 막고 나서) */
function rich(s: string): string {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 20px 140px;
    font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    background: #F8FAFC; color: #0F172A;
    font-size: 19px; line-height: 1.7;
  }
  .wrap { max-width: 640px; margin: 0 auto; }
  h1 { font-size: 27px; line-height: 1.4; margin: 0 0 8px; }
  .lede { color: #334155; margin: 0 0 28px; }
  section { background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px; margin-bottom: 14px; }
  h2 { font-size: 20px; margin: 0 0 12px; color: #0D9488; }
  p { margin: 0 0 10px; color: #334155; }
  p:last-child { margin-bottom: 0; }
  dl { margin: 0; }
  dt { font-weight: 700; color: #0F172A; margin-top: 12px; }
  dt:first-child { margin-top: 0; }
  dd { margin: 4px 0 0; color: #334155; }
  .bar {
    position: fixed; left: 0; right: 0; bottom: 0;
    background: #fff; border-top: 1px solid #E2E8F0;
    padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
  }
  .bar .inner { max-width: 640px; margin: 0 auto; }
  .agree { font-size: 17px; color: #334155; margin: 0 0 12px; }
  button {
    width: 100%; border: 0; border-radius: 14px; padding: 18px;
    background: #14B8A6; color: #fff; font-size: 20px; font-weight: 700;
    font-family: inherit; cursor: pointer;
  }
  button:disabled { background: #94A3B8; }
  .done { text-align: center; padding: 64px 0; }
  .done .mark { font-size: 56px; }
`;

function shell(title: string, inner: string): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body><div class="wrap">${inner}</div></body></html>`;
}

function notice(title: string, body: string, ok = false): string {
  return shell(
    title,
    `<div class="done"><div class="mark">${ok ? '✅' : '🔗'}</div><h1>${esc(title)}</h1><p class="lede">${esc(body)}</p></div>`
  );
}

function sectionHtml(s: ConsentSection): string {
  const rows = s.rows
    ? `<dl>${s.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${rich(r.value)}</dd>`).join('')}</dl>`
    : '';
  const body = (s.body ?? []).map((p) => `<p>${rich(p)}</p>`).join('');
  return `<section><h2>${esc(s.title)}</h2>${rows}${body}</section>`;
}

function consentPage(parentName: string): string {
  const inner = `
    <h1>${esc(parentName)} 님,<br>동의를 여쭙습니다</h1>
    <p class="lede">자녀분이 ${esc(CONSENT_SERVICE_NAME)}에 프로필을 등록하려 합니다.<br>아래를 읽어보시고 괜찮으시면 눌러 주세요.</p>
    ${CONSENT_SECTIONS.map(sectionHtml).join('')}
    <div class="bar"><div class="inner">
      <p class="agree">${esc(CONSENT_AGREE_LABEL)}</p>
      <button id="agree" type="button">동의합니다</button>
    </div></div>
    <script>
      var b = document.getElementById('agree');
      b.addEventListener('click', function () {
        b.disabled = true; b.textContent = '처리 중…';
        fetch(location.pathname.replace(/\\/$/, '') + '/agree', { method: 'POST' })
          .then(function (r) { return r.text(); })
          .then(function (html) { document.open(); document.write(html); document.close(); })
          .catch(function () { b.disabled = false; b.textContent = '동의합니다'; alert('잠시 후 다시 눌러 주세요.'); });
      });
    </script>`;
  return shell('부팅 — 개인정보 동의', inner);
}
