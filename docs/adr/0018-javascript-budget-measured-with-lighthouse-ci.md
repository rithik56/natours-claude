# 0018. The JavaScript budget is measured with Lighthouse CI

Status: Accepted
Date: 9 Nov 2026
Requirements: R9
Plan review: DEL-04, ARC-05; PROJECT.md Key Decision 8; CONTEXT D-10; RESEARCH Open Questions 4 and 5

## Context

R9 as written in `plan.md` asks for a per-route "First Load JS" baseline from the `next build` output, and a check against it. Next.js 16 no longer prints "First Load JS", so that measurement does not exist and the check could not be built (DEL-04, ARC-05). U24 already needs Lighthouse CI for the performance gate, so the same tool can measure JavaScript too.

## Decision

- **Measure the gzipped script transfer size with Lighthouse CI.** The metric is the `resource-summary:script:size` assertion, which reads the `transferSize` of the script row, that is, the compressed bytes sent over the network. It is not the raw size of the chunks.
- **One shared floor.** The floor is measured on `/`, served by `next start` with `APP_ENV=ci`, using Lighthouse's default mobile preset, so it matches the U24 runs in Phase 7. Three runs are taken and the median is the figure. It is recorded in `docs/bundle-baseline.json` as `floorBytes`, with `budgetDeltaBytes` (40,960), `route`, `measuredAt`, `preset`, `lighthouse`, `chrome`, `next`, `runs`, `statistic`, `runBytes` and the command.
- **Every page's budget is the floor plus 40 KB.** A measured size of exactly floor plus 40,960 bytes passes and one byte more fails. The tour page's budget is the floor plus 40 KB plus a map allowance that Phase 4 sets when it adds Leaflet.
- **Each new page joins the Lighthouse CI matrix in the phase that builds it.** `lighthouserc.cjs` builds its `assertMatrix` from the baseline file, so a later phase adds one more URL pattern against the same floor. Pages behind a login use a Lighthouse CI login script when they are added.
- **Record locally, check in CI.** `npm run bundle:record` collects the runs and rewrites `docs/bundle-baseline.json`, and the file is committed and reviewed. CI runs `npm run bundle:check` only: it collects again, runs `lhci assert` against the baseline and then `scripts/measure-bundle.ts --check`, which fails when there are no reports or no baseline, so it can never pass on no data. CI never rewrites the baseline.
- **Re-recording the floor needs a note in this ADR.** Moving the floor moves every page's budget, so each re-record is listed below with its date, its old and new figures and the reason.
- **No public upload.** `lighthouserc.cjs` has no `upload` section. The reports stay in `.lighthouseci/`, which is gitignored, and CI keeps them as the `lighthouse-results` workflow artifact (with `include-hidden-files`, because the folder name starts with a dot). The pages measured carry no personal data in Phase 1 (T-01-51).
- **This amends R9's per-route wording.** R9 becomes "the script transfer size of every page is within 40 KB gzipped of one shared floor, measured with Lighthouse CI", replacing "per-route First Load JS".

## Recorded floors

| Date        | Floor (bytes) | Measured with                                                             | Reason                   |
| ----------- | ------------- | ------------------------------------------------------------------------- | ------------------------ |
| 9 Nov 2026  | 138,107       | Lighthouse 13.6.0, Chrome 156, mobile preset, 3 runs, median, Next 16.4.5 | First recording (01-13)  |

The 138,107 bytes are the compressed transfer of five script files. Their raw size is 457,070 bytes, so gzip is in effect. All nine runs taken while building this (three recordings and checks) gave the same figure, because the same files are compressed the same way every time. The check therefore does not need a noise margin: a change in the figure means the files changed.

## Consequences

- A change that adds more than 40 KB of gzipped JavaScript to `/` over the floor fails CI. Later phases that add dependencies to the root layout pay out of the same 40 KB.
- The floor is Phase 1's `/`, which is nearly empty. It is the framework's own cost (React, Next and the runtime). Pages that add features spend the 40 KB on them; the number is a ceiling per page, not a total.
- `@lhci/cli` pulls in `proxy-agent`, which pulled in `basic-ftp` 5.x, and that release has a high-severity advisory (GHSA-c475-qrg2-pj4r). The CI audit step fails on high advisories, so `package.json` carries an `overrides` entry for `basic-ftp` at 6.2.6, the patched release of the same package. Lighthouse CI never makes an FTP request. The override can go when `get-uri` depends on a patched `basic-ftp` itself.
- The Chrome version in the baseline is the one in the user agent string, which Chrome reduces to its major version. Chrome 156.0.8078.80 was installed when the floor was recorded.
- GitHub's ubuntu runners include Google Chrome, and `--no-sandbox --headless=new` is set in `lighthouserc.cjs` for them (A8). This was not run on a runner when the plan was executed, only on a Mac. It has since run on a runner: on 9 Nov 2026 the `build` job of GitHub Actions run 42655320866 ran three Lighthouse runs and measured 138,229 bytes for `/` (ADR 0026).
