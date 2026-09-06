import { theme } from '@shared/config/colors';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from 'react-native-svg';

/**
 * 카드 뒷면의 보석.
 *
 * 이미지가 아니라 벡터로 그린다. 카드가 화면 폭에 따라 110~180dp 사이를
 * 오가는데, 래스터로 두면 큰 기기에서 각진 면의 경계가 뭉개진다. 파일도
 * 6장 추가되지 않는다.
 *
 * 면(facet)은 흰색·검정을 다른 투명도로 겹쳐서 낸다. 원석 색을 바꿔도 면의
 * 명암 관계가 그대로 유지된다.
 */

export type GemKind = 'heart' | 'brilliant' | 'round' | 'emerald' | 'star' | 'pear';

/**
 * 원석은 **전부 민트**다. 브랜드 색이 하나인 앱에서 카드마다 다른 색을 주면
 * 이 화면만 다른 앱처럼 보인다.
 *
 * 그래서 6장을 가르는 단서는 색이 아니라 **모양**이다. 대신 명암 폭을 넓게
 * 잡아(primaryLight → primaryDark) 단색이어도 면이 또렷하게 갈리게 했다.
 */
export const GEM_MINT = {
  light: theme.colors.primaryLight, // #CCFBF1 — 밝은 면
  base: theme.colors.primary, // #14B8A6 — 본체
  deep: theme.colors.primaryDark, // #0D9488 — 어두운 면
  surface: theme.colors.primarySurface, // #F0FDFA — 카드 안쪽 은은한 바탕
} as const;

/** 접근성 라벨에 쓰는 이름. 화면에는 모양만 보이므로 말로는 이렇게 부른다 */
export const GEM_LABEL: Record<GemKind, string> = {
  heart: '하트',
  brilliant: '다이아',
  round: '원형',
  emerald: '사각',
  star: '별',
  pear: '물방울',
};

/** 카드 6장에 순서대로 물린다 — 하루에 같은 모양이 두 번 나오지 않는다 */
export const GEM_ORDER: GemKind[] = ['heart', 'brilliant', 'round', 'emerald', 'star', 'pear'];

/** 면에 겹치는 투명도. 밝은 면 → 어두운 면 */
const FACET = { bright: 0.55, mid: 0.3, dim: 0.16, shade: 0.1 } as const;

interface Props {
  kind: GemKind;
  size?: number;
}

/**
 * 보석 하나. 뷰박스는 6종 모두 100×100 으로 맞춰 두어, 카드 안에서
 * 어떤 모양이 와도 시각적 무게가 같게 보인다.
 */
export function Gem({ kind, size = 96 }: Props) {
  const stoneId = `stone-${kind}`;
  const glowId = `glow-${kind}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={stoneId} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={GEM_MINT.light} />
          <Stop offset="0.55" stopColor={GEM_MINT.base} />
          <Stop offset="1" stopColor={GEM_MINT.deep} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0.55" stopColor={GEM_MINT.light} stopOpacity="0.75" />
          <Stop offset="1" stopColor={GEM_MINT.light} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/*
        원석 뒤 민트 후광. 흰 카드 위에 원석만 놓으면 도형이 종이에 붙은
        스티커처럼 납작해 보인다 — 옅은 민트를 깔아 빛을 머금은 것처럼 띄운다.
      */}
      <Circle cx="50" cy="50" r="50" fill={`url(#${glowId})`} />

      <GemBody kind={kind} fill={`url(#${stoneId})`} />
    </Svg>
  );
}

