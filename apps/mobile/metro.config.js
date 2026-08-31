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
const customConfig = {
  watchFolders,
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
      '@product-engineer-community-service/i18n': path.resolve(workspaceRoot, 'packages/i18n/src'),
      '@product-engineer-community-service/supabase': path.resolve(workspaceRoot, 'packages/supabase/src'),
      '@product-engineer-community-service/webview-bridge': path.resolve(workspaceRoot, 'packages/webview-bridge/src'),
    },
    // Custom resolver for monorepo
    resolveRequest: (context, moduleName, platform) => {
      // Handle @product-engineer-community-service/source condition for workspace packages
      if (moduleName.startsWith('@product-engineer-community-service/')) {
        const packagePath = moduleName.replace('@product-engineer-community-service/', '');
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
