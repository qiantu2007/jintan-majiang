/* 金坛麻将 · 存在这台手机上的东西
 * 身家与称号、个人资料、牌谱、设置、牌局存档、导出备份码。
 * 全部走 localStorage。都包了 try/catch —— 隐私模式下写不进去也不能崩。
 *
 * 由 构建.mjs 拼进 index.html。改这里，不要改根目录那个。 */

  /* ══════════ 身家 ══════════
     跨会话保存的赌资。开局 2000，可以打成负数（欠账），不会破产出局。
     只记玩家自己，三个电脑对手仍然用本局累计分。 */
  var WEALTH_KEY = "jintan_mj_wealth_v1";
  var START_WEALTH = 2000;
  /* 称号阶梯：门槛逐级拉开（800 / 1200 / 2500 / 3500 / 5000 / 7000 / 10000 / 15000 / 25000），
     越往上越难爬，够打很久。开局 2000 正好是「熟手」，跟老版本对得上，不会平白降级。 */
  var RANKS = [
    { min: -Infinity, name: "欠账", note: "先把窟窿填上" },
    { min: 0,         name: "新丁", note: "刚上桌" },
    { min: 800,       name: "学徒", note: "会打了" },
    { min: 2000,      name: "熟手", note: "开局就在这儿" },
    { min: 4500,      name: "老手", note: "牌路清楚了" },
    { min: 8000,      name: "好手", note: "赢多输少" },
    { min: 13000,     name: "高手", note: "会算牌了" },
    { min: 20000,     name: "名家", note: "麻将馆里有名号" },
    { min: 30000,     name: "大师", note: "少有对手" },
    { min: 45000,     name: "宗师", note: "打遍金坛" },
    { min: 70000,     name: "牌王", note: "封顶了" }
  ];
  var wealth = null;

  function rankOf(w) {
    var r = RANKS[0];
    for (var i = 0; i < RANKS.length; i++) if (w >= RANKS[i].min) r = RANKS[i];
    return r;
  }
  function nextRank(w) {
    for (var i = 0; i < RANKS.length; i++) if (w < RANKS[i].min) return RANKS[i];
    return null;
  }
  function defaultWealth() {
    return {
      w: START_WEALTH, peak: START_WEALTH, low: START_WEALTH,
      rounds: 0, wins: 0, selfDraws: 0, bestWin: 0, worstLoss: 0, since: Date.now()
    };
  }
  function loadWealth() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(WEALTH_KEY) || "null"); } catch (e) {}
    wealth = (d && typeof d.w === "number") ? d : defaultWealth();
    var def = defaultWealth();          /* 老存档补齐新字段 */
    for (var k in def) if (wealth[k] == null) wealth[k] = def[k];
    return wealth;
  }
  function saveWealth() {
    try { localStorage.setItem(WEALTH_KEY, JSON.stringify(wealth)); } catch (e) {}
  }
  function resetWealth() { wealth = defaultWealth(); saveWealth(); }

  function fmtMoney(n) {
    var s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (n < 0 ? "-" : "") + s;
  }

  /* 一盘结束后结算身家。settle.wealthResult 保证只算一次 */
  function applyRoundToWealth(s) {
    if (s.wealthResult) return s.wealthResult;
    var before = wealth.w;
    var delta = (s.pays && s.pays[0]) || 0;
    var meWon = false, byDraw = false;
    for (var i = 0; i < (s.reports || []).length; i++) {
      if (s.reports[i].i !== 0) continue;
      meWon = true;
      var way = s.reports[i].way;
      if (way === "自摸" || way === "杠开" || way === "抢杠") byDraw = true;
    }
    wealth.w = before + delta;
    wealth.rounds++;
    if (meWon) wealth.wins++;
    if (byDraw) wealth.selfDraws++;
    if (wealth.w > wealth.peak) wealth.peak = wealth.w;
    if (wealth.w < wealth.low) wealth.low = wealth.w;
    if (delta > wealth.bestWin) wealth.bestWin = delta;
    if (delta < wealth.worstLoss) wealth.worstLoss = delta;
    saveWealth();
    s.wealthResult = {
      before: before, after: wealth.w, delta: delta,
      rankBefore: rankOf(before).name, rankAfter: rankOf(wealth.w).name
    };
    recordRound(s, s.wealthResult);
    return s.wealthResult;
  }

  /* ══════════ 个人资料 ══════════
     游戏 ID 自动生成、终身不变，用来认人；昵称随时可改，联机时别人看到的就是它。 */
  var PROF_KEY = "jintan_mj_profile_v1";
  var ID_CHARS = "ACDEFGHJKLMNPQRTUVWXY3479";   /* 去掉容易看错的 0O1I B8 S5 Z2 */
  var profile = null;

  function newGameId() {
    var s = "";
    for (var i = 0; i < 6; i++) s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
    return "JT-" + s;
  }
  function defaultProfile() {
    var old = "";
    try { old = localStorage.getItem("jintan_mj_name") || ""; } catch (e) {}
    return { id: newGameId(), nick: old || "", age: 0, sex: "" };
  }
  /* 存档里的字段类型一律不信：只要有一个不是预期的类型，
     后面 nick.charAt() 之类就会抛错，整个脚本起不来，
     打开就是一片空白，而且自己没法恢复。全部强制转成安全值。 */
  function loadProfile() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(PROF_KEY) || "null"); } catch (e) {}
    var fresh = !(d && typeof d === "object" && !Array.isArray(d));
    profile = fresh ? defaultProfile() : d;

    var before = JSON.stringify(profile);
    profile.id = (typeof profile.id === "string" && profile.id) ? profile.id : newGameId();
    profile.nick = typeof profile.nick === "string" ? profile.nick.slice(0, 8) : "";
    var age = parseInt(profile.age, 10);
    profile.age = (isFinite(age) && age > 0 && age < 130) ? age : 0;
    profile.sex = (profile.sex === "m" || profile.sex === "f") ? profile.sex : "";

    /* 新生成的 ID 必须当场落盘。
       以前只放在内存里，等用户自己去「我的」点保存才写，
       结果每开一次游戏 ID 就换一个 —— 报给牌友的号第二天就对不上了。
       顺带把纠正过的脏字段也一并存回去。 */
    if (fresh || JSON.stringify(profile) !== before) {
      try { localStorage.setItem(PROF_KEY, JSON.stringify(profile)); } catch (e) {}
    }
    return profile;
  }
  function saveProfile() {
    try { localStorage.setItem(PROF_KEY, JSON.stringify(profile)); } catch (e) {}
    renderHomeProfile();
  }
  function profNick() { return (profile && profile.nick) || "玩家"; }
  function sexLabel(s) { return s === "m" ? "男" : s === "f" ? "女" : "不说"; }

  /* 头像：昵称首字 + 按性别上色。不联网、不用图片 */
  function avatarHTML(cls) {
    var n = profNick();
    var ch = n.charAt(0) || "玩";
    var k = profile && profile.sex === "m" ? " m" : profile && profile.sex === "f" ? " f" : "";
    return '<span class="ava' + k + (cls ? " " + cls : "") + '">' + esc(ch) + "</span>";
  }

  /* 主页左上角那张小卡 */
  function renderHomeProfile() {
    var el = document.getElementById("home-prof");
    if (!el || !profile) return;
    var bits = [];
    if (profile.age > 0) bits.push(profile.age + " 岁");
    if (profile.sex) bits.push(sexLabel(profile.sex));
    el.innerHTML = avatarHTML() +
      '<span class="hp-txt"><span class="hp-nick">' + esc(profNick()) + "</span>" +
      '<span class="hp-sub">' + esc(profile.id) +
      (bits.length ? "　" + bits.join(" · ") : "") + "</span></span>";
  }

  /* ══════════ 牌谱 ══════════
     每盘结束存一条，供「我的」里翻历史和复盘。只留最近 60 盘，
     一条约 600 字节，占不了多少地方。 */
  var LOG_KEY = "jintan_mj_log_v1";
  var LOG_MAX = 60;

  function loadLog() {
    try {
      var a = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      return Object.prototype.toString.call(a) === "[object Array]" ? a : [];
    } catch (e) { return []; }
  }
  function saveLog(a) {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(a)); } catch (e) {}
  }
  function clearLog() { try { localStorage.removeItem(LOG_KEY); } catch (e) {} }

  /* 把一盘压成尽量小的记录 */
  function recordRound(s, wr) {
    try {
      var hands = [];
      for (var i = 0; i < 4; i++) {
        var p = game.players[i];
        var hk = [];
        for (var q = 0; q < p.hand.length; q++) {
          if (!isFlower(p.hand[q].key)) hk.push(p.hand[q].key);
        }
        hk.sort(cmpKey);
        var ms = [];
        for (var m = 0; m < p.melds.length; m++) {
          ms.push({ k: p.melds[m].key, t: p.melds[m].type, c: p.melds[m].concealed ? 1 : 0 });
        }
        var fs = [];
        for (var f = 0; f < p.flowers.length; f++) fs.push(p.flowers[f].key);
        hands.push({ h: hk, m: ms, f: fs, sc: p.score });
      }
      var rep = [];
      for (var r = 0; r < (s.reports || []).length; r++) {
        var rp = s.reports[r], info = rp.info || {};
        rep.push({
          i: rp.i, way: rp.way, score: rp.score,
          fl: info.flowers, fli: info.flowerItems || [],
          fans: info.fans || [], fan: info.fan, mult: info.mult,
          fm: info.formula
        });
      }
      var rec = {
        t: Date.now(), r: game.round, type: s.type, d: game.dealer,
        delta: wr.delta, w: wr.after, rk: wr.rankAfter,
        from: (s.flags && (s.flags.ron || s.flags.robKong)) ? s.flags.from : null,
        rob: !!(s.flags && s.flags.robKong),
        pays: s.pays.slice(), rep: rep, hands: hands
      };
      var log = loadLog();
      log.unshift(rec);
      if (log.length > LOG_MAX) log.length = LOG_MAX;
      saveLog(log);
    } catch (e) {}
  }

  function renderWealthCard() {
    var el = document.getElementById("wealth-card");
    if (!el || !wealth) return;
    var r = rankOf(wealth.w), nx = nextRank(wealth.w);
    var neg = wealth.w < 0 ? " neg" : "";
    var line2 = r.name + "　打了 " + wealth.rounds + " 盘";
    if (wealth.rounds) line2 += "，胡了 " + wealth.wins + " 盘";
    if (nx) line2 += "　离「" + nx.name + "」还差 " + fmtMoney(nx.min - wealth.w);
    el.innerHTML = '<div class="wc-top"><span class="wc-lab">身家</span>' +
                   '<span class="wc-num' + neg + '">' + fmtMoney(wealth.w) + "</span></div>" +
                   '<div class="wc-sub">' + line2 + "</div>";
  }

  function renderPurse() {
    var el = document.getElementById("purse");
    if (!el || !wealth) return;
    el.textContent = "身家 " + fmtMoney(wealth.w);
    el.classList.toggle("neg", wealth.w < 0);
  }

  /* —— 存档 —— */
  function saveSettings() {
    try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) {}
    applyFont();
  }
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(SET_KEY) || "null");
      if (s) {
        for (var k in settings) if (s[k] != null) settings[k] = s[k];
      }
    } catch (e) {}
    /* 旧存档迁移：倒计时曾是开关，难度曾叫 easy/hard */
    if (settings.timer === true) settings.timer = 60;
    else if (settings.timer === false) settings.timer = 0;
    settings.timer = parseInt(settings.timer, 10) || 0;
    if (DIFF_ALIAS[settings.difficulty]) settings.difficulty = DIFF_ALIAS[settings.difficulty];

    /* 存档里的值一个都不信。
       算分参数要是变成字符串或 null，番数会算出 NaN，
       结果是「明明能胡却提示无番」——这种错最难查，直接在入口挡掉。 */
    function pickOne(v, allowed, dft) { return allowed.indexOf(v) >= 0 ? v : dft; }
    function posInt(v, dft, lo, hi) {
      var n = parseInt(v, 10);
      if (!isFinite(n) || n < lo || n > hi) return dft;
      return n;
    }
    /* 语音从开关升级成三档：关 / 只报碰杠胡 / 每张牌都报。
       老存档里存的是 true / false，迁过来 */
    if (settings.voice === true) settings.voice = "act";
    else if (settings.voice === false) settings.voice = "off";
    if (["off", "act", "all"].indexOf(settings.voice) < 0) settings.voice = "act";

    settings.difficulty = DIFF[settings.difficulty] ? settings.difficulty : "rookie";
    settings.luck       = LUCK[settings.luck] ? settings.luck : "fair";
    settings.speed      = SPEED[settings.speed] ? settings.speed : "mid";
    settings.font       = pickOne(settings.font, ["normal", "large", "xlarge"], "normal");
    settings.tsize      = pickOne(settings.tsize, ["std", "big"], "std");
    settings.base        = posInt(settings.base, 10, 1, 9999);
    settings.flowerScore = posInt(settings.flowerScore, 5, 0, 9999);
    settings.cap         = posInt(settings.cap, capDefault(settings.base, settings.flowerScore), 1, 999999);
    settings.server     = typeof settings.server === "string" ? settings.server.trim() : "";
    applyFont();
  }
  /* ══════════ 存档备份 ══════════
     身家和战绩只存在这台手机的浏览器里，清缓存、换手机就没了。
     导出成一串文本，贴到微信收藏或记事本里就能带走。
     牌局记录（含复盘牌谱）动辄上百 KB，贴不动，不放进来。 */
  var BK_TAG = "JTMJ1:";
  function b64enc(s) {
    return btoa(unescape(encodeURIComponent(s)));   /* 中文要先转成字节再 base64 */
  }
  function b64dec(s) {
    return decodeURIComponent(escape(atob(s)));
  }
  function makeBackup() {
    var d = { v: 1, t: Date.now(), wealth: wealth, profile: profile, settings: settings };
    try { return BK_TAG + b64enc(JSON.stringify(d)); }
    catch (e) { return ""; }
  }
  function restoreBackup() {
    var box = document.getElementById("bk-box");
    var raw = (box && box.value || "").trim();
    if (!raw) { toast("先把备份码贴进上面的框"); return; }
    var body = raw.indexOf(BK_TAG) === 0 ? raw.slice(BK_TAG.length) : raw;
    var d = null;
    try { d = JSON.parse(b64dec(body.replace(/\s+/g, ""))); } catch (e) {}
    if (!d || typeof d !== "object" || !d.wealth) {
      toast("这串码看不懂，检查一下是不是复制全了");
      return;
    }
    var w = d.wealth;
    var when = d.t ? new Date(d.t).toLocaleDateString("zh-CN") : "不明时间";
    if (!confirm("恢复这份备份？\n\n里面是 " + fmtMoney(w.w) + " 分、打了 " +
                 (w.rounds || 0) + " 盘（" + when + " 备份的）。\n" +
                 "当前的身家和战绩会被覆盖。")) return;
    try {
      localStorage.setItem(WEALTH_KEY, JSON.stringify(d.wealth));
      if (d.profile) localStorage.setItem(PROF_KEY, JSON.stringify(d.profile));
      if (d.settings) localStorage.setItem(SET_KEY, JSON.stringify(d.settings));
    } catch (e) { toast("存不进去，手机存储可能满了"); return; }
    toast("恢复好了，正在重新打开…");
    setTimeout(function () { location.reload(); }, 900);
  }

  function applyFont() {
    document.body.setAttribute("data-font", settings.font === "large" ? "large" : settings.font === "xlarge" ? "xlarge" : "normal");
    document.body.setAttribute("data-tsize", settings.tsize === "big" ? "big" : "std");
  }
  function saveGame() {
    if (game && game.online) return;   /* 联机局的进度在服务器上，本地不存 */
    if (!game || game.over) {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      return;
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        game: {
          wall: game.wall, players: game.players, dealer: game.dealer,
          nextDealer: game.nextDealer, current: game.current, round: game.round,
          phase: game.phase, lastDiscard: game.lastDiscard, lastFrom: game.lastFrom,
          kongDraw: game.kongDraw, needDraw: game.needDraw,
          drewThisTurn: game.drewThisTurn, over: game.over
        },
        settings: settings
      }));
    } catch (e) {}
  }
  function loadGame() {
    try {
      var d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!d || !d.game || !d.game.players) return null;
      return d;
    } catch (e) { return null; }
  }
  function hasSave() {
    var d = loadGame();
    return !!(d && d.game && !d.game.over && d.game.wall);
  }
