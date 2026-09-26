/* Vibe Hero — interactive widgets.
   Mount with <div data-widget="event-loop"></div>. Text follows <html lang>. */
(function () {
  'use strict';
  var ZH = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
  function L(zh, en) { return ZH ? zh : en; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* Generic stepper frame: title + controls + body + caption */
  function frame(root, title, opts) {
    opts = opts || {};
    root.classList.add('widget');
    root.innerHTML = '';
    var head = el('div', 'w-head');
    head.appendChild(el('span', 'w-title', esc(title)));
    var ctr = el('div', 'w-controls');
    head.appendChild(ctr);
    var body = el('div', 'w-body');
    var cap = el('div', 'w-caption');
    root.appendChild(head); root.appendChild(body); root.appendChild(cap);
    return { head: head, ctr: ctr, body: body, cap: cap };
  }
  function btn(label, cls, onClick) {
    var b = el('button', 'w-btn' + (cls ? ' ' + cls : ''), esc(label));
    b.type = 'button'; b.addEventListener('click', onClick); return b;
  }

  /* Stepper helper for scripted scenarios */
  function stepper(f, steps, render) {
    var i = 0, timer = null;
    var counter = el('span', 'w-step');
    var bPrev = btn(L('上一步', 'Back'), '', function () { stop(); go(i - 1); });
    var bNext = btn(L('下一步', 'Next'), 'primary', function () { stop(); go(i + 1); });
    var bPlay = btn(L('自动播放', 'Play'), '', function () { timer ? stop() : play(); });
    var bReset = btn(L('重置', 'Reset'), '', function () { stop(); go(0); });
    f.ctr.appendChild(counter); f.ctr.appendChild(bPrev); f.ctr.appendChild(bNext); f.ctr.appendChild(bPlay); f.ctr.appendChild(bReset);
    function go(n) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      render(steps[i], i);
      counter.textContent = (i + 1) + ' / ' + steps.length;
      bPrev.disabled = i === 0; bNext.disabled = i === steps.length - 1;
    }
    function play() {
      if (i === steps.length - 1) go(0);
      bPlay.textContent = L('暂停', 'Pause'); bPlay.classList.add('on');
      timer = setInterval(function () { if (i >= steps.length - 1) stop(); else go(i + 1); }, 1500);
    }
    function stop() { clearInterval(timer); timer = null; bPlay.textContent = L('自动播放', 'Play'); bPlay.classList.remove('on'); }
    go(0);
  }

  /* ------------------------------------------------------------------ */
  /* 1. Event loop                                                       */
  /* ------------------------------------------------------------------ */
  function eventLoop(root) {
    var code = [
      "console.log('A');",
      "setTimeout(() => console.log('B'), 0);",
      "Promise.resolve().then(() => console.log('C'));",
      "(async () => {",
      "  console.log('D');",
      "  await null;",
      "  console.log('E');",
      "})();",
      "console.log('F');"
    ];
    var S = function (line, stack, web, micro, macro, out, zh, en) { return { line: line, stack: stack, web: web, micro: micro, macro: macro, out: out, cap: L(zh, en) }; };
    var steps = [
      S(-1, ['script'], [], [], [], [], '整段脚本本身就是一个“宏任务”，被压入调用栈（call stack）开始执行。', 'The whole script is itself a (macro)task. It is pushed onto the call stack and starts running.'),
      S(0, ['script', "log('A')"], [], [], [], ['A'], '同步调用：直接执行，立刻打印 A。', 'Synchronous call: runs immediately and prints A.'),
      S(1, ['script', 'setTimeout'], ['timer 0ms → B'], [], [], ['A'], 'setTimeout 不执行回调，只把“0ms 后执行 B”交给宿主环境（浏览器/Node）的计时器，然后立刻返回。', 'setTimeout does not run the callback. It hands "run B after 0ms" to the host (browser/Node) timer and returns immediately.'),
      S(2, ['script', 'Promise.then'], [], ['→ C'], ['→ B'], ['A'], '.then 的回调进入微任务队列（microtask queue）。与此同时计时器到期，B 的回调进入宏任务队列（task queue）——但它必须等。', 'The .then callback goes to the microtask queue. Meanwhile the timer fires and B\'s callback lands in the task (macrotask) queue — but it must wait.'),
      S(4, ['script', 'async fn', "log('D')"], [], ['→ C'], ['→ B'], ['A', 'D'], '调用 async 函数：在第一个 await 之前，它的函数体是同步执行的，所以立刻打印 D。', 'Calling an async function: its body runs synchronously until the first await, so D prints right away.'),
      S(5, ['script', 'async fn'], [], ['→ C', 'resume → E'], ['→ B'], ['A', 'D'], 'await 把函数“暂停”：剩余部分（打印 E）被包装成一个微任务排队，函数把控制权交回调用者。', 'await suspends the function: the rest of it (print E) is queued as a microtask and control returns to the caller.'),
      S(8, ['script', "log('F')"], [], ['→ C', 'resume → E'], ['→ B'], ['A', 'D', 'F'], '继续同步代码：打印 F。', 'Back to synchronous code: prints F.'),
      S(-1, [], [], ['→ C', 'resume → E'], ['→ B'], ['A', 'D', 'F'], '脚本执行完，调用栈清空。规则：每个宏任务结束后，先把微任务队列全部清空，再取下一个宏任务。', 'The script finishes and the stack is empty. Rule: after each task, drain the entire microtask queue before taking the next task.'),
      S(2, ["log('C')"], [], ['resume → E'], ['→ B'], ['A', 'D', 'F', 'C'], '取出第一个微任务：打印 C。', 'First microtask runs: prints C.'),
      S(6, ['async fn (resumed)', "log('E')"], [], [], ['→ B'], ['A', 'D', 'F', 'C', 'E'], '第二个微任务：async 函数从 await 处恢复，打印 E。', 'Second microtask: the async function resumes after await and prints E.'),
      S(1, ["log('B')"], [], [], [], ['A', 'D', 'F', 'C', 'E', 'B'], '微任务清空了，事件循环才取下一个宏任务：打印 B。“0ms”只是“最早”，不是“立刻”。', 'Only now, with microtasks drained, does the loop take the next task: prints B. "0ms" means "no earlier than", not "now".'),
      S(-1, [], [], [], [], ['A', 'D', 'F', 'C', 'E', 'B'], '最终顺序 A D F C E B。记住三条：同步先跑完 → 清空微任务 → 取一个宏任务，循环往复。', 'Final order: A D F C E B. Three rules: run sync code to completion → drain microtasks → take one task, repeat.')
    ];
    var f = frame(root, L('事件循环逐步演示', 'Event loop, step by step'));
    var grid = el('div', 'el-grid');
    var codeBox = el('div', 'el-code');
    code.forEach(function (c) { codeBox.appendChild(el('div', '', esc(c))); });
    var cols = el('div', 'el-cols');
    function box(cls, title) { var b = el('div', 'el-box ' + cls); b.appendChild(el('h5', '', title)); var items = el('div', 'el-items'); b.appendChild(items); cols.appendChild(b); return items; }
    var bStack = box('stack', L('调用栈 Call Stack', 'Call stack'));
    var bWeb = box('web', L('宿主 API（计时器等）', 'Host APIs (timers…)'));
    var bMicro = box('micro', L('微任务队列 Microtasks', 'Microtask queue'));
    var bMacro = box('macro', L('宏任务队列 Tasks', 'Task queue'));
    var bOut = box('out', L('控制台输出', 'Console output'));
    grid.appendChild(codeBox); grid.appendChild(cols);
    f.body.appendChild(grid);
    function fill(target, arr) { target.innerHTML = arr.map(function (x) { return '<span class="el-item">' + esc(x) + '</span>'; }).join(''); }
    stepper(f, steps, function (s) {
      Array.prototype.forEach.call(codeBox.children, function (d, i) { d.classList.toggle('cur', i === s.line); });
      fill(bStack, s.stack.slice().reverse()); fill(bWeb, s.web); fill(bMicro, s.micro); fill(bMacro, s.macro); fill(bOut, s.out);
      f.cap.textContent = s.cap;
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. React re-render tree                                             */
  /* ------------------------------------------------------------------ */
  function reactRender(root) {
    var nodes = {
      App: { parent: null, note: 'state: user' },
      Header: { parent: 'App', note: 'props: user' },
      Page: { parent: 'App', note: '' },
      SearchBox: { parent: 'Page', note: 'state: query' },
      List: { parent: 'Page', note: 'props: items' },
      'Item a': { parent: 'List', note: '' },
      'Item b': { parent: 'List', note: 'state: starred' },
      'Item c': { parent: 'List', note: '' }
    };
    var rows = [['App'], ['Header', 'Page'], ['SearchBox', 'List'], ['Item a', 'Item b', 'Item c']];
    var counts = {}; Object.keys(nodes).forEach(function (k) { counts[k] = 1; });
    var memo = false;
    var f = frame(root, L('谁会重新渲染？', 'Who re-renders?'));
    var tree = el('div', 'rt-tree');
    var dom = {};
    rows.forEach(function (r) {
      var row = el('div', 'rt-row');
      r.forEach(function (name) {
        var n = el('div', 'rt-node', esc(name) + (nodes[name].note ? '<small>' + esc(nodes[name].note) + '</small>' : '') + '<span class="cnt">1</span>');
        dom[name] = n; row.appendChild(n);
      });
      tree.appendChild(row);
    });
    f.body.appendChild(tree);
    function descendants(name) {
      var out = [name];
      Object.keys(nodes).forEach(function (k) { if (nodes[k].parent === name) out = out.concat(descendants(k)); });
      return out;
    }
    function trigger(name, msg) {
      var list = descendants(name);
      var skipped = [];
      if (memo && name !== 'List' && list.indexOf('List') >= 0 && name !== 'Item b') {
        var sub = descendants('List');
        skipped = sub;
        list = list.filter(function (k) { return sub.indexOf(k) < 0; });
      }
      Object.keys(dom).forEach(function (k) { dom[k].classList.remove('flash', 'skip'); });
      void tree.offsetWidth;
      list.forEach(function (k) { counts[k]++; dom[k].querySelector('.cnt').textContent = counts[k]; dom[k].classList.add('flash'); });
      skipped.forEach(function (k) { dom[k].classList.add('skip'); });
      f.cap.innerHTML = msg + (skipped.length ? L(' <b>List 被 memo 包裹、props 没变，于是整棵子树被跳过。</b>', ' <b>List is memoized and its props did not change, so its whole subtree is skipped.</b>') : '');
    }
    f.ctr.appendChild(btn('App: setUser()', '', function () {
      trigger('App', L('App 的 state 变了 → App 重新执行，并且<b>默认情况下它渲染出的所有子组件都会重新执行</b>，不管它们的 props 有没有变。', 'App\'s state changed → App runs again, and <b>by default every child it renders runs again too</b>, whether or not their props changed.'));
    }));
    f.ctr.appendChild(btn('SearchBox: setQuery()', '', function () {
      trigger('SearchBox', L('只有 SearchBox 自己（及其子组件）重新渲染。父组件和兄弟组件不受影响——state 在哪，重渲染就从哪开始。<br>但注意：如果 List 需要根据 query 过滤，query 就必须“提升”到它们共同的父组件 Page。', 'Only SearchBox (and its children) re-render. Parents and siblings are untouched — re-rendering starts where the state lives.<br>But if List must filter by query, query has to be lifted up to their common parent, Page.'));
    }));
    f.ctr.appendChild(btn('Item b: toggleStar()', '', function () {
      trigger('Item b', L('局部 state 只影响自己。把 state 放在“需要它的最低位置”是最朴素也最有效的性能优化。', 'Local state affects only itself. Keeping state as low as possible is the simplest, most effective performance technique.'));
    }));
    var mb = btn('memo(List)', '', function () {
      memo = !memo; mb.classList.toggle('on', memo); dom.List.classList.toggle('memo', memo);
      f.cap.innerHTML = memo ? L('已开启：List 被 React.memo 包裹（React Compiler 会自动做类似的事）。再点 App: setUser() 看看。', 'On: List is wrapped in React.memo (the React Compiler does something similar automatically). Click App: setUser() again.') : L('已关闭 memo。', 'Memo off.');
    });
    f.ctr.appendChild(mb);
    f.ctr.appendChild(btn(L('重置', 'Reset'), '', function () {
      Object.keys(counts).forEach(function (k) { counts[k] = 1; dom[k].querySelector('.cnt').textContent = 1; dom[k].classList.remove('flash', 'skip'); });
      f.cap.textContent = L('右上角数字 = 该组件函数被执行的次数。点按钮触发 state 变化。', 'The badge = how many times each component function has run. Click a button to change state.');
    }));
    f.cap.textContent = L('右上角数字 = 该组件函数被执行的次数。点按钮触发 state 变化。', 'The badge = how many times each component function has run. Click a button to change state.');
  }

  /* ------------------------------------------------------------------ */
  /* 3. Rendering modes timeline                                         */
  /* ------------------------------------------------------------------ */
  function renderingModes(root) {
    var rows = [
      { name: 'CSR', sub: L('客户端渲染', 'client-side'), note: L('白屏直到 ~62，之后可见即可交互', 'Blank until ~62, then visible & interactive at once'), segs: [
        [0, 8, 'net', L('HTML 空壳', 'empty HTML')], [8, 32, 'js', L('下载并执行 JS bundle', 'download + run JS bundle')], [40, 22, 'data', L('fetch 数据', 'fetch data')], [62, 38, 'ready', L('可见 + 可交互', 'visible + interactive')]] },
      { name: 'SSR', sub: L('服务端渲染', 'server-side'), note: L('~34 可见（但点不动），~58 hydrate 后可交互', 'Visible at ~34 (not clickable yet), interactive after hydration ~58'), segs: [
        [0, 26, 'server', L('服务器取数 + 渲染 HTML', 'server fetches + renders')], [26, 8, 'html', L('HTML 到达', 'HTML arrives')], [34, 18, 'js', 'JS'], [52, 6, 'js', 'hydrate'], [58, 42, 'ready', L('可交互', 'interactive')]] },
      { name: 'SSG', sub: L('静态生成', 'static'), note: L('构建时就生成好，CDN 直出最快；数据可能是旧的', 'Built ahead of time, fastest from CDN; data may be stale'), segs: [
        [0, 8, 'html', L('CDN 直出 HTML', 'HTML from CDN')], [8, 16, 'js', 'JS'], [24, 5, 'js', 'hydr.'], [29, 71, 'ready', L('可交互', 'interactive')]] },
      { name: 'Streaming', sub: 'SSR + RSC', note: L('~8 外壳可见；慢数据流式补齐；只有客户端组件需要 JS', 'Shell visible at ~8; slow data streams in; only client components ship JS'), segs: [
        [0, 8, 'html', L('外壳+骨架屏', 'shell + skeleton')], [8, 26, 'server', L('慢数据在服务器上继续，逐块流入', 'slow data keeps streaming in'), 'a'], [8, 12, 'js', L('少量 JS', 'less JS'), 'b'], [20, 5, 'js', 'hydr.', 'b'], [34, 66, 'ready', L('全部就绪', 'all ready')]] }
    ];
    var f = frame(root, L('四种渲染模式的时间线（示意）', 'Four rendering modes on a timeline (illustrative)'));
    var wrap = el('div');
    var all = [];
    rows.forEach(function (r) {
      var row = el('div', 'rm-row');
      row.appendChild(el('div', 'rm-label', esc(r.name) + '<small>' + esc(r.sub) + '</small>'));
      var track = el('div', 'rm-track');
      r.segs.forEach(function (s) {
        var seg = el('div', 'rm-seg s-' + s[2], esc(s[3]));
        seg.style.left = s[0] + '%'; seg.style.width = s[1] + '%';
        if (s[4] === 'a') { seg.style.top = '2px'; seg.style.bottom = '18px'; seg.style.lineHeight = '14px'; }
        if (s[4] === 'b') { seg.style.top = '18px'; seg.style.bottom = '2px'; seg.style.lineHeight = '14px'; }
        seg.title = s[3];
        track.appendChild(seg); all.push({ seg: seg, start: s[0] });
      });
      row.appendChild(track);
      wrap.appendChild(row);
      wrap.appendChild(el('div', 'rm-axis', '<div></div><div class="muted" style="font-size:12px">' + esc(r.note) + '</div>'));
    });
    wrap.appendChild(el('div', 'rm-axis', '<div></div><div><span>0</span><span>' + L('时间 →', 'time →') + '</span><span>100</span></div>'));
    wrap.appendChild(el('div', 'rm-legend', '<span class="l-server">' + L('服务器工作', 'server work') + '</span><span class="l-html">' + L('HTML 可见', 'HTML visible') + '</span><span class="l-js">' + L('JS 下载/执行/水合', 'JS download/run/hydrate') + '</span><span class="l-data">' + L('客户端取数', 'client fetch') + '</span><span class="l-ready">' + L('就绪', 'ready') + '</span>'));
    f.body.appendChild(wrap);
    var timers = [];
    function reset() { timers.forEach(clearTimeout); timers = []; all.forEach(function (a) { a.seg.classList.remove('show'); }); }
    function play() {
      reset();
      all.forEach(function (a) { timers.push(setTimeout(function () { a.seg.classList.add('show'); }, 150 + a.start * 38)); });
    }
    f.ctr.appendChild(btn(L('播放', 'Play'), 'primary', play));
    f.ctr.appendChild(btn(L('重置', 'Reset'), '', reset));
    f.cap.textContent = L('数字是相对时间单位，只为比较先后，不代表真实毫秒。真实差异取决于网络、数据源速度和 JS 体积。', 'Units are relative, for ordering only — not real milliseconds. Real differences depend on network, data-source speed and JS size.');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { play(); io.disconnect(); } }, { threshold: .4 });
      io.observe(root);
    } else play();
  }

  /* ------------------------------------------------------------------ */
  /* 4. Type narrowing stepper                                           */
  /* ------------------------------------------------------------------ */
  function narrowing(root) {
    var code = [
      "type Bookmark =",
      "  | { status: 'pending'; url: string }",
      "  | { status: 'done';    url: string; summary: string }",
      "  | { status: 'failed';  url: string; error: string };",
      "",
      "function label(b: Bookmark): string {",
      "  if (b.status === 'done') {",
      "    return b.summary;",
      "  }",
      "  if (b.status === 'failed') {",
      "    return 'Error: ' + b.error;",
      "  }",
      "  return 'Pending: ' + b.url;",
      "}"
    ];
    var U = "{pending} | {done} | {failed}";
    var steps = [
      { line: 5, ty: U, cap: L('进入函数时，b 可能是三种形状中的任意一种。此时访问 b.summary 会报错——因为 pending 和 failed 没有 summary。', 'On entry, b could be any of the three shapes. Accessing b.summary here is an error — pending and failed have no summary.') },
      { line: 6, ty: U, cap: L('status 是三种形状共有的“判别字段（discriminant）”，而且是字面量类型。比较它，编译器就能区分分支。', 'status is the shared "discriminant" field with literal types. Comparing it lets the compiler tell branches apart.') },
      { line: 7, ty: "{ status: 'done'; url; summary }", cap: L('在 if 内部，b 被收窄（narrowing）为 done 这一种，所以 b.summary 合法。没有任何类型转换（cast）。', 'Inside the if, b is narrowed to the done shape only, so b.summary is legal. No cast needed.') },
      { line: 9, ty: "{pending} | {failed}", cap: L('走出第一个 if（它 return 了），编译器知道剩下的只可能是 pending 或 failed。这叫控制流分析（control flow analysis）。', 'Past the first if (which returned), the compiler knows only pending or failed remain. This is control-flow analysis.') },
      { line: 10, ty: "{ status: 'failed'; url; error }", cap: L('再次收窄为 failed，b.error 合法。', 'Narrowed to failed again, so b.error is legal.') },
      { line: 12, ty: "{ status: 'pending'; url }", cap: L('只剩 pending。如果以后有人新增第四种状态 archived，而这里忘了处理，配合穷尽检查（exhaustiveness check）就能在编译期发现。', 'Only pending is left. If someone adds a fourth status "archived" later and forgets it here, an exhaustiveness check catches it at compile time.') }
    ];
    var f = frame(root, L('类型收窄：同一个变量，不同位置的类型', 'Narrowing: one variable, different types at different lines'));
    var line = el('div', 'nr-line');
    var codeBox = el('div', 'el-code');
    code.forEach(function (c) { codeBox.appendChild(el('div', '', esc(c) || ' ')); });
    var ty = el('div', 'nr-type');
    line.appendChild(codeBox); line.appendChild(ty);
    f.body.appendChild(line);
    stepper(f, steps, function (s) {
      Array.prototype.forEach.call(codeBox.children, function (d, i) { d.classList.toggle('cur', i === s.line); });
      ty.innerHTML = '<span class="lbl">' + L('这一行 b 的类型', 'type of b on this line') + '</span><span class="ty">' + esc(s.ty) + '</span>';
      f.cap.textContent = s.cap;
    });
  }

  /* ------------------------------------------------------------------ */
  /* 5. Streaming demo                                                   */
  /* ------------------------------------------------------------------ */
  function streamDemo(root) {
    var textA = L(['你收藏的', '链接里', '有 3 篇', '关于 React', ' 的文章', '。'], ['You have ', '3 saved ', 'links ', 'about ', 'React', '. ']);
    var textB = L(['最新的一篇', '讲的是', ' React Compiler', ' 如何', '自动做记忆化', '……'], ['The newest ', 'explains how ', 'the React ', 'Compiler ', 'auto-memoizes', '…']);
    var frames = [{ raw: 'data: {"type":"start","messageId":"m1"}' }];
    textA.forEach(function (d) { frames.push({ raw: 'data: {"type":"text-delta","delta":' + JSON.stringify(d) + '}', text: d }); });
    frames.push({ raw: 'data: {"type":"tool-call","toolName":"searchBookmarks","input":{"q":"react"}}', tool: 'call' });
    frames.push({ raw: 'data: {"type":"tool-result","output":[{"id":12},{"id":31},{"id":40}]}', tool: 'result' });
    textB.forEach(function (d) { frames.push({ raw: 'data: {"type":"text-delta","delta":' + JSON.stringify(d) + '}', text: d }); });
    frames.push({ raw: 'data: {"type":"finish","usage":{"inputTokens":812,"outputTokens":64}}' });
    frames.push({ raw: 'data: [DONE]', end: true });

    var f = frame(root, L('流式响应：线上传的是什么，界面看到的是什么', 'Streaming: what goes over the wire vs. what the UI shows'));
    var grid = el('div', 'sd-grid');
    var raw = el('div', 'sd-panel sd-raw'); raw.appendChild(el('h5', '', L('网络上（SSE 帧，简化示意）', 'On the wire (SSE frames, simplified)')));
    var rawList = el('div'); raw.appendChild(rawList);
    var ui = el('div', 'sd-panel sd-ui'); ui.appendChild(el('h5', '', L('界面上（useChat 渲染结果）', 'In the UI (what useChat renders)')));
    var uiText = el('div'); ui.appendChild(uiText);
    grid.appendChild(raw); grid.appendChild(ui);
    f.body.appendChild(grid);
    var timer = null, i = 0, acc = '', toolHtml = '';
    function paint(done) { uiText.innerHTML = esc(acc).replace('\u0000', toolHtml) + (done ? '' : '<span class="cursor"></span>'); }
    function tick() {
      if (i >= frames.length) { stop(); return; }
      var fr = frames[i++];
      rawList.appendChild(el('span', '', esc(fr.raw)));
      raw.scrollTop = raw.scrollHeight;
      if (fr.text) acc += fr.text;
      if (fr.tool === 'call') { acc += '\u0000'; toolHtml = '<br><span class="sd-tool">⚙ searchBookmarks({ q: "react" }) …</span><br>'; }
      if (fr.tool === 'result') toolHtml = '<br><span class="sd-tool">✓ searchBookmarks → 3 ' + L('条结果', 'results') + '</span><br>';
      paint(fr.end);
      f.cap.textContent = fr.end ? L('流结束。注意：用户在第一个字到达时就看到了反馈，而不是等整段生成完——这就是流式的全部意义。', 'Stream ends. The user saw feedback from the first token instead of waiting for the full answer — that is the whole point of streaming.')
        : fr.tool === 'call' ? L('模型决定调用工具。文本流暂停，服务器执行 searchBookmarks，UI 可以展示“正在搜索…”的状态。', 'The model decides to call a tool. Text pauses while the server runs searchBookmarks; the UI can show a "searching…" state.')
        : fr.tool === 'result' ? L('工具结果回填给模型，模型基于结果继续生成。', 'The tool result goes back to the model, which continues generating from it.')
        : L('每个 text-delta 是一小段增量文本，前端把它们拼接起来。', 'Each text-delta is a small increment; the client appends them.');
    }
    function start() { stop(); rawList.innerHTML = ''; acc = ''; toolHtml = ''; i = 0; paint(false); timer = setInterval(tick, 420); }
    function stop() { clearInterval(timer); timer = null; }
    f.ctr.appendChild(btn(L('开始流式输出', 'Start stream'), 'primary', start));
    f.ctr.appendChild(btn(L('暂停', 'Pause'), '', stop));
    f.cap.textContent = L('点击“开始”。左边是服务器通过 Server-Sent Events 发来的帧，右边是界面。', 'Click Start. Left: frames the server sends via Server-Sent Events. Right: the UI.');
  }

  /* ------------------------------------------------------------------ */
  /* 6. Agent loop                                                       */
  /* ------------------------------------------------------------------ */
  function agentLoop(root) {
    var P = { ctx: 0, model: 1, tool: 2, obs: 3, done: 4 };
    var steps = [
      { k: 'user', ph: P.ctx, tok: 4, b: L('用户', 'User'), t: L('给 LinkNote 列表页加“按标签筛选”，要有测试。', 'Add tag filtering to the LinkNote list page, with tests.') },
      { k: 'harness', ph: P.ctx, tok: 18, b: 'Harness', t: L('组装上下文：系统提示词 + AGENTS.md（项目约定）+ 工具定义（read / edit / bash）+ 用户消息，发给模型。', 'Assemble context: system prompt + AGENTS.md (project rules) + tool definitions (read / edit / bash) + the user message, then call the model.') },
      { k: 'think', ph: P.model, tok: 20, b: L('模型', 'Model'), t: L('我需要先看列表页和数据结构，不能凭空写。', 'I need to look at the list page and data shape first rather than guess.') },
      { k: 'call', ph: P.tool, tok: 21, b: 'tool_call', t: 'read("src/routes/index.tsx")' },
      { k: 'result', ph: P.obs, tok: 34, b: 'tool_result', t: 'export function BookmarkList({ items }) {\n  return items.map(b => <Item key={b.id} {...b} />)\n}  // …120 lines' },
      { k: 'call', ph: P.tool, tok: 35, b: 'tool_call', t: 'bash("rg -n \\"tags\\" src/db/schema.ts")' },
      { k: 'result', ph: P.obs, tok: 38, b: 'tool_result', t: "12:  tags: text('tags', { mode: 'json' }).$type<string[]>()" },
      { k: 'think', ph: P.model, tok: 40, b: L('模型', 'Model'), t: L('计划：URL 搜索参数存 tag → 路由层校验 → 列表过滤 → 为过滤函数写单元测试。', 'Plan: keep tag in URL search params → validate in the route → filter the list → unit-test the filter.') },
      { k: 'call', ph: P.tool, tok: 44, b: 'tool_call', t: 'edit("src/lib/filter.ts", …)  edit("src/routes/index.tsx", …)' },
      { k: 'harness', ph: P.obs, tok: 45, b: 'Hook', t: L('PostToolUse 钩子自动运行格式化（biome format）。这是确定性的规则，不靠模型“记得”。', 'A PostToolUse hook runs the formatter (biome format). A deterministic rule, not something the model has to remember.') },
      { k: 'call', ph: P.tool, tok: 46, b: 'tool_call', t: 'bash("pnpm vitest run src/lib/filter.test.ts")' },
      { k: 'result', ph: P.obs, tok: 55, b: 'tool_result', t: '✗ filters by tag (case-insensitive)\n  expected 2, received 1' },
      { k: 'think', ph: P.model, tok: 57, b: L('模型', 'Model'), t: L('测试暴露问题：比较时没有忽略大小写。修复后重跑。', 'The test exposed a bug: comparison is case-sensitive. Fix and re-run.') },
      { k: 'call', ph: P.tool, tok: 59, b: 'tool_call', t: 'edit("src/lib/filter.ts", …)  bash("pnpm vitest run && pnpm tsc --noEmit")' },
      { k: 'result', ph: P.obs, tok: 64, b: 'tool_result', t: '✓ 6 passed · tsc: 0 errors' },
      { k: 'final', ph: P.done, tok: 66, b: L('最终回复', 'Final answer'), t: L('已完成：改了 2 个文件、新增 1 个测试文件；标签放在 URL 里，所以刷新和分享链接都能保留筛选。', 'Done: 2 files changed, 1 test file added. The tag lives in the URL, so refresh and shared links keep the filter.') }
    ];
    var f = frame(root, L('一次 Agent 循环（Claude Code / Codex / pi 都长这样）', 'One agent loop (Claude Code / Codex / pi all look like this)'));
    var wrap = el('div', 'al-wrap');
    var log = el('div', 'al-log');
    var side = el('div', 'al-side');
    side.innerHTML = '<h5>' + L('上下文窗口占用', 'Context window used') + '</h5><div class="al-meter"><i></i></div><h5>' + L('当前阶段', 'Phase') + '</h5>';
    var phases = el('div', 'al-phase');
    [L('组装上下文', 'Build context'), L('模型推理', 'Model reasons'), L('执行工具', 'Run tool'), L('观察结果', 'Observe'), L('结束', 'Stop')].forEach(function (p) { phases.appendChild(el('span', '', p)); });
    side.appendChild(phases);
    wrap.appendChild(log); wrap.appendChild(side);
    f.body.appendChild(wrap);
    var meter = side.querySelector('.al-meter i');
    stepper(f, steps, function (s, idx) {
      log.innerHTML = '';
      steps.slice(0, idx + 1).forEach(function (m) {
        log.appendChild(el('div', 'al-msg ' + m.k, '<b>' + esc(m.b) + '</b>' + esc(m.t)));
      });
      log.scrollTop = log.scrollHeight;
      meter.style.height = s.tok + '%';
      meter.style.width = '';
      Array.prototype.forEach.call(phases.children, function (p, i) { p.classList.toggle('on', i === s.ph); });
      f.cap.textContent = s.k === 'final'
        ? L('模型不再请求工具 → 循环结束。整个“智能”来自：模型 + 工具 + 反馈（测试结果）反复迭代。注意上下文一直在涨——这就是为什么需要上下文管理。', 'The model requests no more tools → the loop ends. The "intelligence" is model + tools + feedback (test results) iterating. Note the context keeps growing — hence context management.')
        : s.k === 'result' ? L('工具结果被追加进对话，成为模型下一轮的输入。模型“看见”世界的唯一方式就是这些结果。', 'The tool result is appended to the conversation and becomes the next input. Tool results are the model\'s only window onto the world.')
        : s.k === 'call' ? L('模型没有手：它输出一段结构化的“请求”，由 Harness 真正执行。', 'The model has no hands: it emits a structured request, and the harness actually executes it.')
        : s.k === 'harness' ? L('Harness = 模型之外的一切：提示词、工具、权限、钩子、上下文管理。', 'Harness = everything around the model: prompts, tools, permissions, hooks, context management.')
        : s.k === 'think' ? L('模型根据目前的全部上下文决定下一步：继续调工具，还是回答。', 'Given everything in context, the model decides the next move: another tool call, or an answer.')
        : L('一切从一条自然语言需求开始。需求越准确，后面走的弯路越少。', 'It all starts with one natural-language request. The more precise, the fewer detours.');
    });
  }

  /* ------------------------------------------------------------------ */
  /* 7. Deploy flow                                                      */
  /* ------------------------------------------------------------------ */
  function deployFlow(root) {
    var P = {
      vercel: {
        name: 'Vercel',
        nodes: [
          [L('浏览器', 'Browser'), ''],
          ['Vercel CDN', L('静态资源 / 缓存页面', 'static assets / cached pages')],
          ['Vercel Functions', L('Fluid compute · Node.js', 'Fluid compute · Node.js')],
          [L('外部数据服务', 'External data'), 'Neon / Supabase / Upstash']
        ],
        cls: ['box', 'box-soft', 'box-accent', 'box-purple'],
        desc: L(['和 Next.js 同一家公司：新特性最先、最完整地在这里可用。', '函数是按需启动的 Node.js 实例，可并发处理多个请求（Fluid compute），有最长执行时间限制。', '平台本身不托管数据库，通过 Marketplace 接入第三方 Postgres / Redis / Blob。', '适合：Next.js 项目、想零运维快速上线、团队按席位付费可接受。'],
          ['Same company as Next.js: new features land here first and most completely.', 'Functions are on-demand Node.js instances that can serve multiple requests concurrently (Fluid compute), with a max duration.', 'The platform does not host databases itself; you attach Postgres / Redis / Blob via the Marketplace.', 'Good for: Next.js projects, zero-ops launches, teams fine with per-seat pricing.'])
      },
      cloudflare: {
        name: 'Cloudflare',
        nodes: [
          [L('浏览器', 'Browser'), ''],
          [L('Cloudflare 全球网络', 'Cloudflare network'), L('300+ 城市 · 静态资源', '300+ cities · static assets')],
          ['Worker', L('V8 isolate · workerd', 'V8 isolate · workerd')],
          ['Bindings', 'D1 · KV · R2 · Durable Objects · Queues · AI']
        ],
        cls: ['box', 'box-soft', 'box-use', 'box-aware'],
        desc: L(['代码跑在离用户最近的机房，冷启动几乎为零（isolate 而不是容器）。', '运行时不是完整 Node.js：大部分 Node API 通过兼容层提供，但有 CPU 时间、内存（128MB）等限制。', '存储是“绑定（binding）”注入到 env 里的：D1(SQLite)、KV、R2(对象存储)、Durable Objects(有状态单例)。', '适合：API、AI Agent / MCP 服务器、实时应用、成本敏感的项目。'],
          ['Code runs in the data center nearest the user; near-zero cold starts (isolates, not containers).', 'The runtime is not full Node.js: most Node APIs come via a compat layer, with limits on CPU time and memory (128MB).', 'Storage is injected into env as bindings: D1 (SQLite), KV, R2 (object storage), Durable Objects (stateful singletons).', 'Good for: APIs, AI agents / MCP servers, realtime apps, cost-sensitive projects.'])
      },
      self: {
        name: L('自托管', 'Self-host'),
        nodes: [
          [L('浏览器', 'Browser'), ''],
          [L('反向代理', 'Reverse proxy'), 'Caddy / Nginx (+ CDN)'],
          [L('Node / Bun 进程', 'Node / Bun process'), L('Docker 容器 · 常驻', 'Docker container · long-running')],
          [L('你自己的数据库', 'Your own DB'), 'Postgres · Redis']
        ],
        cls: ['box', 'box-soft', 'box-ok', 'box-deep'],
        desc: L(['一个常驻进程：可以随便用 WebSocket、定时任务、后台队列、本地文件，没有平台限制。', '用 Docker 打包，部署到 VPS（或 Coolify / Dokploy / Kamal 这类自托管 PaaS）。', '成本可预测、完全可控；代价是你要负责扩容、备份、监控、安全更新。', '适合：长任务、重计算、数据合规要求、已经有运维能力的团队。'],
          ['One long-running process: WebSockets, cron jobs, background queues, local files — no platform limits.', 'Package with Docker; deploy to a VPS (or a self-hosted PaaS such as Coolify / Dokploy / Kamal).', 'Predictable cost and full control; the price is you own scaling, backups, monitoring and security patches.', 'Good for: long jobs, heavy compute, data-residency needs, teams with ops capacity.'])
      }
    };
    var f = frame(root, L('一次请求在三种平台上走的路', 'The path of one request on three platforms'));
    var tabs = el('div', 'df-tabs');
    f.ctr.appendChild(tabs);
    var svgWrap = el('div', 'diagram-scroll');
    var desc = el('div', 'df-desc');
    f.body.appendChild(svgWrap); f.body.appendChild(desc);
    var buttons = {};
    function show(key) {
      var p = P[key];
      Object.keys(buttons).forEach(function (k) { buttons[k].classList.toggle('on', k === key); });
      var W = 760, bw = 160, gap = (W - 4 * bw) / 3, h = 150;
      var s = '<svg viewBox="0 0 ' + W + ' ' + h + '" role="img" aria-label="' + esc(p.name) + '"><defs><marker id="dfar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="ar-accent"/></marker></defs>';
      p.nodes.forEach(function (n, i) {
        var x = i * (bw + gap);
        s += '<rect x="' + x + '" y="35" width="' + bw + '" height="80" rx="10" class="' + p.cls[i] + '"/>';
        s += '<text x="' + (x + bw / 2) + '" y="' + (n[1] ? 68 : 80) + '" text-anchor="middle" font-size="14" font-weight="700">' + esc(n[0]) + '</text>';
        if (n[1]) {
          var parts = n[1].length > 22 ? n[1].split(' · ') : [n[1]];
          if (parts.length > 2) parts = [parts.slice(0, Math.ceil(parts.length / 2)).join(' · '), parts.slice(Math.ceil(parts.length / 2)).join(' · ')];
          parts.forEach(function (pt, j) { s += '<text x="' + (x + bw / 2) + '" y="' + (88 + j * 15) + '" text-anchor="middle" font-size="11" class="t-mute">' + esc(pt) + '</text>'; });
        }
        if (i < 3) s += '<line x1="' + (x + bw + 4) + '" y1="75" x2="' + (x + bw + gap - 6) + '" y2="75" class="ln-accent flow" marker-end="url(#dfar)"/>';
      });
      s += '<text x="' + (W / 2) + '" y="20" text-anchor="middle" font-size="12" class="t-mute">' + L('请求方向 →（响应沿原路返回）', 'request →  (response flows back)') + '</text>';
      s += '</svg>';
      svgWrap.innerHTML = s;
      desc.innerHTML = '<ul>' + p.desc.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>';
      f.cap.textContent = L('同一份 TypeScript 代码（例如一个 Hono 应用）可以部署到这三种环境；差异在于“运行时的形状”和“状态放在哪里”。', 'The same TypeScript code (say, a Hono app) can run on all three; what differs is the shape of the runtime and where state lives.');
    }
    ['vercel', 'cloudflare', 'self'].forEach(function (k) {
      var b = btn(P[k].name, '', function () { show(k); }); buttons[k] = b; tabs.appendChild(b);
    });
    show('vercel');
  }

  var REGISTRY = {
    'event-loop': eventLoop,
    'react-render': reactRender,
    'rendering-modes': renderingModes,
    'narrowing': narrowing,
    'stream': streamDemo,
    'agent-loop': agentLoop,
    'deploy-flow': deployFlow
  };

  function init() {
    document.querySelectorAll('[data-widget]').forEach(function (n) {
      var fn = REGISTRY[n.dataset.widget];
      if (fn) { try { fn(n); } catch (e) { n.textContent = 'Widget error: ' + e.message; } }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
