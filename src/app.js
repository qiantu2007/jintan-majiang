/* 金坛麻将 · 界面、联机、牌局流程
 * 还没拆开的那一大块：DOM、WebSocket、单机回合循环、存档、设置。
 * 规则/计分/AI/牌面已经搬到同目录的另外四个文件里。
 * 由 拆分.py 从 index.html 抽出。改这里，然后跑 `node 构建.mjs`。 */


  var VERSION = "1.18.1";
  var CHANGELOG = [
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

  /* ══════════ 语音播报 ══════════
     系统自带的中文语音只有普通话、粤语、台湾腔 —— 没有金坛话，
     吴语毗陵小片任何一家 TTS 都不支持。想听地道乡音只有一条路：真人录一遍。
     所以这里分两层：
       · 有录音包就放录音（真金坛话）
       · 没有就退回系统合成（普通话，至少能听清是什么牌）
     录音在「设置 → 金坛话语音」里当场录，录完导出一个文件传上去，
     全家的手机就都听得到了。 */
  var VOICE_KEY = "jintan_mj_voice_v1";
  var VOICE_PACK_FILE = "语音包.json";

  /* 要录的词条。id 是内部键，text 是提示录音人念什么 */
  var VOICE_LIST = (function () {
    var a = [], i;
    for (i = 1; i <= 9; i++) a.push({ id: "m" + i, text: NUM_CN.charAt(i - 1) + "万" });
    for (i = 1; i <= 9; i++) a.push({ id: "s" + i, text: NUM_CN.charAt(i - 1) + "条" });
    for (i = 1; i <= 9; i++) a.push({ id: "p" + i, text: NUM_CN.charAt(i - 1) + "筒" });
    for (i = 1; i <= 7; i++) a.push({ id: "z" + i, text: HONOR["z" + i] });
    a.push({ id: "act_peng", text: "碰" });
    a.push({ id: "act_gang", text: "杠" });
    a.push({ id: "act_hu", text: "胡了" });
    a.push({ id: "act_zimo", text: "自摸" });
    a.push({ id: "act_your", text: "该你了" });
    a.push({ id: "act_liuju", text: "流局" });
    return a;
  })();

  var voicePack = null;       /* id -> data url，null 表示还没加载或没有 */
  var voiceAudio = null;      /* 复用一个 <audio>，别每次新建 */

  function voiceText(id) {
    for (var i = 0; i < VOICE_LIST.length; i++) if (VOICE_LIST[i].id === id) return VOICE_LIST[i].text;
    return "";
  }

  /* 加载录音包：先看本机录的（localStorage），再看跟游戏一起传上来的文件 */
  function loadVoicePack() {
    try {
      var local = localStorage.getItem(VOICE_KEY);
      if (local) {
        var d = JSON.parse(local);
        if (d && typeof d === "object" && Object.keys(d).length) { voicePack = d; return; }
      }
    } catch (e) {}
    /* 站点上带的包。没有就静静地退回合成音，不弹任何错 */
    try {
      fetch(VOICE_PACK_FILE, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && typeof d === "object" && Object.keys(d).length) voicePack = d;
        })
        .catch(function () {});
    } catch (e) {}
  }

  function hasClip(id) { return !!(voicePack && voicePack[id]); }
  function voicePackCount() { return voicePack ? Object.keys(voicePack).length : 0; }

  /* 说一句。优先放录音，没有录音才用系统合成。 */
  function voiceOn() { return settings.voice === "act" || settings.voice === "all"; }

  function say(id, fallbackText) {
    if (!voiceOn()) return;
    if (hasClip(id)) {
      try {
        if (!voiceAudio) voiceAudio = new Audio();
        voiceAudio.pause();
        voiceAudio.src = voicePack[id];
        voiceAudio.currentTime = 0;
        var pr = voiceAudio.play();
        if (pr && pr.catch) pr.catch(function () {});
        return;
      } catch (e) {}
    }
    speak(fallbackText != null ? fallbackText : voiceText(id));
  }

  /* 报一张牌。「每张都报」那档才会走到这儿 */
  function sayTile(key) {
    if (settings.voice !== "all") return;
    if (isFlower(key)) return;              /* 花牌是自动补的，不用报 */
    say(key, tileName(key));
  }

  /* ── 录音 ──
     录出来的原始格式各家不一样：Chrome 给 webm/opus，Safari 给 mp4/aac，
     互相放不出来。录完一律转成 12kHz 单声道 WAV —— 体积能接受，
     而且没有哪台手机放不响。牌名就一两个字，12k 采样完全够清楚。 */
  var REC = { on: false, id: null, mr: null, chunks: [], stream: null, timer: null };
  var REC_MS = 1800;          /* 每条录这么久，够说「三万」了 */
  var WAV_HZ = 12000;

  function wavFromBuffer(buf) {
    /* 混成单声道并重采样 */
    var src = buf.getChannelData(0);
    if (buf.numberOfChannels > 1) {
      var b = buf.getChannelData(1);
      var mixed = new Float32Array(src.length);
      for (var i = 0; i < src.length; i++) mixed[i] = (src[i] + b[i]) / 2;
      src = mixed;
    }

    /* 掐掉前后的空白，再把音量拉齐。
       录的时候是固定 1.8 秒，真正说话往往只占中间半秒多 ——
       不剪的话每条 54KB，四十条就两兆多，而且每次播报前还要干等一下。 */
    var peak = 0, i2;
    for (i2 = 0; i2 < src.length; i2++) { var a2 = Math.abs(src[i2]); if (a2 > peak) peak = a2; }
    if (peak > 0.01) {
      var thr = peak * 0.05;    /* 阈值别太高，中文字尾是渐弱的，容易被削掉 */
      var s0 = 0, s1 = src.length - 1;
      while (s0 < src.length && Math.abs(src[s0]) < thr) s0++;
      while (s1 > s0 && Math.abs(src[s1]) < thr) s1--;
      var pad = Math.round(buf.sampleRate * 0.08);   /* 前后各留一点点，别切掉字头字尾 */
      s0 = Math.max(0, s0 - pad);
      s1 = Math.min(src.length - 1, s1 + pad);
      if (s1 > s0 + buf.sampleRate * 0.1) {
        var cut = new Float32Array(s1 - s0 + 1);
        var gain = Math.min(4, 0.85 / peak);         /* 音量拉到接近满，但别爆 */
        for (var c = 0; c < cut.length; c++) cut[c] = src[s0 + c] * gain;
        src = cut;
      }
    }

    var ratio = buf.sampleRate / WAV_HZ;
    var n = Math.floor(src.length / ratio);
    var out = new Int16Array(n);
    for (var j = 0; j < n; j++) {
      var v = src[Math.floor(j * ratio)];
      v = v < -1 ? -1 : v > 1 ? 1 : v;
      out[j] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    var bytes = new ArrayBuffer(44 + out.length * 2);
    var dv = new DataView(bytes);
    var put = function (off, s) { for (var k = 0; k < s.length; k++) dv.setUint8(off + k, s.charCodeAt(k)); };
    put(0, "RIFF"); dv.setUint32(4, 36 + out.length * 2, true); put(8, "WAVE");
    put(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true); dv.setUint32(24, WAV_HZ, true);
    dv.setUint32(28, WAV_HZ * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    put(36, "data"); dv.setUint32(40, out.length * 2, true);
    for (var q = 0; q < out.length; q++) dv.setInt16(44 + q * 2, out[q], true);
    /* 转成 data url 存进去 */
    var u8 = new Uint8Array(bytes), s = "";
    for (var z = 0; z < u8.length; z++) s += String.fromCharCode(u8[z]);
    return "data:audio/wav;base64," + btoa(s);
  }

  function saveVoicePack() {
    try { localStorage.setItem(VOICE_KEY, JSON.stringify(voicePack || {})); }
    catch (e) { toast("存不下了，手机存储可能满了"); }
  }

  async function recStart(id) {
    if (REC.on) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      toast("这个浏览器不支持录音，换 Chrome 或 Safari 试试");
      return;
    }
    try {
      REC.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      toast("没拿到麦克风权限，先在浏览器里允许一下");
      return;
    }
    REC.on = true; REC.id = id; REC.chunks = [];
    renderSettings();
    try {
      REC.mr = new MediaRecorder(REC.stream);
    } catch (e) { recCleanup(); toast("录不了音"); return; }
    REC.mr.ondataavailable = function (ev) { if (ev.data && ev.data.size) REC.chunks.push(ev.data); };
    REC.mr.onstop = function () { recFinish(); };
    REC.mr.start();
    REC.timer = setTimeout(function () { recStop(); }, REC_MS);
  }

  function recStop() {
    if (!REC.on || !REC.mr) return;
    if (REC.timer) { clearTimeout(REC.timer); REC.timer = null; }
    try { REC.mr.stop(); } catch (e) { recCleanup(); }
  }

  function recCleanup() {
    if (REC.timer) { clearTimeout(REC.timer); REC.timer = null; }
    if (REC.stream) { try { REC.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} }
    REC.on = false; REC.mr = null; REC.chunks = []; REC.stream = null;
    var keep = REC.id; REC.id = null;
    return keep;
  }

  async function recFinish() {
    var id = REC.id;
    var blob = new Blob(REC.chunks);
    recCleanup();
    if (!blob.size) { renderSettings(); toast("没录到声音"); return; }
    try {
      var arr = await blob.arrayBuffer();
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      var buf = await ac.decodeAudioData(arr);
      try { ac.close(); } catch (e) {}
      if (!voicePack) voicePack = {};
      voicePack[id] = wavFromBuffer(buf);
      saveVoicePack();
      renderSettings();
      /* 录完马上放一遍，让人听着对不对 */
      try { var a = new Audio(voicePack[id]); a.play().catch(function () {}); } catch (e) {}
    } catch (e) {
      renderSettings();
      toast("这段没转成功，再录一次");
    }
  }

  function voicePackSize() {
    try { return Math.round(JSON.stringify(voicePack || {}).length / 1024); } catch (e) { return 0; }
  }

  /* 导出成一个文件。放进 _上传这个文件夹 跟游戏一起传，
     全家的手机打开就都是金坛话了。 */
  function exportVoicePack() {
    if (!voicePackCount()) { toast("还一条都没录"); return; }
    try {
      var blob = new Blob([JSON.stringify(voicePack)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = VOICE_PACK_FILE;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
      toast("导出好了，把 " + VOICE_PACK_FILE + " 放进上传文件夹");
    } catch (e) { toast("导不出来"); }
  }

  function importVoicePack() {
    var inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json,application/json";
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        var d = null;
        try { d = JSON.parse(fr.result); } catch (e) {}
        if (!d || typeof d !== "object" || Array.isArray(d) || !Object.keys(d).length) {
          toast("这个文件读不出来"); return;
        }
        voicePack = d;
        saveVoicePack();
        renderSettings();
        toast("导入好了，共 " + voicePackCount() + " 条");
      };
      fr.readAsText(f);
    };
    inp.click();
  }

  function speak(text) {
    if (!voiceOn() || !window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 0.92;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

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
     外婆看到的是一片空白，而且自己没法恢复。全部强制转成安全值。 */
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

  /* ── 牌桌音效：Web Audio 现场合成，不带任何音频文件 ── */
  var actx = null;
  function audio() {
    if (actx === null) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { actx = false; }
    }
    if (actx && actx.state === "suspended") { try { actx.resume(); } catch (e) {} }
    return actx || null;
  }
  /* 一声「嗒」：短噪声过带通，像牌磕在桌面上 */
  function clack(gain, freq, dur) {
    var a = audio(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur);
    var buf = a.createBuffer(1, n, a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
    var src = a.createBufferSource(); src.buffer = buf;
    var bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 1.4;
    var g = a.createGain(); g.gain.value = gain;
    src.connect(bp); bp.connect(g); g.connect(a.destination);
    src.start();
  }
  /* 一个音符，用于胡牌的上行琶音 */
  function tone(freq, at, dur, gain) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = "triangle"; o.frequency.value = freq;
    var t = a.currentTime + at;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  /* ── 屏幕常亮 ──
     老人一张牌能想半分钟，屏幕自己灭掉最烦人。进牌桌时锁住，离开就放开。
     系统会在切后台时自动释放，所以回前台要重新申请。 */
  var wakeLock = null;
  function keepAwake(on) {
    try {
      if (!("wakeLock" in navigator)) return;
      if (on) {
        if (wakeLock) return;
        navigator.wakeLock.request("screen").then(function (l) {
          wakeLock = l;
          l.addEventListener("release", function () { wakeLock = null; });
        }).catch(function () { wakeLock = null; });
      } else if (wakeLock) {
        wakeLock.release().catch(function () {});
        wakeLock = null;
      }
    } catch (e) { wakeLock = null; }
  }

  /* ── 震动 ──（安卓有效，iOS 的浏览器不支持，静默跳过） */
  function buzz(pattern) {
    if (!settings.vibrate || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) {}
  }

  var BUZZ = {
    discard: 12, draw: 0, flower: [0, 18, 60, 18],
    peng: [0, 26, 55, 26], gang: [0, 26, 50, 26, 50, 40],
    turn: [0, 20, 90, 20], hu: [0, 55, 60, 55, 60, 130], lose: [0, 90]
  };

  function sfx(kind) {
    if (BUZZ[kind]) buzz(BUZZ[kind]);
    if (!settings.sound) return;
    try {
      if (kind === "draw") clack(0.16, 1500, 0.045);
      else if (kind === "discard") clack(0.34, 1000, 0.075);
      else if (kind === "peng") { clack(0.4, 780, 0.08); setTimeout(function () { clack(0.34, 620, 0.09); }, 75); }
      else if (kind === "gang") { clack(0.42, 700, 0.09); setTimeout(function () { clack(0.4, 560, 0.09); }, 70);
                                  setTimeout(function () { clack(0.36, 450, 0.11); }, 145); }
      else if (kind === "flower") clack(0.2, 2100, 0.05);
      else if (kind === "turn") { tone(660, 0, 0.14, 0.1); tone(880, 0.1, 0.18, 0.09); }
      else if (kind === "hu") { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.1, 0.34, 0.13); }); }
      else if (kind === "lose") { tone(392, 0, 0.22, 0.1); tone(294, 0.14, 0.3, 0.09); }
    } catch (e) {}
  }

  function toast(text, ms) {
    var el = document.getElementById("toast");
    el.textContent = text;
    el.classList.add("on");
    setTimeout(function () { el.classList.remove("on"); }, ms || 1600);
  }

  function setMsg(t, hot) {
    var el = document.getElementById("msg");
    el.textContent = t || "";
    el.classList.toggle("hot", !!hot);
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
    hbTimer: null, lastHeard: 0, sawPong: false
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
