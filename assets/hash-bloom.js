(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const schema = 'halveth.hash-membrane.v1';

  function hash32(value) {
    let hash = 0x811c9dc5;
    for (const character of `${schema}|${value}`) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  }

  function layout(ids) {
    const ordered = [...new Set(ids)].sort((left, right) =>
      hash32(left) - hash32(right) || left.localeCompare(right)
    );
    const count = ordered.length;
    const nodes = ordered.map((id, index) => {
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
      const fingerprint = hash32(id);
      const lobe = 176 + 38 * Math.abs(Math.sin(2 * angle));
      const ripple = ((fingerprint >>> 24) / 255 - 0.5) * 9;
      const radius = lobe + ripple;
      return {
        id,
        hash: fingerprint.toString(16).padStart(8, '0'),
        x: 250 + radius * Math.cos(angle),
        y: 250 + radius * 0.86 * Math.sin(angle),
        tone: 155 + (fingerprint % 175)
      };
    });
    const links = [];
    for (let index = 0; index < count; index += 1) {
      for (const offset of [1, 5]) {
        links.push([index, (index + offset) % count]);
      }
    }
    return {nodes, links};
  }

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    return element;
  }

  function ringPath(inset, wobble) {
    const points = [];
    for (let index = 0; index <= 144; index += 1) {
      const angle = (Math.PI * 2 * index) / 144 - Math.PI / 2;
      const radius = 176 - inset + (38 - inset * 0.35) * Math.abs(Math.sin(2 * angle)) + wobble * Math.sin(6 * angle);
      points.push(`${index ? 'L' : 'M'}${(250 + radius * Math.cos(angle)).toFixed(2)} ${(250 + radius * 0.86 * Math.sin(angle)).toFixed(2)}`);
    }
    return `${points.join(' ')} Z`;
  }

  function render() {
    const svg = document.querySelector('#hash-bloom');
    const universe = window.HalvethUniverse;
    if (!svg || !universe?.entities?.length) return;

    const ids = universe.entities.map(entity => entity.id).concat('open-seat');
    const {nodes, links} = layout(ids);
    const rings = svg.querySelector('[data-hash-rings]');
    const linkLayer = svg.querySelector('[data-hash-links]');
    const nodeLayer = svg.querySelector('[data-hash-nodes]');

    for (let index = 0; index < 5; index += 1) {
      rings.append(svgElement('path', {
        class: 'hash-ring',
        d: ringPath(index * 10, index % 2 ? 2.8 : -2.2),
        'pathLength': 100,
        'stroke-dasharray': `${7 + index * 2} ${4 + index}`,
        'style': `--ring-delay:${-index * 2.4}s`
      }));
    }

    for (const [from, to] of links) {
      const start = nodes[from];
      const end = nodes[to];
      linkLayer.append(svgElement('line', {
        class: 'hash-link',
        x1: start.x.toFixed(2),
        y1: start.y.toFixed(2),
        x2: end.x.toFixed(2),
        y2: end.y.toFixed(2)
      }));
    }

    for (const node of nodes) {
      nodeLayer.append(svgElement('circle', {
        class: 'hash-node',
        cx: node.x.toFixed(2),
        cy: node.y.toFixed(2),
        r: 2.15,
        'data-public-id': node.id,
        'data-layout-hash': node.hash,
        'style': `--node-tone:hsl(${node.tone} 86% 76%)`
      }));
    }

    svg.dataset.nodes = String(nodes.length);
    svg.dataset.links = String(links.length);
  }

  const api = Object.freeze({schema, hash32, layout});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.HalvethHashMembrane = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, {once: true});
    else render();
  }
})();
