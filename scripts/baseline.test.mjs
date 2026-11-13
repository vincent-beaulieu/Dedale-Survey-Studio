import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {JSDOM, VirtualConsole} from 'jsdom';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
test('all inline JavaScript parses', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 2);
  for (const [,source] of scripts) new Script(source);
});

test('V6 renders, stays light on a dark OS, navigates, and toggles theme', async () => {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', e => {if(e.type !== 'css-parsing') errors.push(e.message);});
  const dom = new JSDOM(html, {
    url: 'https://studio.example/', runScripts: 'dangerously',
    pretendToBeVisual: true, virtualConsole: console,
    beforeParse(w) {
      w.matchMedia = query => ({matches: query.includes('dark') || query.includes('reduced-motion'), addEventListener(){}, removeEventListener(){}});
      w.IntersectionObserver = class {observe(){} unobserve(){} disconnect(){}};
      w.ResizeObserver = class {observe(){} unobserve(){} disconnect(){}};
      w.scrollTo = () => {};
      w.HTMLElement.prototype.scrollIntoView = () => {};
    }
  });
  try {
    const w = dom.window;
    const settle = () => new Promise(resolve => setTimeout(resolve, 80));
    await settle();
    assert.equal(w.document.documentElement.dataset.theme, 'light');
    assert.ok(w.document.querySelector('#main').textContent.trim().length > 100);
    w.document.querySelector('#themeBtn').click();
    assert.equal(w.document.documentElement.dataset.theme, 'dark');
    w.document.querySelector('#themeBtn').click();
    assert.equal(w.document.documentElement.dataset.theme, 'light');
    const routes = [...new Set([...w.document.querySelectorAll('a[href^="#/"]')].map(a => a.getAttribute('href')))];
    assert.ok(routes.length >= 3);
    for (const route of routes) {
      w.location.hash = route;
      await settle();
      assert.ok(w.document.querySelector('#main').textContent.trim(), route);
    }
    assert.deepEqual(errors, []);
  } finally {dom.window.close();}
});
