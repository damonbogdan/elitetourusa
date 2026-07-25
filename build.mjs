#!/usr/bin/env node
/**
 * Сборка сайта Elite Tour USA.
 *
 *   node build.mjs
 *
 * Читает data/site.json и генерирует статические страницы в site/:
 *   site/index.html               — главная
 *   site/tury/<slug>/index.html   — страница каждой экскурсии
 *   site/sitemap.xml, site/robots.txt
 *
 * Всё содержимое правится в data/site.json, вёрстка — здесь.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'site');
const S = JSON.parse(readFileSync(join(ROOT, 'data', 'site.json'), 'utf8'));
const B = S.brand;

/* ---------- утилиты ---------- */

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const wa = (text) => `https://wa.me/${B.whatsapp}?text=${encodeURIComponent(text)}`;

const priceOf = (t) => (t.price ? `${t.priceFrom ? 'от ' : ''}$${t.price}` : 'По запросу');

const catTitle = (id) => (S.categories.find((c) => c.id === id) || {}).title || '';

/* Настоящее фото гида подставляется само, как только файл появится. */
const hasGuidePhoto = existsSync(join(OUT, 'assets', 'img', 'guide.jpg'));

const write = (rel, html) => {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, html.trim() + '\n', 'utf8');
  return p;
};

/* ---------- иконки ---------- */

