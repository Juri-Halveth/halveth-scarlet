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

`build_preview.py` erzeugt weiterhin einen historischen 2D-Diagnosebogen und
einen OBJ-Chunk. Der Bogen ist keine Spielansicht und kein visuelles Ziel.

**Stand:** Das Modell ist als separates natives Unreal-Level `FoundationLab`
weitergeführt. Dort werden 3D-Grenzflächen samt Kollision abschnittsweise
erzeugt, eine Grabung remesht den betroffenen Boden, und lokale Pflanzen sowie
Felsen werden an die Höhe gesetzt. Der Engine-Kollisionstest und Screenshots
prüfen diesen Kandidaten. Die bisherige Story-Karte verwendet weiterhin ihre
älteren Terrainflächen; der Lab-Stand ist noch kein Ersatz für das gesamte
Spiel. Siehe [native Unreal README](../ashbound-unreal/README.md).
