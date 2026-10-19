// Temporary: how Firefox measures the score's text in a worker and on the page.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

test('diag fonts', async ({ page, browserName }) => {
  const logs: string[] = [];
  page.on('console', m => logs.push(`page ${m.type()}: ${m.text()}`));
  page.on('worker', w =>
    w.on('console', m => logs.push(`worker ${w.url().split('/').pop()} ${m.type()}: ${m.text()}`)),
  );
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/rendering/text-collisions.atex')]);
  await expectScore(page);
  await page.waitForTimeout(1500);
  const gelasio = readdirSync(join(import.meta.dirname, '..', 'dist', 'assets'))
    .filter(name => /^gelasio-latin(-ext)?-(400|700)-(normal|italic)-.*\.woff2$/.test(name))
    .map(name => `/assets/${name}`);
  const report = await page.evaluate(async gelasio => {
    const out: Record<string, unknown> = {};
    const text = [...document.querySelectorAll<SVGTextElement>('.ot-scroll:not([hidden]) svg text')].find(
      t => t.textContent.trim() === 'Moderate',
    );
    if (text === undefined) return { error: 'no Moderate' };
    const style = getComputedStyle(text);
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    out['font'] = font;
    out['raw'] = JSON.stringify(text.textContent);
    out['svgLength'] = text.getComputedTextLength();
    const siblings = [...(text.ownerSVGElement?.querySelectorAll('text') ?? [])];
    const index = siblings.indexOf(text);
    out['engineMeasured'] = siblings
      .slice(index, index + 3)
      .map(t => `${JSON.stringify(t.textContent)}@${t.getAttribute('x')}`);
    const c = document.createElement('canvas').getContext('2d');
    if (c !== null) {
      c.font = font;
      out['pageCanvas'] = [c.measureText('Moderate').width, c.measureText('Moderate ').width];
    }
    out['pageFaces'] = [...document.fonts]
      .filter(f => f.family.includes('Georgia'))
      .map(f => `${f.weight} ${f.style} ${f.status}`);
    const urls = performance
      .getEntriesByType('resource')
      .map(e => e.name)
      .filter(n => n.includes('.woff2'));
    out['urls'] = urls.map(u => u.split('/').pop());
    const source = `
      self.onmessage = async e => {
        const { font, urls, mode } = e.data;
        const c = new OffscreenCanvas(1, 1).getContext('2d');
        c.font = font;
        const before = e.data.skipBefore ? null : [c.measureText('Moderate').width, c.measureText('Moderate ').width];
        const faces = [];
        for (const url of urls) {
          const m = /-(400|700)-(normal|italic)/.exec(url);
          if (mode === 'bold-only' && m[1] !== '700') continue;
          if (mode === 'all-with-local') {
            const local = new FontFace('Georgia', "local('Georgia')", { weight: m[1], style: m[2] });
            self.fonts.add(local);
            faces.push(local);
          }
          const face = new FontFace('Georgia', "local('Georgia'), url(" + url + ") format('woff2')", { weight: m[1], style: m[2] });
          self.fonts.add(face);
          faces.push(face);
        }
        const statuses = [];
        for (const face of faces) statuses.push(await face.load().then(() => 'loaded', err => String(err)));
        const d = new OffscreenCanvas(1, 1).getContext('2d');
        d.font = font;
        const after = [d.measureText('Moderate').width, d.measureText('Moderate ').width];
        self.postMessage({ hasFonts: 'fonts' in self, before, after, statuses });
      };`;
    const run = (mode: string) =>
      new Promise(resolve => {
        const worker = new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
        worker.onmessage = e => resolve(e.data);
        worker.onerror = e => resolve('error ' + e.message);
        worker.postMessage({ skipBefore: true, font, urls: gelasio.map(u => location.origin + u), mode });
      });
    out['worker-all'] = await run('all');
    out['worker-bold-only'] = await run('bold-only');
    out['worker-all-with-local'] = await run('all-with-local');
    return out;
  }, gelasio);
  console.log(`DIAG ${browserName} ${JSON.stringify(report)}`);
  console.log(`DIAGLOGS ${browserName} ${JSON.stringify(logs.filter(l => !l.includes('Service Worker')))}`);
  expect(report).toBeTruthy();
});
