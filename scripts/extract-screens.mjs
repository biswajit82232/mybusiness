/**
 * Legacy helper: screens now live under src/features/ and lazy routes use
 * src/features/main-stage/lazyMainStageScreens.jsx. Do not use a mega-barrel for runtime imports.
 */
console.warn(
  "[extract-screens] Obsolete: use feature modules + lazyMainStageScreens.jsx. No action taken.",
);
process.exit(0);
