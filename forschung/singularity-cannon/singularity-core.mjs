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
 *   a_r = k / (r² + epsilon) × weicher_Randfaktor / Masse
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
  const abstand_im_quadrat = abstand_x ** 2 + abstand_y ** 2;
  const abstand = Math.sqrt(abstand_im_quadrat);

  if (abstand >= feld.radius) {
    return { beruehrt_vom_feld: false, horizonterreicht: false };
  }
  if (abstand < feld.horizon) {
    return { beruehrt_vom_feld: true, horizonterreicht: true };
  }

  const weicher_rand = Math.min(1, (feld.radius - abstand) / (feld.radius * 0.2));
  const randgewichtung = Math.sin(weicher_rand * Math.PI / 2);
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

  koerper.vx += (richtung_x - richtung_y * tangentiale_verdrehung) * feldbeschleunigung * delta_zeit_in_sekunden;
  koerper.vy += (richtung_y + richtung_x * tangentiale_verdrehung) * feldbeschleunigung * delta_zeit_in_sekunden;
  koerper.x += koerper.vx * delta_zeit_in_sekunden;
  koerper.y += koerper.vy * delta_zeit_in_sekunden;

  return {
    beruehrt_vom_feld: true,
    horizonterreicht: false,
    aktuelle_beschleunigung: feldbeschleunigung,
    abstand_zum_kern: abstand,
  };
}
