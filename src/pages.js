/* 金坛麻将 · 牌桌以外的界面
 * 首页、我的（身家 / 称号阶梯 / 战绩 / 复盘）、设置页、录音面板、关于页。
 * 牌桌本身在 table.js。
 *
 * 由 构建.mjs 拼进 index.html。改这里，不要改根目录那个。 */

  /* —— 界面 —— */
  function showScreen(name) {
    ui.prevScreen = ui.screen;
    ui.screen = name;
    ["home", "help", "set", "about", "mine", "net", "table"].forEach(function (s) {
      document.getElementById("sc-" + s).classList.toggle("on", s === name);
    });
    if (name === "home") refreshHome();
    if (name === "set") renderSettings();
    if (name === "about") renderAbout();
    if (name === "mine") renderMine();
    if (name === "net") renderLobby();
    keepAwake(name === "table" && settings.awake);
  }

  function refreshHome() {
    document.getElementById("ver-badge").textContent = "v" + VERSION;
    renderHomeProfile();
    renderWealthCard();
  }

  /* 上次那盘打到哪了，写在「继续」按钮上 */
  function saveSummary() {
    var d = loadGame();
    if (!d || !d.game) return null;
    var g = d.game;
    var bits = [];
    if (g.round) bits.push("第 " + g.round + " 盘");
    if (g.wall && g.wall.length != null) bits.push("还剩 " + g.wall.length + " 张");
    return bits.join("，");
  }

  function playOpt(id, title, sub, cls) {
    return '<button type="button" class="play-opt' + (cls ? " " + cls : "") + '" id="' + id + '">' +
           '<span class="po-t">' + title + "</span>" +
           '<span class="po-s">' + sub + "</span></button>";
  }

  function openPlayMenu() {
    var h = "";
    var sum = hasSave() ? saveSummary() : null;
    if (sum) h += playOpt("play-continue", "继续上次那盘", sum, "go");
    h += playOpt("play-solo", "自己一个人打", "三个电脑陪你，随时能停", sum ? "" : "go");
    h += playOpt("play-net", "和朋友一起打", "开房间发给朋友，人不够电脑补上", "net");
    document.getElementById("play-opts").innerHTML = h;
    document.getElementById("play-ov").classList.add("on");
  }
  function closePlayMenu() {
    document.getElementById("play-ov").classList.remove("on");
  }

  /* 帮助页：怎么装到桌面 + 更新记录 */
  function renderAbout() {
    var h = '<h3>装到桌面，像 App 一样用</h3>' +
      '<p>装好之后点桌面图标就能玩，<strong>断网也照样打</strong>，不用每次开浏览器找网址。</p>' +
      '<div class="chi-banner" style="background:linear-gradient(#c9902a,#8a6510)">别在微信里打开，微信加不了桌面</div>' +
      '<p><strong>苹果手机</strong>：用 Safari 打开网址 → 点底部中间的<strong>分享</strong>按钮（方框里一个向上箭头）→ 往下翻，点<strong>「添加到主屏幕」</strong> → 名字可以改成「麻将」→ 添加。</p>' +
      '<p><strong>安卓手机</strong>：用 Chrome 或手机自带浏览器打开网址 → 点右上角<strong>三个点</strong> → 选<strong>「安装应用」</strong>或<strong>「添加到主屏幕」</strong>。华为小米 OPPO 的自带浏览器写法略有不同，找「添加到桌面」这类字样。</p>' +
      '<p><strong>电脑</strong>：用 Chrome 或 Edge 打开网址，地址栏右边会出现一个安装图标，点它就能装成桌面程序。</p>' +
      '<p>装完可以<strong>开一次飞行模式</strong>再点图标试试，能正常开局就说明离线没问题了。</p>' +
      '<h3>怎么更新</h3>' +
      '<p>有新版本时首页会冒出一条「有新版本，点这里更新」，点一下就好。' +
      '就算不点，<strong>下次重新打开也会自动换成新版</strong>，不会一直卡在旧的。</p>' +
      '<p>更新不会动你的身家和战绩，存档和程序是分开存的。</p>' +
      '<h3>让它说金坛话</h3>' +
      '<p>手机自带的语音只有普通话，没有金坛话——吴语这一支任何一家语音引擎都不支持。' +
      '想听乡音只能找个会说的人录一遍：进<strong>设置 → 金坛话语音</strong>，' +
      '照着 40 条词一条条点「录」，每条录 1.8 秒自动停，十几分钟录完。</p>' +
      '<p>录完点「导出语音包」，把得到的 <span class="mono">语音包.json</span> ' +
      '跟游戏文件一起传上去，全家的手机就都是金坛话了。' +
      '只录一部分也行，没录的自动用普通话顶上。</p>' +

      '<h3>牌面出处</h3>' +
      '<p>牌面用的是实物麻将的画法，来自 Wikimedia Commons 的中式麻将牌矢量图' +
      '（作者 Shizhao，已放入公有领域）。筒子的铜钱花瓣纹、萬字的靛蓝数字、' +
      '五萬写作「伍」，都跟家里那副牌一样。</p>' +
      '<h3>更新记录</h3>';
    /* 只摊开最近三版。十几条日志占了整页四分之三，
       老人翻半天翻不到底，更早的收进折叠里，想看再点。 */
    var SHOWN = 3;
    for (var i = 0; i < CHANGELOG.length; i++) {
      if (i === SHOWN) {
        h += '<button type="button" class="icon-btn wide" id="log-more">' +
             "看更早的 " + (CHANGELOG.length - SHOWN) + " 个版本</button>" +
             '<div id="log-old" class="hidden">';
      }
      var c = CHANGELOG[i];
      h += '<div class="log-item"><div class="log-head"><span class="log-v">v' + c.v + '</span>' +
           '<span class="log-d">' + c.d + '</span>' +
           (c.v === VERSION ? '<span class="log-now">当前版本</span>' : "") + "</div><ul>";
      for (var j = 0; j < c.items.length; j++) h += "<li>" + c.items[j] + "</li>";
      h += "</ul></div>";
    }
    if (CHANGELOG.length > SHOWN) h += "</div>";
    document.getElementById("about-body").innerHTML = h;
  }

  document.getElementById("about-body").addEventListener("click", function (e) {
    if (e.target.id !== "log-more") return;
    document.getElementById("log-old").classList.remove("hidden");
    e.target.remove();
  });

  /* ══════════ 「我的」页 ══════════ */
  function rankIndexOf(w) {
    var ix = 0;
    for (var i = 0; i < RANKS.length; i++) if (w >= RANKS[i].min) ix = i;
    return ix;
  }

  function renderMine() {
    var w = wealth, ix = rankIndexOf(w.w), r = RANKS[ix], nx = RANKS[ix + 1];
    var h = "";

    /* 打开这一页最想看的是身家和称号，放最前面。
       个人资料是设一次就不动的东西，挪到最后并折起来；
       从头像点进来时自动展开（见 ui.mineFocus）。 */

    /* 顶部：身家 + 称号 + 到下一级的进度 */
    h += '<div class="mine-top' + (w.w < 0 ? " neg" : "") + '">' +
         '<div class="mt-rank">' + r.name + "</div>" +
         '<div class="mt-num">' + fmtMoney(w.w) + "</div>" +
         '<div class="mt-note">' + r.note + "</div>";
    if (nx) {
      var lo = (r.min === -Infinity) ? 0 : r.min;
      var span = nx.min - lo;
      var got = Math.max(0, Math.min(span, w.w - lo));
      var pct = span > 0 ? Math.round(got / span * 100) : 0;
      h += '<div class="mt-bar"><i style="width:' + pct + '%"></i></div>' +
           '<div class="mt-next">离「' + nx.name + "」还差 " + fmtMoney(nx.min - w.w) + " 分</div>";
    } else {
      h += '<div class="mt-next">已经封顶，没有更高的了</div>';
    }
    h += "</div>";

    /* 战绩 */
    var rate = w.rounds ? Math.round(w.wins / w.rounds * 100) : 0;
    h += '<h3>战绩</h3><div class="stat-grid">' +
      statCell("打了", w.rounds + " 盘") +
      statCell("胡牌", w.wins + " 盘") +
      statCell("胡牌率", rate + "%") +
      statCell("自摸", w.selfDraws + " 次") +
      statCell("最高身家", fmtMoney(w.peak)) +
      statCell("最低身家", fmtMoney(w.low)) +
      statCell("单盘最多赢", fmtMoney(w.bestWin)) +
      statCell("单盘最多输", fmtMoney(w.worstLoss)) +
      "</div>";

    /* 历史 + 复盘 */
    var log = loadLog();
    h += '<h3>最近的牌局' + (log.length ? "（点一盘可以复盘）" : "") + "</h3>";
    if (!log.length) {
      h += '<p class="mine-empty">还没有记录，打完一盘就会出现在这里。</p>';
    } else {
      h += '<div class="hist">';
      for (var k = 0; k < log.length; k++) h += histRow(log[k], k);
      h += "</div>";
      h += '<p class="mine-empty">只保留最近 ' + LOG_MAX + ' 盘。' +
           '<button type="button" class="icon-btn danger" id="log-clear" ' +
           'style="min-width:auto;min-height:34px;padding:0 12px">清空记录</button></p>';
    }

    /* 称号阶梯：查一次就够的参照表，默认收起来 */
    h += '<h3 class="fold' + (ui.mineOpen.ladder ? " open" : "") + '" id="lad-fold">' +
         '称号一览（' + RANKS.length + ' 级）<span class="fold-i">▾</span></h3>';
    if (ui.mineOpen.ladder) {
      h += '<div class="ladder">';
      for (var i = RANKS.length - 1; i >= 0; i--) {
        var q = RANKS[i];
        var cls = i === ix ? " now" : (w.w >= q.min ? " done" : "");
        h += '<div class="lad-row' + cls + '">' +
             '<span class="lad-n">' + q.name + "</span>" +
             '<span class="lad-m">' + (q.min === -Infinity ? "身家为负" : fmtMoney(q.min) + " 起") + "</span>" +
             '<span class="lad-note">' + q.note + "</span></div>";
      }
      h += "</div>";
    }

    /* 个人资料：设一次就不动，收在最后 */
    h += '<h3 class="fold' + (ui.mineOpen.prof ? " open" : "") + '" id="prof-fold">' +
         '个人资料<span class="fold-i">▾</span></h3>';
    if (ui.mineOpen.prof) {
      h += '<div class="prof-card">' +
        '<div class="prof-top">' + avatarHTML("big") +
        '<div class="prof-id"><span class="pid">' + esc(profile.id) + "</span>" +
        '<span class="pid-note">游戏 ID，别人可以用它找到你，不会变</span></div>' +
        '<button type="button" class="icon-btn tiny" id="prof-copy">复制</button></div>' +
        '<div class="set-row"><label>昵称</label>' +
        '<input class="net-input" id="prof-nick" maxlength="8" placeholder="联机时别人看到的名字" value="' +
        esc(profile.nick) + '"></div>' +
        '<div class="set-row"><label>年龄</label>' +
        '<input class="net-input age" id="prof-age" type="number" min="0" max="120" placeholder="不填也行" value="' +
        (profile.age > 0 ? profile.age : "") + '"></div>' +
        '<div class="set-row"><label>性别</label><div class="seg">' +
        ['m', 'f', ''].map(function (v) {
          return '<button type="button" data-sex="' + v + '" class="' +
                 (profile.sex === v ? "on" : "") + '">' + sexLabel(v) + "</button>";
        }).join("") + "</div></div>" +
        '<div class="net-actions"><button type="button" class="big-btn" id="prof-save">保存</button></div>' +
        "</div>";
    }

    var body = document.getElementById("mine-body");
    body.innerHTML = h;
    /* 从头像或联机改名进来的，直接把资料铺开并滚过去 */
    if (ui.mineFocus === "prof") {
      ui.mineFocus = null;
      var pf = document.getElementById("prof-fold");
      if (pf) pf.scrollIntoView({ block: "start" });
    }
  }

  function statCell(k, v) {
    return '<div class="stat"><div class="sk">' + k + '</div><div class="sv">' + v + "</div></div>";
  }

  function histRow(rec, ix) {
    var mine = rec.rep && rec.rep.filter(function (x) { return x.i === 0; })[0];
    var tag, cls;
    if (rec.type === "liuju") { tag = "流局"; cls = "flat"; }
    else if (mine) { tag = "我胡了 · " + mine.way; cls = "win"; }
    else if (rec.from === 0) { tag = "我点炮"; cls = "lose"; }
    else { tag = "别人胡"; cls = "lose"; }

    var d = new Date(rec.t);
    var when = (d.getMonth() + 1) + "/" + d.getDate() + " " +
               ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    var sign = rec.delta > 0 ? "+" : "";
    var dcls = rec.delta > 0 ? "up" : rec.delta < 0 ? "down" : "";

    return '<div class="hrow ' + cls + '" data-log="' + ix + '">' +
      '<span class="h-when">' + when + "</span>" +
      '<span class="h-tag">' + tag + "</span>" +
      '<span class="h-delta ' + dcls + '">' + sign + fmtMoney(rec.delta) + "</span>" +
      '<span class="h-w">身家 ' + fmtMoney(rec.w) + "</span>" +
      '<span class="h-more">▾</span></div>' +
      '<div class="hdetail" id="hd-' + ix + '"></div>';
  }

  /* 复盘：把当时四家的牌摊出来，加上算分明细 */
  function replayHTML(rec) {
    var h = "";
    for (var r = 0; r < (rec.rep || []).length; r++) {
      var x = rec.rep[r];
      h += '<div class="rp-block"><div class="rp-h">' + NAMES[x.i] + " 胡了 · " + x.way + "</div>";
      if (x.fli && x.fli.length) {
        var fl = [];
        for (var i = 0; i < x.fli.length; i++) fl.push(x.fli[i].name + " " + x.fli[i].n);
        h += "<p>花：" + fl.join("、") + "　合计 <b>" + x.fl + " 花</b></p>";
      } else h += "<p>没有花</p>";
      if (x.fans && x.fans.length) {
        var fa = [];
        for (var j = 0; j < x.fans.length; j++) fa.push(x.fans[j].name + " " + x.fans[j].n + " 番");
        h += "<p>番：" + fa.join("、") + "　合计 <b>" + x.fan + " 番</b>，权值 ×" + x.mult + "</p>";
      } else h += "<p>鸡胡，没有番</p>";
      h += "<p>计分 " + x.fm + "</p></div>";
    }
    if (rec.type === "liuju") h += '<div class="rp-block"><div class="rp-h">流局，荒庄</div></div>';

    h += '<div class="rp-block"><div class="rp-h">当时四家的牌</div>';
    for (var p = 0; p < 4; p++) {
      var hd = rec.hands[p];
      var won = rec.rep && rec.rep.some(function (y) { return y.i === p; });
      var mark = won ? '<span class="sd-tag win">胡</span>'
               : (rec.from === p ? '<span class="sd-tag lose">' + (rec.rob ? "被抢杠" : "点炮") + "</span>" : "");
      var sign2 = rec.pays[p] > 0 ? "+" : "";
      h += '<div class="sd-row' + (won ? " won" : "") + '">' +
           '<div class="sd-head">' + (rec.d === p ? '<span class="zhuang">庄</span>' : "") +
           NAMES[p] + mark +
           '<span class="sd-note">' + sign2 + rec.pays[p] + " 分</span></div>" +
           '<div class="sd-tiles">';
      for (var t = 0; t < hd.h.length; t++) h += mjHTML(hd.h[t], { size: "sm" });
      for (var m = 0; m < hd.m.length; m++) {
        h += '<span class="sd-gap"></span>' +
             meldHTML({ key: hd.m[m].k, type: hd.m[m].t, concealed: !!hd.m[m].c }, "sm");
      }
      if (hd.f.length) {
        h += '<span class="sd-gap"></span>';
        for (var f = 0; f < hd.f.length; f++) h += mjHTML(hd.f[f], { size: "sm" });
      }
      h += "</div></div>";
    }
    return h + "</div>";
  }

  /* 录音面板。给会说金坛话的人用的 —— 通常是子女帮着录，不是外婆自己录。 */
  function voicePanel() {
    var done = voicePackCount(), total = VOICE_LIST.length;
    var h = '<p class="set-hint">手机自带的语音只有普通话，没有金坛话。' +
      "想让外婆听到乡音，得找个会说金坛话的人照着下面念一遍 —— " +
      "点「录」，它录 1.8 秒自动停，录完立刻放给你听，不满意再点一次重录。" +
      "全部录完点「导出」，把文件跟游戏一起传上去，全家的手机就都是金坛话了。</p>";
    h += '<div class="vc-top"><div class="vc-prog">已录 <b>' + done + "</b> / " + total +
         (done ? "　约 " + voicePackSize() + " KB" : "") + "</div>";
    h += '<div class="bk-btns">' +
         '<button type="button" class="icon-btn" id="vc-export"' + (done ? "" : " disabled") + '>导出语音包</button>' +
         '<button type="button" class="icon-btn" id="vc-import">导入</button>' +
         (done ? '<button type="button" class="icon-btn danger" id="vc-clear">全部清掉</button>' : "") +
         "</div></div>";
    h += '<div class="vc-list">';
    for (var i = 0; i < VOICE_LIST.length; i++) {
      var it = VOICE_LIST[i];
      var got = hasClip(it.id);
      var rec = REC.on && REC.id === it.id;
      h += '<div class="vc-row' + (got ? " got" : "") + (rec ? " rec" : "") + '">' +
           '<span class="vc-t">' + esc(it.text) + "</span>" +
           '<span class="vc-mark">' + (got ? "✓" : "") + "</span>" +
           '<button type="button" class="icon-btn tiny" data-rec="' + it.id + '"' +
           (REC.on && !rec ? " disabled" : "") + '>' + (rec ? "录音中…" : (got ? "重录" : "录")) + "</button>" +
           (got ? '<button type="button" class="icon-btn tiny" data-play="' + it.id + '">听</button>' : "") +
           "</div>";
    }
    h += "</div>";
    h += '<p class="set-hint">念的时候手机离嘴 20 公分左右，安静一点的房间效果最好。' +
         "只录一部分也行，录了的用金坛话，没录的自动用普通话顶上。</p>";
    h += '<p class="set-hint">拿不准发音的话，B 站上「语言狂魔Mark」有一期' +
         "《江苏金坛话入门100句》可以对照着听。另外金坛话分两片 —— " +
         "东边是吴语、西边是江淮官话，按外婆自己那一片的口音录就对了。</p>";
    return h;
  }

  function renderSettings() {
    var s = settings;
    /* 顺序按「多久用一次」排：眼睛看不清是第一位要解决的，
       所以字号和牌面放最前；算分参数和服务器地址设一次就不动，收到最后。 */
    document.getElementById("set-body").innerHTML =

      /* 帮不熟悉设置的人一步到位：眼睛不好、手慢的，点这一个就够 */
      '<div class="easy-card">' +
      '<div class="ez-t">看不清？手忙不过来？</div>' +
      '<div class="ez-s">点一下，字和牌都放到最大，出牌放慢，还会念出来</div>' +
      '<button type="button" class="big-btn" id="easy-mode">一键调舒服</button></div>' +

      "<h3>看得清楚</h3>" +
      rowSeg("字体大小", "font", [["normal", "正常"], ["large", "大"], ["xlarge", "特大"]]) +
      rowSeg("牌面大小", "tsize", [["std", "标准"], ["big", "大（两行）"]]) +

      "<h3>打得舒服</h3>" +
      rowSeg("出牌速度", "speed",
        [["vslow", "很慢 3.5秒"], ["slow", "慢 2.5秒"], ["mid", "适中 1.8秒"],
         ["fast", "快 1.1秒"], ["vfast", "很快 0.6秒"]]) +
      rowSeg("出牌倒计时", "timer",
        [["0", "不限时"], ["120", "2分钟"], ["90", "90秒"], ["60", "60秒"],
         ["45", "45秒"], ["30", "30秒"]]) +
      rowSeg("语音播报", "voice",
        [["off", "关"], ["act", "只报碰杠胡"], ["all", "每张牌都报"]]) +
      '<p class="set-hint">' + (voicePackCount()
        ? "现在用的是录好的金坛话（" + voicePackCount() + " 条）。"
        : "现在是手机自带的普通话。想听金坛话，展开下面「金坛话语音」录一遍。") + "</p>" +
      rowSeg("牌桌音效", "sound", [["1", "开"], ["0", "关"]]) +
      rowSeg("震动反馈", "vibrate", [["1", "开"], ["0", "关"]]) +
      rowSeg("打牌时屏幕常亮", "awake", [["1", "开"], ["0", "关"]]) +
      rowSeg("剩余张数提示", "counter", [["1", "开"], ["0", "关"]]) +
      (luck().assist ? "" : '<p class="set-hint warn">硬核档下记牌和听牌提示一律关闭，要靠自己记。</p>') +

      "<h3>打得过瘾</h3>" +
      rowSeg("牌运", "luck", [["kind", "轻松"], ["fair", "公平"], ["hard", "硬核"]]) +
      '<p class="set-hint">' + LUCK_HINT[settings.luck || "fair"] + "</p>" +
      rowSeg("对手水平", "difficulty",
        [["wild", "瞎打"], ["rookie", "新手"], ["normal", "普通"], ["master", "高手"]]) +
      '<p class="set-hint">' + DIFF_HINT[settings.difficulty || "rookie"] + "</p>" +

      '<h3 class="fold' + (ui.setOpen.adv ? " open" : "") + '" id="set-adv-fold">' +
      "算分和身家<span class=\"fold-i\">▾</span></h3>" +
      (ui.setOpen.adv
        ? rowNum("底数", "base", s.base) +
          rowNum("花分值", "flowerScore", s.flowerScore) +
          rowNum("封顶", "cap", s.cap) +
          '<p class="set-hint">默认封顶 =（底数 + 3 × 花分值）× 4 = ' + capDefault(s.base, s.flowerScore) +
          '　<button type="button" class="icon-btn" id="cap-reset" style="min-width:auto;min-height:36px;padding:0 12px">按公式重算</button></p>' +
          wealthPanel()
        : "") +

      '<h3 class="fold' + (ui.setOpen.voice ? " open" : "") + '" id="set-voice-fold">' +
      "金坛话语音" + (voicePackCount() ? "（已录 " + voicePackCount() + " 条）" : "") +
      "<span class=\"fold-i\">▾</span></h3>" +
      (ui.setOpen.voice ? voicePanel() : "") +

      '<h3 class="fold' + (ui.setOpen.bk ? " open" : "") + '" id="set-bk-fold">' +
      "备份存档<span class=\"fold-i\">▾</span></h3>" +
      (ui.setOpen.bk
        ? '<p class="set-hint">身家和战绩是存在这个手机的浏览器里的。' +
          "清理缓存、换手机、系统清理软件，都可能把它抹掉。" +
          "备份一下存到微信收藏或者记事本，万一没了还能贴回来。</p>" +
          '<textarea class="bk-box" id="bk-box" readonly placeholder="点下面「生成备份」"></textarea>' +
          '<div class="bk-btns">' +
          '<button type="button" class="icon-btn" id="bk-make">生成备份</button>' +
          '<button type="button" class="icon-btn" id="bk-copy">复制</button>' +
          '<button type="button" class="icon-btn danger" id="bk-restore">粘贴恢复</button>' +
          "</div>" +
          '<p class="set-hint">恢复：把备份码贴进上面的框，再点「粘贴恢复」。' +
          "会覆盖当前的身家和战绩，问一遍才动。牌局记录太大，不在备份里。</p>"
        : "") +

      '<h3 class="fold' + (ui.setOpen.srv ? " open" : "") + '" id="set-srv-fold">' +
      "联机服务器<span class=\"fold-i\">▾</span></h3>" +
      (ui.setOpen.srv
        ? '<div class="set-row"><label>地址</label>' +
          '<input class="net-input" id="set-server" placeholder="https://xxx.pages.dev" value="' +
          esc(settings.server || "") + '">' +
          '<button type="button" class="icon-btn" id="set-server-save">保存</button></div>' +
          '<p class="set-hint">' + (settings.server
            ? "用的是你自己的服务器。清空这一格会改回内置的那台。"
            : "留空就是用内置的（" +
              DEFAULT_SERVERS.map(function (x) { return x.replace(/^https?:\/\//, ""); }).join(" 或 ") +
              "，哪台通用哪台），一般不用改。想自己搭一台的话，「和朋友一起打」页面里有教程。") + "</p>"
        : "");
    bindSettings();
  }
  function rowNum(label, key, val) {
    return '<div class="set-row"><label>' + label + '</label><div class="stepper">' +
      '<button type="button" data-step="' + key + '" data-d="-1">−</button>' +
      '<div class="val" id="v-' + key + '">' + val + "</div>" +
      '<button type="button" data-step="' + key + '" data-d="1">+</button></div></div>';
  }
  function wealthPanel() {
    var r = rankOf(wealth.w);
    var rate = wealth.rounds ? Math.round(wealth.wins / wealth.rounds * 100) : 0;
    return '<div class="set-row wealth-row"><label>我的身家</label>' +
      '<div class="wr-right"><span class="wr-num' + (wealth.w < 0 ? " neg" : "") + '">' +
      fmtMoney(wealth.w) + '</span><span class="wr-rank">' + r.name + '</span>' +
      '<button type="button" class="icon-btn danger" id="wealth-reset">重来</button></div></div>' +
      '<p class="set-hint">打了 ' + wealth.rounds + ' 盘，胡 ' + wealth.wins + ' 盘（' + rate + '%），自摸 ' +
      wealth.selfDraws + ' 次　最高 ' + fmtMoney(wealth.peak) + '，最低 ' + fmtMoney(wealth.low) +
      '　单盘最多赢 ' + fmtMoney(wealth.bestWin) + '，最多输 ' + fmtMoney(wealth.worstLoss) + '</p>';
  }

  var LUCK_HINT = {
    kind: "起手和摸牌都朝你倾斜，只要不乱打基本都能赢。算分照旧，不掺水。",
    fair: "完全随机洗牌，谁也不偏，最正的一副麻将。",
    hard: "同样是随机洗牌，一样公平，但记牌和听牌提示全关，得自己记牌算张。"
  };
  var DIFF_HINT = {
    wild:   "不太会打，基本见牌就丢，也很少碰杠。",
    rookie: "会打，但常出错，该碰的经常放过。",
    normal: "路子清楚，偶尔失误。",
    master: "记牌、算进张、挑安全牌打。非常小心才赢得了。"
  };
  /* voice 已经从开关变成三档字符串，不在这里 */
  var BOOL_SET = { sound: 1, counter: 1, vibrate: 1, awake: 1 };
  var NUM_SET = { timer: 1 };
  function rowSeg(label, key, opts) {
    var b = "";
    for (var i = 0; i < opts.length; i++) {
      var on = "";
      if (BOOL_SET[key]) on = (!!settings[key] === (opts[i][0] === "1")) ? " on" : "";
      else if (NUM_SET[key]) on = (settings[key] === parseInt(opts[i][0], 10)) ? " on" : "";
      else on = settings[key] === opts[i][0] ? " on" : "";
      b += '<button type="button" data-seg="' + key + '" data-v="' + opts[i][0] + '" class="' + on.trim() + '">' + opts[i][1] + "</button>";
    }
    return '<div class="set-row"><label>' + label + '</label><div class="seg">' + b + "</div></div>";
  }
  function bindSettings() {
    document.getElementById("set-body").onclick = function (e) {
      var t = e.target;
      var fold = t.closest && t.closest("#set-adv-fold, #set-voice-fold, #set-bk-fold, #set-srv-fold");
      if (fold) {
        var key = fold.id === "set-adv-fold" ? "adv"
                : fold.id === "set-voice-fold" ? "voice"
                : fold.id === "set-bk-fold" ? "bk" : "srv";
        ui.setOpen[key] = !ui.setOpen[key];
        renderSettings();
        return;
      }
      var recId = t.getAttribute && t.getAttribute("data-rec");
      if (recId) { recStart(recId); return; }
      var playId = t.getAttribute && t.getAttribute("data-play");
      if (playId) {
        try { var a = new Audio(voicePack[playId]); a.play().catch(function () {}); } catch (e) {}
        return;
      }
      if (t.id === "vc-export") { exportVoicePack(); return; }
      if (t.id === "vc-import") { importVoicePack(); return; }
      if (t.id === "vc-clear") {
        if (!confirm("把录好的金坛话全部删掉？\n删了就回到手机自带的普通话。")) return;
        voicePack = {};
        try { localStorage.removeItem(VOICE_KEY); } catch (e) {}
        renderSettings(); toast("清掉了");
        return;
      }
      if (t.id === "bk-make") {
        document.getElementById("bk-box").value = makeBackup();
        document.getElementById("bk-box").removeAttribute("readonly");
        toast("生成好了，点「复制」存到别处");
        return;
      }
      if (t.id === "bk-copy") {
        var bv = document.getElementById("bk-box").value;
        if (!bv) { toast("先点「生成备份」"); return; }
        copyText(bv, "备份码复制好了，贴到微信收藏里存着");
        return;
      }
      if (t.id === "bk-restore") { restoreBackup(); return; }
      if (t.id === "easy-mode") {
        settings.font = "xlarge";     /* 字最大 */
        settings.tsize = "big";       /* 牌最大，手牌自动排两行 */
        settings.speed = "slow";      /* 电脑慢一点，看得清谁打了什么 */
        settings.timer = 0;           /* 不催 */
        settings.voice = "all";       /* 每张牌都念出来，眼睛不好也跟得上 */
        settings.sound = true;
        settings.counter = true;      /* 还剩几张写在旁边 */
        settings.awake = true;        /* 不黑屏 */
        settings.luck = "kind";       /* 牌运向着自己，赢面大些 */
        settings.difficulty = "rookie";
        saveSettings(); renderSettings();
        toast("调好了，去打一盘试试");
        return;
      }
      if (t.id === "set-server-save") {
        settings.server = (document.getElementById("set-server").value || "").trim();
        NET.base = null; NET.diag = null;   /* 换了地址，之前探测的结果作废 */
        saveSettings(); renderSettings(); toast("服务器地址保存好了");
        return;
      }
      if (t.id === "wealth-reset") {
        if (confirm("把身家清零重来？\n当前 " + fmtMoney(wealth.w) + " 分和全部战绩都会没有，回到 " +
                    fmtMoney(START_WEALTH) + " 分重新开始。")) {
          resetWealth(); renderSettings();
        }
        return;
      }
      if (t.id === "cap-reset") {
        settings.cap = capDefault(settings.base, settings.flowerScore);
        saveSettings(); renderSettings(); return;
      }
      if (t.getAttribute("data-step")) {
        var key = t.getAttribute("data-step");
        var d = parseInt(t.getAttribute("data-d"), 10);
        var step = key === "base" || key === "flowerScore" || key === "cap" ? 1 : 1;
        settings[key] = Math.max(0, settings[key] + d * step);
        if (key === "base" || key === "flowerScore") settings.cap = capDefault(settings.base, settings.flowerScore);
        saveSettings(); renderSettings();
      }
      if (t.getAttribute("data-seg")) {
        var k2 = t.getAttribute("data-seg");
        var v = t.getAttribute("data-v");
        if (BOOL_SET[k2]) settings[k2] = v === "1";
        else if (NUM_SET[k2]) settings[k2] = parseInt(v, 10) || 0;
        else settings[k2] = v;
        saveSettings(); renderSettings();
        if (k2 === "voice" && voiceOn()) say("act_peng");   /* 当场听一下是什么声音 */
        if (k2 === "sound" && settings.sound) sfx("peng");
        if (k2 === "vibrate" && settings.vibrate) buzz([0, 26, 55, 26]);
        if (k2 === "awake") keepAwake(!!settings.awake && ui.screen === "table");
      }
    };
  }

  /* 只有内容真的变了才写 DOM。
     牌河四家满编 64 张，重排一次要让浏览器解析近 10 万字符；
     而大多数 render 是选牌、倒计时、提示这类跟牌河无关的事触发的，
     照原样每次全量重写，老手机上每一次点击都会卡一下。 */
  /* 这几个格子都是页面里写死的、从头到尾同一个节点，
     内容只经 setHTML 改，所以缓存不会和实际 DOM 走散。 */
