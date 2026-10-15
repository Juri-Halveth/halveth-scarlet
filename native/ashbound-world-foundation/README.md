# ASHBOUND: Weltfundament als eigenständige Forschungsprobe

Der definierte Raum ist **5 000 × 5 000 m**. Ein kontinuierliches Höhenfeld
bestimmt die Oberfläche; darunter liegen Humus, Oberboden, Unterboden, Fels und
eine geschützte Grundgesteinszone. `density > 0` bedeutet festes Material.
Die Welt wird nur in angefragten 64-m-Chunks gesampelt. Das spart eine
25-km²-Voxeldatei und erhält gleiche Werte an Chunk-Grenzen.

`excavate()` schneidet eine kugelförmige Grabung aus dem Material und liefert
die betroffenen Chunk-Adressen zum Neuberechnen. `drop_to_ground()` sucht auf
einer vertikalen Linie den ersten Materialkontakt, auch auf dem Boden einer
Grabung. Gras- und Baumpositionen sind deterministisch und verschwinden dort,
wo ihre Bodenstütze ausgegraben wurde. `meshing.py` exportiert echte
3D-Grenzflächen als OBJ; die Farbe eines freigelegten Schnitts hängt von seiner
Schichttiefe ab.

Zum Prüfen in diesem Ordner:

```powershell
python -m unittest -q test_foundation
python build_preview.py .\preview
```

Der [Vorschaubogen](preview/foundation-preview.png) zeigt den gesamten
Koordinatenraum und den Querschnitt eines 64-m-Chunks. Das Vorschaukommando
erzeugt daneben `preview/ground-and-excavation.obj` mit MTL-Datei für einen
OBJ-Viewer. Der große Geometrieexport bleibt lokal; er ist eine Chunk-Probe,
keine Darstellung sämtlicher 25 km² auf einmal.

**Stand:** eigenständige Modell- und Geometrieprobe. Noch keine Unreal- oder
EXE-Integration, Laufzeit-Kollision, steuerbare Spielfigur, Grabetool,
Hydrologie, Erosion, ausgewachsene Pflanzenmeshes oder Langstrecken-Streaming.
Die alten ASHBOUND-Terrainflächen und ihr sichtbares Void sind dadurch noch
nicht repariert. Erst wenn das Fundament im Engine-Build mit Bewegung und
Grabung geprüft ist, kann es die alte Fläche ersetzen.
