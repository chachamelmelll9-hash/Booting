import FontAwesome from '@expo/vector-icons/FontAwesome';
import { nextSetupStep,useParentProfile, useVerification } from '@features/parent-profile';
import { theme } from '@shared/config/colors';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 로그인 직후 인사 — 민트 부스터 뚜껑이 열리고 **하트가 흘러넘친다.**
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
 * 애니메이션은 RN 내장 `Animated` 로만 만든다. 도형이 사각형·원과 아이콘뿐이라
 * SVG 나 Lottie 를 끌어올 이유가 없고, `useNativeDriver` 로 UI 스레드에서 돌아
 * 저사양 기기에서도 끊기지 않는다.
 */

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
  const brim = useRef(new Animated.Value(0)).current;
  const copy = useRef(new Animated.Value(0)).current;
  const hearts = useMemo(() => HEARTS.map(() => new Animated.Value(0)), []);

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
        // 5. 입구에 하트가 그득 차오른다 — 쏟아지기 직전을 한 박자 보여 준다.
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
        ]),
        // 6. 하트가 쏟아진다 — 솟을 때 감속하고 떨어질 때 가속한다 (포물선).
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
  }, [ready, bottleIn, shake, cap, liquid, brim, copy, hearts]);

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
  ground: {
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
   * 입구에 그득 찬 하트.
   *
   * **진한 민트**로 칠한다. 병이 다 차면 본체도 같은 민트라, 같은 색으로 두면
   * 입구에 얹힌 하트가 통째로 사라진다 (물줄기 때 실측한 것과 같은 이유다).
   */
  brim: {
    position: 'absolute',
    top: CAP_H,
    alignSelf: 'center',
  },
  /** 쏟아지는 하트 — 부스터 입구 높이에서 시작한다 */
  heart: {
    position: 'absolute',
    top: 88,
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
