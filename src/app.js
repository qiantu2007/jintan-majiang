/* 金坛麻将 · 骨架
 * 常量、全局状态、牌墙与开局、PWA 安装、自测、事件绑定、启动。
 * 剩下的都分出去了：规则 rules / 算番 score / 电脑 ai / 牌面 tiles /
 * 反馈 feedback / 存档 store / 界面 pages / 联机 net / 牌桌 table / 流程 flow。
 * 
 * 这个文件必须最后加载：结尾那段事件绑定和启动代码要等前面全部声明完。
 *
 * 由 构建.mjs 拼进 index.html。改这里，不要改根目录那个。 */


  var VERSION = "1.19.1";
  var CHANGELOG = [
    { v: "1.19.1", d: "2026-09-03", items: [
      "一些优化"
    ] },
    { v: "1.19.0", d: "2026-09-02", items: [
      "修好一个会让整桌卡死的问题：轮到你选碰不碰的时候手机掉线，回来以后没人再问你了，四个人一起干等 —— 现在重连会把那张牌重新摆到你面前",
      "联机时收到看不懂的消息不再闷头丢掉，会提醒你这台手机上的版本可能太旧了"
    ] },
    { v: "1.18.1", d: "2026-09-01", items: [
      "修好一个会卡死的问题：欠着花掉线、系统替你补掉之后再回来，出牌按钮就再也不出现了",
      "补花提示语改短，大牌面＋特大字时不会再被手牌区切掉半截"
    ] },
    { v: "1.18.0", d: "2026-09-01", items: [
      "摸到花不再自动换掉了：花牌会留在手里，点一下它（或点「补花」）才亮到花区，然后从牌尾补一张",
      "连着摸到花就连着补，一张一张来，跟真牌桌上的动作一样",
      "补花期间不给出牌按钮，免得手快把花当废牌打出去",
      "电脑和掉线托管的座位仍旧自动补，不会把牌局拖住",
      "联机同步改了：服务端摸到花会停下来等你点，断线重连回来还欠着的那张花会接着让你补"
    ] },
    { v: "1.17.1", d: "2026-09-01", items: [
      "录音界面加了发音参考：B 站有一期《江苏金坛话入门100句》可以对照着听",
      "标明金坛话分两片 —— 东边吴语、西边江淮官话，按自家那片口音录就行"
    ] },
    { v: "1.17.0", d: "2026-09-01", items: [
      "语音播报分三档：关 / 只报碰杠胡 / 每张打出的牌都报",
      "可以录金坛话了：设置里有 40 条词，找会说的人照着念一遍，录完全家都能用",
      "录音会自动剪掉前后空白、拉齐音量，一条约 7 KB，40 条加起来才 300 KB",
      "统一转成 WAV，苹果安卓都放得响；录了哪条用哪条，没录的自动用普通话顶上",
      "「一键调舒服」现在会把播报调成「每张牌都报」"
    ] },
    { v: "1.16.0", d: "2026-09-01", items: [
      "房主复制完链接、切去微信发给朋友，回来房间还在了（以前会说「房间不存在」）",
      "掉线的人回来还是原来的座位，房主身份、准备状态都不会丢",
      "有人手机锁屏掉线，不再把房主卡在「还有 1 人没准备」上，可以先开局",
      "掉线的人中途回来能接着打；一直不回来的，轮到他时电脑会替他走，牌局不会停",
      "修掉了会反复断线重连、连准备都点不了的问题"
    ] },
    { v: "1.15.1", d: "2026-09-01", items: [
      "修好联机时中途退出再进来、电脑就不动了的问题",
      "退出的人如果正好是替电脑算牌的那个，屋里别人会立刻接手，牌局不会停",
      "万一人全退光了，服务器自己替电脑走一步，牌局不会永远卡死",
      "（这次改的是服务器，游戏文件也要一起传）"
    ] },
    { v: "1.15.0", d: "2026-09-01", items: [
      "牌面全部换成实物麻将的画法，不再是自己描的",
      "筒子是铜钱花瓣纹，萬字数字是靛蓝色，五萬写作「伍」——和家里那副牌一样",
      "一条的雀、条子的红绿搭配、春夏秋冬梅蘭竹菊，都按实物来",
      "牌面反而更省资源了：屏幕上的元素少了一成，牌河重排快了一倍"
    ] },
    { v: "1.14.1", d: "2026-09-01", items: [
      "修好联机时牌河会凭空多出一张牌的问题（断线重连后同一条消息会收两遍）",
      "重复消息现在一律当没收到，一副牌稳稳是 144 张",
      "服务端同一个座位只保留一条连接，从根上不再发两遍"
    ] },
    { v: "1.14.0", d: "2026-09-01", items: [
      "设置页顶上加了「一键调舒服」：字和牌放最大、出牌放慢、开语音，点一下全搞定",
      "新增备份存档：身家和战绩能导出成一串码，存到微信收藏里，换手机或清了缓存都能贴回来",
      "修好一个明显的错：游戏 ID 每次打开都在变，报给牌友的号第二天就对不上，现在真的固定不变了",
      "修好一个隐患：存档里只要有一个字段类型不对，整个游戏会打不开，现在会自动纠正",
      "修好另一个隐患：设置值损坏时会让能胡的牌被误判成「无番」",
      "设置和联机两页也统一了版式，和其他页面一样宽、一样的标题样式"
    ] },
    { v: "1.13.0", d: "2026-09-01", items: [
      "修好一个大问题：设置页之前是全白的，打不开，现在正常了",
      "所有页面改成铺满屏幕，以前内容挤在中间窄窄一条，两边全空着",
      "设置按「看得清楚 / 打得舒服 / 打得过瘾」分了组，字号和牌面大小提到最前面",
      "「我的」改成一进来先看到身家和称号，称号一览和个人资料收起来了",
      "点左上角头像还是直接进资料，会自动展开",
      "帮助里的更新记录只留最近三版，更早的点开再看",
      "结算面板的按钮不再压住底下的字",
      "小按钮加大到一戳就中，个人资料那行小字也调大了"
    ] },
    { v: "1.12.0", d: "2026-09-01", items: [
      "画面流畅了很多：一次重绘从 8 毫秒降到 0.04 毫秒，老手机点哪都跟手",
      "牌面改成共用一份图样，屏幕上的元素少了一半，更省电",
      "联机换到国内直连能通的地址，不用挂梯子也能进房间了",
      "连不上时 6 秒就说清楚，不再干等半分钟",
      "服务器可以配多个，一个不通自动换另一个，连通过的会记住",
      "新增「检查网络」，一眼看出是没网、服务器挂了、还是网址被拦",
      "「和朋友一起打」里加了「连不上怎么办」，写明原因和解决办法",
      "修掉一个联机的坑：离线缓存会把开房请求也存下来，导致每次开房拿到同一个房间号",
      "断线重连更快，从后台切回来立刻重连",
      "牌桌加了聚光和收边，牌做出了厚度，出牌带一点自然的偏转"
    ] },
    { v: "1.11.0", d: "2026-09-01", items: [
      "首页只留一个「开始游戏」，点进去再选怎么打",
      "上次没打完的那盘，会显示在最上面，还标着打到第几盘、剩多少张",
      "「自己一个人打」和「和朋友一起打」并排放，不用再找",
      "小屏幕、大字号下三个选项也能一眼看全"
    ] },
    { v: "1.10.0", d: "2026-09-01", items: [
      "有个人资料了：游戏 ID、昵称、年龄、性别",
      "主页左上角显示头像和资料，点一下就能改",
      "游戏 ID 自动生成、终身不变，可以复制给朋友",
      "联机进房间时，别人看到的就是你的昵称"
    ] },
    { v: "1.9.1", d: "2026-09-01", items: [
      "服务器地址已经内置好，装上就能联机，不用再一台台手填",
      "「和朋友一起打」里能看到当前用的服务器，有「复制网址」按钮",
      "同一页里加了自己搭服务器的教程，命令都能一键复制",
      "想用自己的服务器就点「改成别的」，随时能改回默认"
    ] },
    { v: "1.9.0", d: "2026-08-31", items: [
      "能和朋友一起打了：开房间拿房间号，或者直接发邀请链接",
      "最多四个人，空位自动用电脑补上",
      "所有人都点了「准备好了」，房主才能开始",
      "房主可以选电脑难度，也可以把人请出去",
      "牌是服务器发的，每人只收到自己的牌，房主也看不到别人的",
      "掉线会自动重连，回来还是原来的座位和手牌"
    ] },
    { v: "1.8.0", d: "2026-08-31", items: [
      "修好一个大 bug：以前只要自己刚打过牌，别人打出的牌就一张都胡不了，点炮胡几乎发生不了",
      "现在上家打出的牌正好补上你的顺子并能和牌时，可以直接胡（等于吃下来就胡）",
      "「不能胡自己打过的牌」改成只拦自己打出去的那几张，不再一出牌就锁死全部",
      "「过水不胡」改成真的放弃过一次可胡的牌之后才锁"
    ] },
    { v: "1.7.1", d: "2026-08-31", items: [
      "去掉了屏幕最下方那块发黑的区域，手牌区改成牌桌的深绿，整屏是一张完整的桌子",
      "手牌区压薄了一点，牌桌看得更多",
      "修好了 iPhone 横屏刘海挡住时手牌被挤成两行的问题"
    ] },
    { v: "1.7.0", d: "2026-08-31", items: [
      "首页加了「我的」：身家、称号、战绩、历史牌局都在里面",
      "可以复盘：点历史里的任意一盘，能看到当时四家的牌和算分明细",
      "称号从 7 个加到 11 个，多了新丁、名家、大师、宗师",
      "称号之间的身家差距拉大了，越往上越难爬（开局仍是「熟手」，不会降级）",
      "「我的」里能看到完整的称号阶梯和各自门槛"
    ] },
    { v: "1.6.0", d: "2026-08-31", items: [
      "打牌时屏幕保持常亮，不会想一想就黑屏",
      "加了「提示」按钮，不知道打哪张时点一下，会指出该打的牌并说明理由",
      "双击一张牌可以直接打出，不用再点「打出」",
      "碰 / 杠 / 胡 的按钮改到手牌正上方居中，更大更好按，也不再挤动画面",
      "加了「牌面大小」，选「大」牌会放大约四分之一、手牌排成两行",
      "碰杠胡时手机会轻轻震一下（安卓）",
      "牌桌中间会写明轮到谁出牌"
    ] },
    { v: "1.5.0", d: "2026-08-31", items: [
      "难度拆成「牌运」和「对手水平」两个独立档位",
      "牌运分轻松 / 公平 / 硬核，硬核档关掉记牌和听牌提示，得自己记",
      "对手分瞎打 / 新手 / 普通 / 高手，高手会记牌、算进张、挑安全牌打",
      "结算时摊出四家牌型，没胡的显示还差几张听牌",
      "出牌倒计时从 2 档加到 6 档",
      "首页加了版本号和帮助，有新版本会提示更新"
    ] },
    { v: "1.4.0", d: "2026-08-30", items: [
      "可以添加到主屏幕，像 App 一样用",
      "加了离线缓存，装好之后断网也能打"
    ] },
    { v: "1.3.0", d: "2026-08-30", items: [
      "加了身家，开局 2000，输赢跨天累计",
      "身家可以打成负数，不会破产出局",
      "按身家给称号，从学徒一路到牌王",
      "结算面板顶部显示身家变化和升降段"
    ] },
    { v: "1.2.0", d: "2026-08-29", items: [
      "牌面照实物重画：同心筒子、真竹节条子、一条画雀",
      "加了牌桌音效，碰杠胡都有声",
      "点一张手牌会告诉你这种牌还剩几张",
      "难度和出牌速度档位细分"
    ] },
    { v: "1.1.0", d: "2026-08-29", items: [
      "改成横屏牌桌，手牌一行排完",
      "竖屏拿手机时画面自动转过来",
      "四家牌河分开摆，结算明细分两栏"
    ] },
    { v: "1.0.0", d: "2026-08-29", items: [
      "第一版：金坛玩法、不能吃牌、一花起胡、算分明细"
    ] }
  ];

  var SAVE_KEY = "jintan_mj_v1";
  var SET_KEY = "jintan_mj_set_v1";
  var NAMES = ["你", "下家", "对家", "上家"];

  /* 出牌速度 5 档（毫秒） */
  var SPEED = { vslow: 3500, slow: 2500, mid: 1800, fast: 1100, vfast: 600 };

  /* 对手水平 4 档
     sloppy = 走神概率（随机乱打、漏碰漏杠）
     defend = 防守权重（照牌河挑安全牌打）
     master = 走完整的向听 + 进张概率计算 */
  var DIFF = {
    wild:   { sloppy: 0.92, defend: 0,   master: false },  /* 不会玩，基本瞎打 */
    rookie: { sloppy: 0.45, defend: 0,   master: false },  /* 会打，常出错 */
    normal: { sloppy: 0.12, defend: 0.5, master: false },  /* 偶尔失误 */
    master: { sloppy: 0,    defend: 1,   master: true  }   /* 记牌算概率 */
  };
  var DIFF_ALIAS = { easy: "rookie", hard: "master" };     /* 旧存档的值 */
  function diff() {
    var k = DIFF_ALIAS[settings.difficulty] || settings.difficulty;
    return DIFF[k] || DIFF.rookie;
  }

  /* 牌运 3 档：只影响发到你手上的牌，不影响电脑，也不影响算分
     kind = 起手和摸牌都朝你倾斜；fair / hard = 完全随机洗牌
     hard 额外关掉记牌提示和听牌提示，逼你自己记 */
  var LUCK = {
    kind: { bias: true,  assist: true  },
    fair: { bias: false, assist: true  },
    hard: { bias: false, assist: false }
  };
  function luck() { return LUCK[settings.luck] || LUCK.fair; }

  var settings = {
    base: 10, flowerScore: 5, cap: 100,
    difficulty: "easy", speed: "mid", font: "normal",
    voice: "act", timer: 0, sound: true, counter: true,
    luck: "fair", vibrate: true, awake: true, tsize: "std",
    server: ""
  };
  var game = null;
  var ui = {
    screen: "home", prevScreen: "home", selected: null,
    paused: false, claimWait: null, discardWait: null, gangPickWait: null,
    flowerWait: null, flowerId: null,
    mineOpen: { ladder: false, prof: false },   /* 「我的」里两块折叠区 */
    mineFocus: null,                            /* 进来后要自动展开并滚过去的那块 */
    setOpen: { adv: false, voice: false, bk: false, srv: false }   /* 设置里几块折叠区 */
  };
  var gen = 0;
  var uid = 1;
  var voiceUnlocked = false;
  var timerId = null;
  var timerLeft = 0;

  /* 把两个纯模块接到本模块的状态上。
     score.js 拿的是 settings 本体的引用，设置里改了封顶/底分立刻生效；
     ai.js 要的三个函数都得看牌局现状，所以留在这里，用注入的方式给它。 */
  setScoreOpts(settings);
  setAiView({
    knownCount: function (k) { return knownCount(k); },
    safeScore:  function (k) { return safeScore(k); },
    diff:       function ()  { return diff(); }
  });

  function nextTileId() { return uid++; }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }




  function selfDrawInfo(p) {
    return checkHu(p, p.lastDrawn || null, {
      selfDraw: true,
      kongDraw: game && game.kongDraw,
      addWin: false
    });
  }



  function emptyPlayer(i, score) {
    return {
      name: NAMES[i], hand: [], melds: [], flowers: [], discards: [],
      score: score || 0, guoShui: false, passed: [], lastDrawn: null
    };
  }

  function newGameState(keepScores) {
    var scores = [0, 0, 0, 0];
    var dealer = 0;
    var round = 1;
    if (keepScores && game) {
      for (var i = 0; i < 4; i++) scores[i] = game.players[i].score;
      dealer = game.nextDealer;
      round = game.round + 1;
    }
    return {
      wall: shuffle(makeWall(nextTileId)),
      players: [emptyPlayer(0, scores[0]), emptyPlayer(1, scores[1]), emptyPlayer(2, scores[2]), emptyPlayer(3, scores[3])],
      dealer: dealer,
      nextDealer: dealer,
      current: dealer,
      round: round,
      phase: "play",
      lastDiscard: null,
      lastFrom: null,
      kongDraw: false,
      needDraw: false,
      drewThisTurn: true,
      undo: null,
      over: false,
      settle: null
    };
  }

  function dealTiles() {
    var d = game.dealer;
    for (var r = 0; r < 13; r++) {
      for (var i = 0; i < 4; i++) {
        var pi = (d + i) % 4;
        game.players[pi].hand.push(game.wall.shift());
      }
    }
    game.players[d].hand.push(game.wall.shift());
    biasStartingHand();
    for (var j = 0; j < 4; j++) {
      sortHand(game.players[j]);
      var h = game.players[j].hand;
      if (h.length) game.players[j].lastDrawn = h[h.length - 1].key;
    }
  }

  function sortHand(p) {
    p.hand.sort(function (a, b) { return cmpKey(a.key, b.key) || a.id - b.id; });
  }

  function drawFront() { return game.wall.length ? game.wall.shift() : null; }
  function drawBack() { return game.wall.length ? game.wall.pop() : null; }

  /* ── 牌运倾斜（只在「轻松」档、只对玩家生效）──
     手法是和牌墙里的牌「交换」，牌张总数和牌墙长度都不变，
     不会凭空造牌，也不会出现第五张同样的牌。 */
  function numKeysOf(p) {
    var a = [];
    for (var i = 0; i < p.hand.length; i++) if (!isFlower(p.hand[i].key)) a.push(p.hand[i].key);
    return a;
  }

  function biasStartingHand() {
    if (!luck().bias || !game) return;
    var p = game.players[0];
    for (var pass = 0; pass < 3; pass++) {
      var keys = numKeysOf(p);
      if (!keys.length) return;
      var cur = shantenOf(counts34(keys), 0);
      if (cur <= 1) return;                    /* 已经够好了，别喂过头 */
      /* 找手里最没用的一张 */
      var worstIx = -1, worstV = -1;
      for (var i = 0; i < p.hand.length; i++) {
        if (isFlower(p.hand[i].key)) continue;
        var v = isolateScore(p.hand[i].key, keys);
        if (v > worstV) { worstV = v; worstIx = i; }
      }
      if (worstIx < 0) return;
      var look = Math.min(12, game.wall.length);
      var bestW = -1, bestS = cur;
      for (var w = 0; w < look; w++) {
        var wk = game.wall[w].key;
        if (isFlower(wk)) continue;
        var trial = keys.slice();
        var ix = trial.indexOf(p.hand[worstIx].key);
        if (ix < 0) continue;
        trial[ix] = wk;
        var s = shantenOf(counts34(trial), 0);
        if (s < bestS) { bestS = s; bestW = w; }
      }
      if (bestW < 0) return;                   /* 换不动了就收手 */
      var tmp = p.hand[worstIx];
      p.hand[worstIx] = game.wall[bestW];
      game.wall[bestW] = tmp;
      sortHand(p);
    }
  }

  /* 玩家摸牌时，从牌墙最前面 3 张里挑一张最有用的换到最前 */
  function drawFrontFor(pi) {
    if (pi === 0 && luck().bias && game.wall.length > 1) {
      var p = game.players[0];
      var keys = numKeysOf(p);
      var look = Math.min(3, game.wall.length);
      var bestI = 0, bestS = 99;
      for (var i = 0; i < look; i++) {
        var k = game.wall[i].key;
        if (isFlower(k)) { bestI = i; break; }   /* 花牌白拿一花，也算好事 */
        var s = shantenOf(counts34(keys.concat([k])), p.melds.length);
        if (s < bestS) { bestS = s; bestI = i; }
      }
      if (bestI > 0) {
        var t = game.wall[0];
        game.wall[0] = game.wall[bestI];
        game.wall[bestI] = t;
      }
    }
    return drawFront();
  }

  function still(g) { return g === gen && game && !game.over; }

  function sleep(ms) {
    return new Promise(function (resolve) {
      var remain = ms, last = Date.now();
      function tick() {
        if (gen && game && game._abort) { resolve("abort"); return; }
        var now = Date.now();
        if (!ui.paused) remain -= (now - last);
        last = now;
        if (remain <= 0) resolve("ok");
        else setTimeout(tick, Math.min(50, remain));
      }
      tick();
    });
  }

  function aiDelay() { return sleep(SPEED[settings.speed] || 1500); }


  /* —— PWA —— */
  function setupPWA() {
    try {
      var c = document.createElement("canvas");
      c.width = 192; c.height = 192;
      var x = c.getContext("2d");
      x.fillStyle = "#0c3d24"; x.fillRect(0, 0, 192, 192);
      x.fillStyle = "#d4a017"; roundRect(x, 36, 24, 120, 148, 16); x.fill();
      x.fillStyle = "#f6eed8"; roundRect(x, 44, 32, 104, 132, 12); x.fill();
      x.fillStyle = "#16110c"; x.font = "bold 64px serif"; x.textAlign = "center";
      x.fillText("金", 96, 118);
      var icon = c.toDataURL("image/png");
      var link = document.createElement("link");
      link.rel = "apple-touch-icon";
      link.href = icon;
      document.head.appendChild(link);
      var iconLink = document.createElement("link");
      iconLink.rel = "icon";
      iconLink.href = icon;
      document.head.appendChild(iconLink);
      /* 放在网上时用真的 manifest 文件（blob: 的 manifest 安卓装不了），
         并注册 Service Worker 做离线缓存；直接双击打开单个 html 时自动降级。 */
      var online = location.protocol === "http:" || location.protocol === "https:";
      var l = document.createElement("link");
      l.rel = "manifest";
      if (online) {
        l.href = "./manifest.webmanifest";
        if ("serviceWorker" in navigator) {
          window.addEventListener("load", function () {
            navigator.serviceWorker.register("./sw.js")
              .then(function (reg) {
                watchForUpdate(reg);
                /* 静默预热：缓存被清过（比如点过更新）时，install 不会重跑，
                   靠这一下把图标之类没人主动请求的文件补回缓存，保证离线完整。 */
                setTimeout(function () {
                  ["./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
                   "./manifest.webmanifest"].forEach(function (u) {
                    fetch(u).catch(function () {});
                  });
                }, 2500);
              })
              .catch(function () {});
          });
          /* 新 SW 接管说明新版就位；但首次安装时也会触发，要排掉 */
          var hadController = !!navigator.serviceWorker.controller;
          navigator.serviceWorker.addEventListener("controllerchange", function () {
            if (hadController) showUpdateBar();
          });
        }
      } else {
        var man = {
          name: "金坛麻将", short_name: "金坛麻将", display: "standalone",
          start_url: location.href.split("#")[0],
          scope: location.href.replace(/[^/]+$/, ""),
          background_color: "#0a3a22", theme_color: "#0a3a22",
          icons: [{ src: icon, sizes: "192x192", type: "image/png" }]
        };
        l.href = URL.createObjectURL(new Blob([JSON.stringify(man)], { type: "application/json" }));
      }
      document.head.appendChild(l);
    } catch (e) {}
  }
  function roundRect(x, x0, y0, w, h, r) {
    x.beginPath();
    x.moveTo(x0 + r, y0);
    x.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
    x.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    x.arcTo(x0, y0 + h, x0, y0, r);
    x.arcTo(x0, y0, x0 + w, y0, r);
    x.closePath();
  }

  /* —— 自测 —— */
  function selfTest() {
    var fails = [];
    function handP(keys, melds) {
      melds = melds || [];
      return {
        hand: keys.map(function (k, i) { return { id: i + 1, key: k }; }),
        melds: melds, flowers: [], guoShui: false, name: "测"
      };
    }
    function assert(name, cond) { if (!cond) fails.push(name); }

    var p = handP(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","z1","z1"]);
    assert("标准鸡胡", canWinHand(p, null));
    assert("无吃也能胡顺子", canWinHand(p, null));

    var q = handP(["m1","m1","m2","m2","m3","m3","m4","m4","s5","s5","p6","p6","z1","z1"]);
    assert("七对", canWinHand(q, null) && isQiDui(handKeys(q), 0));

    var q2 = handP(["m1","m1","m1","m1","m2","m2","m3","m3","s5","s5","p6","p6","z1","z1"]);
    assert("七对四张算两对", isQiDui(handKeys(q2), 0));

    var qing7 = handP(["m1","m1","m2","m2","m3","m3","m4","m4","m5","m5","m6","m6","m7","m7"]);
    var aQ7 = analyzeWin(qing7, "m7", { selfDraw: true, addWin: false });
    assert("七对不清对对胡", aQ7.ok && aQ7.fans.some(function (f) { return f.name === "七对"; }) && !aQ7.fans.some(function (f) { return f.name === "对对胡"; }));
    assert("七对可叠加清一色", aQ7.fans.some(function (f) { return f.name === "清一色"; }));

    var pengP = handP(["m1","m2","m3","m4","m5","m6","m7","m8","m9","z1","z1"], [{ type: "peng", key: "z2", concealed: false }]);
    assert("副露后标准胡", canWinHand(pengP, null));

    var dd = handP(["m1","m1","m1","m3","m3","m3","s5","s5","s5","p9","p9","p9","z1","z1"]);
    var a1 = analyzeWin(dd, "z1", { selfDraw: true, addWin: false });
    assert("对对胡", a1.ok && a1.fans.some(function (f) { return f.name === "对对胡"; }));

    var qing = handP(["m1","m2","m3","m4","m5","m6","m7","m8","m9","m1","m1","m1","m9","m9"]);
    var a2 = analyzeWin(qing, "m9", { selfDraw: true, addWin: false });
    assert("清一色", a2.ok && a2.fans.some(function (f) { return f.name === "清一色"; }));

    var hun = handP(["m1","m2","m3","m4","m5","m6","m7","m8","m9","z1","z1","z1","z2","z2"]);
    var a3 = analyzeWin(hun, "z2", { selfDraw: true, addWin: false });
    assert("混一色", a3.ok && a3.fans.some(function (f) { return f.name === "混一色"; }));

    var diaoP = handP(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s1","s1","z2"]);
    var a4 = analyzeWin(diaoP, "z2", { selfDraw: false, addWin: true });
    assert("独吊", a4.ok && a4.diao);

    var chicken = handP(["m1","m2","m4","m5","m6","m7","m8","m9","s1","s2","s3","p1","p1"]);
    chicken.guoShui = false;
    var a5 = analyzeWin(chicken, "m3", { selfDraw: false, addWin: true });
    assert("无花无番不能点炮", a5.blocked === "nofan" && !a5.diao);
    var chicken14 = handP(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","p1","p1"]);
    var a5b = analyzeWin(chicken14, "m3", { selfDraw: true, addWin: false });
    assert("无花无番可自摸", a5b.ok && a5b.fan === 0);

    chicken.guoShui = true;
    chicken.flowers = [{ id: 99, key: "f1" }];
    var a6 = analyzeWin(chicken, "m3", { selfDraw: false, addWin: true });
    assert("过水不能胡", a6.blocked === "guoshui");

    /* 出牌只该锁自己打过的那张，不该锁全部——之前这里错成一出牌就什么都胡不了 */
    var seqP = handP(["m1","m2","s4","s5","s6","p7","p8","p9","z1","z1","z1","z5","z5"]);
    seqP.guoShui = false; seqP.passed = ["p2"];
    var b1 = analyzeWin(seqP, "m3", { selfDraw: false, addWin: true });
    assert("打过别的牌不挡点炮胡", b1.ok && b1.flowers === 2);
    seqP.passed = ["m3"];
    var b2 = analyzeWin(seqP, "m3", { selfDraw: false, addWin: true });
    assert("不能胡自己打过的那张", b2.blocked === "guoshui");
    seqP.passed = [];
    var b3 = analyzeWin(seqP, "m3", { selfDraw: false, addWin: true });
    assert("补顺子点炮胡成立", b3.ok && b3.score > 0);
    diaoP.guoShui = true;
    diaoP.flowers = [{ id: 1, key: "f1" }];
    var a7 = analyzeWin(diaoP, "z2", { selfDraw: false, addWin: true });
    assert("独吊可过水胡", a7.ok && a7.diao);

    var hon = handP(["m1","m2","m3","m4","m5","m6","m7","m8","m9","p1","p1","z1","z1","z1"]);
    var a8 = analyzeWin(hon, "z1", { selfDraw: true, addWin: false });
    var hasAn = a8.ok && a8.flowerItems.some(function (x) { return x.name.indexOf("暗刻") >= 0 && x.n === 2; });
    assert("字牌暗刻2花", hasAn && a8.flowers >= 2);

    var hon2 = handP(["m1","m2","m3","m4","m5","m6","m7","m8","m9","p1","p1","z1","z1"]);
    var a9 = analyzeWin(hon2, "z1", { selfDraw: false, addWin: true });
    var hasMing = a9.ok && a9.flowerItems.some(function (x) { return x.name.indexOf("明刻") >= 0; });
    assert("点炮字刻算明刻", hasMing);

    var kg = handP(["m1","m2","m3","m4","m5","m6","m7","m8","m9","z1","z1"], [{ type: "gang", key: "z5", concealed: true }]);
    var a10 = analyzeWin(kg, null, { selfDraw: true, addWin: false });
    assert("字牌暗杠4花", a10.ok && a10.flowers >= 4);

    var numg = handP(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s2","s2"], [{ type: "gang", key: "p1", concealed: false }]);
    var a11 = analyzeWin(numg, null, { selfDraw: true, addWin: false });
    assert("数牌明杠1花且数牌刻不计花", a11.ok && a11.flowers === 1);

    var nk = handP(["m1","m1","m1","m4","m5","m6","m7","m8","m9","s1","s2","s3","p2","p2"]);
    var a12 = analyzeWin(nk, "p2", { selfDraw: true, addWin: false });
    assert("数牌刻子不计花", a12.ok && a12.flowers === 0);

    var gk = handP(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","p1","p1"]);
    var a13 = analyzeWin(gk, "p1", { selfDraw: true, kongDraw: true, addWin: false });
    assert("杠开加一番", a13.ok && a13.fans.some(function (f) { return f.name === "杠开"; }));
    var a14 = analyzeWin(gk, "p1", { robKong: true, selfDraw: true, addWin: false });
    assert("抢杠不加杠开", a14.ok && !a14.fans.some(function (f) { return f.name === "杠开"; }));

    var btns = document.querySelectorAll("button");
    var hasChiBtn = false;
    for (var bi = 0; bi < btns.length; bi++) {
      if (btns[bi].textContent.replace(/\s/g, "") === "吃") hasChiBtn = true;
    }
    assert("界面无吃按钮", !hasChiBtn);

    window.__jintanTests = fails;
    return fails;
  }

  /* —— 事件 —— */
  document.getElementById("btn-start").onclick = function () {
    unlockVoice();
    openPlayMenu();
  };
  document.getElementById("play-cancel").onclick = closePlayMenu;
  document.getElementById("play-ov").onclick = function (e) {
    if (e.target === this) closePlayMenu();      /* 点空白处关掉 */
  };
  document.getElementById("play-opts").onclick = function (e) {
    var b = e.target.closest(".play-opt");
    if (!b) return;
    if (b.id === "play-continue") { closePlayMenu(); continueSaved(); return; }
    if (b.id === "play-solo") {
      if (hasSave() && !confirm("开始新的一盘？上次没打完的会被替换。")) return;
      closePlayMenu();
      startRound(false);
      return;
    }
    if (b.id === "play-net") {
      closePlayMenu();
      ui.screenReturn = "home";
      showScreen("net");
      return;
    }
  };
  document.getElementById("btn-help").onclick = function () { ui.screenReturn = "home"; showScreen("help"); };
  document.getElementById("btn-set").onclick = function () { ui.screenReturn = "home"; showScreen("set"); };
  function goBackFromPanel() {
    if (ui.screenReturn === "table" && game) {
      showScreen("table");
      if (ui.paused) document.getElementById("pause-ov").classList.add("on");
    } else showScreen("home");
  }
  document.querySelector("#sc-help [data-go]").onclick = function () { goBackFromPanel(); };
  document.querySelector("#sc-set [data-go]").onclick = function () { goBackFromPanel(); };
  document.querySelector("#sc-about [data-go]").onclick = function () { goBackFromPanel(); };
  document.querySelector("#sc-mine [data-go]").onclick = function () { goBackFromPanel(); };
  document.querySelector("#sc-net [data-go]").onclick = function () {
    if (NET.started && game && game.online) showScreen("table");
    else showScreen("home");
  };
  document.getElementById("btn-about").onclick = function () {
    ui.screenReturn = "home";
    showScreen("about");
  };
  document.getElementById("btn-mine").onclick = function () {
    ui.screenReturn = "home";
    showScreen("mine");
  };
  document.getElementById("wealth-card").onclick = function () {
    ui.screenReturn = "home";
    showScreen("mine");
  };
  /* 点头像是奔着改资料来的，直接把那一块铺开滚过去 */
  document.getElementById("home-prof").onclick = function () {
    ui.screenReturn = "home";
    ui.mineOpen.prof = true; ui.mineFocus = "prof";
    showScreen("mine");
  };
  /* 点一行历史，展开当时的牌谱 */
  document.getElementById("mine-body").onclick = function (e) {
    var fold = e.target.closest && e.target.closest("#lad-fold, #prof-fold");
    if (fold) {
      var key = fold.id === "lad-fold" ? "ladder" : "prof";
      ui.mineOpen[key] = !ui.mineOpen[key];
      renderMine();
      return;
    }
    if (e.target.id === "prof-copy") { copyText(profile.id, "游戏 ID 复制好了"); return; }
    var sx = e.target.getAttribute && e.target.getAttribute("data-sex");
    if (sx != null) {
      profile.sex = sx; saveProfile(); renderMine(); return;
    }
    if (e.target.id === "prof-save") {
      var nk = (document.getElementById("prof-nick").value || "").trim().slice(0, 8);
      var ag = parseInt(document.getElementById("prof-age").value, 10);
      profile.nick = nk;
      profile.age = (ag > 0 && ag < 130) ? ag : 0;
      saveProfile();
      toast("资料保存好了");
      renderMine();
      /* 已经在房间里就把新昵称同步过去 */
      if (NET.ws && NET.ws.readyState === 1 && NET.code && !NET.started) {
        netSend({ t: "rename", name: netName() });
      }
      return;
    }
    if (e.target.id === "log-clear") {
      if (confirm("清空全部牌局记录？\n身家和战绩统计不受影响，只是不能再复盘了。")) {
        clearLog(); renderMine();
      }
      return;
    }
    var row = e.target.closest(".hrow");
    if (!row) return;
    var ix = parseInt(row.getAttribute("data-log"), 10);
    var box = document.getElementById("hd-" + ix);
    if (!box) return;
    if (box.classList.contains("on")) {
      box.classList.remove("on");
      box.innerHTML = "";
      row.classList.remove("open");
      return;
    }
    var log = loadLog();
    if (!log[ix]) return;
    box.innerHTML = replayHTML(log[ix]);
    box.classList.add("on");
    row.classList.add("open");
  };
  document.getElementById("update-bar").onclick = function () {
    this.textContent = "正在更新…";
    this.disabled = true;
    /* 把离线缓存清干净再重载，保证这次一定走网络拿新版。
       缓存只是副本，清掉不影响身家和设置（那些在 localStorage）。 */
    var done = false;
    function go() { if (!done) { done = true; location.reload(); } }
    setTimeout(go, 2500);                       /* 兜底，别卡住 */
    try {
      if (window.caches) {
        caches.keys()
          .then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })
          .then(go).catch(go);
      } else go();
    } catch (e) { go(); }
  };
  document.getElementById("ver-badge").onclick = function () {
    ui.screenReturn = "home";
    showScreen("about");
  };
  document.getElementById("btn-pause").onclick = function () {
    ui.paused = true;
    document.getElementById("pause-ov").classList.add("on");
    saveGame();
  };
  document.getElementById("btn-resume").onclick = function () {
    ui.paused = false;
    document.getElementById("pause-ov").classList.remove("on");
  };
  document.getElementById("btn-pause-set").onclick = function () {
    ui.screenReturn = "table";
    showScreen("set");
  };
  document.getElementById("btn-pause-help").onclick = function () {
    ui.screenReturn = "table";
    showScreen("help");
  };
  document.getElementById("btn-to-home").onclick = function () {
    ui.paused = false;
    document.getElementById("pause-ov").classList.remove("on");
    saveGame();
    showScreen("home");
  };
  document.getElementById("btn-undo").onclick = function () {
    if (!game || !game.undo) return;
    gen++;
    var snap = game.undo;
    if (ui.claimWait) {
      var fn = ui.claimWait;
      ui.claimWait = null;
      setClaim("");
      setReason("");
      fn("abort");
    }
    if (ui.discardWait) {
      var fn2 = ui.discardWait;
      ui.discardWait = null;
      fn2({ abort: true });
    }
    if (ui.flowerWait) {
      var fn3 = ui.flowerWait;
      ui.flowerWait = null;
      ui.flowerId = null;
      setClaim("");
      fn3();
    }
    restore(snap);
    game.undo = null;
    ui.selected = null;
    ui.discardWait = null;
    ui.claimWait = null;
    ui.flowerWait = null;
    ui.flowerId = null;
    clearTimer();
    setMsg("已收回上一次出牌", true);
    saveGame();
    render();
    turnLoop();
  };

  function unlockVoice() {
    audio();                     /* 首次点击时把音频上下文唤醒 */
    if (voiceUnlocked || !window.speechSynthesis || !voiceOn()) return;
    voiceUnlocked = true;
    try {
      var u = new SpeechSynthesisUtterance(" ");
      u.lang = "zh-CN";
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  buildTileSprite();
  loadSettings();
  loadVoicePack();
  loadWealth();
  loadProfile();
  setupPWA();
  refreshHome();
  checkVersion();
  netAutoJoin();
  /* 从后台切回来时再查一次（她可能几天不关这个页面） */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    checkVersion();
    /* 切后台时系统会释放屏幕常亮，回来要重新申请 */
    if (ui.screen === "table" && settings.awake) keepAwake(true);
    /* 手机切后台一会儿，socket 常常已经被系统收走了。
       回到前台立刻重连，不用干等退避计时器。

       条件不看 NET.want：房主复制完链接切去微信发给朋友，
       这一去可能好几分钟，页面被冻住、几次重试全落空，
       want 已经被判成「放弃」了。只要手里还攥着房间号，
       回到前台就该再试一次 —— 房间在服务器上存着，回得去。 */
    if (NET.code && (!NET.ws || NET.ws.readyState > 1)) {
      if (NET.retryTimer) { clearTimeout(NET.retryTimer); NET.retryTimer = null; }
      NET.retry = 0;
      NET.err = "";
      netConnect(NET.code, false);
    }
  });
  var fails = selfTest();
  if (fails.length) console.warn("金坛麻将自测失败:", fails);
  else console.log("金坛麻将自测通过");
  window.__jintanSelfTest = selfTest;
  window.__jintanCanWin = canWinHand;
  window.__jintanAnalyze = analyzeWin;
  window.__jintanWaiting = waitingTiles;
  window.__jintanGetGame = function () { return game; };
  window.__jintanRender = render;
  window.__jintanTile = mjHTML;
  window.__jintanSettle = showSettle;
  window.__jintanWealth = function () { return wealth; };
  window.__jintanAI = {
    setDiff: function (d) { settings.difficulty = d; },
    setLuck: function (l) { settings.luck = l; },
    discard: aiChooseDiscard, master: aiDiscardMaster,
    peng: aiWantPeng, gang: aiWantGang,
    safe: safeScore, diff: diff, luck: luck,
    shanten: function (keys, nMelds) { return shantenOf(counts34(keys), nMelds || 0); },
    ukeire: ukeireOf
  };
