module.exports = (request, options) => {
  const defaultResolver = options.defaultResolver;

  // Check if we're resolving from the winter directory and request is for runtime
  if (
    options.basedir &&
    options.basedir.includes('expo/src/winter') &&
    request === './runtime'
  ) {
    // Force resolution to non-native version to avoid runtime.native.ts
    return defaultResolver('./runtime.ts', options);
  }

  // Use default jest resolution
  return defaultResolver(request, options);
};
