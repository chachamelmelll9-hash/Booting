const { withGradleProperties } = require("expo/config-plugins");

/**
 * The Android Gradle Plugin aborts the build when the project path contains
 * non-ASCII characters:
 *
 *   > Your project path contains non-ASCII characters. This will most likely
 *     cause the build to fail on Windows.
 *
 * That is the case for a Windows checkout living under a Korean user directory
 * (C:\Users\한화손해보험\...), where the path cannot be changed without moving
 * the repository. The check is a heuristic guard rather than a hard technical
 * limit, and this project builds cleanly with it overridden.
 *
 * Applied on win32 only, so macOS/Linux prebuild output stays byte-identical to
 * upstream — the check never fires there anyway.
 */
const withAndroidPathCheckOverride = (config) => {
  if (process.platform !== "win32") {
    return config;
  }

  return withGradleProperties(config, (config) => {
    const key = "android.overridePathCheck";
    const existing = config.modResults.find(
      (item) => item.type === "property" && item.key === key,
    );

    if (existing) {
      existing.value = "true";
    } else {
      config.modResults.push({ type: "property", key, value: "true" });
    }

    return config;
  });
};

module.exports = withAndroidPathCheckOverride;
