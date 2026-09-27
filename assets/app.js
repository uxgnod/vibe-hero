/* Vibe Hero — site shell.
   Each page only contains <main class="content"><article class="doc">…</article></main>.
   This script injects the topbar, sidebar, TOC, pager, code blocks and progress tracking. */
(function () {
  'use strict';

  var CHAPTERS = [
    { slug: 'index',         part: 0, zh: '导读：一次范式转换',          en: 'Orientation: A Paradigm Shift' },
    { slug: 'landscape',     part: 0, zh: '生态全景地图',                en: 'The Ecosystem Map' },
    { slug: 'setup',         part: 0, zh: '环境搭建与第一个项目',        en: 'Setup & Your First Project' },
    { slug: 'javascript',    part: 1, zh: 'JavaScript 运行时心智模型',   en: 'The JavaScript Runtime Model' },
    { slug: 'typescript',    part: 1, zh: 'TypeScript 类型系统',         en: 'The TypeScript Type System' },
    { slug: 'web',           part: 2, zh: 'Web 平台基础',                en: 'Web Platform Fundamentals' },
    { slug: 'react',         part: 2, zh: 'React 心智模型',              en: 'Thinking in React' },
    { slug: 'rendering',     part: 2, zh: '渲染模式与元框架',            en: 'Rendering & Meta-Frameworks' },
    { slug: 'backend',       part: 3, zh: '后端、数据与端到端类型',      en: 'Backend, Data & End-to-End Types' },
    { slug: 'deploy',        part: 3, zh: '部署三条路线',                en: 'Three Deployment Paths' },
    { slug: 'engineering',   part: 3, zh: '工程化与质量保障',            en: 'Engineering & Quality' },
    { slug: 'ai-apps',       part: 4, zh: 'AI 应用开发',                 en: 'Building AI Applications' },
    { slug: 'agents',        part: 4, zh: 'Agent 与 Harness',            en: 'Agents & Harnesses' },
    { slug: 'workflow',      part: 5, zh: '驾驭 Coding Agent',           en: 'Driving Coding Agents' },
    { slug: 'system-design', part: 5, zh: '系统设计与面试',              en: 'System Design & Interviews' },
    { slug: 'glossary',      part: 5, zh: '术语表与学习计划',            en: 'Glossary & Study Plan' }
  ];

  var PARTS = {
    zh: ['第一部分 · 起步', '第二部分 · 语言', '第三部分 · 前端', '第四部分 · 全栈', '第五部分 · AI', '第六部分 · 驾驭'],
    en: ['Part 1 · Start', 'Part 2 · Language', 'Part 3 · Frontend', 'Part 4 · Full-Stack', 'Part 5 · AI', 'Part 6 · Mastery']
  };

  var T = {
    zh: {
      brandSub: 'TS 全栈 AI 转型指南', toc: '本页目录', prev: '上一章', next: '下一章',
      markDone: '标记本章为已完成', isDone: '✓ 已完成（点击取消）', copy: '复制', copied: '已复制',
      menu: '目录', theme: '切换明暗', lang: 'English', progress: function (d, t) { return '已完成 ' + d + '/' + t; },
      legend: '<span class="badge deep">原理</span> 必须懂原理<br><span class="badge use">会用</span> 能熟练使用<br><span class="badge aware">知道</span> 知道是什么、何时用',
      foot: '内容基于 2026 年 9 月的生态状态编写。版本号会变化，概念与判断方法不会轻易过时。遇到具体 API 时，以官方文档为准。',
      license: '本作品采用 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" rel="license noopener">CC BY-NC-SA 4.0</a> 许可 · <a href="https://github.com/uxgnod/vibe-hero" rel="noopener">GitHub</a>'
    },
    en: {
      brandSub: 'TS Full-Stack AI Transition Guide', toc: 'On this page', prev: 'Previous', next: 'Next',
      markDone: 'Mark chapter as done', isDone: '✓ Done (click to undo)', copy: 'Copy', copied: 'Copied',
      menu: 'Menu', theme: 'Toggle theme', lang: '中文', progress: function (d, t) { return d + '/' + t + ' done'; },
      legend: '<span class="badge deep">Deep</span> understand the internals<br><span class="badge use">Use</span> use it fluently<br><span class="badge aware">Aware</span> know what & when',
      foot: 'Written against the state of the ecosystem in September 2026. Version numbers will move; the concepts and the judgment calls age slowly. For concrete APIs, the official docs win.',
      license: 'Licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" rel="license noopener">CC BY-NC-SA 4.0</a> · <a href="https://github.com/uxgnod/vibe-hero" rel="noopener">GitHub</a>'
    }
  };

  var html = document.documentElement;
  var LANG = (html.lang || 'en').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
  var t = T[LANG];

  function currentSlug() {
    var p = location.pathname.replace(/\/+$/, '/');
    var last = p.split('/').pop() || 'index.html';
    return last.replace(/\.html?$/, '') || 'index';
  }
  var SLUG = currentSlug();
  var IDX = CHAPTERS.findIndex(function (c) { return c.slug === SLUG; });

  function href(slug) { return slug + '.html'; }
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  function getDone() {
    try { return JSON.parse(store('vh-done') || '[]'); } catch (e) { return []; }
  }
  function setDone(list) { store('vh-done', JSON.stringify(list)); }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var ICONS = {
    logo: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#2f6fbd"/><path d="M8 11h9M12.5 11v12" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M24.5 12.2c-.6-1-1.7-1.5-2.9-1.5-1.6 0-2.8.9-2.8 2.2 0 3.1 6 2 6 5.4 0 1.5-1.4 2.6-3.2 2.6-1.4 0-2.6-.6-3.2-1.7" stroke="#fff" stroke-width="2.3" fill="none" stroke-linecap="round"/><circle cx="26" cy="25.5" r="2.2" fill="#f59e0b"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>'
  };

  /* ---------------- shell ---------------- */
  function buildShell() {
    var main = document.querySelector('main.content');
    if (!main) return;

    var other = LANG === 'zh' ? 'en' : 'zh';
    var top = document.createElement('header');
    top.className = 'topbar';
    top.innerHTML =
      '<button class="icon-btn menu-btn" type="button" aria-label="' + t.menu + '">' + ICONS.menu + '</button>' +
      '<a class="brand" href="' + href('index') + '">' + ICONS.logo + '<span>Vibe Hero</span><small>' + t.brandSub + '</small></a>' +
      '<span class="spacer"></span>' +
      '<span class="progress-pill"></span>' +
      '<a class="icon-btn lang-btn" href="../' + other + '/' + href(SLUG) + '" hreflang="' + (other === 'zh' ? 'zh-CN' : 'en') + '">' + ICONS.globe + '<span>' + t.lang + '</span></a>' +
      '<button class="icon-btn theme-btn" type="button" aria-label="' + t.theme + '" title="' + t.theme + '">' + ICONS.theme + '</button>';

    var layout = document.createElement('div');
    layout.className = 'layout';
    var side = document.createElement('nav');
    side.className = 'sidebar';
    side.setAttribute('aria-label', t.menu);
    var toc = document.createElement('aside');
    toc.className = 'toc';

    main.parentNode.insertBefore(top, main);
    main.parentNode.insertBefore(layout, main);
    layout.appendChild(side);
    layout.appendChild(main);
    layout.appendChild(toc);

    renderSidebar(side);
    renderToc(toc);
    renderPager(main.querySelector('.doc') || main);

    top.querySelector('.menu-btn').addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
    side.addEventListener('click', function (e) { if (e.target.closest('a')) document.body.classList.remove('nav-open'); });
    document.addEventListener('click', function (e) {
      if (document.body.classList.contains('nav-open') && !e.target.closest('.sidebar') && !e.target.closest('.menu-btn')) document.body.classList.remove('nav-open');
    });
    top.querySelector('.theme-btn').addEventListener('click', toggleTheme);
    top.querySelector('.lang-btn').addEventListener('click', function (e) {
      store('vh-lang', other);
      if (location.hash) { e.preventDefault(); location.href = this.getAttribute('href') + location.hash; }
    });
    store('vh-lang', LANG);
    updateProgress();
  }

  function renderSidebar(side) {
    var done = getDone();
    var out = '';
    var lastPart = -1;
    CHAPTERS.forEach(function (c, i) {
      if (c.part !== lastPart) { out += '<div class="part">' + PARTS[LANG][c.part] + '</div>'; lastPart = c.part; }
      out += '<a href="' + href(c.slug) + '"' + (i === IDX ? ' class="active" aria-current="page"' : '') + '>' +
        '<span class="num">' + String(i).padStart(2, '0') + '</span><span>' + c[LANG] + '</span>' +
        (done.indexOf(c.slug) >= 0 ? '<span class="done" title="done">✓</span>' : '') + '</a>';
    });
    out += '<div class="legend">' + t.legend + '</div>';
    side.innerHTML = out;
  }

  function slugify(text, i) {
    var s = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '');
    return s && /^[a-z]/.test(s) ? s.slice(0, 60) : 'sec-' + (i + 1);
  }

  function renderToc(toc) {
    var heads = Array.prototype.slice.call(document.querySelectorAll('.doc h2, .doc h3'));
    var used = {};
    heads.forEach(function (h, i) {
      if (!h.id) { var id = slugify(h.textContent, i); while (used[id]) id += '-x'; h.id = id; }
      used[h.id] = 1;
      var a = document.createElement('a');
      a.className = 'anchor'; a.href = '#' + h.id; a.textContent = '#'; a.setAttribute('aria-hidden', 'true');
      h.appendChild(a);
    });
    var h2s = heads.filter(function (h) { return h.tagName === 'H2'; });
    if (!h2s.length) { toc.remove(); return; }
    toc.innerHTML = '<div class="toc-title">' + t.toc + '</div>' + h2s.map(function (h) {
      return '<a href="#' + h.id + '" data-id="' + h.id + '">' + esc(h.firstChild.textContent.trim()) + '</a>';
    }).join('');
    if ('IntersectionObserver' in window) {
      var links = toc.querySelectorAll('a');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            links.forEach(function (l) { l.classList.toggle('active', l.dataset.id === en.target.id); });
          }
        });
      }, { rootMargin: '-10% 0px -75% 0px' });
      h2s.forEach(function (h) { io.observe(h); });
    }
  }

  function renderPager(doc) {
    if (IDX < 0) return;
    var row = document.createElement('div');
    row.className = 'done-row';
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'done-btn';
    function paint() {
      var d = getDone().indexOf(SLUG) >= 0;
      btn.classList.toggle('is-done', d);
      btn.textContent = d ? t.isDone : t.markDone;
    }
    btn.addEventListener('click', function () {
      var list = getDone(); var i = list.indexOf(SLUG);
      if (i >= 0) list.splice(i, 1); else list.push(SLUG);
      setDone(list); paint(); renderSidebar(document.querySelector('.sidebar')); updateProgress();
    });
    paint();
    row.appendChild(btn);
    doc.appendChild(row);

    var pager = document.createElement('nav');
    pager.className = 'pager';
    var prev = CHAPTERS[IDX - 1], next = CHAPTERS[IDX + 1];
    pager.innerHTML =
      (prev ? '<a class="prev" href="' + href(prev.slug) + '"><small>← ' + t.prev + '</small>' + prev[LANG] + '</a>' : '') +
      (next ? '<a class="next" href="' + href(next.slug) + '"><small>' + t.next + ' →</small>' + next[LANG] + '</a>' : '');
    doc.appendChild(pager);

    var foot = document.createElement('footer');
    foot.className = 'site-foot';
    foot.innerHTML = esc(t.foot) + '<br>' + t.license;
    doc.appendChild(foot);
  }

  function updateProgress() {
    var pill = document.querySelector('.progress-pill');
    if (pill) pill.textContent = t.progress(getDone().filter(function (s) { return CHAPTERS.some(function (c) { return c.slug === s; }); }).length, CHAPTERS.length);
  }

  function toggleTheme() {
    var cur = html.dataset.theme;
    if (!cur) cur = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var nextTheme = cur === 'dark' ? 'light' : 'dark';
    html.dataset.theme = nextTheme;
    store('vh-theme', nextTheme);
  }

  /* ---------------- code blocks ---------------- */
  var KW = ('abstract as async await break case catch class const continue debugger declare default delete do else enum export extends ' +
    'false finally for from function get if implements import in infer instanceof interface is keyof let namespace new null of ' +
    'private protected public readonly return satisfies set static super switch this throw true try type typeof undefined unique var void while with yield').split(' ');
  var KWSET = {}; KW.forEach(function (k) { KWSET[k] = 1; });
  var BUILTIN_TYPES = { string: 1, number: 1, boolean: 1, unknown: 1, any: 1, never: 1, object: 1, bigint: 1, symbol: 1 };

  function highlightTS(src, jsx) {
    var re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^\\`])*`|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|(\b\d[\d_]*(?:\.\d+)?\b)|(<\/?[A-Za-z][\w.]*)|([A-Za-z_$][\w$]*)/g;
    var out = '', last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      var tok = m[0];
      if (m[1]) out += '<span class="tk-com">' + esc(tok) + '</span>';
      else if (m[2]) out += '<span class="tk-str">' + esc(tok) + '</span>';
      else if (m[3]) out += '<span class="tk-num">' + esc(tok) + '</span>';
      else if (m[4]) {
        if (jsx) out += '<span class="tk-tag">' + esc(tok) + '</span>';
        else { out += esc(tok.charAt(0) === '<' ? '<' : ''); re.lastIndex = m.index + 1; last = re.lastIndex; continue; }
      } else if (m[5]) {
        var after = src.charAt(re.lastIndex);
        if (KWSET[tok]) out += '<span class="tk-kw">' + tok + '</span>';
        else if (BUILTIN_TYPES[tok]) out += '<span class="tk-type">' + tok + '</span>';
        else if (after === '(') out += '<span class="tk-fn">' + tok + '</span>';
        else if (/^[A-Z]/.test(tok)) out += '<span class="tk-type">' + tok + '</span>';
        else out += tok;
      }
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  function highlightBash(src) {
    return src.split('\n').map(function (line) {
      var m = line.match(/^(\s*)(#.*)$/);
      if (m) return m[1] + '<span class="tk-com">' + esc(m[2]) + '</span>';
      var ci = line.search(/\s#\s/);
      var code = ci >= 0 ? line.slice(0, ci) : line;
      var com = ci >= 0 ? line.slice(ci) : '';
      var h = esc(code)
        .replace(/(&quot;|"[^"]*"|'[^']*')/g, '<span class="tk-str">$1</span>')
        .replace(/^(\s*)(\$ )?([\w.\-/@]+)/, function (_, sp, dollar, cmd) { return sp + (dollar ? '<span class="tk-com">$ </span>' : '') + '<span class="tk-fn">' + cmd + '</span>'; })
        .replace(/(\s)(--?[\w-]+)/g, '$1<span class="tk-kw">$2</span>');
      return h + (com ? '<span class="tk-com">' + esc(com) + '</span>' : '');
    }).join('\n');
  }

  function highlightJSON(src) {
    return esc(src)
      .replace(/("(?:\\.|[^"\\])*")(\s*:)?/g, function (_, s, colon) { return colon ? '<span class="tk-type">' + s + '</span>' + colon : '<span class="tk-str">' + s + '</span>'; })
      .replace(/\b(true|false|null)\b/g, '<span class="tk-kw">$1</span>')
      .replace(/(:\s*)(-?\d+(?:\.\d+)?)/g, '$1<span class="tk-num">$2</span>');
  }

  function dedent(text) {
    var lines = text.replace(/\t/g, '  ').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    var min = Infinity;
    lines.forEach(function (l) { if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length); });
    if (!isFinite(min)) min = 0;
    return lines.map(function (l) { return l.slice(min); }).join('\n');
  }

  function buildCode() {
    var blocks = document.querySelectorAll('script[type="text/plain"].code');
    Array.prototype.forEach.call(blocks, function (s) {
      var lang = s.dataset.lang || 'text';
      var src = dedent(s.textContent);
      var hl;
      if (/^(ts|js|tsx|jsx|typescript|javascript)$/.test(lang)) hl = highlightTS(src, /x$/.test(lang));
      else if (/^(bash|sh|shell|zsh)$/.test(lang)) hl = highlightBash(src);
      else if (lang === 'json' || lang === 'jsonc') hl = highlightJSON(src);
      else hl = esc(src);
      var fig = document.createElement('div');
      fig.className = 'codeblock';
      fig.innerHTML = '<div class="code-head"><span class="file">' + esc(s.dataset.title || '') + '</span><span class="lang">' + esc(lang) + '</span><button type="button" class="copy">' + t.copy + '</button></div><pre><code>' + hl + '</code></pre>';
      fig.querySelector('.copy').addEventListener('click', function () {
        var b = this;
        var done = function () { b.textContent = t.copied; setTimeout(function () { b.textContent = t.copy; }, 1400); };
        if (navigator.clipboard) navigator.clipboard.writeText(src).then(done, done);
        else done();
      });
      s.parentNode.replaceChild(fig, s);
    });
  }

  function wrapTables() {
    document.querySelectorAll('.doc table').forEach(function (tb) {
      if (tb.parentNode.classList.contains('table-wrap')) return;
      var w = document.createElement('div'); w.className = 'table-wrap';
      tb.parentNode.insertBefore(w, tb); w.appendChild(tb);
    });
  }

  function init() {
    buildCode();
    wrapTables();
    buildShell();
    if (location.hash) {
      var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) setTimeout(function () { el.scrollIntoView(); }, 0);
    }
  }

  window.VH = { LANG: LANG, CHAPTERS: CHAPTERS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
