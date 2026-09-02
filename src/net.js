/* 金坛麻将 · 联机
 * 找服务器、连 WebSocket、心跳重连、协议处理、房间大厅、连不上时的自诊断。
 * 服务器是唯一权威：牌墙只在服务器上，每人只收到自己那副牌。
 * 本地的规则判定、算番、渲染全部复用，这里只负责「显示」和「上报动作」。
 * 消息格式的约定见 protocol.js。
 *
 * 由 构建.mjs 拼进 index.html。改这里，不要改根目录那个。 */

  /* ══════════════════════════════════════════
     联机
     服务器是唯一权威：牌墙只在服务器上，每人只收到自己那副牌。
     本地那套规则判定、算番、渲染全部复用，客户端只负责「显示」和「上报动作」。
     ══════════════════════════════════════════ */
  var NET = {
    ws: null, code: null, seat: -1, isHost: false,
    seats: [], opts: null, started: false,
    status: "", err: "", retry: 0, retryTimer: null, want: false,
    base: null,          /* 这次实际连上的那台 */
    showFix: false,      /* 连不上时把「怎么办」展开 */
    diag: null,          /* 体检结果 */
    hbTimer: null, lastHeard: 0, sawPong: false,
    sawUnknown: false    /* 收到过不认识的消息类型，只提示一次别刷屏 */
  };

  function netToken() {
    var k = "jintan_mj_token";
    var t = null;
    try { t = localStorage.getItem(k); } catch (e) {}
    if (!t) {
      t = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem(k, t); } catch (e) {}
    }
    return t;
  }
  /* 联机时别人看到的就是你的昵称 */
  function netName() { return profNick().slice(0, 8); }
  /* 内置服务器，从上往下同时试，谁先答应用谁。
     为什么要两条 ——
     *.workers.dev 在国内被拦了两道：DNS 查出来是 Facebook 网段的假 IP，
     就算手工指对 IP，TLS 握手时按 SNI 还会被重置。实测两层都拦。
     *.pages.dev 两层都干净，同一批 Cloudflare 机器，只是换个门牌号。
     所以国内走 pages.dev，国外两条都通，随便哪条先答应都行。 */
  var DEFAULT_SERVERS = [
    "https://jintan-mj.pages.dev",
    "https://jintan-mahjong.qiantu2007.workers.dev"
  ];
  var OKSRV_KEY = "jintan_mj_okserver";
  var PROBE_MS = 6000;      /* 探一台服务器最多等这么久 */
  var WS_OPEN_MS = 8000;    /* WebSocket 握手最多等这么久 */
  var BLOCKED_HINT = "连不上服务器。多半是这个网址在国内被拦住了，" +
                     "翻到下面「连不上怎么办」按着做就能解决。";

  /* 要试的服务器，按优先级排：自己填的 > 上次连通的 > 内置的 */
  function serverList() {
    var list = [], i;
    if (settings.server) list.push(settings.server);
    for (i = 0; i < DEFAULT_SERVERS.length; i++) {
      if (list.indexOf(DEFAULT_SERVERS[i]) < 0) list.push(DEFAULT_SERVERS[i]);
    }
    for (i = 0; i < list.length; i++) list[i] = String(list[i]).replace(/\/+$/, "");
    var ok = null;
    try { ok = localStorage.getItem(OKSRV_KEY); } catch (e) {}
    var at = ok ? list.indexOf(ok) : -1;
    if (at > 0) { list.splice(at, 1); list.unshift(ok); }
    return list;
  }
  /* 显示用：当前配置的地址 */
  function netBase() {
    return NET.base || serverList()[0] || "";
  }
  function usingDefault() { return !settings.server; }

  /* 探一台服务器通不通。走 /health，不会真的开房间。
     超时必须自己掐：域名被污染时浏览器会一直等到系统 TCP 超时（半分钟往上），
     那期间界面只会显示「正在进房…」，老人以为是卡死了。 */
  function probeServer(base) {
    return new Promise(function (resolve) {
      var done = false, ctl = null;
      var t0 = Date.now();
      try { ctl = new AbortController(); } catch (e) {}
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        if (ctl) { try { ctl.abort(); } catch (e) {} }
        resolve({ base: base, ok: false, ms: PROBE_MS, why: "超时没反应" });
      }, PROBE_MS);
      fetch(base + "/health", { cache: "no-store", signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return { ok: !!(r && r.ok), why: r && r.ok ? "" : "服务器回了错误码" }; })
        .catch(function () { return { ok: false, why: "连不上" }; })
        .then(function (res) {
          if (done) return;
          done = true; clearTimeout(timer);
          resolve({ base: base, ok: res.ok, ms: Date.now() - t0, why: res.why });
        });
    });
  }

  /* 几台一起探，谁先答应用谁；全都不通就返回 null */
  function pickServer() {
    var list = serverList();
    return new Promise(function (resolve) {
      var left = list.length, settled = false;
      if (!left) { resolve(null); return; }
      list.forEach(function (b) {
        probeServer(b).then(function (r) {
          left--;
          if (r.ok && !settled) { settled = true; resolve(r.base); }
          else if (!left && !settled) { settled = true; resolve(null); }
        });
      });
    });
  }

  /* 确保手上有一台能用的服务器 */
  function ensureServer(force) {
    if (NET.base && !force) return Promise.resolve(NET.base);
    NET.status = "正在找服务器…";
    if (ui.screen === "net") renderLobby();
    return pickServer().then(function (b) {
      if (b) {
        NET.base = b;
        try { localStorage.setItem(OKSRV_KEY, b); } catch (e) {}
      }
      return b;
    });
  }

  /* 复制文本，带降级：剪贴板拿不到就把文字选中让用户自己复制 */
  function copyText(text, okMsg) {
    var ok = false;
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      ok = document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (e) { ok = false; }
    if (!ok && navigator.clipboard) {
      try { navigator.clipboard.writeText(text); ok = true; } catch (e2) {}
    }
    toast(ok ? (okMsg || "复制好了") : "复制不了，请长按文字手动复制");
    return ok;
  }
  function shareLink(code) {
    return location.origin + location.pathname + "?room=" + code;
  }

  function netSend(m) {
    if (NET.ws && NET.ws.readyState === 1) {
      try { NET.ws.send(JSON.stringify(m)); } catch (e) {}
    }
  }

  function netClose() {
    NET.want = false;
    clearFlowerWait();
    NET.gen = (NET.gen || 0) + 1;   /* 让还在路上的那次连接自己作废 */
    if (NET.retryTimer) { clearTimeout(NET.retryTimer); NET.retryTimer = null; }
    stopHeartbeat();
    if (NET.ws) { try { NET.ws.close(); } catch (e) {} }
    NET.ws = null; NET.code = null; NET.seat = -1; NET.started = false;
    NET.seats = []; NET.status = ""; NET.err = "";
    NET.retry = 0;
    /* NET.base 故意留着：同一台刚才是通的，下次进房间不用再探一遍 */
    ui.online = false;
  }

  async function netCreate() {
    NET.status = "正在开房…"; NET.err = ""; renderLobby();
    var base = await ensureServer(false);
    if (!base) { NET.status = ""; NET.err = BLOCKED_HINT; NET.showFix = true; renderLobby(); return; }
    try {
      var ctl = null;
      try { ctl = new AbortController(); } catch (e) {}
      var to = setTimeout(function () { if (ctl) { try { ctl.abort(); } catch (e) {} } }, PROBE_MS);
      var r = await fetch(base + "/new", { cache: "no-store", signal: ctl ? ctl.signal : undefined });
      clearTimeout(to);
      var j = await r.json();
      if (!j || !j.code) throw new Error("bad");
      netConnect(j.code, true);
    } catch (e) {
      NET.base = null;   /* 这台刚才还答应了，现在又不行，下次重新挑 */
      NET.status = ""; NET.err = BLOCKED_HINT; NET.showFix = true; renderLobby();
    }
  }

  async function netConnect(code, create) {
    code = (code || "").toUpperCase().trim();
    if (!/^[A-Z0-9]{4,8}$/.test(code)) { NET.err = "房间号不对"; renderLobby(); return; }

    /* 同一时刻只能有一次连接在跑。
       这个函数是 async 的（中间要 await 探服务器），
       双击「进去」、或者探测那几秒里切了下屏触发了重连，
       就会同时开出两条连接；服务端「一个座位只留一条」会把先来的踢掉，
       被踢的 onclose 又去重连，两条互相踢 —— 界面上就是反复断线重连、
       准备都点不了。这里用一个代号把旧的全部作废。 */
    var gen = (NET.gen = (NET.gen || 0) + 1);
    if (NET.retryTimer) { clearTimeout(NET.retryTimer); NET.retryTimer = null; }
    if (NET.ws) {
      try { NET.ws.onclose = null; NET.ws.onmessage = null; NET.ws.onopen = null; } catch (e) {}
      try { NET.ws.close(); } catch (e) {}
      NET.ws = null;
    }
    stopHeartbeat();

    NET.want = true;
    NET.code = code;
    NET.status = create ? "正在开房…" : "正在进房…";
    NET.err = "";
    renderLobby();

    var base = await ensureServer(false);
    if (gen !== NET.gen) return;   /* 等探测的这几秒里又发起了新的连接，这次作废 */
    if (!base) { NET.status = ""; NET.err = BLOCKED_HINT; NET.showFix = true; renderLobby(); return; }
    if (!NET.want) return;   /* 探测那几秒里她可能已经退出去了 */
    NET.status = create ? "正在开房…" : "正在进房…";

    var wsUrl = base.replace(/^http/, "ws") + "/ws?code=" + encodeURIComponent(code) +
                "&token=" + encodeURIComponent(netToken()) +
                "&name=" + encodeURIComponent(netName()) +
                (create ? "&create=1" : "");
    var ws;
    try { ws = new WebSocket(wsUrl); } catch (e) {
      NET.status = ""; NET.err = BLOCKED_HINT; NET.showFix = true; renderLobby(); return;
    }
    NET.ws = ws;

    /* 握手也要掐时间。被墙的地址上 new WebSocket() 不会报错，
       它会一声不吭地卡到系统超时，界面就那么干等着。 */
    var openTimer = setTimeout(function () {
      if (ws.readyState !== 1) { try { ws.close(); } catch (e) {} }
    }, WS_OPEN_MS);

    ws.onopen = function () {
      if (gen !== NET.gen) { try { ws.close(); } catch (e) {} return; }
      clearTimeout(openTimer);
      NET.retry = 0;
      NET.status = "";
      NET.showFix = false;
      startHeartbeat();
      renderLobby();
    };
    ws.onmessage = function (ev) {
      if (gen !== NET.gen) return;   /* 早就被顶替的连接，收到什么都不算数 */
      NET.lastHeard = Date.now();
      var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === "pong") { NET.sawPong = true; return; }
      netOnMsg(m);
    };
    ws.onclose = function () {
      clearTimeout(openTimer);
      if (gen !== NET.gen) return;   /* 是被新连接顶掉的，不该触发重连 */
      stopHeartbeat();
      if (!NET.want) return;
      NET.retry++;
      /* 连着几次都不行，说明这台是真不通了，下一轮重新挑一台 */
      if (NET.retry >= 2) NET.base = null;
      if (NET.retry >= 4) {
        NET.want = false;
        NET.status = ""; NET.err = BLOCKED_HINT; NET.showFix = true;
        if (ui.screen === "net") renderLobby(); else setMsg("联机断了，连不上服务器", true);
        return;
      }
      NET.status = "断线了，正在重连…";
      if (ui.screen === "net") renderLobby();
      else setMsg("断线了，正在重连…", true);
      var wait = Math.min(4000, 600 * NET.retry);
      NET.retryTimer = setTimeout(function () {
        if (NET.want) netConnect(NET.code, false);
      }, wait);
    };
    ws.onerror = function () {};
  }

  /* 心跳：手机网络切换、后台挂起之后，连接经常是「看着还在、其实已经死了」。
     每 20 秒问一声，45 秒听不到任何回音就当断了，主动重连。 */
  function startHeartbeat() {
    stopHeartbeat();
    NET.lastHeard = Date.now();
    NET.hbTimer = setInterval(function () {
      if (!NET.ws || NET.ws.readyState !== 1) return;
      /* 只有确认服务端会回 pong，才敢把「长时间没声音」当成掉线。
         老版本服务端不认 ping，那种情况下静默是正常的，不能瞎断。 */
      if (NET.sawPong && Date.now() - NET.lastHeard > 45000) {
        try { NET.ws.close(); } catch (e) {}   /* 交给 onclose 走重连 */
        return;
      }
      netSend({ t: "ping" });
    }, 20000);
  }
  function stopHeartbeat() {
    if (NET.hbTimer) { clearInterval(NET.hbTimer); NET.hbTimer = null; }
  }

  /* 手动体检：把每台服务器的结果摊开给用户看 */
  async function netDiagnose() {
    NET.diag = { running: true, rows: [] };
    renderLobby();
    var list = serverList();
    var rows = await Promise.all(list.map(probeServer));
    NET.diag = { running: false, rows: rows, online: navigator.onLine !== false };
    NET.showFix = rows.every(function (r) { return !r.ok; });
    renderLobby();
  }

  /* ── 收消息 ── */
  function netOnMsg(m) {
    if (m.t === "err") {
      NET.want = false;
      NET.status = ""; NET.err = m.m || "出错了";
      if (ui.screen !== "net") showScreen("net"); else renderLobby();
      return;
    }
    if (m.t === "room") {
      NET.seats = m.seats || [];
      NET.opts = m.opts;
      NET.started = !!m.started;
      NET.code = m.code || NET.code;
      if (m.you != null) NET.seat = m.you;
      NET.isHost = !!(NET.seats[NET.seat] && NET.seats[NET.seat].host);
      if (ui.screen === "net") renderLobby();
      return;
    }
    if (m.t === "deal") { netStartGame(m); return; }
    if (m.t === "resume") { netResume(m); return; }
    if (m.t === "turn") { netTurn(m); return; }
    if (m.t === "drew") { netDrew(m); return; }
    if (m.t === "drewn") { netDrewOther(m); return; }
    if (m.t === "discard") { netDiscard(m); return; }
    if (m.t === "claim") { netClaim(m); return; }
    if (m.t === "meld") { netMeld(m); return; }
    if (m.t === "over") { netOver(m); return; }
    if (m.t === "aiask") { netAiAsk(m); return; }
    if (m.t === "aiclaim") { netAiClaim(m); return; }

    /* 走到这儿说明服务端发了一条这个版本不认识的消息。
       以前是直接掉地上 —— 牌局无声停住，控制台干干净净，没法查。
       实际最可能的原因是这台手机缓存着旧版本（老人的手机常年不清缓存），
       所以顺手提示一句去更新。_测试_协议.mjs 会在提交前拦住真正的协议漂移。 */
    console.warn("收到不认识的消息类型：", m.t, m);
    if (!NET.sawUnknown) {
      NET.sawUnknown = true;
      toast("这台手机上的版本可能太旧了，退出重进一次试试", 4000);
      checkVersion();
    }
  }

  /* ── 把服务端消息塞进本地 game 对象，渲染照旧 ── */
  function fakeTiles(n, keyPrefix) {
    var a = [];
    for (var i = 0; i < n; i++) a.push({ id: -(i + 1), key: keyPrefix || "z1" });
    return a;
  }
  function toTiles(arr) {
    var a = [];
    for (var i = 0; i < (arr || []).length; i++) {
      var x = arr[i];
      a.push(typeof x === "string" ? { id: -(i + 1000), key: x } : { id: x.id, key: x.key });
    }
    return a;
  }
  /* 联机时座位要转一圈：服务器的 0..3 是绝对座位，本地渲染永远把「我」放在 0 */
  function rel(seat) { return (seat - NET.seat + 4) % 4; }
  function abs(local) { return (local + NET.seat) % 4; }

  function netStartGame(m) {
    NET.seat = m.seat;
    ui.online = true;
    NET.started = true;
    if (m.opts) {
      settings.base = m.opts.base; settings.flowerScore = m.opts.flowerScore;
      settings.cap = m.opts.cap;
    }
    game = newGameState(false);
    game.online = true;
    game.round = m.round;
    game.dealer = rel(m.dealer);
    game.over = false;
    for (var i = 0; i < 4; i++) {
      var a = abs(i);
      game.players[i].name = NET.seats[a] ? NET.seats[a].name : NAMES[i];
      game.players[i].hand = [];
      game.players[i].melds = [];
      game.players[i].flowers = toTiles((m.flowers && m.flowers[a]) || []);
      game.players[i].discards = [];
    }
    game.players[0].hand = toTiles(m.hand);
    for (var j = 1; j < 4; j++) game.players[j].hand = fakeTiles(m.counts[abs(j)]);
    game.wall = fakeTiles(m.wall);
    game.current = rel(m.dealer);
    game.phase = "discard";
    clearFlowerWait();   /* 上一盘要是停在补花上，标记不清会把新的一盘也锁死 */
    game.drewThisTurn = true;
    sortHand(game.players[0]);
    showScreen("table");
    render();
    netRefreshBar();
    setMsg("开局，庄家是 " + game.players[game.dealer].name, true);
  }

  function netResume(m) {
    NET.seat = m.seat;
    ui.online = true;
    NET.started = true;
    if (!game) game = newGameState(false);
    game.online = true;
    game.round = m.round;
    game.dealer = rel(m.dealer);
    game.over = !!m.over;
    for (var i = 0; i < 4; i++) {
      var a = abs(i);
      game.players[i].name = NET.seats[a] ? NET.seats[a].name : NAMES[i];
      game.players[i].melds = (m.melds && m.melds[a]) || [];
      game.players[i].flowers = toTiles((m.flowers && m.flowers[a]) || []);
      game.players[i].discards = toTiles((m.discards && m.discards[a]) || []);
      game.players[i].hand = i === 0 ? toTiles(m.hand) : fakeTiles(m.counts[a]);
    }
    game.wall = fakeTiles(m.wall);
    game.current = rel(m.current);
    game.lastDiscard = m.lastDiscard || null;
    game.lastFrom = m.lastFrom >= 0 ? rel(m.lastFrom) : -1;
    game.phase = m.needFlower ? "flower" : "discard";
    clearFlowerWait();   /* 掉线期间可能已经被兜底补掉了，旧标记一律作废 */
    sortHand(game.players[0]);
    showScreen("table");
    render();
    if (m.needFlower) { netAskFlower(); setMsg("接上了，先把花补掉", true); return; }
    /* 掉线的那一刻正好有人在问我碰不碰，服务端把这个问题随 resume 带回来了。
       不接住的话，牌桌会一直等我这个永远不会来的回答。 */
    if (m.claim) { netClaim(m.claim); setMsg("接上了，还有一张牌等你决定", true); return; }
    netRefreshBar();
    setMsg("接上了", true);
  }

  function netTurn(m) {
    if (!game) return;
    game.current = rel(m.who);
    game.wall = fakeTiles(m.wall);
    for (var i = 0; i < 4; i++) if (i !== 0) game.players[i].hand = fakeTiles(m.counts[abs(i)]);
    game.phase = m.phase || "discard";
    /* 我这轮还欠着一张花：保住「补花」按钮，别被这条 turn 冲掉 */
    if (game.phase === "flower" && game.current === 0) { netAskFlower(); return; }
    setClaim("");
    render();
    netRefreshBar();
    if (game.current === 0) { say("act_your"); sfx("turn"); setMsg("该你出牌了", true); }
    else setMsg("轮到 " + game.players[game.current].name, false);
  }

  function netDrew(m) {
    if (!game) return;
    game.players[0].hand = toTiles(m.hand);
    game.players[0].lastDrawn = m.tile.key;
    if (m.flowers) {
      for (var i = 0; i < 4; i++) game.players[i].flowers = toTiles(m.flowers[abs(i)]);
    }
    game.drewThisTurn = true;
    sortHand(game.players[0]);
    sfx("draw");
    render();
    /* 服务端摸到花会停下来等我亲手补，不再替我补掉 */
    if (m.needFlower) { netAskFlower(); return; }
    netRefreshBar();
  }

  function netAskFlower() {
    var p = game.players[0], fl = null;
    for (var i = 0; i < p.hand.length; i++) if (isFlower(p.hand[i].key)) { fl = p.hand[i]; break; }
    if (!fl) { netRefreshBar(); return; }
    ui.selected = null;
    ui.hintId = null;
    ui.flowerId = fl.id;
    ui.flowerWait = true;   /* 联机下只是个标记，真正推进靠服务端回包 */
    setAct("");
    setClaim('<button type="button" class="btn-gang pop" data-act="flower">补花 ' + FLOWER[fl.key] + "</button>");
    setMsg("摸到「" + FLOWER[fl.key] + "」，点补花", true);
    sfx("flower");
    render();
  }

  function netSendFlower() {
    if (!ui.flowerWait) return;
    ui.flowerWait = null;
    ui.flowerId = null;
    setClaim("");
    netSend({ t: "act", a: "flower" });
  }

  /* 把挂起的补花状态抹掉。
     发牌、重连、一盘结束这三处都必须调 —— 否则会留下一个死结：
     人欠着花掉了线，服务端 30 秒兜底替他补掉并出了牌，
     他连回来 needFlower 已经是 false，可 ui.flowerWait 还留着 true，
     netRefreshBar() 第一行就 return，出牌按钮再也不出来，这一局就废了。 */
  function clearFlowerWait() {
    if (typeof ui.flowerWait === "function") { try { ui.flowerWait(); } catch (e) {} }
    ui.flowerWait = null;
    ui.flowerId = null;
  }

  function netDrewOther(m) {
    if (!game) return;
    game.wall = fakeTiles(m.wall);
    for (var i = 1; i < 4; i++) game.players[i].hand = fakeTiles(m.counts[abs(i)]);
    if (m.flowers) {
      for (var j = 0; j < 4; j++) game.players[j].flowers = toTiles(m.flowers[abs(j)]);
    }
    render();
  }

  function netDiscard(m) {
    if (!game) return;
    var who = rel(m.who);
    /* 同一张牌只记一次。服务端已经保证一个座位只有一条连接，
       但网络这种事不好说死 —— 重复收到就当没收到，
       否则牌河里会多出一张，整副牌变成 145 张。 */
    var dq = game.players[who].discards;
    for (var d = 0; d < dq.length; d++) if (dq[d].id === m.tile.id) return;
    dq.push({ id: m.tile.id, key: m.tile.key });
    game.lastDiscard = { id: m.tile.id, key: m.tile.key };
    game.lastFrom = who;
    ui.dropId = m.tile.id;
    if (m.counts) for (var i = 1; i < 4; i++) game.players[i].hand = fakeTiles(m.counts[abs(i)]);
    if (who === 0) {
      game.players[0].hand = game.players[0].hand.filter(function (t) { return t.id !== m.tile.id; });
      if (!game.players[0].passed) game.players[0].passed = [];
      if (game.players[0].passed.indexOf(m.tile.key) < 0) game.players[0].passed.push(m.tile.key);
    }
    sfx("discard");
    sayTile(m.tile.key);
    setMsg(game.players[who].name + " 打出 " + tileName(m.tile.key), false);
    setClaim("");
    render();
    netRefreshBar();
  }

  function netMeld(m) {
    if (!game) return;
    var who = rel(m.who);
    /* 这条消息处理过没有：服务器给的副露数比本地多，才是新的一副。
       重复处理会把下面那段「从手牌里删掉用掉的牌」再跑一遍，
       手牌会被多削两三张。 */
    var already = (m.melds[abs(who)] || []).length <= game.players[who].melds.length;
    for (var i = 0; i < 4; i++) game.players[i].melds = m.melds[abs(i)] || [];
    if (m.counts) for (var j = 1; j < 4; j++) game.players[j].hand = fakeTiles(m.counts[abs(j)]);
    if (who === 0 && !already) {
      /* 自己碰杠了，本地手牌按服务器口径重建：直接删掉用掉的牌 */
      var need = m.kind === "gang" ? (m.from === abs(0) ? 4 : 3) : 2;
      for (var n = 0; n < need; n++) {
        var ix = -1;
        for (var q = game.players[0].hand.length - 1; q >= 0; q--) {
          if (game.players[0].hand[q].key === m.key) { ix = q; break; }
        }
        if (ix < 0) break;
        game.players[0].hand.splice(ix, 1);
      }
      game.players[0].guoShui = false;
      game.players[0].passed = [];
    }
    var fromRel = rel(m.from);
    if (fromRel !== who) {
      game.players[fromRel].discards = game.players[fromRel].discards.filter(function (t) {
        return t.key !== m.key || game.lastDiscard == null || t.id !== game.lastDiscard.id;
      });
    }
    game.lastDiscard = null;
    speak(m.kind === "gang" ? "杠" : "碰");
    sfx(m.kind === "gang" ? "gang" : "peng");
    setMsg(game.players[who].name + (m.kind === "gang" ? " 杠" : " 碰"), true);
    setClaim("");
    render();
    netRefreshBar();
  }

  /* 服务端说「这张牌你可以要」，本地再用自己的规则判断到底给不给按 */
  function netClaim(m) {
    if (!game) return;
    var p = game.players[0];
    var info = m.hu ? checkHu(p, m.tile.key, { selfDraw: false }) : { ok: false };
    var html = "";
    if (m.hu && info.ok) html += '<button type="button" class="btn-hu pop" data-net="hu">胡</button>';
    if (m.gang) html += '<button type="button" class="btn-gang pop" data-net="gang">杠</button>';
    if (m.peng) html += '<button type="button" class="btn-peng pop" data-net="peng">碰</button>';
    html += '<button type="button" class="btn-pass" data-net="pass">过</button>';
    setClaim(html);
    if (m.hu && !info.ok && info.blocked === "guoshui") setReason("本轮过水，不能胡（摸牌或碰杠后解除）");
    else if (m.hu && !info.ok && info.blocked === "nofan") setReason("无花无番，只能自摸胡");
    else setReason("");
    NET.claimHuOk = !!(m.hu && info.ok);
    render();
  }

  function netOver(m) {
    if (!game) return;
    game.over = true;
    clearFlowerWait();   /* 这盘结束了，别把补花按钮和标记留到结算画面上 */
    game.nextDealer = rel(m.nextDealer);
    var rv = m.reveal;
    for (var i = 0; i < 4; i++) {
      var a = abs(i);
      game.players[i].hand = toTiles(rv.hands[a]);
      game.players[i].melds = rv.melds[a] || [];
      game.players[i].flowers = toTiles(rv.flowers[a]);
    }
    /* 摊牌之后，用本地引擎把分算出来 —— 四个人算的都是同一副牌，结果必然一致 */
    var reports = [], pays = [0, 0, 0, 0], payLines = [];
    var flags = { ron: !!m.flags.ron, selfDraw: !!m.flags.selfDraw,
                  from: m.flags.from != null ? rel(m.flags.from) : -1 };
    if (m.kind === "hu") {
      for (var w = 0; w < m.winners.length; w++) {
        var wi = rel(m.winners[w]);
        var wp = game.players[wi];
        var wk = m.flags.tile ? m.flags.tile.key : wp.lastDrawn;
        var info = analyzeWin(wp, wk, {
          selfDraw: !!m.flags.selfDraw, ron: !!m.flags.ron,
          addWin: !m.flags.selfDraw, from: flags.from
        });
        if (!info || !info.ok) info = analyzeWin(wp, wk, { selfDraw: true, addWin: false });
        var sc = info.score;
        reports.push({ i: wi, way: m.flags.selfDraw ? "自摸" : "点炮", score: sc, info: info });
        if (m.flags.ron && flags.from >= 0) {
          pays[wi] += sc; pays[flags.from] -= sc;
          payLines.push(game.players[flags.from].name + " 付给 " + wp.name + " " + sc + " 分");
        } else {
          for (var o = 0; o < 4; o++) if (o !== wi) {
            pays[wi] += sc; pays[o] -= sc;
            payLines.push(game.players[o].name + " 付给 " + wp.name + " " + sc + " 分");
          }
        }
      }
    }
    for (var q = 0; q < 4; q++) game.players[q].score += pays[q];
    game.settle = {
      type: m.kind === "hu" ? "hu" : "liuju",
      reports: reports, pays: pays, flags: flags, payLines: payLines
    };
    showSettle();
    netRefreshBar();
  }

  /* ── 房主替电脑做决定：直接复用本地那套 AI ── */
  function netAiPlayer(m) {
    return {
      name: "电脑", hand: toTiles(m.hand), melds: m.melds || [],
      flowers: toTiles(m.flowers || []), discards: [], guoShui: false, passed: [], score: 0
    };
  }
  function netAiAsk(m) {
    if (!game) return;
    var p = netAiPlayer(m);
    setTimeout(function () {
      /* 能胡就胡 */
      if (m.drew && canWinHand(p, null)) { netSend({ t: "act", a: "hu", forSeat: m.seat }); return; }
      var gangs = m.wall > 0 ? possibleGangs(p) : [];
      if (gangs.length && aiWantGang(p, gangs[0].key, gangs[0].kind)) {
        netSend({ t: "act", a: "gang", key: gangs[0].key, forSeat: m.seat });
        return;
      }
      var t = aiChooseDiscard(p);
      if (!t) t = p.hand[p.hand.length - 1];
      netSend({ t: "act", a: "discard", id: t.id, forSeat: m.seat });
    }, SPEED[settings.speed] || 1500);
  }
  function netAiClaim(m) {
    var p = netAiPlayer(m);
    setTimeout(function () {
      var pick = "pass";
      if (m.hu) {
        var info = checkHu(p, m.tile.key, { selfDraw: false });
        if (info.ok) pick = "hu";
      }
      if (pick === "pass" && m.gang && aiWantGang(p, m.tile.key, "ming")) pick = "gang";
      if (pick === "pass" && m.peng && aiWantPeng(p, m.tile.key)) pick = "peng";
      netSend({ t: "act", a: "claim", pick: pick, forSeat: m.seat });
    }, Math.min(900, (SPEED[settings.speed] || 1500) * 0.6));
  }

  /* ── 联机时的操作条 ── */
  function netRefreshBar() {
    if (!game || !game.online) return;
    if (game.over || game.current !== 0) { setAct(""); return; }
    /* 还欠着花，先别给出牌/胡/杠的按钮 */
    if (ui.flowerWait || game.phase === "flower") { setAct(""); return; }
    var p = game.players[0];
    var btns = "";
    if (game.drewThisTurn && canWinHand(p, null)) {
      btns += '<button type="button" class="btn-hu pop" data-net="selfhu">胡</button>';
    }
    var gangs = game.wall.length ? possibleGangs(p) : [];
    if (gangs.length) btns += '<button type="button" class="btn-gang pop" data-net="selfgang">杠</button>';
    if (luck().assist) btns += '<button type="button" class="btn-hint" id="a-hint">提示</button>';
    btns += '<button type="button" class="btn-play" data-net="play">打出</button>';
    setAct(btns);
  }

  function netPlaySelected() {
    if (!game || !game.online || game.current !== 0) { toast("还没轮到你"); return; }
    if (ui.selected == null) { toast("请先点选一张牌，再按打出"); return; }
    var t = null, p = game.players[0];
    for (var i = 0; i < p.hand.length; i++) if (p.hand[i].id === ui.selected) t = p.hand[i];
    if (!t) { toast("请先点选一张牌"); return; }
    if (isFlower(t.key)) { toast("花牌点「补花」亮出去，不能当废牌打"); return; }
    netSend({ t: "act", a: "discard", id: t.id });
    ui.selected = null; ui.hintId = null;
    setAct("");
  }

  /* 联机的动作按钮统一走 data-net */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-net]");
    if (!b || !game || !game.online) return;
    var a = b.getAttribute("data-net");
    if (a === "play") { netPlaySelected(); return; }
    if (a === "selfhu") { netSend({ t: "act", a: "hu" }); setAct(""); return; }
    if (a === "selfgang") {
      var gangs = possibleGangs(game.players[0]);
      if (gangs.length) netSend({ t: "act", a: "gang", key: gangs[0].key });
      setAct("");
      return;
    }
    if (a === "hu" || a === "gang" || a === "peng" || a === "pass") {
      if (a === "pass" && NET.claimHuOk) game.players[0].guoShui = true;
      netSend({ t: "act", a: "claim", pick: a });
      setClaim(""); setReason("");
      return;
    }
  });

  /* ── 房间界面 ── */
  function renderLobby() {
    var el = document.getElementById("net-body");
    var base = netBase();
    var h = "";

    if (!NET.code || !NET.ws) {
      h += '<div class="prof-mini">' + avatarHTML() +
           '<span class="pm-txt"><b>' + esc(profNick()) + "</b>" +
           '<span class="pm-sub">进房间后别人看到的就是这个名字</span></span>' +
           '<button type="button" class="icon-btn tiny" id="net-editprof">改</button></div>';
      h += '<div class="net-actions">' +
           '<button type="button" class="big-btn" id="net-create">开一个房间</button>' +
           "</div>";
      h += '<div class="set-row"><label>用房间号进房</label>' +
           '<input class="net-input up" id="net-code" maxlength="8" placeholder="房间号">' +
           '<button type="button" class="icon-btn" id="net-join">进去</button></div>';
      if (NET.status) h += '<p class="set-hint">' + esc(NET.status) + "</p>";
      if (NET.err) h += '<p class="set-hint warn">' + esc(NET.err) + "</p>";

      h += '<h3>怎么玩</h3><ul>' +
           "<li>一个人开房，把房间号或链接发给朋友。</li>" +
           "<li>最多四个人，不够的位子自动用电脑补上。</li>" +
           "<li>大家都点了「准备好了」，房主才能开始。</li>" +
           "<li>牌是服务器发的，每个人只收到自己的牌，房主也看不到别人的。</li>" +
           "</ul>";

      /* 服务器状态：默认已经内置好，一般不用管 */
      h += '<h3>联机服务器</h3>';
      h += '<div class="srv-card' + (usingDefault() ? "" : " custom") + '">' +
           '<div class="srv-row"><span class="srv-tag">' +
           (usingDefault() ? "已内置，可以直接用" : "用的是你自己的") + "</span></div>" +
           '<div class="srv-url" id="srv-url">' + esc(base) + "</div>" +
           '<div class="srv-btns">' +
           '<button type="button" class="icon-btn" id="srv-check">检查网络</button>' +
           '<button type="button" class="icon-btn" id="srv-copy">复制网址</button>' +
           '<button type="button" class="icon-btn" id="srv-edit">改成别的</button>' +
           (usingDefault() ? "" :
             '<button type="button" class="icon-btn danger" id="srv-reset">用回默认</button>') +
           "</div></div>";
      h += diagHTML();
      if (NET.editSrv) {
        h += '<div class="set-row"><label>服务器地址</label>' +
             '<input class="net-input" id="net-server" placeholder="https://xxx.workers.dev" value="' +
             esc(settings.server || "") + '">' +
             '<button type="button" class="icon-btn" id="net-save">保存</button></div>';
      }

      /* 连不上怎么办：进不去房间时自动展开 */
      h += '<h3 class="fold' + (NET.showFix ? " open" : "") + '" id="fix-fold">' +
           "连不上怎么办<span class=\"fold-i\">▾</span></h3>";
      if (NET.showFix) h += fixHTML();

      /* 自己搭一台（可选），默认收起来 */
      h += '<h3 class="fold' + (NET.showDeploy ? " open" : "") + '" id="deploy-fold">' +
           "自己搭一台服务器（可选）<span class=\"fold-i\">▾</span></h3>";
      if (NET.showDeploy) {
        h += '<div class="deploy">' +
          "<p>上面那台是现成的，<strong>一般不用自己搭</strong>。" +
          "如果你想要一台完全属于自己的（或者上面那台连不上），按下面四步做，" +
          "<strong>全程免费</strong>，不用买服务器、不用买域名、不用备案。</p>" +

          '<div class="dstep"><div class="dt">1. 装 Node.js</div>' +
          '<p>电脑上没有的话，去 <span class="mono">nodejs.org</span> 下载 LTS 版装上。</p></div>' +

          '<div class="dstep"><div class="dt">2. 注册 Cloudflare</div>' +
          '<p><span class="mono">dash.cloudflare.com/sign-up</span>　免费，不用填信用卡。</p></div>' +

          '<div class="dstep"><div class="dt">3. 部署房间逻辑</div>' +
          '<p>打开 PowerShell，先 <span class="mono">cd</span> 到项目里的 ' +
          '<span class="mono">_服务端</span> 文件夹，然后依次执行：</p>' +
          cmdRow("npx wrangler login", "会弹浏览器让你授权") +
          cmdRow("npx wrangler deploy", "部署，几秒钟") +
          '<p>它会打印一个 <span class="mono">workers.dev</span> 网址，' +
          "<strong>那个地址国内进不去，用不到</strong>，忽略就行。</p></div>" +

          '<div class="dstep"><div class="dt">4. 部署对外入口</div>' +
          '<p>再 <span class="mono">cd</span> 到 <span class="mono">_服务端Pages</span> 文件夹：</p>' +
          cmdRow("npx wrangler pages deploy", "这一步才给出能用的网址") +
          '<p>打印出来的 <span class="mono">https://xxx.pages.dev</span> 才是你的服务器网址。' +
          "国内直连就能通。</p></div>" +

          '<div class="dstep"><div class="dt">5. 填回来</div>' +
          '<p>回到这一页，点上面的<strong>「改成别的」</strong>，把 pages.dev 那个网址粘进去保存。' +
          "每台要联机的手机都填一次。</p></div>" +

          "<p class=\"dnote\">日常不用维护。免费额度是每天 10 万次请求，" +
          "几个人打麻将用不掉零头。</p>" +
          "</div>";
      }
      el.innerHTML = h;
      return;
    }

    var link = shareLink(NET.code);
    h += '<div class="room-head"><div class="room-code">' + esc(NET.code) + "</div>" +
         '<div class="room-sub">把这个房间号告诉朋友，或者发下面的链接</div></div>';
    h += '<div class="set-row"><label>邀请链接</label>' +
         '<input class="net-input" id="net-link" readonly value="' + esc(link) + '">' +
         '<button type="button" class="icon-btn" id="net-copy">复制</button></div>';

    h += "<h3>座位</h3><div class=\"seat-list\">";
    for (var i = 0; i < NET.seats.length; i++) {
      var s = NET.seats[i];
      var mine = (i === NET.seat);
      var tag = s.host ? '<span class="st host">房主</span>' :
                (s.ai ? '<span class="st ai">电脑</span>' :
                (s.ready ? '<span class="st ok">准备好了</span>' : '<span class="st wait">还没准备</span>'));
      var off = (!s.ai && !s.online) ? '<span class="st off">掉线</span>' : "";
      h += '<div class="seat-row' + (mine ? " me" : "") + '">' +
           '<span class="sn">' + esc(s.name) + (mine ? "（你）" : "") + "</span>" + tag + off;
      if (NET.isHost && !s.ai && i !== NET.seat && !NET.started) {
        h += '<button type="button" class="icon-btn danger tiny" data-kick="' + i + '">请出去</button>';
      }
      h += "</div>";
    }
    h += "</div>";

    if (NET.isHost && !NET.started) {
      h += "<h3>电脑难度</h3><div class=\"seg\">";
      var lv = [["wild", "瞎打"], ["rookie", "新手"], ["normal", "普通"], ["master", "高手"]];
      for (var k = 0; k < lv.length; k++) {
        var on = NET.opts && NET.opts.difficulty === lv[k][0] ? " on" : "";
        h += '<button type="button" class="' + on.trim() + '" data-diff="' + lv[k][0] + '">' + lv[k][1] + "</button>";
      }
      h += "</div>";
      /* 只数还在线的。有人手机锁屏掉线了，不该把房主卡在这儿开不了局 */
      var waiting = NET.seats.filter(function (x) { return !x.ai && x.online && !x.ready; }).length;
      var offline = NET.seats.filter(function (x) { return !x.ai && !x.online; }).length;
      h += '<div class="net-actions">' +
           '<button type="button" class="big-btn" id="net-start"' + (waiting ? " disabled" : "") + '>' +
           (waiting ? "还有 " + waiting + " 人没准备" : "开始游戏") + "</button></div>";
      if (!waiting && offline) {
        h += '<p class="set-hint">有 ' + offline + " 人掉线了，可以先开始 —— " +
             "他们回来还是原来的座位，中途也能接着打。</p>";
      }
    } else if (!NET.started) {
      var meSeat = NET.seats[NET.seat];
      var rdy = meSeat && meSeat.ready;
      h += '<div class="net-actions">' +
           '<button type="button" class="big-btn' + (rdy ? " alt" : "") + '" id="net-ready">' +
           (rdy ? "取消准备" : "准备好了") + "</button></div>";
    } else {
      h += '<div class="net-actions"><button type="button" class="big-btn" id="net-back">回到牌桌</button></div>';
    }

    if (NET.status) h += '<p class="set-hint">' + esc(NET.status) + "</p>";
    if (NET.err) h += '<p class="set-hint warn">' + esc(NET.err) + "</p>";
    h += '<div class="net-actions"><button type="button" class="icon-btn danger" id="net-leave">离开房间</button></div>';
    el.innerHTML = h;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* 体检结果：哪台通、多快、不通是卡在哪一步 */
  function diagHTML() {
    if (!NET.diag) return "";
    if (NET.diag.running) return '<p class="set-hint">正在挨个试…最多 6 秒</p>';
    var rows = NET.diag.rows, h = '<div class="diag">', i;
    if (!NET.diag.online) {
      h += '<div class="diag-row bad"><span class="dg-i">✕</span>手机现在没有网，先连上 WiFi 或数据</div>';
    }
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      h += '<div class="diag-row ' + (r.ok ? "good" : "bad") + '">' +
           '<span class="dg-i">' + (r.ok ? "✓" : "✕") + "</span>" +
           '<span class="dg-u">' + esc(r.base.replace(/^https?:\/\//, "")) + "</span>" +
           '<span class="dg-m">' + (r.ok ? r.ms + " 毫秒" : esc(r.why)) + "</span></div>";
    }
    var anyOk = rows.some(function (x) { return x.ok; });
    h += '<p class="dg-sum">' + (anyOk
      ? "能连上，可以开房间了。"
      : "一台都连不上。手机有网的话，那就是这些网址在国内被拦了——看下面。") + "</p>";
    return h + "</div>";
  }

  /* 连不上的原因和解法。写给装这个游戏的人看，不是给老人看的 */
  function fixHTML() {
    return '<div class="deploy">' +
      "<p><strong>症状</strong>：点「开一个房间」一直转圈，或者等一会儿说连不上。</p>" +

      "<p><strong>原因</strong>：老地址的后缀是 " +
      '<span class="mono">.workers.dev</span>，它在国内被拦了两道——' +
      "查域名返回的是假 IP（Facebook 的地址段），就算手工指对 IP，" +
      "握手时按域名还会被掐断。挂梯子能用、不挂就不行，就是这个原因。</p>" +

      '<div class="dstep"><div class="dt">解法：换成 pages.dev，不花钱</div>' +
      "<p>同一批 Cloudflare 机器，<span class=\"mono\">.pages.dev</span> 这个后缀国内直连是通的" +
      "（实测 120~280 毫秒），只是换个门牌号。<strong>不用买域名、不用备案、不用挂梯子。</strong>" +
      "内置地址已经指过去了，正常情况下你什么都不用做。</p></div>" +

      "<p>如果这台也连不上（比如你自己搭了一套），按下面两步重新部署：</p>" +

      '<div class="dstep"><div class="dt">1. 部署房间逻辑</div>' +
      '<p>PowerShell 里 <span class="mono">cd</span> 到项目的 ' +
      '<span class="mono">_服务端</span> 文件夹，跑：</p>' +
      cmdRow("npx wrangler deploy", "房间逻辑，地址被墙没关系，用不到") + "</div>" +

      '<div class="dstep"><div class="dt">2. 部署对外入口</div>' +
      '<p>再 <span class="mono">cd</span> 到 <span class="mono">_服务端Pages</span> 文件夹，跑：</p>' +
      cmdRow("npx wrangler pages deploy", "这一步给出 pages.dev 网址") +
      "<p>完成后打印的 <span class=\"mono\">https://xxx.pages.dev</span> 就是要填的地址。</p></div>" +

      '<div class="dstep"><div class="dt">3. 填回来</div>' +
      "<p>点上面的<strong>「改成别的」</strong>把网址粘进去，保存后会自动体检。" +
      "打勾就成了，每台手机填一次。</p></div>" +

      "<p class=\"dnote\">游戏会记住哪台通，以后先试那一台；" +
      "哪天不通了会自动去试别的，不用手动切。</p>" +
      "</div>";
  }

  /* 一条可以一键复制的命令 */
  function cmdRow(cmd, note) {
    return '<div class="cmd"><code>' + esc(cmd) + "</code>" +
           '<button type="button" class="icon-btn tiny" data-cmd="' + esc(cmd) + '">复制</button>' +
           (note ? '<span class="cmd-note">' + esc(note) + "</span>" : "") + "</div>";
  }

  document.getElementById("net-body").addEventListener("click", function (e) {
    var t = e.target;
    if (t.id === "net-save") {
      var v = (document.getElementById("net-server").value || "").trim();
      settings.server = v; saveSettings();
      NET.err = ""; NET.editSrv = false;
      NET.base = null; NET.diag = null;   /* 换了地址，之前探测的结果作废 */
      toast(v ? "服务器地址保存好了" : "已改回默认服务器");
      renderLobby();
      netDiagnose();                      /* 顺手替她验一下新地址通不通 */
      return;
    }
    if (t.id === "srv-copy") { copyText(netBase(), "网址复制好了，发给朋友"); return; }
    if (t.id === "srv-check") { NET.base = null; netDiagnose(); return; }
    if (t.id === "srv-edit") { NET.editSrv = !NET.editSrv; renderLobby(); return; }
    if (t.id === "srv-reset") {
      settings.server = ""; saveSettings(); NET.editSrv = false;
      NET.base = null; NET.diag = null;
      toast("已改回默认服务器"); renderLobby(); return;
    }
    if (t.id === "fix-fold" || (t.closest && t.closest("#fix-fold"))) {
      NET.showFix = !NET.showFix; renderLobby(); return;
    }
    if (t.id === "deploy-fold" || (t.closest && t.closest("#deploy-fold"))) {
      NET.showDeploy = !NET.showDeploy; renderLobby(); return;
    }
    var cmd = t.getAttribute && t.getAttribute("data-cmd");
    if (cmd) { copyText(cmd, "命令复制好了，去 PowerShell 里粘贴"); return; }
    if (t.id === "net-editprof") {
      ui.screenReturn = "net";
      ui.mineOpen.prof = true; ui.mineFocus = "prof";
      showScreen("mine"); return;
    }
    if (t.id === "net-create") { netCreate(); return; }
    if (t.id === "net-join") {
      netConnect(document.getElementById("net-code").value, false); return;
    }
    if (t.id === "net-copy") {
      var inp = document.getElementById("net-link");
      inp.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e2) {}
      if (!ok && navigator.clipboard) { navigator.clipboard.writeText(inp.value).catch(function () {}); ok = true; }
      toast(ok ? "链接复制好了，发给朋友" : "请长按上面的链接手动复制");
      return;
    }
    if (t.id === "net-ready") {
      var me = NET.seats[NET.seat];
      netSend({ t: "ready", v: !(me && me.ready) });
      return;
    }
    if (t.id === "net-start") { netSend({ t: "start" }); return; }
    if (t.id === "net-back") { showScreen("table"); return; }
    if (t.id === "net-leave") {
      netClose();
      showScreen("home");
      return;
    }
    var kick = t.getAttribute && t.getAttribute("data-kick");
    if (kick != null) { netSend({ t: "kick", seat: parseInt(kick, 10) }); return; }
    var d = t.getAttribute && t.getAttribute("data-diff");
    if (d) { netSend({ t: "opts", difficulty: d }); return; }
  });

  /* 链接里带房间号就直接进 */
  function netAutoJoin() {
    var mm = /[?&]room=([A-Za-z0-9]{4,8})/.exec(location.search);
    if (!mm) return;
    showScreen("net");
    if (netBase()) netConnect(mm[1], false);
  }

  /* ── 新版本检测 ──
     Service Worker 装好新版后会通知这里。就算用户不点更新按钮，
     下次重新打开也会用上新版，按钮只是让它立刻生效。 */
  function showUpdateBar() {
    var el = document.getElementById("update-bar");
    if (el) el.classList.remove("hidden");
  }

  /* 主动问服务器现在最新是几版。断网时静默失败，不打扰。
     比只听 Service Worker 可靠：只改 index.html 没改 sw.js 时也能发现新版。 */
  function checkVersion() {
    try {
      fetch("./version.json?t=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && j.version && j.version !== VERSION) showUpdateBar();
        })
        .catch(function () {});
    } catch (e) {}
  }
  function watchForUpdate(reg) {
    if (!reg) return;
    function track(w) {
      if (!w) return;
      w.addEventListener("statechange", function () {
        if (w.state === "installed" && navigator.serviceWorker.controller) showUpdateBar();
      });
    }
    track(reg.installing);
    track(reg.waiting);
    reg.addEventListener("updatefound", function () { track(reg.installing); });
    try { reg.update(); } catch (e) {}
  }
