import FontAwesome from '@expo/vector-icons/FontAwesome';
import { nextSetupStep,useParentProfile, useVerification } from '@features/parent-profile';
import { theme } from '@shared/config/colors';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

/**
 * 로그인 직후 인사 — 민트 **하트병**에 마음이 차오르고 **하트가 흘러넘친다.**
 *
 * 왜 이 자리에 두나: 여기서 하는 말이 "부모님 프로필을 등록하세요"다. 그 말을
 * 빈 화면에 글자로만 두면 할 일 목록처럼 읽힌다. 자녀가 부모님을 대신 등록하는
 * 일은 원래 조금 쑥스러운 일이라, 시작하는 자리만큼은 가볍고 즐거워야 한다.
 *
 * 넘치는 것이 물이 아니라 하트인 이유: 이 앱에서 넘쳐야 하는 것은 마음이다.
 * 액체는 '부스터에 뭔가 가득 찼다' 까지만 말하고 무엇인지는 말하지 않았다.
 *
 * 이미 등록을 마친 사람에게는 보여 주지 않는다 — 켤 때마다 같은 인사를 다시
 * 보는 건 즐거움이 아니라 방해다.
 *
 * 병 몸통은 **하트 모양**이다 (2026-09-18, "물병 말고 하트병"). 하트에 마음이
 * 차올라 넘친다 — 담는 그릇까지 마음이라야 액체·하트·병이 한 이야기가 된다.
 * 하트는 View 로 만들 수 없어 여기만 `react-native-svg` 를 쓴다: 하트 경로로
 * 클리핑한 사각형의 y 를 올려 차오르게 한다. 나머지 동작(흔들림·쏟아지는
 * 하트)은 RN 내장 `Animated` 그대로이고, 위치·회전은 `useNativeDriver` 로
 * UI 스레드에서 돌아 저사양 기기에서도 끊기지 않는다.
 */

/**
 * 하트 경로 — 100×90 상자. 두 봉우리 사이 골 (50, 15) 이 입구라 하트가 거기서 쏟아진다.
 */
const HEART_PATH =
  'M50 88 C20 65 0 48 0 28 C0 12 12 0 27 0 C37 0 46 6 50 15 C54 6 63 0 73 0 C88 0 100 12 100 28 C100 48 80 65 50 88 Z';
const HEART_BOX_W = 100;
const HEART_BOX_H = 90;
/** 골의 깊이(상자 단위). 쏟아지는 하트의 출발점이다 */
const HEART_DIP = 15;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * 입구에서 쏟아지는 하트.
 *
 * 시작 시각을 600ms 에 걸쳐 흩어 놓는다 — 한 번에 터뜨리면 폭죽이지 넘치는
 * 것이 아니다. 크기·각도도 제각각이라야 쏟아지는 덩어리로 읽힌다.
 */
