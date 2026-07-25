/* Elite Tour USA — самодиагностика страницы.
 *
 * Ничего никуда не отправляет сам по себе и ничего не показывает обычному
 * посетителю. Работает так:
 *   • всегда — молча копит ошибки JS в window.__ETU_ERRORS;
 *   • window.__ETU_DIAG.run() — прогоняет проверки и возвращает отчёт;
 *   • ?diag=1 в адресе — показывает отчёт панелью прямо на странице;
 *   • /diag.html — стенд, который прогоняет сайт на разных ширинах.
 *
 * Проверяется то, из-за чего сайт реально может «поехать»: не подгрузился CSS
 * или шрифт, упал JS (и весь контент остался невидимым), битые картинки,
 * горизонтальный скролл, пустой каталог, сломанные ссылки на WhatsApp.
 */
(function (w, d) {
  'use strict';

  /* Ошибки ловим как можно раньше — до всех проверок. */
  var ERRORS = (w.__ETU_ERRORS = w.__ETU_ERRORS || []);
  w.addEventListener('error', function (e) {
    ERRORS.push({
      kind: e.message ? 'error' : 'resource',
      text: e.message || ('не загрузился ресурс: ' + ((e.target && (e.target.src || e.target.href)) || '?')),
      at: (e.filename || '') + (e.lineno ? ':' + e.lineno : ''),
    });
  }, true);
  w.addEventListener('unhandledrejection', function (e) {
    ERRORS.push({ kind: 'promise', text: String((e.reason && e.reason.message) || e.reason), at: '' });
  });

  var CHECKS = [

    /* Фон зависит от темы системы, поэтому годятся оба значения --paper. */
    { id: 'css', crit: true, title: 'Таблица стилей применилась', run: function () {
      var bg = getComputedStyle(d.body).backgroundColor;
      var light = 'rgb(242, 237, 227)', dark = 'rgb(20, 18, 14)';
      var ok = bg === light || bg === dark;
      var dm = w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)').matches;
      return {
        ok: ok,
        info: ok ? (dm ? 'тёмная тема' : 'светлая тема')
                 : 'фон body = ' + bg + ', ожидался ' + light + ' или ' + dark + ' — style.css не загрузился',
      };
    }},

    { id: 'js', crit: true, title: 'Скрипт страницы отработал', run: function () {
      var ok = w.__ETU_APP === true;
      return { ok: ok, info: ok ? '' : 'app.js не отметился — меню, фильтры и форма не работают' };
    }},

    /* Ругаемся только на блоки, которые уверенно внутри экрана: у наблюдателя
       снизу отрицательный запас, поэтому у нижней кромки прозрачность — норма. */
    { id: 'reveal', crit: true, title: 'Контент видим (не завис на появлении)', run: function () {
      var stuck = [].filter.call(d.querySelectorAll('.rv'), function (el) {
        var r = el.getBoundingClientRect();
        if (r.height === 0) return false;
        var wellInside = r.top < w.innerHeight * 0.7 && r.bottom > 0;
        return wellInside && parseFloat(getComputedStyle(el).opacity) < 0.05;
      });
      return {
        ok: !stuck.length,
        info: stuck.length ? 'прозрачны: ' + stuck.map(tag).join(', ') : '',
      };
    }},

    { id: 'fonts', crit: false, title: 'Шрифты подгрузились', run: function () {
      if (!d.fonts || !d.fonts.check) return { ok: true, info: 'браузер не умеет проверять' };
      var miss = ['700 16px Unbounded', '400 16px Onest', '400 16px "JetBrains Mono"']
        .filter(function (f) { return !d.fonts.check(f); });
      return { ok: !miss.length, info: miss.length ? 'не подгрузились: ' + miss.join(', ') : '' };
    }},

    { id: 'images', crit: true, title: 'Картинки загрузились', run: function () {
      var broken = [].filter.call(d.images, function (i) { return i.complete && i.naturalWidth === 0; });
      return {
        ok: !broken.length,
        info: broken.length ? 'битые: ' + broken.map(function (i) { return i.getAttribute('src'); }).join(', ') : d.images.length + ' шт.',
      };
    }},

    { id: 'overflow', crit: true, title: 'Нет горизонтального скролла', run: function () {
      var over = d.documentElement.scrollWidth - w.innerWidth;
      return { ok: over <= 1, info: over > 1 ? 'страница шире окна на ' + over + 'px' : '' };
    }},

    { id: 'wide', crit: true, title: 'Ничего не вылезает за правый край', run: function () {
      var lim = w.innerWidth + 1, bad = [];
      [].forEach.call(d.querySelectorAll('main *, header *, footer *'), function (el) {
        if (el.closest('.ticker') || el.closest('.drawer')) return;   /* бегущая строка и меню — за кадром намеренно */
        var r = el.getBoundingClientRect();
        if (r.width && r.right > lim) bad.push(tag(el) + ' (+' + Math.round(r.right - lim) + 'px)');
      });
      return { ok: !bad.length, info: bad.slice(0, 6).join(', ') };
    }},

    /* .filters есть только на главной — на страницах экскурсий сетка карточек
       тоже есть («Ещё направления»), но прайса там нет и быть не должно. */
    { id: 'catalog', crit: true, title: 'Каталог и прайс не пустые', run: function () {
      if (!d.querySelector('.filters')) return { ok: true, info: 'не главная' };
      var cards = d.querySelectorAll('.tour').length, rows = d.querySelectorAll('.prow').length;
      return { ok: cards > 0 && rows > 0, info: cards + ' карточек, ' + rows + ' строк прайса' };
    }},

    { id: 'contacts', crit: true, title: 'Ссылки на связь на месте', run: function () {
      var wa = d.querySelectorAll('a[href*="wa.me/"]').length;
      var tel = d.querySelectorAll('a[href^="tel:"]').length;
      var bad = [].filter.call(d.querySelectorAll('a[href*="wa.me/"]'), function (a) {
        return !/wa\.me\/\d{10,}/.test(a.getAttribute('href'));
      }).length;
      return {
        ok: wa > 0 && tel > 0 && !bad,
        info: bad ? bad + ' ссылок WhatsApp без нормального номера' : 'WhatsApp ×' + wa + ', телефон ×' + tel,
      };
    }},

    { id: 'prices', crit: false, title: 'Цены отрисовались', run: function () {
      if (!d.querySelector('.filters')) return { ok: true, info: 'не главная' };
      var withPrice = [].filter.call(d.querySelectorAll('.price b'), function (b) { return /\$\d/.test(b.textContent); });
      return { ok: withPrice.length >= 8, info: withPrice.length + ' карточек с ценой (ожидалось ≥ 8)' };
    }},

    { id: 'title', crit: false, title: 'Заголовок и описание заполнены', run: function () {
      var t = (d.title || '').trim();
      var m = d.querySelector('meta[name="description"]');
      var desc = m ? (m.content || '').trim() : '';
      return { ok: t.length > 10 && desc.length > 40, info: 'title ' + t.length + ' симв., description ' + desc.length };
    }},

    { id: 'errors', crit: true, title: 'Нет ошибок JavaScript', run: function () {
      return {
        ok: !ERRORS.length,
        info: ERRORS.slice(0, 4).map(function (e) { return e.text + (e.at ? ' @' + e.at : ''); }).join(' | '),
      };
    }},
  ];

  function tag(el) {
    var c = (el.className || '').toString().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    return el.tagName.toLowerCase() + (c ? '.' + c : '');
  }

  function run() {
    var res = CHECKS.map(function (c) {
      var o;
      try { o = c.run(); } catch (err) { o = { ok: false, info: 'проверка упала: ' + err.message }; }
      return { id: c.id, title: c.title, crit: !!c.crit, ok: !!o.ok, info: o.info || '' };
    });
    var fails = res.filter(function (r) { return !r.ok; });
    return {
      url: location.pathname + location.search,
      width: w.innerWidth,
      height: w.innerHeight,
      ua: navigator.userAgent,
      checks: res,
      failed: fails.length,
      critical: fails.filter(function (r) { return r.crit; }).length,
      ok: fails.length === 0,
    };
  }

  w.__ETU_DIAG = { run: run, checks: CHECKS };

  /* Панель по ?diag=1 — чтобы посмотреть глазами прямо на странице. */
  function panel() {
    var r = run();
    var box = d.createElement('div');
    box.setAttribute('style', [
      'position:fixed', 'z-index:9999', 'right:12px', 'top:12px', 'width:min(400px,calc(100vw - 24px))',
      'max-height:calc(100vh - 24px)', 'overflow:auto', 'background:#12130f', 'color:#eee9df',
      'font:12px/1.5 ui-monospace,Menlo,monospace', 'padding:14px 16px', 'border-radius:8px',
      'box-shadow:0 18px 50px rgba(0,0,0,.45)', 'white-space:pre-wrap',
    ].join(';'));
    var head = '<b style="font-size:13px">Самодиагностика — ' + (r.ok ? '✅ всё чисто' : '❌ проблем: ' + r.failed) +
      '</b>\n<span style="opacity:.55">' + r.width + '×' + r.height + ' · ' + r.url + '</span>\n\n';
    box.innerHTML = head + r.checks.map(function (c) {
      var mark = c.ok ? '<span style="color:#4ec77f">✔</span>' : (c.crit ? '<span style="color:#ff6a4d">✖</span>' : '<span style="color:#e2b23c">▲</span>');
      return mark + ' ' + c.title + (c.info ? '\n   <span style="opacity:.6">' + c.info.replace(/</g, '&lt;') + '</span>' : '');
    }).join('\n');
    d.body.appendChild(box);
    box.addEventListener('click', function () { box.remove(); });
  }

  function boot() {
    /* Даём странице догрузить картинки и шрифты, иначе проверки врут. */
    var start = function () { setTimeout(function () {
      if (/[?&]diag=1/.test(location.search)) panel();
      w.__ETU_DIAG_READY = true;
      w.dispatchEvent(new Event('etu-diag-ready'));
    }, 700); };
    if (d.readyState === 'complete') start();
    else w.addEventListener('load', start);
  }
  boot();
})(window, document);
