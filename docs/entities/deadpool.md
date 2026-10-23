# DEADPOOL

HALVETH · Dossier · 2026-10-23

## Deutsch

### Rolle

Ein Ursprung, getrennte Fortsetzungen: Identität, Zustand, gespeicherte Information und Ereignisgeschichte getrennt untersuchen.

### Geschichte und These

Deadpool ist der Ausgangspunkt für Juris Frage nach einer Entität mit mehreren gleichzeitig bestehenden Fortsetzungen. Die HALVETH-Umsetzung gibt jedem Branch eine eigene Adresse, einen Elternbranch, Modellschritte, veränderbare Koordinaten und einen gemerkten Zustand.

FORK erzeugt einen neuen Branch und erhält den Elternzustand. RESTORE stellt die gemerkten Koordinaten wieder her und ergänzt die Ereignisgeschichte. CHECKPOINT merkt die aktuellen Koordinaten. Diese Operationen sind im Signaturraum für alle Profile verfügbar. Eine Sitzung hat höchstens 16 Branches und 128 Transitionen je Entität und kann als JSON exportiert werden.

Das Modell implementiert Zustandsfortsetzung in Software. Eine Rekonstruktion subjektiver Erfahrung oder eine physische Wiederherstellung wird damit nicht gemessen. Die geometrischen Koordinaten sind frei gestaltete Projektwerte.

### Quellenstand

Die Figurenherkunft bleibt bei Marvel. Das Continuity-Experiment ist eine eigene HALVETH-Gestaltung vom 23. Oktober 2026. EIP-140 beschreibt das Zurücknehmen von EVM-Zustandsänderungen; die hier implementierte RESTORE-Operation arbeitet mit einem lokalen Checkpoint und erhält ihre eigene Historie.

### Weiterlesen

- [Marvel · Deadpool](https://www.marvel.com/characters/deadpool-wade-wilson)
- [EIP-140 · REVERT](https://eips.ethereum.org/EIPS/eip-140)
- [HALVETH · Signaturmodell](https://github.com/Juri-Halveth/halveth-scarlet/blob/main/assets/entity-signatures.mjs)

## English

### Role

One origin, separate continuations: investigate identity, state, retained information and event history separately.

### Story and thesis

Deadpool is the starting point for Juri’s question about an entity with several simultaneous continuations. The HALVETH implementation gives each branch its own address, parent branch, model steps, editable coordinates and checkpoint.

FORK creates a new branch while retaining its parent. RESTORE restores the checkpoint coordinates and appends to the event history. CHECKPOINT retains the current coordinates. All profiles expose these operations in the signature space. A session supports at most 16 branches and 128 transitions per entity and can be exported as JSON.

The model implements software state continuation. It does not measure subjective continuity or physical regeneration. Its geometric coordinates are authored project values.

### Source status

Character origins remain with Marvel. The continuity experiment is an original HALVETH design dated 23 October 2026. EIP-140 describes reverting EVM state changes; the local RESTORE operation instead uses a checkpoint and retains its own event history.

### Read more

- [Marvel · Deadpool](https://www.marvel.com/characters/deadpool-wade-wilson)
- [EIP-140 · REVERT](https://eips.ethereum.org/EIPS/eip-140)
- [HALVETH · Signature model](https://github.com/Juri-Halveth/halveth-scarlet/blob/main/assets/entity-signatures.mjs)
