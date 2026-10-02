# Scarlet Studio: repeat-impulse audit

Date: 2026-10-02. Base source: `0abdc3d18c097884a3246bbcff0aa8e35c6d5a72`.
Scope: the existing world studio, its local demo relay, appearance rendering,
export and focused regressions. This is a finite engineering review, not an
independent security certification or an audit of every project on the account.

## Requested behavior

- Keep preview and incoming room events in one combined browser view.
- Allow the same source impulse to produce additional visible objects.
- Preserve the source event and identify each resulting appearance.
- Keep existing character identities, movement, moments and world navigation.

The combined flow is intentional behavior, not an invalid-state finding.
No separate rooms, automatic history purge or new renderer cap were introduced.

## Changes reviewed

1. A repeat control now reuses the last gift's source event and creates a new
   appearance. The free preview needs no API or wallet.
2. Each accepted local POST has a new delivery ID and is streamed to connected
   views. An unchanged repeated source event is accepted as `REPEATED_DEMO`.
   A POST retry can create another object; this is intentionally not a
   financial/idempotent endpoint.
3. The source event ID and appearance ID have different roles. The transport
   receipt and stream notification for one delivery refer to the same object;
   another accepted delivery creates another object. Reconnect snapshots
   restore the recorded appearances.
4. Export v2 includes the combined source journal and appearance history,
   including occurrence counts, local observation times and per-appearance
   preview/relay origin. Current connection mode alone is not evidence that
   every earlier preview event was transmitted.
5. The shared view remains intact on connection and reconnection. Existing
   source-event validation, local-only listener and passive wallet behavior
   remain in place.

## Observed verification

| Check | Result |
| --- | --- |
| Node test suite | 228 passed, 0 failed |
| Python suite | 5 passed, 1 skipped |
| Site build | 86 HTML pages, 1,586 local references validated |
| Browser sizes | 1440x900, 1920x1080, 820x1180, 390x844, 320x740 |
| Canvas checks | Nonblank, moving, all 69 figures translate; reduced motion stable |
| Repeat interaction | One source produced four distinct appearance IDs |
| Shared room | Two isolated browser contexts observed repeat deliveries |
| Connection recovery | Controlled local stream interruption; missed delivery restored |
| Preview continuity | Preview appearance survived connection; no automatic preview upload |
| Export | Source link, occurrences and appearance origins inspected |
| Wallet fixture | Only account and chain display methods; no signing or transfer |
| Layout | Mobile repeat button fits; no horizontal page overflow in tested sizes |

The real-browser checks used Chrome/Playwright against the built site and a
factory-owned ephemeral loopback relay with synthetic events. The transport
interruption was controlled by that test server; it was not a claim about
every real network failure. No real wallet was connected in these checks.
The host's browser security integration generated its own requests; those
were recorded separately from application traffic.

Committed regression tests are in `tests/studio-flow.test.mjs`,
`tests/world-appearances.test.mjs`, `tests/live-studio.test.mjs` and the
existing world suites. The UI-controller fixture is intentionally smaller
than a browser; browser checks supplement it rather than being inferred
from a fixture pass.

## Remaining scope and reopen triggers

- Appearance history and renderer ID records grow for the page lifetime.
  No long-duration memory soak was performed. Reopen for a measured long
  session or an explicit request for archival/retention controls.
- The existing scene shows 24 newest instances; the relay snapshot retains
  100 deliveries. These prior finite presentation/retention choices were not
  expanded in this patch. A snapshot is not a complete historical archive.
- Reloading the preview loses its session; export remains explicit. Durable
  shared storage and BFCache lifecycle redesign were not included.
- Public GitHub Pages remains a per-browser preview. Shared public chat,
  payment settlement, blockchain integration and financial actions were not
  added or tested by this change.
- Firefox, Safari, non-Chrome mobile browsers, long-duration load and arbitrary
  browser extensions remain outside this test coverage.

Publication is a separate step: the repository commit and Pages build-info
must agree after deployment. This file records the local candidate review;
it does not itself prove that a deployment completed.
