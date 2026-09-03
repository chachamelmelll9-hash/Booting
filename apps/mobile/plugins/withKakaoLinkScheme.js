const { withAndroidManifest } = require("expo/config-plugins");

/**
 * 카카오톡 공유 카드를 눌렀을 때 부팅 앱이 열리게 한다.
 *
 * 피드 카드에는 '자세히 보기' 버튼이 **항상** 붙는다 (카카오가 기본으로 넣고,
 * `buttons: []` 로도 지워지지 않는다). 갈 곳을 주지 않으면 부모님이 눌러보고
 * 아무 일도 일어나지 않는다.
 *
 * 웹 주소를 넣는 길도 있지만 카카오 콘솔에 도메인을 등록해야 열린다. 반면 앱을
 * 여는 건 우리 매니페스트만 고치면 된다 — 그리고 부모님은 코드 로그인을 위해
 * 어차피 앱이 필요하시니, 카드에서 앱으로 이어지는 편이 동선도 맞다.
 *
 * 카카오톡은 `kakao{네이티브앱키}://kakaolink` 로 앱을 부른다. `@react-native-kakao/core`
 * 플러그인은 로그인용 `oauth` 호스트만 등록하므로(실측: 이 호스트가 없어
 * `INTENT_NOT_RESOLVED` 로 아무 일도 안 일어났다) `kakaolink` 를 여기서 더한다.
 */
const withKakaoLinkScheme = (config) => {
  return withAndroidManifest(config, (config) => {
    const key = process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY;
    if (!key) return config;

    const scheme = `kakao${key}`;
    const application = config.modResults.manifest.application?.[0];
    const activity = application?.activity?.find(
      (a) => a["$"]?.["android:name"] === ".MainActivity",
    );
    if (!activity) return config;

    activity["intent-filter"] = activity["intent-filter"] ?? [];

    const already = activity["intent-filter"].some((filter) =>
      (filter.data ?? []).some(
        (d) =>
          d["$"]?.["android:scheme"] === scheme &&
          d["$"]?.["android:host"] === "kakaolink",
      ),
    );
    if (already) return config;

    activity["intent-filter"].push({
      action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
      category: [
        { $: { "android:name": "android.intent.category.DEFAULT" } },
        { $: { "android:name": "android.intent.category.BROWSABLE" } },
      ],
      data: [{ $: { "android:scheme": scheme, "android:host": "kakaolink" } }],
    });

    return config;
  });
};

module.exports = withKakaoLinkScheme;
