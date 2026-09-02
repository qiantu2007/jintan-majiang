/* 金坛麻将 · 单机牌局流程
 * 一个人打三个电脑时的回合循环：摸打碰杠胡、补花、抢杠、结算、下一盘。
 * 联机时这套不跑 —— 那边的流程由服务器推着走，见 net.js。
 * 两边没有合并，是因为单机要支持悔牌、牌运、难度、存档续局，
 * 而联机要的是绝对公平和掉线接管，本来就是两件事。
 *
 * 由 构建.mjs 拼进 index.html。改这里，不要改根目录那个。 */

  /* —— 游戏流程 —— */

  /* 手动补花：摸到花不再瞬间换掉，而是停下来等人亲手亮出去，
     亮完再从牌尾补一张 —— 跟真牌桌上的动作顺序一致。
     电脑和掉线托管的座位仍然自动走，节奏不变。 */
  function waitHumanFlower(tile) {
    return new Promise(function (resolve) {
      ui.selected = null;
      ui.hintId = null;
      ui.flowerId = tile.id;
      ui.flowerWait = resolve;
      showTileCount(null);
      setAct("");
      setClaim('<button type="button" class="btn-gang pop" data-act="flower">补花 ' + FLOWER[tile.key] + "</button>");
      /* 提示要短。大牌面＋特大字时牌桌只剩 180px 高，中间那块信息框
         放得下一行，放两行就会被手牌区切掉半截。
         旁边按钮上已经写着「补花 梅」，不必再重复怎么点。 */
      setMsg("摸到「" + FLOWER[tile.key] + "」，点补花", true);
      sfx("flower");
      render();
      startFlowerTimer(resolve);
    });
  }

  /* 跟出牌一样给个倒计时，超时就替她亮出去，别让牌局卡住 */
  function startFlowerTimer(resolveFlower) {
    clearTimer();
    if (!settings.timer) return;
    timerLeft = settings.timer;
    timerId = setInterval(function () {
      if (ui.paused) return;
      timerLeft--;
      if (timerLeft <= 0) {
        clearTimer();
        if (ui.flowerWait === resolveFlower) doHumanFlower();
      } else setMsg("点补花　" + timerLeft + "秒", true);
    }, 1000);
  }

  function doHumanFlower() {
    if (typeof ui.flowerWait !== "function") return;   /* 联机走 netSendFlower */
    var fn = ui.flowerWait;
    ui.flowerWait = null;
    ui.flowerId = null;
    clearTimer();
    setClaim("");
    fn();
  }

  async function replaceFlowers(p) {
    var g = gen;
    var byHand = !game.online && p === game.players[0];
    while (still(g)) {
      var ix = -1;
      for (var i = 0; i < p.hand.length; i++) if (isFlower(p.hand[i].key)) { ix = i; break; }
      if (ix < 0) return "ok";
      if (byHand) {
        game.phase = "flower";
        render();
        await waitHumanFlower(p.hand[ix]);
        if (!still(g)) return "abort";
        /* 等待期间手牌可能被重排，重新定位那张花 */
        ix = -1;
        for (var k = 0; k < p.hand.length; k++) if (isFlower(p.hand[k].key)) { ix = k; break; }
        if (ix < 0) return "ok";
      }
      var fl = p.hand.splice(ix, 1)[0];
      p.flowers.push(fl);
      sortHand(p);
      render();
      sfx("flower");
      setMsg(p.name + " 补花 " + FLOWER[fl.key], false);
      await sleep(byHand ? 240 : 380);
      if (p.flowers.length >= 8) {
        await endEightFlowers(p);
        return "eight";
      }
      var t = drawBack();
      if (!t) { await liuju(); return "liuju"; }
      p.hand.push(t);
      p.lastDrawn = t.key;
      sortHand(p);
      render();
    }
    return "abort";
  }

  function takeFromHand(p, key, n) {
    var got = [];
    for (var i = p.hand.length - 1; i >= 0 && got.length < n; i--) {
      if (p.hand[i].key === key) got.push(p.hand.splice(i, 1)[0]);
    }
    return got;
  }

  function doPeng(pi, tile, from) {
    var p = game.players[pi];
    takeFromHand(p, tile.key, 2);
    p.melds.push({ type: "peng", key: tile.key, concealed: false, from: from });
    p.guoShui = false; p.passed = [];
    game.players[from].discards = game.players[from].discards.filter(function (t) { return t.id !== tile.id; });
    game.lastDiscard = null;
    game.current = pi;
    game.needDraw = false;
    game.kongDraw = false;
    game.drewThisTurn = false;
    game.phase = "discard";
    game.undo = null;
    sortHand(p);
    say("act_peng"); sfx("peng");
    setMsg(NAMES[pi] + " 碰", true);
  }

  async function doMingGang(pi, tile, from) {
    var p = game.players[pi];
    takeFromHand(p, tile.key, 3);
    p.melds.push({ type: "gang", key: tile.key, concealed: false, from: from, added: false });
    p.guoShui = false; p.passed = [];
    game.players[from].discards = game.players[from].discards.filter(function (t) { return t.id !== tile.id; });
    game.lastDiscard = null;
    game.current = pi;
    game.undo = null;
    say("act_gang"); sfx("gang");
    setMsg(NAMES[pi] + " 杠", true);
    var r = await drawKongReplace(p);
    return r;
  }

  async function doAnGang(pi, key) {
    var p = game.players[pi];
    takeFromHand(p, key, 4);
    p.melds.push({ type: "gang", key: key, concealed: true, from: pi, added: false });
    p.guoShui = false; p.passed = [];
    game.undo = null;
    say("act_gang"); sfx("gang");
    setMsg(NAMES[pi] + " 暗杠", true);
    return await drawKongReplace(p);
  }

  async function doBuGang(pi, key) {
    var p = game.players[pi];
    var meld = null;
    for (var i = 0; i < p.melds.length; i++) {
      if (p.melds[i].type === "peng" && p.melds[i].key === key) { meld = p.melds[i]; break; }
    }
    if (!meld) return "ok";
    takeFromHand(p, key, 1);
    meld.type = "gang";
    meld.added = true;
    meld.concealed = false;
    p.guoShui = false; p.passed = [];
    game.undo = null;
    say("act_gang"); sfx("gang");
    setMsg(NAMES[pi] + " 补杠", true);
    var rob = await resolveRobKong(pi, key);
    if (rob === "end") return "end";
    return await drawKongReplace(p);
  }

  async function drawKongReplace(p) {
    game.kongDraw = true;
    game.drewThisTurn = true;
    var t = drawBack();
    if (!t) { await liuju(); return "end"; }
    p.hand.push(t);
    p.lastDrawn = t.key;
    if (isFlower(t.key)) {
      game.kongDraw = false;
      var r = await replaceFlowers(p);
      if (r !== "ok") return "end";
    }
    sortHand(p);
    game.needDraw = false;
    game.phase = "discard";
    saveGame();
    render();
    return "ok";
  }

  function execDiscard(pi, tile) {
    var p = game.players[pi];
    p.hand = p.hand.filter(function (t) { return t.id !== tile.id; });
    p.discards.push(tile);
    /* 出牌只锁「这一张」，不锁全部。锁全部会让点炮胡几乎不可能发生 */
    if (!p.passed) p.passed = [];
    if (p.passed.indexOf(tile.key) < 0) p.passed.push(tile.key);
    game.lastDiscard = tile;
    game.lastFrom = pi;
    game.kongDraw = false;
    sortHand(p);
    ui.dropId = tile.id;          /* 让这张牌落到牌河时带个动画 */
    sfx("discard");
    sayTile(tile.key);
    setMsg(NAMES[pi] + " 打出 " + tileName(tile.key), false);
  }

  async function resolveRobKong(from, key) {
    var fake = { id: -1, key: key };
    var huP = [];
    var humanInfo = null;
    if (from !== 0) {
      humanInfo = checkHu(game.players[0], key, { robKong: true, selfDraw: true });
    }
    var humanChoice = "pass";
    if (from !== 0 && (humanInfo.ok || humanInfo.blocked)) {
      var reason = "";
      if (!humanInfo.ok && humanInfo.blocked === "guoshui") reason = "本轮过水，不能胡（摸牌或碰杠后解除）";
      if (humanInfo.ok) {
        humanChoice = await waitHumanClaim({ huOk: true, rob: true, reason: "" });
        setReason("");
        if (humanChoice !== "hu") game.players[0].guoShui = true;
      } else if (reason) {
        setReason(reason);
        await sleep(1200);
        setReason("");
      }
    }
    if (humanChoice === "hu") huP.push({ i: 0, info: humanInfo });
    for (var i = 1; i < 4; i++) {
      if (i === from) continue;
      var info = checkHu(game.players[i], key, { robKong: true, selfDraw: true });
      if (info.ok) huP.push({ i: i, info: info });
    }
    if (huP.length) {
      await doWins(huP, { robKong: true, from: from, tile: fake });
      return "end";
    }
    return "ok";
  }

  async function afterDiscard(from, tile) {
    var g = gen;
    game.phase = "claim";
    saveGame();
    var p0 = game.players[0];
    var humanInfo = from === 0 ? { ok: false } : checkHu(p0, tile.key, { selfDraw: false });
    var nHand = countKey(handKeys(p0), tile.key);
    var humanGang = from !== 0 && nHand >= 3 && game.wall.length > 0;
    var humanPeng = from !== 0 && nHand >= 2;
    var reason = "";
    if (from !== 0 && humanInfo.blocked === "guoshui") reason = "本轮过水，不能胡（摸牌或碰杠后解除）";
    if (from !== 0 && humanInfo.blocked === "nofan") reason = "无花无番，只能自摸胡";

    var anyAiHu = false;
    for (var a = 1; a < 4; a++) {
      if (a === from) continue;
      if (checkHu(game.players[a], tile.key, { selfDraw: false }).ok) anyAiHu = true;
    }

    var humanChoice = "pass";
    if (from !== 0 && anyAiHu && !humanInfo.ok) {
      if (reason) {
        setReason(reason);
        render();
        await sleep(1400);
        setReason("");
      }
    } else if (from !== 0 && (humanInfo.ok || (!anyAiHu && (humanGang || humanPeng)))) {
      humanChoice = await waitHumanClaim({
        huOk: humanInfo.ok,
        gang: humanGang && !anyAiHu,
        peng: humanPeng && !anyAiHu,
        reason: humanInfo.ok ? "" : reason
      });
      setReason("");
      setClaim("");
      /* 明明能胡却按了「过」——这才是真正的过水，到动牌前什么都不能胡 */
      if (humanInfo.ok && humanChoice !== "hu") p0.guoShui = true;
    } else if (from !== 0 && reason && !humanPeng && !humanGang) {
      setReason(reason);
      render();
      await sleep(1400);
      setReason("");
    }
    if (!still(g) || humanChoice === "abort" || humanChoice === "undo-cancel") return "abort";

    var huP = [];
    if (humanChoice === "hu") huP.push({ i: 0, info: humanInfo });
    for (var i = 1; i < 4; i++) {
      if (i === from) continue;
      var info = checkHu(game.players[i], tile.key, { selfDraw: false });
      if (info.ok) huP.push({ i: i, info: info });
    }
    if (huP.length) {
      await doWins(huP, { ron: true, from: from, tile: tile });
      return "end";
    }

    if (humanChoice === "gang") {
      var r = await doMingGang(0, tile, from);
      return r === "end" ? "end" : "claimed";
    }
    if (humanChoice === "peng") {
      doPeng(0, tile, from);
      return "claimed";
    }

    await aiDelay();
    if (!still(gen)) return "abort";

    for (i = 1; i < 4; i++) {
      if (i === from) continue;
      if (countKey(handKeys(game.players[i]), tile.key) >= 3 && game.wall.length > 0 && aiWantGang(game.players[i], tile.key, "ming")) {
        var r2 = await doMingGang(i, tile, from);
        return r2 === "end" ? "end" : "claimed";
      }
    }
    for (i = 1; i < 4; i++) {
      if (i === from) continue;
      if (countKey(handKeys(game.players[i]), tile.key) >= 2 && aiWantPeng(game.players[i], tile.key)) {
        doPeng(i, tile, from);
        return "claimed";
      }
    }
    game.undo = null;
    game.current = (from + 1) % 4;
    game.needDraw = true;
    game.phase = "draw";
    return "none";
  }

  async function doWins(winners, flags) {
    game.over = true;
    game.undo = null;
    say((flags.selfDraw || flags.kongDraw) ? "act_zimo" : "act_hu");
    var meWon = false;
    for (var wi = 0; wi < winners.length; wi++) if (winners[wi].i === 0) meWon = true;
    sfx(meWon ? "hu" : "lose");
    var reports = [];
    var pays = [0, 0, 0, 0];
    for (var w = 0; w < winners.length; w++) {
      var pi = winners[w].i;
      var info = winners[w].info;
      var score = info.score;
      var way = "自摸";
      if (flags.robKong) way = "抢杠";
      else if (flags.kongDraw || game.kongDraw) way = "杠开";
      else if (flags.ron) way = "点炮";
      else if (flags.selfDraw) way = "自摸";
      if (flags.robKong) {
        pays[pi] += 3 * score;
        pays[flags.from] -= 3 * score;
      } else if (flags.ron) {
        pays[pi] += score;
        pays[flags.from] -= score;
      } else {
        for (var o = 0; o < 4; o++) if (o !== pi) {
          pays[o] -= score;
          pays[pi] += score;
        }
      }
      reports.push({ i: pi, info: info, way: way, score: score });
    }
    for (var i = 0; i < 4; i++) game.players[i].score += pays[i];
    var dealerWin = false;
    for (w = 0; w < winners.length; w++) if (winners[w].i === game.dealer) dealerWin = true;
    game.nextDealer = dealerWin ? game.dealer : (game.dealer + 1) % 4;
    var payLines = [];
    for (w = 0; w < reports.length; w++) {
      var rp = reports[w];
      if (flags.robKong) {
        payLines.push(NAMES[flags.from] + " 付给 " + NAMES[rp.i] + " " + (3 * rp.score) + " 分（抢杠三倍）");
      } else if (flags.ron) {
        payLines.push(NAMES[flags.from] + " 付给 " + NAMES[rp.i] + " " + rp.score + " 分");
      } else {
        for (var o2 = 0; o2 < 4; o2++) if (o2 !== rp.i) {
          payLines.push(NAMES[o2] + " 付给 " + NAMES[rp.i] + " " + rp.score + " 分");
        }
      }
    }
    game.settle = { type: "hu", reports: reports, pays: pays, flags: flags, liuju: false, payLines: payLines };
    showSettle();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  async function liuju() {
    if (game.over) return;
    game.over = true;
    game.nextDealer = game.dealer;
    game.settle = { type: "liuju", reports: [], pays: [0, 0, 0, 0], liuju: true };
    say("act_liuju");
    setMsg("流局，荒庄", true);
    showSettle();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  async function endEightFlowers(p) {
    game.over = true;
    var pi = game.players.indexOf(p);
    var score = settings.cap;
    var pays = [0, 0, 0, 0];
    for (var o = 0; o < 4; o++) if (o !== pi) { pays[o] -= score; pays[pi] += score; }
    for (var i = 0; i < 4; i++) game.players[i].score += pays[i];
    game.nextDealer = pi === game.dealer ? game.dealer : (game.dealer + 1) % 4;
    var items = [];
    for (var f = 0; f < p.flowers.length; f++) items.push({ name: "花牌" + FLOWER[p.flowers[f].key], n: 1 });
    game.settle = {
      type: "eight",
      reports: [{
        i: pi, way: "满花（八张花牌）", score: score,
        info: {
          flowers: 8, flowerItems: items, fans: [], fan: 0, mult: 1,
          formula: "独得 8 张花牌，直接按封顶 " + score + " 计",
          score: score, raw: score
        }
      }],
      pays: pays,
      payLines: (function () {
        var lines = [];
        for (var ox = 0; ox < 4; ox++) if (ox !== pi) lines.push(NAMES[ox] + " 付给 " + NAMES[pi] + " " + score + " 分");
        return lines;
      })()
    };
    showSettle();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  /* 身家横幅：整盘最有分量的一行，放在标题正下方 */
  function wealthBanner(s) {
    var wr = applyRoundToWealth(s);
    var up = wr.delta > 0, down = wr.delta < 0;
    var tone = up ? "up" : down ? "down" : "flat";
    var rankUp = wr.rankAfter !== wr.rankBefore &&
                 rankOf(wr.after).min > rankOf(wr.before).min;
    var rankDown = wr.rankAfter !== wr.rankBefore && !rankUp;
    var h = '<div class="wealth-banner ' + tone + '">' +
            '<div class="wb-delta">' + (up ? "+" : "") + fmtMoney(wr.delta) + "</div>" +
            '<div class="wb-main">身家 ' + fmtMoney(wr.before) + " → <b>" + fmtMoney(wr.after) + "</b>" +
            (wr.after < 0 ? '<span class="wb-debt">欠账</span>' : "") + "</div>";
    if (rankUp || rankDown) {
      h += '<div class="wb-rank ' + (rankUp ? "up" : "down") + '">称号 ' + wr.rankBefore +
           (rankUp ? " ↗ " : " ↘ ") + wr.rankAfter + "</div>";
      if (rankUp) { toast("升到「" + wr.rankAfter + "」了", 2800); sfx("hu"); }
    }
    h += '<div class="wb-stat">打了 ' + wealth.rounds + " 盘，胡了 " + wealth.wins +
         " 盘（自摸 " + wealth.selfDraws + "）　最高身家 " + fmtMoney(wealth.peak) + "</div>";
    return h + "</div>";
  }

  /* 摊牌：四家的手牌、副露、花牌全亮出来，谁差一张、谁在做什么牌一目了然 */
  function showdownHTML(s) {
    var winners = {};
    for (var w = 0; w < (s.reports || []).length; w++) winners[s.reports[w].i] = 1;
    var h = '<div class="block showdown"><h3>四家牌型</h3>';
    for (var i = 0; i < 4; i++) {
      var p = game.players[i];
      var hand = p.hand.slice().filter(function (t) { return !isFlower(t.key); });
      hand.sort(function (a, b) { return cmpKey(a.key, b.key); });

      var tag = "";
      if (winners[i]) tag = '<span class="sd-tag win">胡</span>';
      else if (s.flags && s.flags.ron && s.flags.from === i) tag = '<span class="sd-tag lose">点炮</span>';
      else if (s.flags && s.flags.robKong && s.flags.from === i) tag = '<span class="sd-tag lose">被抢杠</span>';

      /* 没胡的人差几张 */
      var note = "";
      if (!winners[i] && s.type !== "eight") {
        var need = 13 - 3 * p.melds.length;
        var keys = [];
        for (var q = 0; q < hand.length; q++) keys.push(hand[q].key);
        if (keys.length >= need) {
          var sh = shantenOf(counts34(keys.slice(0, need)), p.melds.length);
          note = sh <= 0 ? '<span class="sd-note ting">已听牌</span>'
                         : '<span class="sd-note">差 ' + sh + ' 张听牌</span>';
        }
      }

      h += '<div class="sd-row' + (winners[i] ? " won" : "") + '">' +
           '<div class="sd-head">' + (game.dealer === i ? '<span class="zhuang">庄</span>' : "") +
           NAMES[i] + tag + note + "</div>" +
           '<div class="sd-tiles">';
      for (var t = 0; t < hand.length; t++) h += mjHTML(hand[t].key, { size: "sm" });
      for (var m = 0; m < p.melds.length; m++) {
        h += '<span class="sd-gap"></span>' + meldHTML(p.melds[m], "sm");
      }
      if (p.flowers.length) {
        h += '<span class="sd-gap"></span>';
        for (var f = 0; f < p.flowers.length; f++) h += mjHTML(p.flowers[f].key, { size: "sm" });
      }
      h += "</div></div>";
    }
    return h + "</div>";
  }

  function showSettle() {
    var s = game.settle;
    var html = "";
    if (s.type === "liuju") {
      html = "<h2>流局</h2>" + wealthBanner(s) + "<p class='way'>牌墙摸完，荒庄。庄家连庄。</p>";
    } else {
      html = "<h2>本盘结束</h2>" + wealthBanner(s);
      for (var r = 0; r < s.reports.length; r++) {
        var rp = s.reports[r];
        var info = rp.info;
        html += "<div class='block'><h3>" + NAMES[rp.i] + " 胡了 · " + rp.way + "</h3>";
        html += "<p><strong>花数明细</strong></p>";
        if (!info.flowerItems.length) html += "<p>没有花</p>";
        for (var i = 0; i < info.flowerItems.length; i++) {
          html += "<p>" + info.flowerItems[i].name + "：" + info.flowerItems[i].n + " 花</p>";
        }
        html += "<p>合计 <strong>" + info.flowers + " 花</strong></p>";
        html += "<p><strong>番型明细</strong></p>";
        if (!info.fans.length) html += " <p>鸡胡（0番），权值 ×1</p>";
        for (var f = 0; f < info.fans.length; f++) {
          html += "<p>" + info.fans[f].name + "：" + info.fans[f].n + " 番</p>";
        }
        html += "<p>合计 <strong>" + info.fan + " 番</strong>，权值 ×" + info.mult + "</p>";
        html += "<p><strong>计分</strong> " + info.formula + "</p>";
        html += "<p>这一份：" + info.score + " 分</p></div>";
      }
    }
    html += "<div class='block'><h3>谁付给谁</h3>";
    if (s.payLines && s.payLines.length) {
      for (var pl = 0; pl < s.payLines.length; pl++) html += "<p class='pay'>" + s.payLines[pl] + "</p>";
    }
    if (s.type === "hu" && s.flags && s.flags.ron) {
      html += "<p>" + NAMES[s.flags.from] + " 点炮。</p>";
    }
    if (s.type === "hu" && s.flags && s.flags.robKong) {
      html += "<p>" + NAMES[s.flags.from] + " 开杠被抢，一家付三倍。</p>";
    }
    for (var i2 = 0; i2 < 4; i2++) {
      var d = s.pays[i2];
      var cls = d > 0 ? "delta-plus" : d < 0 ? "delta-minus" : "";
      var sign = d > 0 ? "+" : "";
      html += "<p class='pay " + cls + "'>" + NAMES[i2] + "：" + sign + d + "　累计 " + game.players[i2].score + "</p>";
    }
    html += showdownHTML(s);

    var zmsg = game.nextDealer === game.dealer ? "庄家连庄（" + NAMES[game.dealer] + "）" : "下一盘由 " + NAMES[(game.dealer + 1) % 4] + " 坐庄";
    html += "<p>" + zmsg + "</p></div>";
    html += '<div class="home-btns" style="margin-top:12px">';
    html += '<button class="big-btn" type="button" id="next-round">下一盘</button>';
    html += '<button class="big-btn alt" type="button" id="settle-home">返回首页</button></div>';
    document.getElementById("settle").innerHTML = html;
    document.getElementById("settle-ov").classList.add("on");
    var nextBtn = document.getElementById("next-round");
    if (game.online) {
      nextBtn.textContent = NET.isHost ? "下一盘" : "等房主开下一盘";
      nextBtn.disabled = !NET.isHost;
      nextBtn.onclick = function () {
        if (!NET.isHost) return;
        document.getElementById("settle-ov").classList.remove("on");
        netSend({ t: "next" });
      };
    } else {
      nextBtn.onclick = function () { startRound(true); };
    }
    document.getElementById("settle-home").onclick = function () {
      document.getElementById("settle-ov").classList.remove("on");
      if (game && game.online) { netClose(); }
      game = null;
      showScreen("home");
    };
    render();
  }

  /* —— AI —— */
  function knownCount(key) {
    var c = 0, i, j, p;
    for (i = 0; i < 4; i++) {
      p = game.players[i];
      for (j = 0; j < p.discards.length; j++) if (p.discards[j].key === key) c++;
      for (j = 0; j < p.melds.length; j++) {
        if (p.melds[j].key === key) c += p.melds[j].type === "gang" ? 4 : 3;
      }
    }
    return c;
  }


  /* 已经被打出过的牌相对安全，出现次数越多越安全（现物） */
  function safeScore(key) {
    var seen = 0;
    for (var i = 0; i < 4; i++) {
      var d = game.players[i].discards;
      for (var j = 0; j < d.length; j++) if (d[j].key === key) seen++;
    }
    return seen;
  }


  async function chooseAction(pi) {
    var p = game.players[pi];
    sortHand(p);
    render();
    if (pi === 0) {
      var act = await waitHumanDiscard();
      return act;
    }
    await aiDelay();
    if (!still(gen)) return { abort: true };
    if (game.drewThisTurn && canWinHand(p, null) && p.hand.length === 14 - 3 * p.melds.length) {
      return { hu: true };
    }
    var gangs = game.wall.length ? possibleGangs(p) : [];
    if (gangs.length) {
      var g = gangs[0];
      var kind = g.kind;
      if (aiWantGang(p, g.key, kind)) return { gang: g };
    }
    return aiChooseDiscard(p);
  }

  async function turnLoop() {
    var g = gen;
    if (game.phase === "claim" && game.lastDiscard && still(g)) {
      var ad0 = await afterDiscard(game.lastFrom, game.lastDiscard);
      if (ad0 === "end" || ad0 === "abort" || !still(g)) return;
      saveGame();
      render();
    }
    while (still(g)) {
      var pi = game.current;
      var p = game.players[pi];
      if (game.needDraw) {
        game.phase = "draw";
        if (!game.wall.length) { await liuju(); return; }
        var t = drawFrontFor(game.current);
        p.hand.push(t);
        p.lastDrawn = t.key;
        sfx("draw");
        p.guoShui = false; p.passed = [];
        game.kongDraw = false;
        game.drewThisTurn = true;
        if (isFlower(t.key)) {
          var rf = await replaceFlowers(p);
          if (rf !== "ok") return;
        }
        sortHand(p);
        game.needDraw = false;
        game.phase = "discard";
        saveGame();
        render();
      }
      while (still(g) && game.current === pi && !game.needDraw) {
        game.phase = "discard";
        var act = await chooseAction(pi);
        if (!still(g)) return;
        if (act && act.abort) return;
        if (act && act.hu) {
          var info = selfDrawInfo(p);
          await doWins([{ i: pi, info: info }], { selfDraw: true, kongDraw: game.kongDraw });
          return;
        }
        if (act && act.gang) {
          var gg = act.gang;
          var r;
          if (gg.kind === "an") r = await doAnGang(pi, gg.key);
          else r = await doBuGang(pi, gg.key);
          if (r === "end") return;
          continue;
        }
        var tile = act.key ? act : act;
        if (pi === 0) {
          game.undo = snapshot();
        }
        execDiscard(pi, tile);
        ui.selected = null;
        saveGame();
        render();
        var ad = await afterDiscard(pi, tile);
        if (ad === "end" || ad === "abort") return;
        saveGame();
        render();
        break;
      }
    }
  }

  function snapshot() {
    return clone({
      wall: game.wall, players: game.players, dealer: game.dealer,
      nextDealer: game.nextDealer, current: game.current, round: game.round,
      phase: game.phase, lastDiscard: game.lastDiscard, lastFrom: game.lastFrom,
      kongDraw: game.kongDraw, needDraw: game.needDraw, drewThisTurn: game.drewThisTurn
    });
  }

  function restore(s) {
    game.wall = s.wall;
    game.players = s.players;
    game.dealer = s.dealer;
    game.nextDealer = s.nextDealer;
    game.current = s.current;
    game.round = s.round;
    game.phase = s.phase;
    game.lastDiscard = s.lastDiscard;
    game.lastFrom = s.lastFrom;
    game.kongDraw = s.kongDraw;
    game.needDraw = s.needDraw;
    game.drewThisTurn = s.drewThisTurn;
    game.undo = null;
    game.over = false;
  }

  async function startRound(keep) {
    gen++;
    var g = gen;
    document.getElementById("settle-ov").classList.remove("on");
    document.getElementById("pause-ov").classList.remove("on");
    ui.paused = false;
    ui.claimWait = null;
    ui.discardWait = null;
    ui.flowerWait = null;
    ui.flowerId = null;
    ui.selected = null;
    setClaim("");
    setAct("");
    setReason("");
    game = newGameState(keep);
    dealTiles();
    showScreen("table");
    render();
    setMsg("开局补花", false);
    var order = [game.dealer, (game.dealer + 1) % 4, (game.dealer + 2) % 4, (game.dealer + 3) % 4];
    for (var i = 0; i < 4; i++) {
      var r = await replaceFlowers(game.players[order[i]]);
      if (r !== "ok") return;
      if (!still(g)) return;
    }
    game.current = game.dealer;
    game.needDraw = false;
    game.drewThisTurn = true;
    game.phase = "discard";
    saveGame();
    render();
    await turnLoop();
  }

  function continueSaved() {
    var d = loadGame();
    if (!d) { toast("没有存档"); return; }
    gen++;
    game = d.game;
    game.over = false;
    game.undo = null;
    game._abort = false;
    if (game.drewThisTurn == null) game.drewThisTurn = !game.needDraw;
    if (!game.phase) game.phase = game.needDraw ? "draw" : "discard";
    showScreen("table");
    render();
    game.needDraw = !!game.needDraw;
    if (game.current == null) game.current = game.dealer;
    turnLoop();
  }
