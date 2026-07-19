// /dashboard and /admin require an authenticated session — LHCI has no
// login flow configured here, so those two runs currently measure the
// (lightweight) login/redirect page, not the real dashboard. Real
// authenticated-page numbers still need a manual Lighthouse run against a
// logged-in session (see perf-baseline/README or Task 7.1.2). Kept in the
// URL list anyway so a regression on the login page itself still gets
// caught.
module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000/orendezvous",
        "http://localhost:3000/orendezvous/checkout",
        "http://localhost:3000/dashboard",
        "http://localhost:3000/admin",
      ],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        throttlingMethod: "simulate",
        disableStorageReset: false,
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 3000 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.15 }],
        "total-blocking-time": ["error", { maxNumericValue: 600 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
        "uses-optimized-images": ["warn", { minScore: 1 }],
        "uses-webp-images": ["warn", { minScore: 1 }],
        "unused-javascript": ["warn", { maxNumericValue: 50000 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
