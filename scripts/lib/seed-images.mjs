/**
 * 시드 프로필 사진 생성기 — 의존성 없이 PNG 를 직접 만든다.
 *
 * 왜 만드나: 23명이 전부 같은 회색 사각형이면 카드를 넘겨도 넘어간 줄 모른다.
 * 추천 덱·받은 관심 덱·대화 목록이 전부 사진 위주 레이아웃이라, 사진이 같으면
 * 화면 검증 자체가 안 된다.
 *
 * 왜 직접 그리나: 외부 이미지를 받아오면 네트워크·라이선스가 붙고, 진짜 사람
 * 얼굴을 시드에 넣는 건 이 앱 성격상 하면 안 된다. 사람이 아닌 게 한눈에
 * 보이는 실루엣이면 충분하고, 별명마다 색이 달라 구분은 확실히 된다.
 *
 * PNG 인코더는 최소 구성이다 — 8bit RGB, 필터 없음, IDAT 한 덩어리.
 */
import zlib from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hsl(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

/** 같은 별명은 항상 같은 색이 나오게 — 시드를 다시 돌려도 사진이 안 바뀐다 */
function hueOf(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * 인물 아바타 한 장.
 *
 * 사진이 아니라 **일러스트**다. 진짜 사람 사진을 시드에 넣지 않는 건 의도한
 * 것이다 — 무료로 구할 수 있는 인물 사진은 (1) 실존 인물이고 (2) 대개
 * cc-nc-nd 라, 특정인을 소개팅 서비스 가입자처럼 보이게 만드는 셈이 된다.
 * 실제 사진으로 보고 싶으면 `assets/seed-photos/{male,female}/` 에 직접
 * 넣으면 시드가 그걸 우선 사용한다 (seed-demo.mjs 참고).
 *
 * `variant` 로 같은 사람의 사진 3장이 서로 달라 보이게 한다 — 캐러셀을
 * 넘겼는지 확인하려면 장마다 달라야 한다.
 */
export function makePortrait(seed, variant = 0, width = 600, height = 800) {
  const hue = (hueOf(seed) + variant * 14) % 360;
  const top = hsl(hue, 0.45, 0.88 - variant * 0.04);
  const bottom = hsl((hue + 26) % 360, 0.40, 0.70 - variant * 0.04);
  const cloth = hsl(hue, 0.30, 0.34 + variant * 0.03);
  const collar = hsl(hue, 0.26, 0.44 + variant * 0.03);
  const skin = hsl((hue + 20) % 360, 0.30, 0.62);
  const hair = hsl(hue, 0.22, 0.26 + variant * 0.02);

  const cx = width / 2 + (variant - 1) * width * 0.025;
  const headR = width * (0.165 + variant * 0.01);
  const headY = height * (0.38 - variant * 0.015);
  const hairR = headR * 1.14;
  const shoulderRx = width * (0.45 + variant * 0.03);
  const shoulderRy = height * 0.40;
  const shoulderY = height * 1.0;

  // 2x 슈퍼샘플링 — 계단 현상이 남으면 아무리 색을 잘 잡아도 조잡해 보인다
  const ss = 2;
  const rgb = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let sy = 0; sy < ss; sy += 1) {
        for (let sx = 0; sx < ss; sx += 1) {
          const px = x + (sx + 0.5) / ss;
          const py = y + (sy + 0.5) / ss;

          // 배경: 세로 그라디언트 + 가장자리로 갈수록 살짝 어두운 비네트
          const edge =
            Math.hypot((px - width / 2) / (width / 2), (py - height / 2) / (height / 2)) / 1.42;
          const bg = mix(
            mix(top, bottom, py / height),
            [0, 0, 0],
            Math.max(0, edge - 0.55) * 0.22
          );

          const dHead = Math.hypot(px - cx, py - headY);
          const dHair = Math.hypot(px - cx, py - (headY - headR * 0.18));
          const body = Math.hypot((px - cx) / shoulderRx, (py - shoulderY) / shoulderRy);

          let color = bg;
          // 목 — 머리와 어깨가 떨어져 있으면 사람이 아니라 도형 두 개로 보인다
          if (Math.abs(px - cx) < headR * 0.42 && py > headY && py < shoulderY - shoulderRy) {
            color = skin;
          }
          if (body <= 1) color = cloth;
          // 옷깃: 어깨 맨 윗부분에만 얹는다 (아래까지 내려오면 줄무늬가 된다)
          if (
            body <= 1 &&
            py < shoulderY - shoulderRy + headR * 0.5 &&
            Math.abs(px - cx) < headR * 0.95
          ) {
            color = collar;
          }
          // 머리카락은 정수리 쪽만 — 원을 통째로 칠하면 헬멧처럼 보인다
          if (dHair <= hairR && py < headY - headR * 0.1) color = hair;
          if (dHead <= headR) color = skin;

          r += color[0];
          g += color[1];
          b += color[2];
        }
      }

      const n = ss * ss;
      const offset = (y * width + x) * 3;
      rgb[offset] = Math.round(r / n);
      rgb[offset + 1] = Math.round(g / n);
      rgb[offset + 2] = Math.round(b / n);
    }
  }

  return encodePng(width, height, rgb);
}