const HEARTS = [
  { x: -34, delay: 0, size: 30, fall: 168, spin: -24, dark: false },
  { x: 30, delay: 60, size: 24, fall: 190, spin: 18, dark: true },
  { x: -10, delay: 120, size: 34, fall: 150, spin: 8, dark: false },
  { x: 56, delay: 175, size: 22, fall: 176, spin: 30, dark: true },
  { x: -60, delay: 225, size: 27, fall: 142, spin: -32, dark: false },
  { x: 14, delay: 275, size: 20, fall: 204, spin: 14, dark: true },
  { x: -26, delay: 320, size: 25, fall: 184, spin: -12, dark: true },
  { x: 44, delay: 370, size: 31, fall: 158, spin: 26, dark: false },
  { x: 4, delay: 415, size: 19, fall: 210, spin: -8, dark: false },
  { x: -48, delay: 460, size: 22, fall: 172, spin: 20, dark: true },
  { x: 72, delay: 505, size: 18, fall: 148, spin: -28, dark: false },
  { x: -74, delay: 550, size: 20, fall: 164, spin: 34, dark: true },
  { x: 22, delay: 595, size: 28, fall: 196, spin: -18, dark: false },
  { x: -16, delay: 640, size: 21, fall: 178, spin: 12, dark: true },
  { x: 60, delay: 685, size: 24, fall: 186, spin: -22, dark: false },
  { x: -38, delay: 730, size: 26, fall: 200, spin: 16, dark: false },
  { x: 38, delay: 775, size: 19, fall: 166, spin: -14, dark: true },
  { x: -4, delay: 820, size: 23, fall: 214, spin: 24, dark: false },
  // 아래는 "더 많이 쏟아지게" (09-18) — 앞 하트들 사이사이에 끼워 넣는다
  { x: 48, delay: 30, size: 17, fall: 160, spin: 12, dark: true },
  { x: -52, delay: 95, size: 21, fall: 182, spin: -26, dark: true },
  { x: 8, delay: 150, size: 16, fall: 222, spin: 6, dark: false },
  { x: -30, delay: 205, size: 29, fall: 154, spin: -16, dark: false },
  { x: 66, delay: 260, size: 20, fall: 198, spin: 22, dark: true },
  { x: -68, delay: 305, size: 18, fall: 170, spin: -30, dark: false },
  { x: 26, delay: 350, size: 24, fall: 208, spin: 10, dark: true },
  { x: -12, delay: 400, size: 32, fall: 146, spin: -6, dark: false },
  { x: 54, delay: 445, size: 19, fall: 190, spin: 28, dark: false },
  { x: -42, delay: 490, size: 23, fall: 216, spin: -20, dark: true },
  { x: 18, delay: 540, size: 27, fall: 162, spin: 16, dark: false },
  { x: -78, delay: 580, size: 17, fall: 180, spin: 32, dark: true },
  { x: 76, delay: 625, size: 21, fall: 174, spin: -24, dark: false },
  { x: -22, delay: 670, size: 19, fall: 226, spin: 8, dark: true },
  { x: 36, delay: 715, size: 25, fall: 152, spin: -10, dark: false },
  { x: -58, delay: 760, size: 22, fall: 206, spin: 18, dark: false },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { data: parentProfile, isLoading } = useParentProfile();
  const { data: verification, isLoading: verifying } = useVerification();
  const [ready, setReady] = useState(false);
  /**
   * 애니메이션 회차 — 개발 빌드의 '다시 보기'가 올린다.
   *
   * 시연에서 이 화면을 다시 보려면 계정을 새로 만들어야 했다 (등록을 마친 사람에게는
   * 인사를 안 하니까). 발표 중에 그럴 수는 없어, 개발 빌드에서만 같은 화면에서
   * 처음부터 다시 돌린다. 운영에는 없다 — 인사는 한 번이면 족하다.
   */
  const [run, setRun] = useState(0);

  /**
   * 다음에 갈 곳 — 프로필이 **있는지**가 아니라 등록이 **끝났는지**로 가른다.
   *
   * 전에는 프로필이 하나라도 있으면 인사를 건너뛰고 홈으로 보냈다. 그런데 등록을
   * 하다 만 사람에게도 프로필 행은 이미 있다(초안). 그래서 개발용 로그인으로
   * 들어가면 등록 단계를 통째로 지나쳐 추천 화면이 떴다 (실측).
   *
   * 판정은 `nextSetupStep` 하나에 맡긴다 — 등록 화면들이 이미 쓰는 기준이라
   * 여기서 따로 세면 두 곳이 어긋난다.
   */
  const step = nextSetupStep(verification, parentProfile);

  useEffect(() => {
    if (isLoading || verifying) return;
    // 등록을 마친 분께는 인사 없이 홈으로 — 켤 때마다 같은 인사는 방해다
    if (step === 'done') router.replace('/(tabs)/home');
    else setReady(true);
  }, [isLoading, verifying, step, router]);

  const bottleIn = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const liquid = useRef(new Animated.Value(0)).current;
  const brim = useRef(new Animated.Value(0)).current;
  const copy = useRef(new Animated.Value(0)).current;
  const hearts = useMemo(() => HEARTS.map(() => new Animated.Value(0)), []);

  useEffect(() => {
    if (!ready) return;

    // 다시 볼 때는 전부 0 으로 — 안 그러면 두 번째부터는 끝난 자리에서 시작한다
    for (const v of [bottleIn, shake, liquid, brim, copy, ...hearts]) v.setValue(0);

    const sequence = Animated.sequence([
      // 1. 부스터는 **제자리에서** 커지며 등장한다.
      //    아래에서 솟아오르게 하면 병이 위로 날아가는 것처럼 보인다
      Animated.spring(bottleIn, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      // 2. 두근거림 — 차오르기 전에 한 번 떨린다
      Animated.sequence(
        [1, -1, 1, -1, 0.5, 0].map((to) =>
          Animated.timing(shake, {
            toValue: to,
            duration: 60,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        )
      ),
      Animated.parallel([
        // 3. 마음이 차오른다 (뚜껑은 없다 — 하트병에 뚜껑을 달면 밤톨이 됐다).
        //    차오르는 것은 감속한다 — 수면이 골에 가까워질수록 느려진다
        Animated.sequence([
          Animated.delay(90),
          Animated.timing(liquid, {
            toValue: 1,
            duration: 760,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ]),
        // 4. 골에 하트가 그득 차오른다 — 쏟아지기 직전을 한 박자 보여 준다.
        //    바로 튀어나오면 어디서 나온 것인지 읽히지 않는다
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(brim, {
            toValue: 1,
            duration: 240,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(brim, {
            toValue: 0.6,
            duration: 460,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          // 다 쏟아지면 골에 남은 하트도 사라진다 — 남겨 두면 끝난 뒤에 얼룩처럼 보인다
          Animated.delay(500),
          Animated.timing(brim, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // 5. 하트가 쏟아진다 — 솟을 때 감속하고 떨어질 때 가속한다 (포물선).
        //    타이밍 자체는 linear 로 두고 곡선은 좌표에서 만든다
        ...hearts.map((h, i) =>
          Animated.sequence([
            // 시작 간격을 0.65 로 좁힌다 — 개수를 늘리면서 간격을 그대로 두면
            // 마지막 하트가 떨어지기까지 인사가 늦어져 기다림이 된다
            Animated.delay(340 + HEARTS[i].delay * 0.65),
            Animated.timing(h, {
              toValue: 1,
              duration: 1020,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ])
        ),
      ]),
      // 6. 하고 싶은 말은 소란이 지난 뒤에
      Animated.timing(copy, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    sequence.start();
    return () => sequence.stop();
  }, [ready, run, bottleIn, shake, liquid, brim, copy, hearts]);

  if (!ready) return <View style={styles.container} />;

  return (
    <View style={styles.container} testID="welcome-screen">
      <View style={styles.stage}>
        {/* 부스터가 서 있는 자리 — 부스터 뒤에 깔아 바닥처럼 보이게 한다 */}
        <View style={styles.ground} />

        <Animated.View
          style={{
            opacity: bottleIn,
            transform: [
              // 제자리에서 살짝 커지기만 한다. 병은 서 있는 물건이라 움직이지 않는다
              {
                scale: bottleIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.88, 1],
                }),
              },
              {
                rotate: shake.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ['-4deg', '4deg'],
                }),
              },
            ],
          }}
        >
          <View style={styles.body}>
            <Svg
              width={HEART_W}
              height={HEART_H}
              // 테두리가 상자에 잘리지 않게 여백을 둔다
              viewBox={`-2 -2 ${HEART_BOX_W + 4} ${HEART_BOX_H + 4}`}
            >
              <Defs>
                <ClipPath id="heart-bottle">
                  <Path d={HEART_PATH} />
                </ClipPath>
              </Defs>
              <Path d={HEART_PATH} fill={theme.colors.surface} />
              <G clipPath="url(#heart-bottle)">
                {/* 안에서 차오르는 액체 — 사각형의 y 를 올린다. 좌표라 네이티브 드라이버를 못 쓴다 */}
                <AnimatedRect
                  x={0}
                  width={HEART_BOX_W}
                  height={HEART_BOX_H}
                  y={liquid.interpolate({
                    inputRange: [0, 1],
                    outputRange: [HEART_BOX_H * 0.82, 0],
                  })}
                  fill={theme.colors.primary}
                />
              </G>
              <Path
                d={HEART_PATH}
                fill="none"
                stroke={theme.colors.primary}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </Svg>
            {/* 상표는 액체가 차오르며 드러난다 */}
            <Animated.Text style={[styles.mark, { opacity: liquid }]}>B</Animated.Text>
          </View>

          {/* 입구에 그득 찬 하트 — 쏟아지기 직전 */}
          <Animated.View
            style={[
              styles.brim,
              {
                opacity: brim,
                transform: [
                  { scale: brim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                ],
              },
            ]}
          >
            <FontAwesome name="heart" size={26} color={theme.colors.primaryDark} />
          </Animated.View>
        </Animated.View>

        {/*
          쏟아지는 하트.

          부스터 **뒤가 아니라 앞**에 그린다. 입구에서 나와 병 앞면을 타고
          내려가야 '넘친다' 로 읽힌다 — 뒤로 보내면 어디선가 날아온 장식이 된다.
        */}
        {HEARTS.map((h, i) => (
          <Animated.View
            key={`${h.x}-${h.delay}`}
            style={[
              styles.heart,
              {
                opacity: hearts[i].interpolate({
                  inputRange: [0, 0.08, 0.75, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    // 솟으면서 바깥으로 벌어진다 — 수직으로만 오르내리면 쏟아지는 게 아니다
                    translateX: hearts[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [h.x * 0.22, h.x],
                    }),
                  },
                  {
                    translateY: hearts[i].interpolate({
                      // 포물선: 솟을 때 감속(0→0.3 구간이 넓다), 떨어질 때 가속
                      inputRange: [0, 0.18, 0.3, 0.6, 1],
                      outputRange: [0, -40, -50, -4, h.fall],
                    }),
                  },
                  {
                    // 톡 튀어나오는 맛 — 나오는 순간만 조금 크게
                    scale: hearts[i].interpolate({
                      inputRange: [0, 0.12, 1],
                      outputRange: [0.4, 1.15, 0.9],
                    }),
                  },
                  {
                    rotate: hearts[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${h.spin}deg`],
                    }),
                  },
                ],
              },
            ]}
          >
            <FontAwesome
              name="heart"
              size={h.size}
              /**
               * 하트는 **진한 민트**와 **연한 민트** 둘뿐이다.
               *
               * 브랜드 민트(`primary`)로 칠하면 병 앞을 지날 때 통째로 사라진다 —
               * 다 찬 병의 몸통이 바로 그 색이다 (물줄기 때와 같은 이유로 실측).
               * 배경(`primarySurface`)과 몸통(`primary`) 둘 다에서 보이려면
               * 그보다 진하거나(`primaryDark`) 훨씬 연해야(`primaryLight`) 한다.
               */
              color={h.dark ? theme.colors.primaryDark : theme.colors.primaryLight}
            />
          </Animated.View>
        ))}

      </View>

      <Animated.View
        style={[
          styles.copy,
          {
            opacity: copy,
            transform: [
              { translateY: copy.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            ],
          },
        ]}
      >
        <Text style={styles.headline}>
          Booting은{'\n'}부모님의 새 인연을 응원합니다
        </Text>
        <Text style={styles.sub}>부모님 프로필부터 만들어 볼까요?</Text>
      </Animated.View>

      <Animated.View style={{ opacity: copy }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음"
          style={({ pressed }) => [styles.next, pressed && styles.nextPressed]}
          testID="welcome-next"
          // 하다 만 분은 하던 자리로 — 처음부터 다시 시키지 않는다
          onPress={() => router.replace(`/(parent-setup)/${step}`)}
        >
          <Text style={styles.nextText}>다음</Text>
        </Pressable>
      </Animated.View>

      {/* 개발 빌드에만 — 시연에서 인사 애니메이션을 다시 돌린다. '개발:' 을 밝힌다 */}
      {__DEV__ && (
        <Pressable
          accessibilityRole="button"
          testID="welcome-replay"
          style={styles.replay}
          onPress={() => setRun((n) => n + 1)}
        >
          <Text style={styles.replayText}>개발: 애니메이션 다시 보기</Text>
        </Pressable>
      )}
    </View>
  );
}

const HEART_SCALE = 1.8;
const HEART_W = HEART_BOX_W * HEART_SCALE;
const HEART_H = HEART_BOX_H * HEART_SCALE;
const STAGE_H = 300;
/** 골의 stage 기준 y — 하트가 여기서 쏟아진다 */
const MOUTH_Y = STAGE_H - HEART_H + HEART_DIP * HEART_SCALE;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: STAGE_H,
    marginBottom: 44,
  },
  ground: {
    position: 'absolute',
    bottom: -14,
    width: 210,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primaryLight,
  },
  /**
   * 병목도 뚜껑도 없다.
   *
   * 처음엔 하트 위에 병목과 뚜껑을 뒀는데, 다 찬 하트에 같은 색 꼭지가 붙어
   * **밤톨**로 보였고 유리 목·코르크로 바꿔도 이상했다 ("목 없애줘",
   * "뚜껑 날라가는 건 없애야지"). 하트 하나가 병이고, 골이 입구다.
   */
  body: {
    width: HEART_W,
    height: HEART_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 액체 위에 얹히는 상표. 흰 글자라 액체가 차오를수록 또렷해진다. 하트의 무게중심은 위쪽이라 살짝 올린다 */
  mark: {
    position: 'absolute',
    top: HEART_H * 0.3,
    fontSize: 58,
    fontWeight: '800',
    color: theme.colors.surface,
    includeFontPadding: false,
  },
  /**
   * 입구에 그득 찬 하트.
   *
   * **진한 민트**로 칠한다. 병이 다 차면 본체도 같은 민트라, 같은 색으로 두면
   * 입구에 얹힌 하트가 통째로 사라진다 (물줄기 때 실측한 것과 같은 이유다).
   */
  brim: {
    position: 'absolute',
    // 골에 걸쳐 고인다
    top: 2,
    alignSelf: 'center',
  },
  /** 쏟아지는 하트 — 병 입구 높이에서 시작한다 */
  heart: {
    position: 'absolute',
    top: MOUTH_Y - 2,
  },
  copy: { alignItems: 'center', marginBottom: 36 },
  headline: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  sub: {
    marginTop: 12,
    fontSize: 15,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  next: {
    minWidth: 240,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  nextPressed: { backgroundColor: theme.colors.primaryDark },
  nextText: { fontSize: 16, fontWeight: '700', color: theme.colors.surface },
  replay: { position: 'absolute', bottom: 28, alignSelf: 'center', padding: 12 },
  replayText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textDecorationLine: 'underline',
  },
});