const ICON = {
  wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.17 8.17 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.79.97-.14.16-.29.19-.54.06-.25-.12-1.05-.38-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.09-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.88 2.35 1 2.51c.12.17 1.72 2.63 4.17 3.69.58.25 1.04.4 1.39.51.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29Z"/></svg>',
  tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2Z"/></svg>',
  yt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 12s0-3.6-.5-5.3a2.8 2.8 0 0 0-2-2C18.8 4.2 12 4.2 12 4.2s-6.8 0-8.5.5a2.8 2.8 0 0 0-2 2C1 8.4 1 12 1 12s0 3.6.5 5.3c.3 1 1 1.7 2 2 1.7.5 8.5.5 8.5.5s6.8 0 8.5-.5a2.8 2.8 0 0 0 2-2C23 15.6 23 12 23 12ZM9.8 15.3V8.7l5.7 3.3-5.7 3.3Z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" stroke="none"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

/* ---------- общие блоки ---------- */

const NAV = [
  ['#tours', 'Экскурсии'],
  ['#pricing', 'Цены'],
  ['#how', 'Как это работает'],
  ['#about', 'О гиде'],
  ['#faq', 'Вопросы'],
];

const head = ({ title, desc, canonical, image, jsonld }) => `
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F2EDE3">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${canonical.includes('/tury/') ? '../../' : ''}assets/style.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
<script>document.documentElement.className+=" js";window.__ETU_BOOT=setTimeout(function(){document.documentElement.classList.remove("js")},4000)</script>
</head>
<body>`;

const header = (base = '') => `
<header class="hdr">
  <div class="wrap hdr__in">
    <a class="brand" href="${base || '#top'}"><b>ELITE TOUR USA</b><span>${esc(B.cities)}</span></a>
    <nav>${NAV.map(([h, t]) => `<a href="${base}${h}">${esc(t)}</a>`).join('')}</nav>
    <a class="hdr__tel" href="tel:${B.phoneRaw}">${esc(B.phone)}</a>
    <a class="btn btn--wa btn--sm" href="${wa('Здравствуйте! Пишу с сайта — хочу обсудить экскурсию.')}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a>
    <button class="burger" aria-label="Меню" aria-expanded="false"><i></i></button>
  </div>
</header>
<div class="drawer">
  ${NAV.map(([h, t]) => `<a href="${base}${h}">${esc(t)}</a>`).join('\n  ')}
  <div class="drawer__foot">
    <a href="tel:${B.phoneRaw}">${esc(B.phone)}</a>
    <a href="mailto:${B.email}">${esc(B.email)}</a>
    <a href="${B.instagram}" target="_blank" rel="noopener">Instagram · ${esc(B.instagramHandle)}</a>
    <a href="${B.youtube}" target="_blank" rel="noopener">YouTube · ${esc(B.youtubeHandle)}</a>
  </div>
</div>`;

const dock = () => `
<div class="dock">
  <a class="btn btn--wa" href="${wa('Здравствуйте! Пишу с сайта — хочу обсудить экскурсию.')}" target="_blank" rel="noopener">${ICON.wa} Написать</a>
  <a class="btn btn--ghost" href="tel:${B.phoneRaw}">${ICON.tel} Позвонить</a>
</div>`;

const footer = (base = '') => `
<footer>
  <div class="wrap">
    <div class="foot__top">
      <div>
        <a class="brand" href="${base || './'}"><b>ELITE TOUR USA</b><span>${esc(B.cities)}</span></a>
        <p style="max-width:34ch;margin-top:16px;font-size:14px;line-height:1.6">
          Частные экскурсии по США на русском языке. Гид — ${esc(B.guide)}, Лос-Анджелес.
        </p>
      </div>
      <div class="foot__cols">
        <div class="foot__col">
          <h4>Экскурсии</h4>
          ${S.tours.filter((t) => t.featured).slice(0, 5)
            .map((t) => `<a href="${base}tury/${t.slug}/">${esc(t.title)}</a>`).join('\n          ')}
          <a href="${base}#tours">Все направления</a>
        </div>
        <div class="foot__col">
          <h4>Связь</h4>
          <a href="tel:${B.phoneRaw}">${esc(B.phone)}</a>
          <a href="${wa('Здравствуйте! Пишу с сайта.')}" target="_blank" rel="noopener">WhatsApp</a>
          <a href="mailto:${B.email}">${esc(B.email)}</a>
        </div>
        <div class="foot__col">
          <h4>Соцсети</h4>
          <a href="${B.instagram}" target="_blank" rel="noopener">Instagram</a>
          <a href="${B.youtube}" target="_blank" rel="noopener">YouTube</a>
        </div>
      </div>
    </div>
    <div class="foot__bot">
      <span>© <span data-year>2026</span> Elite Tour USA</span>
      <span>${esc(B.cities)}</span>
    </div>
  </div>
</footer>
${dock()}
<script src="${base}assets/app.js" defer></script>
<script src="${base}assets/diag.js" defer></script>
</body>
</html>`;

/* ---------- карточка экскурсии ---------- */

const tourCard = (t) => `
<article class="tour rv" data-cat="${t.cat}">
  <a class="tour__ph" href="tury/${t.slug}/" aria-label="${esc(t.title)}">
    <img src="assets/img/${t.img}.jpg" alt="${esc(t.title)}" loading="lazy" width="1100" height="733">
    <span class="tour__tag">${esc(catTitle(t.cat))}</span>
  </a>
  <div class="tour__body">
    <div class="tour__meta"><span>${esc(t.city)}</span><span>${esc(t.duration)}</span></div>
    <h3><a href="tury/${t.slug}/">${esc(t.title)}</a></h3>
    <p>${esc(t.short)}</p>
    <div class="tour__foot">
      <span class="price${t.price ? '' : ' price--ask'}">
        <b>${priceOf(t)}</b>
        <small>${esc(t.price ? t.priceNote : 'считаю под ваш запрос')}</small>
      </span>
      <a class="btn btn--ghost btn--sm" href="tury/${t.slug}/">Подробно ${ICON.arrow}</a>
    </div>
  </div>
</article>`;

/* ---------- главная ---------- */

function buildIndex() {
  const withPrice = S.tours.filter((t) => t.price);
  const onRequest = S.tours.filter((t) => !t.price);

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: B.name,
    description: 'Частные экскурсии по США на русском языке с гидом Геннадием Котлярчуком.',
    url: B.domain,
    telephone: B.phoneRaw,
    email: B.email,
    image: `${B.domain}/assets/img/hero.jpg`,
    areaServed: ['Los Angeles', 'San Diego', 'Las Vegas', 'Grand Canyon', 'Miami'],
    address: { '@type': 'PostalAddress', addressLocality: 'Los Angeles', addressRegion: 'CA', addressCountry: 'US' },
    sameAs: [B.instagram, B.youtube],
    employee: { '@type': 'Person', name: B.guide, jobTitle: 'Гид' },
    makesOffer: withPrice.map((t) => ({
      '@type': 'Offer',
      name: t.title,
      price: t.price,
      priceCurrency: 'USD',
      url: `${B.domain}/tury/${t.slug}/`,
      description: t.short,
    })),
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: S.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return `
${head({
    title: 'Elite Tour USA — частные экскурсии по США на русском языке | Гид Геннадий Котлярчук',
    desc: 'Частные экскурсии по Лос-Анджелесу, Сан-Диего, Лас-Вегасу и Гранд-Каньону на русском языке. Цена за группу 1–3 человека, от $350. Трансфер от отеля включён.',
    canonical: B.domain + '/',
    image: B.domain + '/assets/img/hero.jpg',
    jsonld,
  })}
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
${header()}

<main id="top">

  <section class="hero">
    <div class="hero__bg">
      <img src="assets/img/hero.jpg" alt="Побережье Калифорнии на закате" width="2000" height="1125" fetchpriority="high">
    </div>
    <div class="wrap hero__in">
      <p class="label">Лос-Анджелес · Сан-Диего · Лас-Вегас · Гранд-Каньон</p>
      <h1 class="h-display h1">Америка<br>на русском.<br>Без автобуса<br>и толпы.</h1>
      <div class="hero__row">
        <div>
          <p class="hero__copy">
            Меня зовут ${esc(B.guideShort)}, я живу в Лос-Анджелесе и вожу частные экскурсии
            по Калифорнии и Неваде. Заберу от отеля на своей машине и покажу город так,
            как показывал бы друзьям. Цена — за группу, а не за каждого человека.
          </p>
          <div class="hero__cta">
            <a class="btn btn--wa" href="${wa('Здравствуйте! Пишу с сайта. Хочу подобрать экскурсию.')}" target="_blank" rel="noopener">${ICON.wa} Написать в WhatsApp</a>
            <a class="btn btn--light" href="#tours">Экскурсии и цены</a>
          </div>
        </div>
      </div>
      <ul class="hero__facts">
        <li>от $350 за группу 1–3 человека</li>
        <li>трансфер от отеля включён</li>
        <li>консультант «Орла и Решки»</li>
        <li>маршрут собирается под вас</li>
      </ul>
    </div>
  </section>

  <div class="ticker" aria-hidden="true">
    <div class="ticker__track">
      ${[0, 1].map(() => `<span>Голливуд</span><span>Гранд-Каньон</span><span>Санта-Моника</span><span>Лас-Вегас</span><span>Диснейленд</span><span>Ла-Хойя</span><span>Universal Studios</span><span>Долина Смерти</span><span>Родео Драйв</span><span>Венис-Бич</span>`).join('')}
    </div>
  </div>

  <section class="facts">
    <div class="wrap">
      <div class="facts__grid rv">
        <div>
          <span class="facts__n">1–3</span>
          <div class="facts__t">Цена за группу</div>
          <p class="facts__d">Втроём платите столько же, сколько один. Не за человека.</p>
        </div>
        <div>
          <span class="facts__n">0</span>
          <div class="facts__t">Автобусов и толп</div>
          <p class="facts__d">Только вы и я. Темп, остановки и паузы — ваши.</p>
        </div>
        <div>
          <span class="facts__n">RU</span>
          <div class="facts__t">Всё на русском</div>
          <p class="facts__d">От первого сообщения в WhatsApp до последнего дня поездки.</p>
        </div>
        <div>
          <span class="facts__n">TV</span>
          <div class="facts__t">«Орёл и Решка»</div>
          <p class="facts__d">Консультант передач «Орёл и Решка» и «Проводник».</p>
        </div>
      </div>
    </div>
  </section>

  <section class="cats" id="cats">
    <div class="wrap">
      <div class="sec-head rv">
        <div>
          <p class="label">С чего начать</p>
          <h2 class="h-display h2">Выберите настроение поездки</h2>
        </div>
        <p>Пять понятных направлений вместо списка из шестнадцати пунктов. Внутри каждого — конкретные маршруты с ценой и длительностью.</p>
      </div>
      <div class="cats__grid">
        ${S.categories.map((c, i) => `
        <a class="cat rv" href="#tours" data-jump="${c.id}">
          <img class="cat__ph" src="assets/img/${c.img}.jpg" alt="" aria-hidden="true" loading="lazy" width="1100" height="733">
          <span class="cat__i">${String(i + 1).padStart(2, '0')}</span>
          <h3>${esc(c.title)}</h3>
          <p>${esc(c.desc)}</p>
          <span class="cat__go">Смотреть →</span>
        </a>`).join('')}
      </div>
    </div>
  </section>

  <section id="tours">
    <div class="wrap">
      <div class="sec-head rv">
        <div>
          <p class="label">Каталог</p>
          <h2 class="h-display h2">${S.tours.length} направлений</h2>
        </div>
        <p>Готовые программы — это отправная точка. Любую можно сократить, растянуть на два дня или собрать из кусочков нескольких.</p>
      </div>
      <div class="filters rv">
        <button data-cat="all" aria-pressed="true">Все</button>
        ${S.categories.map((c) => `<button data-cat="${c.id}" aria-pressed="false">${esc(c.title)}</button>`).join('\n        ')}
      </div>
      <div class="grid">
        ${S.tours.map(tourCard).join('')}
      </div>
    </div>
  </section>

  <section class="pricing" id="pricing">
    <div class="wrap">
      <div class="sec-head rv">
        <div>
          <p class="label">Прайс-лист</p>
          <h2 class="h-display h2">Цены целиком,<br>без «уточняйте»</h2>
        </div>
        <p>Стоимость указана за группу 1–3 человека. Трансфер от отеля и парковки уже входят — отдельно за дорогу платить не нужно.</p>
      </div>
      <div class="ptable rv">
        ${withPrice.map((t) => `
        <a class="prow" href="tury/${t.slug}/">
          <div class="prow__t">${esc(t.title)}<small>${esc(t.city)}</small></div>
          <div class="prow__d">${esc(t.duration)}</div>
          <div class="prow__inc">Входит: ${esc(t.included.join(' · '))}</div>
          <div class="prow__p">${priceOf(t)}<small>${esc(t.priceNote)}</small></div>
        </a>`).join('')}
        ${onRequest.map((t) => `
        <a class="prow" href="tury/${t.slug}/">
          <div class="prow__t">${esc(t.title)}<small>${esc(t.city)}</small></div>
          <div class="prow__d">${esc(t.duration)}</div>
          <div class="prow__inc">Собирается под ваши даты и состав</div>
          <div class="prow__p is-ask">Расчёт<small>после короткого разговора</small></div>
        </a>`).join('')}
      </div>
      <p class="pnote">
        <b>Почему часть маршрутов «по расчёту».</b> Гранд-Каньон, Вегас, экстрим и VIP слишком сильно
        зависят от дат, состава группы и того, что именно вы хотите: вертолёт или джип, один день
        или три. Называть красивую цифру «от», которая потом вырастет втрое, — не мой формат.
        Напишите в WhatsApp пару слов — назову точную сумму и что в неё входит.
        <b> Входные билеты в парки и музеи, а также питание в стоимость экскурсий не входят.</b>
      </p>
    </div>
  </section>

  <section id="how" class="steps">
    <div class="wrap">
      <div class="sec-head rv">
        <div>
          <p class="label">Как это работает</p>
          <h2 class="h-display h2">Четыре шага<br>от сообщения до поездки</h2>
        </div>
        <p>Никаких форм с обязательными полями, личных кабинетов и регистраций. Обычный разговор в мессенджере.</p>
      </div>
      <div class="steps__grid rv">
        ${S.steps.map((s) => `
        <div class="step">
          <span class="step__n">${esc(s.n)}</span>
          <h3>${esc(s.t)}</h3>
          <p>${esc(s.d)}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="about" id="about">
    <div class="wrap about__grid">
      <div class="rv">
        <div class="about__ph">
          ${hasGuidePhoto
            ? `<img src="assets/img/guide.jpg" alt="${esc(B.guide)} на церемонии «Эмми»" loading="lazy">`
            : `<span>Здесь будет<br>фотография Геннадия<br>— положите файл<br>assets/img/guide.jpg</span>`}
        </div>
        ${hasGuidePhoto ? `<p class="about__cap">75-я церемония «Эмми», Лос-Анджелес</p>` : ''}
      </div>
      <div class="rv">
        <p class="label">О гиде</p>
        <h2 class="h-display h2">${esc(B.guide)}</h2>
        <p class="about__quote">«Я помогаю, чтобы мечты становились реальностью»</p>
        <p class="lead">
          Живу в Лос-Анджелесе и работаю гидом в Калифорнии и Неваде. Кроме обычных экскурсий
          мои клиенты ездят на шоппинг-туры, стреляют на стрельбищах, участвуют в воздушных боях
          на настоящих самолётах с инструкторами, летают на вертолёте, рыбачат в океане
          и попадают на шоу и концерты в Лос-Анджелесе и Лас-Вегасе.
        </p>
        <p class="lead">
          Я консультант передач «Орёл и Решка» и «Проводник». Во время экскурсии могу провести
          профессиональную фотосъёмку — после каждой поездки у вас останется память, а не только
          снимки с телефона.
        </p>
        <div class="about__proof">
          <a class="chip" href="${B.youtube}" target="_blank" rel="noopener">${ICON.yt} YouTube · ${esc(B.youtubeHandle)}</a>
          <a class="chip" href="${B.instagram}" target="_blank" rel="noopener">${ICON.ig} Instagram · ${esc(B.instagramHandle)}</a>
          <a class="chip" href="tel:${B.phoneRaw}">${ICON.tel} ${esc(B.phone)}</a>
        </div>
      </div>
    </div>
  </section>

  <section class="reviews">
    <div class="wrap">
      <div class="sec-head rv">
        <div>
          <p class="label label--plain">Отзывы</p>
          <h2 class="h-display h2">Что говорят<br>после поездки</h2>
        </div>
        <p>Отзывы перенесены со старого сайта. Живые видеоотзывы и фото из поездок — на YouTube-канале.</p>
      </div>
      <div class="reviews__grid">
        ${S.reviews.map((r) => `
        <figure class="review rv">
          <span class="review__mark">”</span>
          <p>${esc(r.text)}</p>
          <figcaption class="review__by">${esc(r.name)}</figcaption>
        </figure>`).join('')}
      </div>
    </div>
  </section>

  <section id="extras">
    <div class="wrap">
      <div class="sec-head rv">
        <div>
          <p class="label">Кроме экскурсий</p>
          <h2 class="h-display h2">С чем ещё помогаю</h2>
        </div>
        <p>Это не туры, а сопутствующие задачи, с которыми ко мне обращаются приезжающие и те, кто переезжает.</p>
      </div>
      <ul class="extras__grid rv">
        ${S.extras.map((x) => `<li>${esc(x)}</li>`).join('\n        ')}
      </ul>
    </div>
  </section>

  <section class="faq" id="faq">
    <div class="wrap">
      <div class="sec-head rv">
        <div>
          <p class="label">Вопросы</p>
          <h2 class="h-display h2">Коротко о главном</h2>
        </div>
        <p>Если чего-то здесь нет — просто спросите в WhatsApp, отвечу своими словами.</p>
      </div>
      <div class="faq__list rv">
        ${S.faq.map((f) => `
        <details>
          <summary>${esc(f.q)}</summary>
          <p>${esc(f.a)}</p>
        </details>`).join('')}
      </div>
    </div>
  </section>

  <section class="cta" id="contacts">
    <div class="wrap cta__grid">
      <div class="rv">
        <p class="label">Заявка</p>
        <h2 class="h-display h2">Расскажите,<br>что хотите увидеть</h2>
        <p class="cta__copy">
          Достаточно пары строк: когда приезжаете, сколько вас и что интересно.
          Остальное уточню сам. Форма ниже просто соберёт сообщение и откроет WhatsApp —
          ничего никуда не отправляется без вас.
        </p>
        <div class="cta__direct">
          <p class="cta__or">Или напрямую</p>
          <a class="btn btn--wa btn--block" href="${wa('Здравствуйте! Пишу с сайта.')}" target="_blank" rel="noopener">${ICON.wa} WhatsApp ${esc(B.phone)}</a>
          <a class="btn btn--light btn--block" href="tel:${B.phoneRaw}">${ICON.tel} Позвонить</a>
          <a class="btn btn--light btn--block" href="mailto:${B.email}">${esc(B.email)}</a>
        </div>
      </div>
      <form class="form rv" data-wa="${B.whatsapp}">
        <div class="form__row">
          <label class="field"><span>Как вас зовут</span><input name="name" placeholder="Имя" autocomplete="name"></label>
          <label class="field"><span>Сколько человек</span><input name="people" placeholder="Например: 2 взрослых + ребёнок"></label>
        </div>
        <div class="form__row">
          <label class="field"><span>Даты</span><input name="dates" placeholder="Например: 12–18 марта"></label>
          <label class="field"><span>Экскурсия</span>
            <select name="tour">
              <option value="">Ещё не выбрал(а)</option>
              ${S.tours.map((t) => `<option>${esc(t.title)}</option>`).join('\n              ')}
            </select>
          </label>
        </div>
        <label class="field"><span>Что хочется увидеть</span><textarea name="note" placeholder="Свободной форме: повод, интересы, темп, пожелания"></textarea></label>
        <button class="btn btn--wa" type="submit">${ICON.wa} Отправить в WhatsApp</button>
        <p class="form__note" data-ok hidden>Сообщение собрано — окно WhatsApp должно было открыться. Если нет, напишите напрямую: ${esc(B.phone)}.</p>
        <p class="form__note">Данные никуда не отправляются и нигде не сохраняются: кнопка только формирует текст и открывает чат.</p>
      </form>
    </div>
  </section>

</main>
${footer()}`;
}

/* ---------- страница экскурсии ---------- */

function buildTour(t, i) {
  const others = S.tours.filter((x) => x.slug !== t.slug && x.cat === t.cat).slice(0, 3);
  const rest = others.length ? others : S.tours.filter((x) => x.slug !== t.slug).slice(0, 3);
  const waText = `Здравствуйте! Пишу с сайта. Интересует экскурсия «${t.title}».`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: t.title,
    description: t.short,
    url: `${B.domain}/tury/${t.slug}/`,
    image: `${B.domain}/assets/img/${t.img}.jpg`,
    touristType: 'Русскоязычные туристы',
    provider: { '@type': 'TravelAgency', name: B.name, telephone: B.phoneRaw, url: B.domain },
    itinerary: {
      '@type': 'ItemList',
      itemListElement: t.program.map((p, n) => ({ '@type': 'ListItem', position: n + 1, name: p })),
    },
    ...(t.price
      ? { offers: { '@type': 'Offer', price: t.price, priceCurrency: 'USD', availability: 'https://schema.org/InStock' } }
      : {}),
  };

  return `
${head({
    title: `${t.title} — экскурсия на русском | Elite Tour USA`,
    desc: `${t.short} ${t.price ? `${priceOf(t)} ${t.priceNote}.` : 'Стоимость по расчёту.'} Длительность: ${t.duration}.`,
    canonical: `${B.domain}/tury/${t.slug}/`,
    image: `${B.domain}/assets/img/${t.img}.jpg`,
    jsonld,
  })}
${header('../../')}

<main class="tpage">

  <section class="thero">
    <div class="thero__bg">
      <img src="../../assets/img/${t.img}.jpg" alt="${esc(t.title)}" width="1100" height="733" fetchpriority="high">
    </div>
    <div class="wrap">
      <p class="crumbs"><a href="../../">Главная</a> / <a href="../../#tours">Экскурсии</a> / ${esc(catTitle(t.cat))}</p>
      <h1 class="h-display h1">${esc(t.title)}</h1>
    </div>
  </section>

  <section class="tspec" style="padding:0">
    <div class="wrap">
      <div class="tspec__grid">
        <div><div class="tspec__k">Стоимость</div><div class="tspec__v">${priceOf(t)}</div></div>
        <div><div class="tspec__k">${t.price ? 'За кого' : 'Формат'}</div><div class="tspec__v sm">${esc(t.price ? t.priceNote : 'считаю под ваш запрос')}</div></div>
        <div><div class="tspec__k">Длительность</div><div class="tspec__v">${esc(t.duration)}</div></div>
        <div><div class="tspec__k">Где</div><div class="tspec__v sm">${esc(t.city)}</div></div>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap tbody">
      <div class="rv">
        <p class="lead" style="font-size:clamp(17px,2vw,21px);color:var(--ink)">${esc(t.lead)}</p>

        <h2 class="h-display" style="margin-top:44px">Что посмотрим</h2>
        <ul class="plist">
          ${t.program.map((p) => `<li>${esc(p)}</li>`).join('\n          ')}
        </ul>

        ${t.tiers ? `
        <h2 class="h-display" style="margin-top:44px">Два формата</h2>
        <div class="tiers">
          ${t.tiers.map((tier) => `
          <div class="tier">
            <h4>${esc(tier.name)}</h4>
            <ul>${tier.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>
            ${tier.note ? `<p>${esc(tier.note)}</p>` : ''}
          </div>`).join('')}
        </div>` : `
        <div class="inc">
          <div>
            <h3>Входит в стоимость</h3>
            <ul>${t.included.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>
          <div>
            <h3>Оплачивается отдельно</h3>
            <ul class="out">${t.excluded.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>
        </div>`}

        <p class="muted" style="margin-top:34px;font-size:14px;max-width:64ch">
          Программу можно менять: сократить, добавить остановки, подстроить под детей
          или объединить с другой экскурсией. Напишите — соберу маршрут под вас.
        </p>
      </div>

      <aside class="tside rv">
        <div class="tspec__k" style="color:var(--ink-3)">Стоимость</div>
        <div class="tside__p${t.price ? '' : ' is-ask'}">${priceOf(t)}</div>
        <p class="tside__pn">${esc(t.price ? t.priceNote : 'Считаю после короткого разговора — зависит от дат и состава.')}</p>
        <div class="tside__btns">
          <a class="btn btn--wa btn--block" href="${wa(waText)}" target="_blank" rel="noopener">${ICON.wa} Спросить в WhatsApp</a>
          <a class="btn btn--ghost btn--block" href="tel:${B.phoneRaw}">${ICON.tel} ${esc(B.phone)}</a>
        </div>
        <div class="tside__meta">
          <div><span>Длительность</span><b>${esc(t.duration)}</b></div>
          <div><span>Направление</span><b>${esc(t.city)}</b></div>
          <div><span>Язык</span><b>Русский</b></div>
          <div><span>Категория</span><b>${esc(catTitle(t.cat))}</b></div>
        </div>
      </aside>
    </div>
  </section>

  <section class="tnext">
    <div class="wrap">
      <div class="sec-head rv">
        <div>
          <p class="label">Рядом</p>
          <h2 class="h-display h2">Ещё направления</h2>
        </div>
        <p>Многие соединяют две-три экскурсии в один маршрут — так выходит и логичнее, и дешевле.</p>
      </div>
      <div class="grid">
        ${rest.map((o) => tourCard(o).replace(/href="tury\//g, 'href="../').replace(/src="assets\//g, 'src="../../assets/')).join('')}
      </div>
    </div>
  </section>

</main>
${footer('../../')}`;
}

/* ---------- запуск ---------- */

if (existsSync(join(OUT, 'tury'))) rmSync(join(OUT, 'tury'), { recursive: true, force: true });

write('index.html', buildIndex());
S.tours.forEach((t, i) => write(join('tury', t.slug, 'index.html'), buildTour(t, i)));

const urls = ['/', ...S.tours.map((t) => `/tury/${t.slug}/`)];
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${B.domain}${u}</loc><changefreq>monthly</changefreq><priority>${u === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>`
);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${B.domain}/sitemap.xml`);

console.log(`✓ Собрано: 1 главная + ${S.tours.length} страниц экскурсий → site/`);

const toVerify = S.faq.filter((f) => f.verify);
if (toVerify.length) {
  console.log(`\n⚠  ${toVerify.length} ответа(ов) в FAQ написаны по здравому смыслу, а НЕ взяты со старого сайта.`);
  console.log('   Подтвердите их у Геннадия или отредактируйте в data/site.json:');
  toVerify.forEach((f) => console.log(`   • ${f.q}`));
}
if (!existsSync(join(OUT, 'assets', 'img', 'guide.jpg'))) {
  console.log('\n⚠  Нет assets/img/guide.jpg — в блоке «О гиде» стоит заглушка. Положите настоящее фото.');
}
