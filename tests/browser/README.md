# Rendered-scene regression

This check opens the **generated public site** in Chromium, including the shared
styles and scripts added by the normal site builder. It serves the repository's
Pages prefix, `/halveth-scarlet/`. It is separate from the existing source-text
contract in `tests/singularity-cannon-ui.test.cjs`.

From the repository root, with Node 24:

```bash
node tools/build_site.mjs
npm ci --prefix tests/browser --ignore-scripts --no-audit --no-fund
cd tests/browser
npx --no-install playwright install --with-deps chromium
npm test
```

On each of a 1440 × 900 desktop and a 390 × 844 emulated touch device, the test
requires the actual `fx` canvas to have visible layout, contain rendered pixels,
receive the centre pointer hit, and enable Undo after a real mouse click or touch.
Runtime errors also fail the check. Browser absence is an error, never a skip.

The same observations and usability assertion are then applied to an intentional
counterexample: the local HTTP server adds CSS hiding all four scene canvases.
That page must lose the centre hit and leave Undo disabled, and the **same
usability assertion must reject it**. The source and generated HTML on disk are
never edited. The original page must pass independently on both viewport sizes.

The check writes a screenshot and JSON observation for each case to `artifacts/`.
CI retains them for three days. This demonstrates the visibility/input regression;
it is not an aesthetic approval, a likeness check, proof of physical accuracy,
or a substitute for testing real mobile hardware and other browser engines.

`SCARLET_SITE_ROOT` can explicitly point to another already-built site directory.
Its absolute path is recorded in the observations. The default is `.site-build`
at the repository root. A source-only fixture is not equivalent to the generated
site and must not be reported as a publication test.

For an already installed compatible Chromium, an explicit local executable may
be selected with `SCARLET_CHROMIUM_EXECUTABLE`. CI uses the browser installed by
the exact Playwright version in `package-lock.json`; it does not set this override.
