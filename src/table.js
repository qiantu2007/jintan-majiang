/* 金坛麻将 · 牌桌的画面与操作
 * 四家座位、牌河、自己那手牌、操作栏、点牌选牌、提示、倒计时。
 * 只管画和收操作，不管规则也不管流程。
 *
 * 由 构建.mjs 拼进 index.html。改这里，不要改根目录那个。 */

  var htmlCache = {};
  function setHTML(el, html) {
    if (htmlCache[el.id] === html) return false;
    htmlCache[el.id] = html;
    el.innerHTML = html;
    return true;
  }

  function render() {
    if (!game) return;
    var rem = document.getElementById("remain");
    rem.textContent = "剩余 " + game.wall.length + " 张　第" + game.round + "盘";
    rem.classList.toggle("low", game.wall.length <= 12);
    renderPurse();
    document.getElementById("btn-undo").classList.toggle("hidden", !game.undo);
    renderSeat(1);
    renderSeat(2);
    renderSeat(3);
    renderCenter();
    renderMe();
  }

  function renderSeat(i) {
    var p = game.players[i];
    var turn = game.current === i && !game.over;
    var z = game.dealer === i ? '<span class="zhuang">庄</span>' : "";
    var fl = p.flowers.length ? '<span class="np-fl">花' + p.flowers.length + "</span>" : "";
    var np = '<div class="nameplate' + (turn ? " turn" : "") + '">' + z + NAMES[i] +
             "<span>" + p.score + "</span>" + fl + "</div>";

    var backs = '<div class="rack ' + (i === 2 ? "h" : "v") + '">';
    for (var k = 0; k < p.hand.length; k++) backs += '<i class="tb"></i>';
    backs += "</div>";

    var ex = "";
    if (p.melds.length || p.flowers.length) {
      ex = '<div class="melds-mini">';
      for (var m = 0; m < p.melds.length; m++) ex += meldHTML(p.melds[m], "sm");
      if (p.flowers.length) {
        ex += '<div class="flowers-mini">';
        for (var f = 0; f < p.flowers.length; f++) ex += mjHTML(p.flowers[f].key, { size: "sm" });
        ex += "</div>";
      }
      ex += "</div>";
    }

    setHTML(document.getElementById("seat-" + i), np + backs + ex);
  }

  function meldHTML(m, size) {
    var h = '<div class="meld-g">';
    var n = m.type === "gang" ? 4 : 3;
    for (var i = 0; i < n; i++) {
      var back = m.type === "gang" && m.concealed && (i === 0 || i === 3);
      h += mjHTML(m.key, { size: size || "sm", back: back });
    }
    return h + "</div>";
  }

  var RIVER_AREA = ["rv-me", "rv-right", "rv-opp", "rv-left"];
  var RIVER_CAP = [20, 12, 20, 12];

  function renderCenter() {
    var ci;
    if (game.lastDiscard) {
      ci = '<div class="lab">' + NAMES[game.lastFrom] + " 打出</div>" +
           mjHTML(game.lastDiscard.key, { size: "md", last: true });
    } else {
      ci = '<div class="lab">庄家</div><div class="big">' + NAMES[game.dealer] + "</div>";
    }
    /* 轮到电脑时写明是哪一家在想，省得盯着找高亮。
       轮到自己时不写——下面已经有一行金色的「该你出牌了」，别重复。 */
    if (!game.over && game.current !== 0) {
      ci += '<div class="turn-of">轮到 ' + NAMES[game.current] + "</div>";
    }
    setHTML(document.getElementById("last-play"), ci);

    var html = "";
    for (var i = 0; i < 4; i++) {
      var arr = game.players[i].discards;
      var start = Math.max(0, arr.length - RIVER_CAP[i]);
      html += '<div class="rv ' + RIVER_AREA[i] + '">';
      for (var j = start; j < arr.length; j++) {
        var isLast = !!(game.lastDiscard && arr[j].id === game.lastDiscard.id);
        html += mjHTML(arr[j].key, { size: "sm", last: isLast, drop: ui.dropId === arr[j].id });
      }
      html += "</div>";
    }
    setHTML(document.getElementById("discards"), html);
    ui.dropId = null;   /* 动画只放一次，之后重绘不再触发 */
  }

  function renderMe() {
    var p = game.players[0];
    var myTurn = game.current === 0 && (game.phase === "discard" || game.phase === "play") &&
                 !ui.claimWait && !game.over;
    document.getElementById("me").classList.toggle("turn", myTurn && !ui.paused);
    document.getElementById("turn-hint").classList.toggle("on", myTurn && !ui.paused);

    var fl = "";
    for (var i = 0; i < p.flowers.length; i++) fl += mjHTML(p.flowers[i].key, { size: "sm" });
    setHTML(document.getElementById("my-flowers"), fl);

    var md = "";
    for (var j = 0; j < p.melds.length; j++) md += meldHTML(p.melds[j], "md");
    setHTML(document.getElementById("my-melds"), md);

    /* 横屏下手牌一行排完；刚摸进来的那张加高亮，方便看出是哪张 */
    var freshAt = -1;
    if (myTurn && game.drewThisTurn && p.lastDrawn) {
      for (var q = 0; q < p.hand.length; q++) {
        if (p.hand[q].key === p.lastDrawn) { freshAt = q; break; }
      }
    }
    var hh = "";
    for (var t = 0; t < p.hand.length; t++) {
      var tile = p.hand[t];
      var one = mjHTML(tile.key, { id: tile.id, sel: ui.selected === tile.id });
      if (ui.hintId === tile.id) one = one.replace('class="mj', 'class="mj hint');
      else if (t === freshAt && ui.selected !== tile.id) one = one.replace('class="mj', 'class="mj fresh');
      hh += one;
    }
    setHTML(document.getElementById("hand"), hh);

    var waits = [];
    if (luck().assist && p.hand.length === 13 - 3 * p.melds.length) waits = waitingTiles(p);
    var tb = document.getElementById("ting-bar");
    if (waits.length && !game.over) {
      var th = '<div class="t">听</div><div class="ting-tiles">';
      for (var w = 0; w < waits.length && w < 8; w++) th += mjHTML(waits[w], { size: "sm" });
      th += "</div>";
      setHTML(tb, th);
      tb.classList.add("on");
    } else {
      tb.classList.remove("on");
      setHTML(tb, "");
    }
  }

  function setReason(text) {
    var el = document.getElementById("reason");
    if (text) { el.textContent = text; el.classList.add("on"); }
    else { el.textContent = ""; el.classList.remove("on"); }
  }

  function setClaim(html) {
    var el = document.getElementById("claim");
    if (html) { el.innerHTML = html; el.classList.add("on"); }
    else { el.innerHTML = ""; el.classList.remove("on"); }
  }

  function setAct(html) {
    document.getElementById("act").innerHTML = html || "";
  }

  document.getElementById("hand").addEventListener("click", function (e) {
    var el = e.target.closest(".mj");
    if (!el || el.classList.contains("back")) return;
    if (!game || game.over || ui.paused) return;
    /* 等补花的时候，点那张花就等于亮出去 */
    if (ui.flowerWait) {
      var fid = parseInt(el.getAttribute("data-id"), 10);
      if (fid !== ui.flowerId) { toast("先把花补掉"); return; }
      if (game.online) netSendFlower(); else doHumanFlower();
      return;
    }
    if (game.current !== 0 || ui.claimWait) {
      toast("还没轮到你，请等一等");
      return;
    }
    var id = parseInt(el.getAttribute("data-id"), 10);
    if (ui.selected === id) ui.selected = null;
    else ui.selected = id;
    ui.hintId = null;
    showTileCount(ui.selected == null ? null : el.getAttribute("data-key"));
    renderMe();
    refreshActBar();
  });

  /* 双击一张牌 = 直接打出。单击选牌再点「打出」的老路子照旧留着，
     不熟的人用两步更保险，熟了的人少点一半。 */
  document.getElementById("hand").addEventListener("dblclick", function (e) {
    var el = e.target.closest(".mj");
    if (!el || el.classList.contains("back")) return;
    if (!game || game.over || ui.paused) return;
    if (game.current !== 0 || ui.claimWait || !ui.discardWait) return;
    var id = parseInt(el.getAttribute("data-id"), 10);
    if (isNaN(id)) return;
    ui.selected = id;
    onHumanPlay();
  });

  /* 点一张手牌，告诉你这种牌还有几张没露面 —— 老人算牌的小抄 */
  function showTileCount(key) {
    var el = document.getElementById("tile-info");
    if (!settings.counter || !luck().assist || !key || !game) {
      el.textContent = ""; el.classList.remove("on"); return;
    }
    var p = game.players[0], mine = 0;
    for (var i = 0; i < p.hand.length; i++) if (p.hand[i].key === key) mine++;
    var left = 4 - knownCount(key) - mine;
    if (left < 0) left = 0;
    el.innerHTML = tileName(key) + "　还有 <b>" + left + "</b> 张没出现";
    el.classList.add("on");
  }

  /* 提示：拿高手 AI 当教练，告诉她该打哪张、打了之后有什么好处。
     硬核档下不给提示，跟记牌/听牌提示一个道理。 */
  function giveHint() {
    if (!game || game.over || game.current !== 0 || ui.claimWait) return;
    var p = game.players[0];
    var t;
    try { t = aiDiscardMaster(p); } catch (e) { t = null; }
    if (!t) { toast("这手牌暂时没什么好建议"); return; }
    var keys = handKeys(p).filter(function (k) { return !isFlower(k); });
    var rest = keys.slice();
    var ix = rest.indexOf(t.key);
    if (ix >= 0) rest.splice(ix, 1);
    var e = ukeireOf(rest, p.melds.length);
    var msg;
    if (e.shanten <= 0) msg = "打「" + tileName(t.key) + "」就听牌了";
    else if (e.tiles > 0) msg = "建议打「" + tileName(t.key) + "」，还有 " + e.tiles + " 张牌能让你更近一步";
    else msg = "建议打「" + tileName(t.key) + "」";
    ui.hintId = t.id;
    ui.selected = t.id;                 /* 顺手替她选上，点「打出」即可 */
    renderMe();
    refreshActBar();
    var el = document.getElementById("tile-info");
    el.innerHTML = msg;
    el.classList.add("on");
    sfx("turn");
  }

  function refreshActBar() {
    if (game && game.online) { netRefreshBar(); return; }
    if (ui.flowerWait) { setAct(""); return; }   /* 补花期间不给出牌按钮 */
    if (!game || game.over || ui.claimWait || game.current !== 0) {
      if (!ui.claimWait) setAct("");
      return;
    }
    var p = game.players[0];
    var btns = "";
    if (game.drewThisTurn && canWinHand(p, null) && p.hand.length === 14 - 3 * p.melds.length) {
      btns += '<button type="button" class="btn-hu pop" id="a-hu">胡</button>';
    }
    var gangs = game.wall.length ? possibleGangs(p) : [];
    if (gangs.length) btns += '<button type="button" class="btn-gang pop" id="a-gang">杠</button>';
    if (luck().assist && ui.discardWait) {
      btns += '<button type="button" class="btn-hint" id="a-hint">提示</button>';
    }
    btns += '<button type="button" class="btn-play" id="a-play">打出</button>';
    setAct(btns);
  }

  document.getElementById("act").addEventListener("click", function (e) {
    var id = e.target.id;
    if (id === "a-play") onHumanPlay();
    else if (id === "a-hu") onHumanSelfHu();
    else if (id === "a-gang") onHumanGang();
    else if (id === "a-hint") giveHint();
  });

  document.getElementById("claim").addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    var act = t.getAttribute("data-act");
    if (act === "flower") {
      if (game && game.online) netSendFlower();
      else doHumanFlower();
      return;
    }
    if (act && act.indexOf("pickgang-") === 0) {
      var gix = parseInt(act.slice(9), 10);
      setClaim("");
      if (ui.discardWait && ui.pendingGangs && ui.pendingGangs[gix]) {
        var fnG = ui.discardWait;
        ui.discardWait = null;
        clearTimer();
        fnG({ gang: ui.pendingGangs[gix] });
      } else refreshActBar();
      return;
    }
    if (act === "nogang") {
      setClaim("");
      refreshActBar();
      return;
    }
    if (!ui.claimWait) return;
    var fn = ui.claimWait;
    ui.claimWait = null;
    setClaim("");
    fn(act);
  });

  function onHumanPlay() {
    if (game && game.online) { netPlaySelected(); return; }
    if (!game || game.current !== 0 || ui.claimWait) {
      toast("现在还不能出牌");
      return;
    }
    if (ui.selected == null) {
      toast("请先点选一张牌，再按打出");
      return;
    }
    var p = game.players[0];
    var tile = null;
    for (var i = 0; i < p.hand.length; i++) if (p.hand[i].id === ui.selected) tile = p.hand[i];
    if (!tile) { toast("请先点选一张牌，再按打出"); return; }
    if (isFlower(tile.key)) { toast("花牌点「补花」亮出去，不能当废牌打"); return; }
    if (ui.discardWait) {
      var fn = ui.discardWait;
      ui.discardWait = null;
      clearTimer();
      fn(tile);
    }
  }

  function onHumanSelfHu() {
    if (!ui.discardWait || game.current !== 0) return;
    var p = game.players[0];
    if (!canWinHand(p, null)) return;
    var fn = ui.discardWait;
    ui.discardWait = null;
    clearTimer();
    fn({ hu: true });
  }

  function onHumanGang() {
    if (!ui.discardWait || game.current !== 0) return;
    var p = game.players[0];
    var gangs = possibleGangs(p);
    if (!gangs.length) return;
    if (gangs.length === 1) {
      var fn = ui.discardWait;
      ui.discardWait = null;
      clearTimer();
      fn({ gang: gangs[0] });
      return;
    }
    ui.pendingGangs = gangs;
    var html = "";
    for (var i = 0; i < gangs.length; i++) {
      html += '<button type="button" class="btn-gang" data-act="pickgang-' + i + '">杠 ' + tileName(gangs[i].key) + "</button>";
    }
    html += '<button type="button" class="btn-pass" data-act="nogang">不杠</button>';
    setClaim(html);
  }

  function waitHumanDiscard() {
    return new Promise(function (resolve) {
      ui.selected = null;
      ui.hintId = null;
      showTileCount(null);
      ui.discardWait = resolve;
      setMsg("该你出牌了", true);
      say("act_your"); sfx("turn");
      refreshActBar();
      render();
      startTimer(resolve);
    });
  }

  function startTimer(resolveDiscard) {
    clearTimer();
    if (!settings.timer) return;
    timerLeft = settings.timer;
    setMsg("该你出牌了　" + timerLeft + "秒", true);
    timerId = setInterval(function () {
      if (ui.paused) return;
      timerLeft--;
      if (timerLeft <= 0) {
        clearTimer();
        var p = game.players[0];
        var tile = null;
        if (ui.selected != null) {
          for (var i = 0; i < p.hand.length; i++) if (p.hand[i].id === ui.selected) tile = p.hand[i];
        }
        if (!tile) tile = p.hand[p.hand.length - 1];
        if (ui.discardWait === resolveDiscard) {
          ui.discardWait = null;
          resolveDiscard(tile);
        }
      } else setMsg("该你出牌了　" + timerLeft + "秒", true);
    }, 1000);
  }
  function clearTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  function waitHumanClaim(opts) {
    return new Promise(function (resolve) {
      ui.claimWait = resolve;
      var html = "";
      if (opts.huOk) html += '<button type="button" class="btn-hu pop" data-act="hu">' + (opts.rob ? "抢杠胡" : "胡") + "</button>";
      if (opts.gang) html += '<button type="button" class="btn-gang pop" data-act="gang">杠</button>';
      if (opts.peng) html += '<button type="button" class="btn-peng pop" data-act="peng">碰</button>';
      html += '<button type="button" class="btn-pass" data-act="pass">过</button>';
      setClaim(html);
      if (opts.reason) setReason(opts.reason);
      else setReason("");
      render();
    });
  }
