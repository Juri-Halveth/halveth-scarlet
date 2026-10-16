# Red Room × DER SCHLICHTER: lokale Gesprächsprobe

## Stand und Quellen

Die neue Seite `forschung/red-room-dialog/` ist ein eigenständiger SCARLET-Forschungsprototyp. Sie liest ausschließlich das synthetische `red-room-swarm-shadow-v1`-Modell. Die Rollenfolge orientiert sich an den lokalen Entwurfsdokumenten `DER-SCHLICHTER/docs/04_COMPONENTS_AND_ROLES.md` und `DER-SCHLICHTER/docs/13_DELIBERATION_SPACE_EXTENSION.md` (gelesen am 2026-10-17). Die separate IDENTIQ-Quellenkarte nennt Sprache, Mimik, Gestik, Verhalten und Kontext als mögliche Beobachtungsklassen. Keine dieser Quellen wird als Laufzeitkomponente importiert.

## Getypte Relation

| Von | Nach | Relation | Stand |
| --- | --- | --- | --- |
| T±-Frame | Fiktiver Gesprächsfall | `SYNTHETIC_FIXTURE_SOURCE` | In `red-room-dialog-model.mjs` implementiert |
| Perspektive A/B | Zero | `STATEMENT_FOR_COMPARISON` | Zwei geschriebene Beispielaussagen, keine Aufnahme |
| T±-Frame | Zero | `MODEL_OBSERVATION` | Zahlen am selben Szenario und Zeitpunkt |
| Zero | Brückenbauer | `OPTION_INPUT` | Drei fest formulierte freiwillige Prüfwege |
| Video/Mimik/Gestik | Gesprächsfall | `FUTURE_CANDIDATE` | Keine Erfassung oder Deutung implementiert |
| DER-SCHLICHTER-Code | SCARLET-Seite | `NO_RUNTIME_INTEGRATION` | Nur Quellenbezug, keine Codekopie |

## Entscheidende Gegenprobe

Bei T+2 zeigen `blocked` und `active` beide drei öffentliche Echos. Die zweite fiktive Perspektive erhält in beiden Fällen dieselbe modellgebundene Echoinformation. Zero zeigt separat null beziehungsweise drei aktive Kopien aus dem internen synthetischen Modell. Der Wechsel der Szenariowahl ändert keine Personenäußerung und keine Brückenoption. So wird sichtbare Spur nicht still zur Laufzeitbehauptung.

Der Prototyp hat keinen Text-, Mikrofon-, Kamera- oder Netzwerk-Ingress, keine echten Teilnehmer, keine Einwilligung, keine emotionale oder biometrische Auswertung und keine Versöhnungswirkung. Sein Claim lautet ausschließlich: **Die entworfenen Rollen und Relationen sind an einem synthetischen Beispiel lokal bedienbar.**
