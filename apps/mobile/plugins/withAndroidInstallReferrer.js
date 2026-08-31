const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  createRunOncePlugin,
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
} = require('expo/config-plugins');

const MODULE_NAME = 'InstallReferrer';
const PACKAGE_NAME = 'InstallReferrerPackage';
const INSTALL_REFERRER_DEPENDENCY =
  'implementation("com.android.installreferrer:installreferrer:2.2")';

const moduleSource = (androidPackage) => `package ${androidPackage};

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

public class ${MODULE_NAME}Module extends ReactContextBaseJavaModule {
  private final ReactApplicationContext reactContext;

  public ${MODULE_NAME}Module(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return "${MODULE_NAME}";
  }

  @ReactMethod
  public void getInstallReferrer(Promise promise) {
    InstallReferrerClient referrerClient =
      InstallReferrerClient.newBuilder(reactContext).build();

    referrerClient.startConnection(new InstallReferrerStateListener() {
      @Override
      public void onInstallReferrerSetupFinished(int responseCode) {
        try {
          if (responseCode != InstallReferrerClient.InstallReferrerResponse.OK) {
            promise.resolve(null);
            return;
          }

          ReferrerDetails response = referrerClient.getInstallReferrer();
          WritableMap map = Arguments.createMap();

          map.putString("installReferrer", response.getInstallReferrer());
          map.putDouble(
            "referrerClickTimestampSeconds",
            response.getReferrerClickTimestampSeconds()
          );
          map.putDouble(
            "installBeginTimestampSeconds",
            response.getInstallBeginTimestampSeconds()
          );
          map.putDouble(
            "referrerClickTimestampServerSeconds",
            response.getReferrerClickTimestampServerSeconds()
          );
          map.putDouble(
            "installBeginTimestampServerSeconds",
            response.getInstallBeginTimestampServerSeconds()
          );
          map.putBoolean("googlePlayInstantParam", response.getGooglePlayInstantParam());
          map.putString("installVersion", response.getInstallVersion());

          promise.resolve(map);
        } catch (Exception error) {
          promise.reject("INSTALL_REFERRER_ERROR", error);
        } finally {
          referrerClient.endConnection();
        }
      }

      @Override
      public void onInstallReferrerServiceDisconnected() {
        // The service can disconnect unexpectedly; callers retry on next app start.
      }
    });
  }
}
`;

const packageSource = (androidPackage) => `package ${androidPackage};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class ${PACKAGE_NAME} implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    return Arrays.<NativeModule>asList(new ${MODULE_NAME}Module(reactContext));
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }
}
`;

const getAndroidPackage = (config) => {
  const androidPackage = AndroidConfig.Package.getPackage(config);
  if (!androidPackage) {
    throw new Error('android.package must be defined for install referrer plugin.');
  }

  return androidPackage;
};

const addDependency = (contents) => {
  if (contents.includes(INSTALL_REFERRER_DEPENDENCY)) {
    return contents;
  }

  return contents.replace(
    /dependencies\s*\{/,
    `dependencies {\n    ${INSTALL_REFERRER_DEPENDENCY}`,
  );
};

const addMainApplicationRegistration = (contents, androidPackage, language) => {
  const importLine =
    language === 'kt'
      ? `import ${androidPackage}.${PACKAGE_NAME}`
      : `import ${androidPackage}.${PACKAGE_NAME};`;

  let nextContents = contents;
  if (!nextContents.includes(importLine)) {
    const importAnchor =
      language === 'kt'
        ? /import expo\.modules\.ReactNativeHostWrapper\n/
        : /import expo\.modules\.ReactNativeHostWrapper;\n/;

    nextContents = nextContents.replace(
      importAnchor,
      language === 'kt'
        ? `import expo.modules.ReactNativeHostWrapper\n${importLine}\n`
        : `import expo.modules.ReactNativeHostWrapper;\n${importLine}\n`,
    );
  }

  if (language === 'kt') {
    const registrationLine = `              add(${PACKAGE_NAME}())`;
    if (!nextContents.includes(registrationLine)) {
      const packageCommentPattern =
        /(\s*)\/\/ (?:packages\.)?add\(MyReactNativePackage\(\)\)\n/;
      if (packageCommentPattern.test(nextContents)) {
        nextContents = nextContents.replace(
          packageCommentPattern,
          `$1// add(MyReactNativePackage())\n${registrationLine}\n`,
        );
      } else {
        nextContents = nextContents.replace(
          /PackageList\(this\)\.packages\.apply \{\n/,
          `PackageList(this).packages.apply {\n${registrationLine}\n`,
        );
      }
    }
    return nextContents;
  }

  const registrationLine = `            packages.add(new ${PACKAGE_NAME}());`;
  if (!nextContents.includes(registrationLine)) {
    nextContents = nextContents.replace(
      /(\s*)\/\/ packages\.add\(new MyReactNativePackage\(\)\);\n/,
      `$1// packages.add(new MyReactNativePackage());\n${registrationLine}\n`,
    );
  }

  return nextContents;
};

const withAndroidInstallReferrer = (config) => {
  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = addDependency(config.modResults.contents);
    return config;
  });

  config = withMainApplication(config, (config) => {
    const androidPackage = getAndroidPackage(config);
    config.modResults.contents = addMainApplicationRegistration(
      config.modResults.contents,
      androidPackage,
      config.modResults.language,
    );
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    (config) => {
      const androidPackage = getAndroidPackage(config);
      const packagePath = androidPackage.replace(/\./g, path.sep);
      const sourceDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        packagePath,
      );

      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(
        path.join(sourceDir, `${MODULE_NAME}Module.java`),
        moduleSource(androidPackage),
      );
      fs.writeFileSync(
        path.join(sourceDir, `${PACKAGE_NAME}.java`),
        packageSource(androidPackage),
      );

      return config;
    },
  ]);

  return config;
};

module.exports = createRunOncePlugin(
  withAndroidInstallReferrer,
  'withAndroidInstallReferrer',
  '1.0.0',
);
