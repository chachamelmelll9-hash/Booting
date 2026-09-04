import { nextSetupStep,useParentProfile, useVerification } from '@features/parent-profile';
import { theme } from '@shared/config/colors';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 로그인 직후 인사 — 민트 부스터 뚜껑이 열리고 액체가 흘러넘친다.
 *
 * 왜 이 자리에 두나: 여기서 하는 말이 "부모님 프로필을 등록하세요"다. 그 말을
 * 빈 화면에 글자로만 두면 할 일 목록처럼 읽힌다. 자녀가 부모님을 대신 등록하는
 * 일은 원래 조금 쑥스러운 일이라, 시작하는 자리만큼은 가볍고 즐거워야 한다.
 *
 * 이미 프로필이 있는 사람에게는 보여 주지 않는다 — 로그인할 때마다 같은 인사를
 * 다시 보는 건 즐거움이 아니라 방해다.
 *
 * 애니메이션은 RN 내장 `Animated` 로만 만든다. 도형이 사각형·원 몇 개뿐이라
 * SVG 나 Lottie 를 끌어올 이유가 없고, `useNativeDriver` 로 UI 스레드에서 돌아
 * 저사양 기기에서도 끊기지 않는다.
 */

/** 넘쳐 흐르는 방울 — 위치와 시작 시각을 조금씩 어긋나게 둔다 */
const DROPS = [
  { x: -34, delay: 0, size: 12, fall: 120 },
  { x: -14, delay: 120, size: 9, fall: 156 },
  { x: 10, delay: 60, size: 14, fall: 138 },
  { x: 32, delay: 190, size: 8, fall: 108 },
  { x: -46, delay: 260, size: 7, fall: 92 },
  { x: 46, delay: 330, size: 10, fall: 124 },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { data: parentProfile, isLoading } = useParentProfile();
  const { data: verification, isLoading: verifying } = useVerification();
  const [ready, setReady] = useState(false);

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
  const cap = useRef(new Animated.Value(0)).current;
  const liquid = useRef(new Animated.Value(0)).current;
  const crown = useRef(new Animated.Value(0)).current;
  const spill = useRef(new Animated.Value(0)).current;
  const puddle = useRef(new Animated.Value(0)).current;
  const copy = useRef(new Animated.Value(0)).current;
  const drops = useMemo(() => DROPS.map(() => new Animated.Value(0)), []);

  useEffect(() => {
    if (!ready) return;

    const sequence = Animated.sequence([
      // 1. 부스터는 **제자리에서** 커지며 등장한다.
      //    아래에서 솟아오르게 하면 병이 위로 날아가는 것처럼 보인다
      Animated.spring(bottleIn, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      // 2. 압력이 차오르는 흔들림 — 뚜껑이 왜 열리는지 몸짓으로 먼저 말한다
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
        // 3. 뚜껑이 날아간다
        Animated.timing(cap, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // 4. 액체가 차오른다 (뚜껑보다 살짝 늦게 시작해 인과가 보이게).
        //    차오르는 것은 감속한다 — 수면이 입구에 가까워질수록 느려진다
        Animated.sequence([
          Animated.delay(90),
          Animated.timing(liquid, {
            toValue: 1,
            duration: 760,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ]),
        // 5. 입구에서 부풀었다가 표면장력이 터지듯 가라앉는다.
        //    바로 흘러내리면 물이 아니라 막대가 자라는 것처럼 보인다
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(crown, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(crown, {
            toValue: 0.55,
            duration: 420,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // 6. 넘친 줄기가 병 바깥을 타고 내려온다. **가속**이어야 한다 —
        //    감속하면 흘러내리는 게 아니라 스르르 자라는 것으로 읽힌다
        Animated.sequence([
          Animated.delay(520),
          Animated.timing(spill, {
            toValue: 1,
            duration: 700,
            easing: Easing.in(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
        // 7. 줄기가 바닥에 닿은 뒤에야 고인다
        Animated.sequence([
          Animated.delay(1120),
          Animated.timing(puddle, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // 8. 튀어 오르는 방울 — 솟을 때 감속하고 떨어질 때 가속한다 (포물선)
        ...drops.map((d, i) =>
          Animated.sequence([
            Animated.delay(360 + DROPS[i].delay),
            Animated.timing(d, {
              toValue: 1,
              duration: 1000,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ])
        ),
      ]),
      // 5. 하고 싶은 말은 소란이 지난 뒤에
      Animated.timing(copy, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    sequence.start();
    return () => sequence.stop();
  }, [ready, bottleIn, shake, cap, liquid, crown, spill, puddle, copy, drops]);

  if (!ready) return <View style={styles.container} />;

  return (
    <View style={styles.container} testID="welcome-screen">
      <View style={styles.stage}>
        {/* 넘친 액체가 고이는 자리 — 부스터 뒤에 깔아 바닥처럼 보이게 한다 */}
        <Animated.View
          style={[
            styles.puddle,
            {
              opacity: puddle,
              transform: [
                { scaleX: puddle.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) },
                { scaleY: puddle.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
              ],
            },
          ]}
        />

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
          {/*
            뚜껑 — 넘치는 액체에 밀려 톡 튕겼다가 옆으로 굴러떨어진다.
            위로 쭉 날려 보내면 로켓처럼 보인다. 액체가 밀어내는 힘은 그 정도가 아니다.
          */}
          <Animated.View
            style={[
              styles.cap,
              {
                opacity: cap.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
                transform: [
                  {
                    translateY: cap.interpolate({
                      // 살짝 솟았다가(0.25) 곧장 떨어진다
                      inputRange: [0, 0.25, 1],
                      outputRange: [0, -40, 176],
                    }),
                  },
                  { translateX: cap.interpolate({ inputRange: [0, 1], outputRange: [0, 118] }) },
                  {
                    rotate: cap.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '128deg'] }),
                  },
                ],
              },
            ]}
          />
          <View style={styles.neck} />

          <View style={styles.body}>
            {/* 안에서 차오르는 액체 — 높이라 네이티브 드라이버를 못 쓴다 */}
            <Animated.View
              style={[
                styles.liquid,
                {
                  height: liquid.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['18%', '100%'],
                  }),
                },
              ]}
            />
            {/*
              넘친 액체가 병 앞면을 덮으며 내려온다 — **폭 전체를 한 겹으로**.

              넓은 덩어리에서 가운데만 좁게 흘러내리게 그렸더니 손 모양이 됐다.
              물리적으로는 그게 맞아도 화면에 남는 인상이 그렇다면 틀린 그림이다.
              튀어나오는 부분을 없애고 아래 모서리만 크게 굴려 물의 앞머리를 만든다.

              병 **안쪽**에 둔다. 바깥에 두면 네모난 위쪽 모서리가 둥근 병
              실루엣 밖으로 삐져나온다. 안에 두면 `overflow: hidden` 이 병 모양대로
              잘라 줘서, 표면을 타고 흐르는 것처럼 보인다 (실측).
            */}
            <Animated.View
              style={[
                styles.sheet,
                {
                  height: spill.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, BODY_HEIGHT * 0.86],
                  }),
                },
              ]}
            />

            {/* 상표는 액체가 차오르며 드러나고, 흘러넘친 뒤에도 가려지지 않게
                가장 위에 둔다 */}
            <Animated.Text style={[styles.mark, { opacity: liquid }]}>B</Animated.Text>
          </View>

          {/* 입구에서 부풀어 오르는 액체 — 터지기 직전의 표면장력 */}
          <Animated.View
            style={[
              styles.crown,
              {
                opacity: crown,
                transform: [
                  { scaleY: crown.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                  { scaleX: crown.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.06] }) },
                ],
              },
            ]}
          />

        </Animated.View>

        {/* 튀어 오르는 방울들 */}
        {DROPS.map((drop, i) => (
          <Animated.View
            key={drop.x}
            style={[
              styles.drop,
              {
                width: drop.size,
                height: drop.size,
                borderRadius: drop.size / 2,
                opacity: drops[i].interpolate({
                  inputRange: [0, 0.1, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    // 솟으면서 바깥으로 벌어진다 — 수직으로만 오르내리면 물이 아니다
                    translateX: drops[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [drop.x * 0.35, drop.x],
                    }),
                  },
                  {
                    translateY: drops[i].interpolate({
                      // 포물선: 솟을 때 감속(0→0.3 구간이 넓다), 떨어질 때 가속
                      inputRange: [0, 0.18, 0.3, 0.6, 1],
                      outputRange: [0, -38, -46, -4, drop.fall],
                    }),
                  },
                ],
              },
            ]}
          />
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
    </View>
  );
}

const BODY_WIDTH = 132;
const BODY_HEIGHT = 190;
const CAP_H = 28;
const NECK_H = 20;

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
    height: 300,
    marginBottom: 44,
  },
  puddle: {
    position: 'absolute',
    bottom: -14,
    width: 210,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primaryLight,
  },
  cap: {
    alignSelf: 'center',
    width: 56,
    height: CAP_H,
    borderRadius: 9,
    backgroundColor: theme.colors.primaryDark,
    marginBottom: 6,
  },
  neck: {
    alignSelf: 'center',
    width: 46,
    height: NECK_H,
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  body: {
    width: BODY_WIDTH,
    height: BODY_HEIGHT,
    borderRadius: 26,
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liquid: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
  },
  /** 액체 위에 얹히는 상표. 흰 글자라 액체가 차오를수록 또렷해진다 */
  mark: {
    fontSize: 58,
    fontWeight: '800',
    color: theme.colors.surface,
    includeFontPadding: false,
  },
  /**
   * 입구에서 부풀어 오르는 액체.
   *
   * 흘러넘친 액체는 **진한 민트**로 칠한다. 병이 다 차면 본체도 같은 민트라,
   * 같은 색으로 두면 표면을 타고 흐르는 줄기가 통째로 사라진다 (실측).
   * 색이 짙어지는 건 물리적으로도 맞다 — 겉을 덮은 액체층은 더 어둡게 보인다.
   */
  crown: {
    position: 'absolute',
    top: CAP_H + 4,
    alignSelf: 'center',
    width: 58,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryDark,
  },
  /**
   * 흘러내리는 액체 한 겹 (병 안쪽 좌표계).
   * 폭은 병 전체. 아래 모서리를 크게 굴려 앞머리가 곡선이 되게 한다.
   */
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 56,
    borderBottomRightRadius: 56,
    backgroundColor: theme.colors.primaryDark,
  },
  drop: {
    position: 'absolute',
    top: 96,
    backgroundColor: theme.colors.primary,
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
});
