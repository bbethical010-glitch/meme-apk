export const AD_TEST_MODE = import.meta.env.DEV || import.meta.env.VITE_ADMOB_TEST_MODE === 'true';

export const AD_UNITS = {
  interstitial: AD_TEST_MODE
    ? 'ca-app-pub-3940256099942544/1033173712'
    : 'ca-app-pub-2093403233028868/3926550523',
  // A Rewarded Video unit is required; do not reuse the legacy rewarded-interstitial ID.
  rewarded: AD_TEST_MODE
    ? 'ca-app-pub-3940256099942544/5224354917'
    : import.meta.env.VITE_ADMOB_REWARDED_ID || '',
  // Optional: this app had no banner placement. Configure only when enabling banners.
  banner: import.meta.env.VITE_ADMOB_BANNER_ID
    ? (AD_TEST_MODE ? 'ca-app-pub-3940256099942544/6300978111' : import.meta.env.VITE_ADMOB_BANNER_ID)
    : '',
} as const;

/**
 * Phase 2 — AdMob mediation:
 * Keep format-specific AdMob IDs stable and map them into mediation groups in
 * the AdMob console (e.g. Meta Audience Network / AppLovin demand). Group setup
 * and placement routing are dashboard-side, with no app routing-code changes.
 * Networks that require native SDKs/adapters need those added, synced, and
 * released separately before serving; console configuration alone cannot
 * install a mediation adapter. No network-specific SDKs are included here.
 */
