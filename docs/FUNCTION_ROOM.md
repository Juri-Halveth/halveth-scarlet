# Scarlet function room — 2026-10-24

## Product purpose

The root route is a local operational space for states, variants and observation.
The previous Earth/event/game page is replaced at the same URL. Its old source
remains in Git history; a duplicate legacy website is not added to the public tree.
Existing independent applications keep their own routes and development scopes.

## Executed operations

`assets/capability-room-model.mjs` adapts the existing kernels, without changing
their definitions:

| Interface | Actual operation | Result |
| --- | --- | --- |
| Plant seed | `GStar.create`, `SEED`, `MATERIALIZE` | Preserved raw text, a versioned text state, a local root and an event chain |
| Shell | Read selected state | Displays the exact selected text |
| Time | `GStarLiving.advance` | Deterministic finite software ecology; fixed 50-ms model steps |
| Unfold / variant | `PROPOSE` (`DERIVE_CHILD`), `MATERIALIZE` | A new text state and a bound parent relation; original state retained |
| Observe | `OBSERVE` | A read of a materialized local text state |
| Snapshot | `SNAPSHOT` | A retained event prefix and references |
| Check replay | `GStar.verify` | Exact reconstruction and self-consistency of the text ledger |
| Export | Data serialization after successful text replay | Separate text ledger and ecology state in `halveth.capability-room.v1` JSON |

The central shell represents the selected text state. Small moving points and
signals project the separate cell model. The two models share this interface;
the ecology does not generate the visitor's text or authorize a text transition.
Display geometry is neither physical geometry nor a physical mechanism claim.

## Autonomy and bounds

Cell motion, signal routing, processing and finite descendant creation occur
under the existing local rules. Visitors explicitly create text variants and
observations. There is no AI text generation, remote program execution, financial
operation or integration with outside systems on this entry route.

- Model horizon: 180,000 ms; a new run reopens it.
- Text kernel: existing 48-state / 128-event limits; the adapter checks capacity
  before its two-event branch operation.
- Cell kernel: existing depth, inbox, signal and retained-history limits.
- Hidden-tab time and display gaps are recorded separately; no catch-up history
  is fabricated.
- Reduced motion starts paused; pause and individual steps are available.
- Text is rendered through `textContent`; JSON is downloaded as data.
- No persistence or automatic upload; a fresh seed replaces the current in-memory
  run after valid initialization. The interface says to export first if needed.
- Root CSP: local scripts/styles only; `connect-src 'none'`, no frames or forms.

`Z / EI / T / unfolding` is the interface's user-inspired lifecycle motif.
It is not a derivation of biology, physics or an unlimited-value claim.

## Verification

The adapter tests exercise preserved originals, changed variants, relation
endpoints, replay, independent automatic evolution, deterministic seeds,
capacity rejection, finite model time, observation gaps and tampered exports.
Build/link checks and desktop/mobile browser verification cover delivery and
interaction separately. A passing replay checks the text model, not real-world
truth or a complete reconstruction of the cell model.

Homepage-only tests for the removed inline game countdown and the removed inline
NASA satellite loader are retired with those implementations. Kernel tests and
the independently available applications remain. Other former homepage layout
assertions are updated to the new entry contract rather than retaining hidden
game controls simply to satisfy old markup tests.

## Practical value

The implemented primitives support prototype histories, explainable workflows,
variant comparison and observation planning. An outside use needs a concrete
integration, a domain-specific contract and measured outcomes. Commercial terms
follow the repository's path- and version-specific license map. This document
does not assert external acceptance, financial valuation or exclusive rights in
mathematical ideas or third-party components.
