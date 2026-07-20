# Performance baseline — not yet captured

`npx lighthouse` and `playwright.chromium.launch()` both fail in every
sandbox tried so far with `error while loading shared libraries:
libnspr4.so: cannot open shared object file` — the environment is missing
base Chromium runtime libs and has no package manager on `PATH` to install
them (`npx playwright install-deps` needs `apt-get`).

Run from a machine with a working Chrome/Chromium (any normal dev machine,
or GitHub's `ubuntu-latest` CI runner — the `lighthouse` job in
`.github/workflows/ci.yml` already works there):

```bash
npx lighthouse http://localhost:4000/orendezvous \
  --output=json --output=html --output-path=perf-baseline/menu \
  --preset=perf --form-factor=mobile --screenEmulation.mobile \
  --throttling-method=simulate
```

See `darna-phase-7-performance.md` → "Remaining work" for full context.
