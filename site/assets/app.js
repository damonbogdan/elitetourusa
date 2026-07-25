/* Elite Tour USA — минимум JS: без библиотек, без блокирующих запросов. */
(function () {
  'use strict';

  var body = document.body;

  /* Отметка для самодиагностики + снятие «страховочного таймера»: если этот
     файл не загрузится, инлайн-скрипт в <head> сам уберёт класс js через 4 с,
     и контент, скрытый до анимации появления, всё равно станет видимым. */
  window.__ETU_APP = true;
  clearTimeout(window.__ETU_BOOT);

  /* --- шапка: прозрачная над героем, плотная при скролле --- */
  var hdr = document.querySelector('.hdr');
  var hero = document.querySelector('.hero, .thero');
  if (hdr) {
    var solidAfter = function () {
      return hero ? hero.offsetHeight - 90 : 40;
    };
    var onScroll = function () {
      hdr.classList.toggle('is-solid', window.scrollY > solidAfter());
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  /* --- мобильное меню --- */
  var burger = document.querySelector('.burger');
  var drawer = document.querySelector('.drawer');
  if (burger && drawer) {
    var setMenu = function (open) {
      body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () {
      setMenu(!body.classList.contains('menu-open'));
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  /* --- фильтр каталога --- */
  var filters = document.querySelector('.filters');
  if (filters) {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.tour[data-cat]'));

    var applyFilter = function (cat) {
      filters.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.cat === cat));
      });
      cards.forEach(function (c) {
        c.classList.toggle('is-hidden', cat !== 'all' && c.dataset.cat !== cat);
      });
    };

    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-cat]');
      if (btn) applyFilter(btn.dataset.cat);
    });

    /* карточки категорий сразу включают нужный фильтр */
    document.querySelectorAll('.cat[data-jump]').forEach(function (card) {
      card.addEventListener('click', function () { applyFilter(card.dataset.jump); });
    });

    /* прямая ссылка вида /#tours&cat=nature */
    var m = location.hash.match(/cat=([a-z]+)/);
    if (m) applyFilter(m[1]);
  }

  /* --- появление блоков при скролле --- */
  var revealables = document.querySelectorAll('.rv');
  if (revealables.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealables.forEach(function (el) { io.observe(el); });
    } else {
      revealables.forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* --- форма: собирает готовое сообщение и уводит в WhatsApp --- */
  var form = document.querySelector('form[data-wa]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var val = function (k) { return (d.get(k) || '').toString().trim(); };
      var lines = ['Здравствуйте! Пишу с сайта.'];
      if (val('name'))  lines.push('Меня зовут: ' + val('name'));
      if (val('tour'))  lines.push('Интересует: ' + val('tour'));
      if (val('dates')) lines.push('Даты: ' + val('dates'));
      if (val('people'))lines.push('Нас: ' + val('people'));
      if (val('note'))  lines.push('Пожелания: ' + val('note'));
      var url = 'https://wa.me/' + form.dataset.wa + '?text=' + encodeURIComponent(lines.join('\n'));
      window.open(url, '_blank', 'noopener');
      var ok = form.querySelector('[data-ok]');
      if (ok) ok.hidden = false;
    });
  }

  /* --- видео: плеер YouTube подгружается только по клику --- */
  document.querySelectorAll('.ytv[data-yt]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + b.dataset.yt + '?autoplay=1&rel=0';
      f.title = b.getAttribute('aria-label') || 'Видео';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      f.loading = 'lazy';
      var box = document.createElement('div');
      box.className = 'ytv ytv--live';
      box.appendChild(f);
      b.replaceWith(box);
    });
  });

  /* --- год в подвале --- */
  var y = document.querySelector('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
})();
