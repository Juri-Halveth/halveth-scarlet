import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const guard = readFileSync(new URL('../assets/entry-scroll.js', import.meta.url), 'utf8').replace(/\r\n?/g, '\n');
const guardHash = 'sha256-' + createHash('sha256').update(guard).digest('base64');

// Shared by source generation and publication. Restrictive documents permit only
// this exact local guard, rather than widening their policy to arbitrary scripts.
export function entryPolicy(html, relative) {
  let clean = html.replace(/<!-- ENTRY_SCROLL_START -->[\s\S]*?<!-- ENTRY_SCROLL_END -->/g, '');
  let head = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(clean);
  if (!head) throw new Error(`Missing document head: ${relative}`);
  const policies = [...head[1].matchAll(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]*)"[^>]*>/gi)];
  let inline = false;
  for (const [meta, policy] of policies) {
    const script = /(?:^|;)\s*script-src\s+([^;]+)/i.exec(policy)?.[1];
    const fallback = /(?:^|;)\s*default-src\s+([^;]+)/i.exec(policy)?.[1];
    if ((script ?? fallback)?.trim() === "'none'" || meta.includes('data-entry-scroll-csp')) {
      inline = true;
      const directive = "script-src '" + guardHash + "'";
      const updated = script ? policy.replace(/(^|;)\s*script-src\s+[^;]+/i, '$1 ' + directive) : policy + '; ' + directive;
      const bound = meta.replace('content="' + policy + '"', 'content="' + updated + '"');
      clean = clean.replace(meta, bound.includes('data-entry-scroll-csp') ? bound : bound.replace('<meta ', '<meta data-entry-scroll-csp="hash-pinned" '));
    }
  }
  head = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(clean);
  const prefix = '../'.repeat(relative.split('/').length - 1);
  const application = ['entities/index.html', 'forschung/ashbound/index.html'].includes(relative);
  const fragment = application ? ' data-entry-fragments="application"' : '';
  const tag = '<!-- ENTRY_SCROLL_START -->' + (inline
    ? '<script' + fragment + '>' + guard + '</script>'
    : '<script src="' + prefix + 'assets/entry-scroll.js"' + fragment + '></script>') + '<!-- ENTRY_SCROLL_END -->';
  const boundaries = [...head[1].matchAll(/<meta\b[^>]*(?:charset\s*=|http-equiv=["']Content-Security-Policy["'])[^>]*>/gi)];
  const after = boundaries.length ? boundaries.at(-1).index + boundaries.at(-1)[0].length : 0;
  const offset = head.index + head[0].indexOf('>') + 1 + after;
  return clean.slice(0, offset) + tag + clean.slice(offset);
}
