/**
 * HALVETH / SINGULARITY CORE
 * Eigenständiges, kleines 2D-Bewegungsmodell, inspiriert vom Unreal-II-Effekt.
 * Keine Originaldatei aus Unreal II, keine reale Schwarze-Loch-Physik.
 *
 * Ein Objekt hat: {x, y, vx, vy, mass}
 * Ein Feld hat:  {x, y, radius, strength, horizon}
 * Diese Referenzfunktion integriert Position und Geschwindigkeit genau einmal.
 * Ein Aufrufer darf dieselbe Position nicht nochmals im selben Schritt bewegen.
 * Die HTML-Demo hat eigene Visualisierungsparameter und nutzt dieses Modul nicht.
 *
 * Die mathematische Idee:
 *   a_r = k / (r² + epsilon) × 1/(1 + (r/R)^4) / Masse
 *   v(t + dt) = v(t) + a × dt
 *   x(t + dt) = x(t) + v(t + dt) × dt
 */

export function beeinflusse_koerper_durch_singularitaet(koerper, feld, delta_zeit_in_sekunden) {
  const bodyValues = [koerper?.x, koerper?.y, koerper?.vx, koerper?.vy, koerper?.mass ?? 1];
  const fieldValues = [feld?.x, feld?.y, feld?.radius, feld?.strength, feld?.horizon];
  if (!bodyValues.every(Number.isFinite) || !fieldValues.every(Number.isFinite) ||
      koerper.mass <= 0 || feld.radius <= 0 || feld.horizon < 0 ||
      feld.horizon >= feld.radius || feld.strength < 0 ||
      !Number.isFinite(delta_zeit_in_sekunden) || delta_zeit_in_sekunden < 0) {
    throw new RangeError('Endliche Werte, positive Masse und Radius, 0 <= Horizont < Radius sowie dt >= 0 erforderlich');
  }
  const abstand_x = feld.x - koerper.x;
  const abstand_y = feld.y - koerper.y;
  const abstand = Math.hypot(abstand_x, abstand_y);
  const abstand_im_quadrat = abstand ** 2;

  if (!Number.isFinite(abstand)) {
    return { beruehrt_vom_feld: false, horizonterreicht: false };
  }
  if (abstand < feld.horizon) {
    return { beruehrt_vom_feld: true, horizonterreicht: true };
  }

  const randgewichtung = 1 / (1 + (abstand / feld.radius) ** 4);
  const stabilisierender_abstand = 4500;
  const wirksame_masse = Math.max(0.05, koerper.mass ?? 1);
  const feldbeschleunigung = Math.min(
    1000,
    (feld.strength * 5_700_000 * randgewichtung) /
      ((abstand_im_quadrat + stabilisierender_abstand) * wirksame_masse)
  );

  const richtung_x = abstand_x / Math.max(0.001, abstand);
  const richtung_y = abstand_y / Math.max(0.001, abstand);
  const tangentiale_verdrehung = 0.17;

  const nextVx = koerper.vx + (richtung_x - richtung_y * tangentiale_verdrehung) * feldbeschleunigung * delta_zeit_in_sekunden;
  const nextVy = koerper.vy + (richtung_y + richtung_x * tangentiale_verdrehung) * feldbeschleunigung * delta_zeit_in_sekunden;
  const nextX = koerper.x + nextVx * delta_zeit_in_sekunden;
  const nextY = koerper.y + nextVy * delta_zeit_in_sekunden;
  if (![nextX, nextY, nextVx, nextVy].every(Number.isFinite)) {
    throw new RangeError('Der Bewegungsschritt muss endliche Ausgabewerte behalten');
  }
  koerper.vx = nextVx;
  koerper.vy = nextVy;
  koerper.x = nextX;
  koerper.y = nextY;

  return {
    beruehrt_vom_feld: feldbeschleunigung > 0,
    horizonterreicht: false,
    aktuelle_beschleunigung: feldbeschleunigung,
    abstand_zum_kern: abstand,
  };
}
