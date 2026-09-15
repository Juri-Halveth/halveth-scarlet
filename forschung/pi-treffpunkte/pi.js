(() => {
  'use strict';
  const root = document.getElementById('pi-main');
  const map = document.getElementById('earth-map');
  const pointLayer = document.getElementById('map-points');
  const routeLayer = document.getElementById('surface-routes');
  const wrapLayer = document.getElementById('wrap-copies');
  const visual = document.querySelector('.visual');
  const shortPanel = document.getElementById('short-recovery');
  const expectedHash = root.dataset.publicModelSha256.toLowerCase();
  const operatorNames = {
    P: { kind: 'IDENTITY', de: 'Identität', en: 'Identity' },
    Z: { kind: 'EARTH_AXIS_HALF_TURN', de: 'Erdachsen-Halbdrehung', en: 'Earth-axis half-turn' },
    E: { kind: 'EQUATOR_REFLECTION', de: 'Äquatorspiegelung', en: 'Equator reflection' },
    A: { kind: 'ANTIPODE', de: 'Antipode', en: 'Antipode' }
  };
  let model = null;
  let activeOperator = 'P';

  const svg = (name, attrs = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    return node;
  };
  const xy = point => ({ x: (point.longitude + 180) / 360 * 1000, y: (90 - point.latitude) / 180 * 500 });
  const format = point => `≈ ${point.latitude.toFixed(2)}°, ${point.longitude.toFixed(2)}°`;
  const toHex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  const language = () => document.documentElement.lang.startsWith('en') ? 'en' : 'de';

  function pathData(samples) {
    return samples.map((point, index) => {
      const position = xy(point);
      return `${index ? 'L' : 'M'}${position.x.toFixed(2)} ${position.y.toFixed(2)}`;
    }).join(' ');
  }

  function renderModel() {
    routeLayer.replaceChildren(...model.paths.surface.routes.map((route, index) => svg('path', { d: pathData(route.samples), class: `surface-route${index ? ' secondary' : ''}` })));
    pointLayer.replaceChildren(...Object.values(model.points).map(point => {
      const position = xy(point);
      const group = svg('g', { transform: `translate(${position.x} ${position.y})`, 'data-point': point.id });
      const dot = svg('circle', { r: 11, class: `point-dot${point.id === activeOperator ? ' active' : ''}` });
      const label = svg('text', { x: 17, y: -5, class: 'point-label' });
      label.textContent = point.id;
      const coordinates = svg('text', { x: 17, y: 15, class: 'point-coord' });
      coordinates.textContent = format(point);
      group.append(dot, label, coordinates);
      return group;
    }));
    renderWrap();
    setOperator(activeOperator);
  }

  function renderWrap() {
    wrapLayer.replaceChildren();
    if (visual.dataset.viewState !== 'wrap') return;
    for (const offset of [-1000, 1000]) {
      const clone = pointLayer.cloneNode(true);
      clone.removeAttribute('id');
      clone.setAttribute('class', 'wrap-copy');
      clone.setAttribute('transform', `translate(${offset} 0)`);
      wrapLayer.append(clone);
    }
  }

  function setOperator(id) {
    activeOperator = id;
    document.querySelectorAll('[data-operator]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.operator === id)));
    pointLayer.querySelectorAll('.point-dot').forEach(dot => dot.classList.remove('active'));
    pointLayer.querySelector(`[data-point="${id}"] .point-dot`)?.classList.add('active');
    const point = model.points[id];
    const name = operatorNames[id];
    document.getElementById('active-symbol').textContent = id;
    document.getElementById('active-kind').textContent = name.kind;
    document.getElementById('active-title').textContent = name[language()];
    document.getElementById('active-coordinates').textContent = format(point);
  }

  function setView(view) {
    visual.dataset.viewState = view;
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    shortPanel.hidden = view !== 'short';
    map.classList.toggle('world-wrap-active', view === 'wrap');
    renderWrap();
  }

  function setPalette(palette) {
    visual.dataset.paletteState = palette;
    document.querySelectorAll('[data-palette]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === palette)));
  }

  async function load() {
    try {
      const response = await fetch('data/public-model.json', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      const digest = toHex(await crypto.subtle.digest('SHA-256', bytes));
      if (digest !== expectedHash) throw new Error('PUBLIC_MODEL_DIGEST_MISMATCH');
      const decoded = new TextDecoder().decode(bytes);
      const candidate = JSON.parse(decoded);
      if (candidate.schema !== 'geometry-model.v1' || candidate.source?.classification !== 'PUBLIC_ROUNDED' || candidate.publicProjection?.exactLocationRetained !== false || candidate.publicProjection?.locationCodeRetained !== false || candidate.publicProjection?.privateSourcePathsRetained !== false) throw new Error('PUBLIC_MODEL_PRIVACY_CONTRACT_FAILED');
      model = candidate;
      renderModel();
      document.getElementById('model-status').textContent = `${candidate.modelId} · ${language() === 'en' ? 'SHA-256 verified' : 'SHA-256 geprüft'}`;
      document.getElementById('model-digest').textContent = digest.toUpperCase();
      document.getElementById('canon-commit').textContent = root.dataset.canonicalCommit;
    } catch (error) {
      document.getElementById('model-status').textContent = `${language() === 'en' ? 'Dataset not loaded' : 'Datensatz nicht geladen'} · ${error.message}`;
    }
  }

  document.querySelectorAll('[data-operator]').forEach(button => button.addEventListener('click', () => model && setOperator(button.dataset.operator)));
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  document.querySelectorAll('[data-palette]').forEach(button => button.addEventListener('click', () => setPalette(button.dataset.palette)));
  window.addEventListener('halveth:language', () => {
    if (!model) return;
    setOperator(activeOperator);
    document.getElementById('model-status').textContent = `${model.modelId} · ${language() === 'en' ? 'SHA-256 verified' : 'SHA-256 geprüft'}`;
  });
  load();
})();
