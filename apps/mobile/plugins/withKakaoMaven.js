const { withProjectBuildGradle } = require("expo/config-plugins");

/** Adds Kakao SDK Maven repository to allprojects.repositories in android/build.gradle */
const withKakaoMaven = (config) => {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    const kakaoMaven =
      "maven { url 'https://devrepo.kakao.com/nexus/content/groups/public/' }";

    if (!contents.includes("devrepo.kakao.com")) {
      config.modResults.contents = contents.replace(
        /allprojects\s*\{[^}]*repositories\s*\{/,
        (match) => `${match}\n    ${kakaoMaven}`,
      );
    }

    return config;
  });
};

module.exports = withKakaoMaven;
