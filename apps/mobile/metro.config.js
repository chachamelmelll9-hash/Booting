const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('metro-config');
const path = require('path');

// Get the monorepo root
const workspaceRoot = path.resolve(__dirname, '../..');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;
const watchFolders = Array.from(new Set([
  ...(defaultConfig.watchFolders ?? []),
  workspaceRoot,
]));

/**
 * Metro configuration for Turborepo monorepo
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
/**
 * `expo export:embed` 프로세스인가.
 *
 * 릴리스 빌드에서 엔트리를 못 찾는 문제를 이 프로세스에만 한정해 고치기 위해 본다.
 * 아래 unstable_serverRoot 주석에 이유가 있다.
 */
const isExportEmbed = process.argv.includes('export:embed');

const customConfig = {
  watchFolders,
  /**
   * 릴리스 번들의 엔트리 해석을 맞춘다 — **export:embed 일 때만**.
   *
   * expo/metro-config 는 모노레포에서 `unstable_serverRoot` 를 워크스페이스 루트로
   * 잡는다. 그런데 엔트리 절대경로를 상대화하는 기준이 도구마다 다르다:
   *
   *   - `@expo/cli` 의 export:embed : projectRoot 기준 (`./index.js`)
   *   - `expo-updates` 의 매니페스트 : serverRoot 기준 (`apps/mobile/index.js`)
   *
   * Metro 는 둘 다 serverRoot 로 푼다. 그래서 기본값에서는 export:embed 가 죽고
   *   Unable to resolve module ./index.js from C:\proj\Booting/.
   * serverRoot 를 통째로 projectRoot 로 바꾸면 이번엔 expo-updates 가 죽는다
   *   The resource `...\apps\mobile\apps\mobile\index.js` was not found.
   * (둘 다 실측). 두 기준을 동시에 만족시킬 수 없어서 프로세스별로 맞춘다.
   *
   * 개발 서버는 엔트리를 이 경로로 풀지 않아 어느 쪽이든 영향이 없다. 릴리스
   * 빌드만 걸리며, 그래서 versionCode 가 1 인 채로 여기까지 왔다 — 스토어 빌드가
   * 한 번도 성공한 적이 없다.
   */
  ...(isExportEmbed ? { server: { unstable_serverRoot: __dirname } } : {}),
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
    // Let Metro know where to find node_modules
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    // Resolve workspace packages
    extraNodeModules: {
      '@chachamelmelll9-hash-service/i18n': path.resolve(workspaceRoot, 'packages/i18n/src'),
      '@chachamelmelll9-hash-service/supabase': path.resolve(workspaceRoot, 'packages/supabase/src'),
      '@chachamelmelll9-hash-service/webview-bridge': path.resolve(workspaceRoot, 'packages/webview-bridge/src'),
    },
    // Custom resolver for monorepo
    resolveRequest: (context, moduleName, platform) => {
      // Handle @chachamelmelll9-hash-service/source condition for workspace packages
      if (moduleName.startsWith('@chachamelmelll9-hash-service/')) {
        const packagePath = moduleName.replace('@chachamelmelll9-hash-service/', '');
        const [packageName, ...subPaths] = packagePath.split('/');

        if (['i18n', 'supabase', 'webview-bridge'].includes(packageName)) {
          const basePath = path.resolve(workspaceRoot, 'packages', packageName, 'src');
          const subPath = subPaths.length > 0 ? subPaths.join('/') : 'index';
          const resolvedPath = path.resolve(basePath, `${subPath}.ts`);

          return {
            filePath: resolvedPath,
            type: 'sourceFile',
          };
        }
      }
      // Fall back to default resolution
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, customConfig);
