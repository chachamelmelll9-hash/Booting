const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "CMAKE_OBJECT_PATH_MAX";

// Kept short on purpose: every character here is charged against MAX_PATH for
// every object file below. `.cxx` under apps/mobile/android/app costs 69
// characters before a single object name is appended; this costs 14.
const STAGING_DIR = "C:/cxx/booting";

/**
 * Windows caps paths at MAX_PATH (260). The ninja shipped with the Android SDK
 * (cmake 3.22.1 / ninja 1.10.2) is not long-path aware — it has neither the
 * longPathAware manifest nor the RtlAreLongPathsEnabled probe — so it refuses
 * to stat or mkdir past that limit no matter what the LongPathsEnabled registry
 * value says. Two distinct failures come out of this:
 *
 *   ninja: error: Stat(<relative object path>): Filename longer than 260 characters
 *   ninja: error: mkdir(<relative object dir>): No such file or directory
 *
 * The first is ninja's own guard on the path as written into build.ninja
 * (relative to the .cxx/<config>/<hash>/<abi> directory). The second is Windows
 * rejecting the *absolute* path — ninja passes the relative one, but it is
 * resolved against that same directory before the syscall.
 *
 * Where the length comes from: CMake mirrors the absolute path of every source
 * outside the CMake source tree into the object path (C:\... becomes C_\...).
 * node_modules lives outside apps/mobile/android, so the codegen sources of
 * long-named packages — react-native-keyboard-controller is the worst — reach
 * 310 characters. Moving the repository to a shorter path does not fix this:
 * the mirrored tail alone is ~270 characters.
 *
 * The fix has two halves, and both are needed:
 *
 *   1. buildStagingDirectory moves .cxx out of the module directory, cutting
 *      the fixed prefix from 69 characters to 14+.
 *   2. CMake shortens an object name that does not fit CMAKE_OBJECT_PATH_MAX by
 *      replacing its leading directories with an MD5 hash — but only when the
 *      shortened form itself fits. With .cxx in its default location only 74
 *      characters were left for the object name while the hashed form needs 81,
 *      so CMake gave up and emitted the long name anyway. With (1) applied the
 *      budget is ~104 and the hash is used, which is what keeps every path
 *      under the limit.
 *
 * 250 is also CMake's own Windows default; it is set explicitly so the pairing
 * with (1) stays legible and survives a change of default.
 *
 * Applied on win32 only, so macOS/Linux prebuild output stays byte-identical to
 * upstream — those platforms have no MAX_PATH limit.
 */
const withAndroidCmakeObjectPathMax = (config) => {
  if (process.platform !== "win32") {
    return config;
  }

  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes(MARKER)) {
      return config;
    }

    const anchor = "    defaultConfig {\n";
    const at = contents.indexOf(anchor);

    if (at === -1) {
      throw new Error(
        "withAndroidCmakeObjectPathMax: could not find the defaultConfig block in app/build.gradle",
      );
    }

    const argument = [
      "        // Windows MAX_PATH workaround — see docs/progress/windows-setup-notes.md",
      "        externalNativeBuild {",
      "            cmake {",
      '                arguments "-DCMAKE_OBJECT_PATH_MAX=250"',
      "            }",
      "        }",
      "",
    ].join("\n");

    const staging = [
      "",
      "// Windows MAX_PATH workaround — see docs/progress/windows-setup-notes.md",
      "// Keeps the native build directory short so object paths stay under 260 characters.",
      "android {",
      "    externalNativeBuild {",
      "        cmake {",
      `            buildStagingDirectory = file("${STAGING_DIR}")`,
      "        }",
      "    }",
      "}",
      "",
    ].join("\n");

    const cut = at + anchor.length;

    config.modResults.contents =
      contents.slice(0, cut) + argument + contents.slice(cut) + staging;

    return config;
  });
};

module.exports = withAndroidCmakeObjectPathMax;
