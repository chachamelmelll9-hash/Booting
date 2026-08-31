module.exports = (request, options) => {
  const defaultResolver = options.defaultResolver;

  // Windows hands us a basedir with backslashes, so the posix-style match below
  // never fires and runtime.native.ts gets loaded instead — it lazily requires a
  // module from a global getter, which Jest rejects with "You are trying to
  // `import` a file outside of the scope of the test code."
  const basedir = options.basedir ? options.basedir.replace(/\\/g, '/') : '';

  // Check if we're resolving from the winter directory and request is for runtime
  if (basedir.includes('expo/src/winter') && request === './runtime') {
    // Force resolution to non-native version to avoid runtime.native.ts
    return defaultResolver('./runtime.ts', options);
  }

  // Use default jest resolution
  return defaultResolver(request, options);
};