function GemBody({ kind, fill }: { kind: GemKind; fill: string }) {
  switch (kind) {
    case 'heart':
      return (
        <G>
          <Path
            d="M50 88 C22 68 8 52 8 36 C8 22 19 12 32 12 C40 12 47 16 50 22 C53 16 60 12 68 12 C81 12 92 22 92 36 C92 52 78 68 50 88 Z"
            fill={fill}
          />
          {/* 가운데 세로 능선을 기준으로 왼쪽이 밝고 오른쪽이 어둡다 */}
          <Path
            d="M50 88 C22 68 8 52 8 36 C8 22 19 12 32 12 C40 12 47 16 50 22 Z"
            fill="#FFFFFF"
            fillOpacity={FACET.dim}
          />
          <Path d="M32 16 C22 16 14 24 14 34 C14 42 20 51 30 61 L50 22 Z" fill="#FFFFFF" fillOpacity={FACET.mid} />
          <Path d="M68 16 C78 16 86 24 86 34 C86 42 80 51 70 61 L50 22 Z" fill="#000000" fillOpacity={FACET.shade} />
          <Path d="M30 61 L50 22 L70 61 L50 82 Z" fill="#FFFFFF" fillOpacity={FACET.shade} />
          <Sparkle x={34} y={30} r={7} />
        </G>
      );

    case 'brilliant':
      return (
        <G>
          <Polygon points="30,16 70,16 94,40 50,92 6,40" fill={fill} />
          {/* 크라운(위) — 테이블 면이 가장 밝다 */}
          <Polygon points="38,16 62,16 66,28 34,28" fill="#FFFFFF" fillOpacity={FACET.bright} />
          <Polygon points="30,16 38,16 34,28 22,40 6,40" fill="#FFFFFF" fillOpacity={FACET.mid} />
          <Polygon points="70,16 62,16 66,28 78,40 94,40" fill="#000000" fillOpacity={FACET.shade} />
          <Polygon points="34,28 66,28 78,40 22,40" fill="#FFFFFF" fillOpacity={FACET.dim} />
          {/* 파빌리온(아래) — 좌우로 갈라 빛이 모이는 인상을 준다 */}
          <Polygon points="6,40 50,40 50,92" fill="#FFFFFF" fillOpacity={FACET.dim} />
          <Polygon points="50,40 94,40 50,92" fill="#000000" fillOpacity={FACET.shade} />
          <Sparkle x={42} y={22} r={6} />
        </G>
      );

    case 'round':
      return (
        <G>
          <Circle cx="50" cy="50" r="42" fill={fill} />
          {/* 방사형 면 — 8등분 중 번갈아 밝게 */}
          <Polygon points="50,50 50,8 79,20" fill="#FFFFFF" fillOpacity={FACET.mid} />
          <Polygon points="50,50 92,50 79,79" fill="#000000" fillOpacity={FACET.shade} />
          <Polygon points="50,50 50,92 21,79" fill="#FFFFFF" fillOpacity={FACET.dim} />
          <Polygon points="50,50 8,50 21,21" fill="#FFFFFF" fillOpacity={FACET.mid} />
          <Circle cx="50" cy="50" r="20" fill="#FFFFFF" fillOpacity={FACET.bright} />
          <Circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} />
          <Sparkle x={35} y={30} r={7} />
        </G>
      );

    case 'emerald':
      return (
        <G>
          <Polygon points="28,12 72,12 88,28 88,72 72,88 28,88 12,72 12,28" fill={fill} />
          {/* 계단 컷 — 사각 테를 안쪽으로 좁혀 가며 겹친다 */}
          <Polygon
            points="32,20 68,20 80,32 80,68 68,80 32,80 20,68 20,32"
            fill="#FFFFFF"
            fillOpacity={FACET.dim}
          />
          <Polygon
            points="37,28 63,28 72,37 72,63 63,72 37,72 28,63 28,37"
            fill="#FFFFFF"
            fillOpacity={FACET.mid}
          />
          <Polygon points="37,28 63,28 72,37 28,37" fill="#FFFFFF" fillOpacity={FACET.bright} />
          <Polygon points="28,63 72,63 63,72 37,72" fill="#000000" fillOpacity={FACET.shade} />
          <Sparkle x={33} y={26} r={6} />
        </G>
      );

    case 'star':
      return (
        <G>
          <Polygon
            points="50,12 60,38.3 88,39.6 66.2,57.3 73.5,84.4 50,69 26.5,84.4 33.8,57.3 12,39.6 40,38.3"
            fill={fill}
          />
          {/* 중심에서 각 꼭짓점으로 뻗는 면 — 한 칸씩 건너뛰며 밝기를 바꾼다 */}
          <Polygon points="50,52 50,12 60,38.3" fill="#FFFFFF" fillOpacity={FACET.mid} />
          <Polygon points="50,52 50,12 40,38.3" fill="#FFFFFF" fillOpacity={FACET.bright} />
          <Polygon points="50,52 88,39.6 66.2,57.3" fill="#000000" fillOpacity={FACET.shade} />
          <Polygon points="50,52 12,39.6 33.8,57.3" fill="#FFFFFF" fillOpacity={FACET.dim} />
          <Polygon points="50,52 73.5,84.4 50,69" fill="#000000" fillOpacity={FACET.shade} />
          <Polygon points="50,52 26.5,84.4 50,69" fill="#FFFFFF" fillOpacity={FACET.dim} />
          <Sparkle x={50} y={26} r={6} />
        </G>
      );

    case 'pear':
      return (
        <G>
          <Path
            d="M50 8 C68 30 84 46 84 62 C84 80 69 92 50 92 C31 92 16 80 16 62 C16 46 32 30 50 8 Z"
            fill={fill}
          />
          <Path d="M50 8 C68 30 84 46 84 62 C84 80 69 92 50 92 Z" fill="#000000" fillOpacity={FACET.shade} />
          <Path d="M50 8 C32 30 16 46 16 62 C16 80 31 92 50 92 Z" fill="#FFFFFF" fillOpacity={FACET.dim} />
          <Ellipse cx="50" cy="62" rx="22" ry="20" fill="#FFFFFF" fillOpacity={FACET.mid} />
          <Ellipse cx="50" cy="62" rx="11" ry="10" fill="#FFFFFF" fillOpacity={FACET.bright} />
          <Sparkle x={38} y={40} r={6} />
        </G>
      );
  }
}

/** 하이라이트용 4각 반짝임. 원보다 '빛난다'는 인상이 강하다 */
function Sparkle({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <Path
      d={`M${x} ${y - r} Q${x + r * 0.22} ${y - r * 0.22} ${x + r} ${y} Q${x + r * 0.22} ${y + r * 0.22} ${x} ${y + r} Q${x - r * 0.22} ${y + r * 0.22} ${x - r} ${y} Q${x - r * 0.22} ${y - r * 0.22} ${x} ${y - r} Z`}
      fill="#FFFFFF"
      fillOpacity={0.85}
    />
  );
}

