#!/usr/bin/env node
/**
 * Внешний прогон самодиагностики Elite Tour USA.
 *
 *   node check.mjs                      # проверяет опубликованный сайт
 *   node check.mjs http://localhost:8412   # или локальный
 *
 * Что делает:
 *   1) обходит все адреса из sitemap.xml и проверяет коды ответа;
 *   2) открывает /diag.html?auto=1 в headless Chrome — стенд сам прогоняет
 *      страницы в ифреймах на шести ширинах и отдаёт JSON;
 *   3) печатает человеческий отчёт и кладёт его в diag-report.json;
 *   4) код выхода: 0 — чисто, 1 — есть замечания, 2 — критические проблемы.
 *
 * Код выхода нужен, чтобы прогон можно было повесить на расписание и заметить
 * поломку, не открывая сайт руками.
 */

import { writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const SITE = (process.argv[2] || 'https://damonbogdan.github.io/elitetourusa').replace(/\/$/, '');

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => existsSync(p));

const C = { ok: '\x1b[32m', bad: '\x1b[31m', warn: '\x1b[33m', dim: '\x1b[2m', off: '\x1b[0m' };

async function httpPass() {
  const xml = await fetch(`${SITE}/sitemap.xml`).then((r) => (r.ok ? r.text() : '')).catch(() => '');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  // sitemap хранит боевой домен — проверяем те же пути на текущем адресе
  const paths = urls.length ? urls.map((u) => new URL(u).pathname) : ['/'];
  const bad = [];
  for (const p of paths) {
    try {
      const r = await fetch(SITE + p, { redirect: 'follow' });
      if (!r.ok) bad.push({ path: p, status: r.status });
    } catch (e) {
      bad.push({ path: p, status: e.message });
    }
  }
  return { total: paths.length, bad };
}

function runHarness() {
  if (!CHROME) return { error: 'не найден Chrome — прогон в браузере пропущен' };
  let dom = '';
  try {
    dom = execFileSync(CHROME, [
      '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      '--virtual-time-budget=90000', '--window-size=1500,1200',
      '--dump-dom', `${SITE}/diag.html?auto=1`,
    ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    return { error: 'Chrome не отработал: ' + e.message };
  }

  const m = dom.match(/<pre id="raw"[^>]*>([\s\S]*?)<\/pre>/);
  if (!m || !m[1].trim()) return { error: 'стенд не отдал отчёт (diag.html не догрузился?)' };
  const json = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  try { return JSON.parse(json); } catch (e) { return { error: 'не разобрал отчёт: ' + e.message }; }
}

/* ---------- запуск ---------- */

console.log(`\nElite Tour USA — проверка ${SITE}\n${'─'.repeat(58)}`);

const http = await httpPass();
if (http.bad.length) {
  console.log(`${C.bad}✖ Коды ответа: ${http.bad.length} из ${http.total} страниц недоступны${C.off}`);
  http.bad.forEach((b) => console.log(`   ${b.path} → ${b.status}`));
} else {
  console.log(`${C.ok}✔ Все ${http.total} страниц отдают 200${C.off}`);
}

const harness = runHarness();
let critical = http.bad.length, warnings = 0;

if (harness.error) {
  console.log(`${C.warn}▲ Прогон в браузере: ${harness.error}${C.off}`);
  warnings++;
} else {
  critical += harness.critical;
  warnings += harness.warnings;
  const line = harness.critical ? C.bad + '✖' : harness.warnings ? C.warn + '▲' : C.ok + '✔';
  console.log(`${line} Прогон в браузере: ${harness.runs} комбинаций страница×ширина, ` +
              `критических ${harness.critical}, замечаний ${harness.warnings}${C.off}`);

  for (const r of harness.results) {
    const fails = r.checks.filter((c) => !c.ok);
    if (!fails.length) continue;
    console.log(`\n   ${r.url} @ ${r.width}px`);
    for (const f of fails) {
      console.log(`     ${f.crit ? C.bad + '✖' : C.warn + '▲'} ${f.title}${C.off}` +
                  (f.info ? `\n        ${C.dim}${f.info}${C.off}` : ''));
    }
  }
}

const report = { at: new Date().toISOString(), site: SITE, http, harness, critical, warnings };
writeFileSync(join(import.meta.dirname, 'diag-report.json'), JSON.stringify(report, null, 2));

console.log(`\n${'─'.repeat(58)}`);
if (critical) console.log(`${C.bad}ИТОГ: сайт показывается неправильно — критических проблем ${critical}.${C.off}`);
else if (warnings) console.log(`${C.warn}ИТОГ: работает, но есть замечания (${warnings}).${C.off}`);
else console.log(`${C.ok}ИТОГ: всё чисто.${C.off}`);
console.log(`${C.dim}Подробности: diag-report.json${C.off}\n`);

process.exit(critical ? 2 : warnings ? 1 : 0);
