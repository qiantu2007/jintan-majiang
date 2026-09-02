/* 金坛麻将 · 联机服务端
 * Cloudflare Workers + Durable Objects
 *
 * 设计要点：
 *   服务器是唯一权威。整副牌墙只存在服务器上，每个人只会收到自己那副手牌。
 *   房主的客户端和其他人完全一样，看不到任何别人的牌 —— 这是「绝对公平」的落点。
 *   服务器只懂三件事：发牌、回合顺序、碰杠胡的优先级仲裁。
 *   算番、计分、界面全在客户端，服务器不参与，也就无从偏袒。
 */

/* 规则内核是和客户端共用的同一个文件 —— 以前这里有一份逐字重写的副本
   （makeWall / counts34 / allMeldForms / canWinShape 等 85 行），
   改一次规则要记得改两处，漏一处就是服务端判胡和客户端算番对不上。 */
import { makeWall, shuffle, isFlower, canWinShape, countKey } from "../src/rules.js";

/* 由 构建.mjs 从 src/app.js 的 VERSION 同步过来，别手动改。
   /health 会把它报出来，部署完拿手机开一下就知道线上是哪一版。 */
const VERSION = "1.19.1";

/* 洗牌用 crypto，不是 Math.random —— 服务器自己也猜不到牌序。
   单机那边不需要这个强度，所以随机源是传进去的，不写死在 rules 里。 */
function cryptoRand() {
  const r = new Uint32Array(1);
  crypto.getRandomValues(r);
  return r[0] / 4294967296;
}

/* ══════════ 房间 ══════════ */
const CODE_CHARS = "ACDEFGHJKLMNPQRSTUVWXY3479";  /* 去掉了容易看错的 0O1IB8Z2S6 */
function makeCode() {
  const r = new Uint8Array(5);
  crypto.getRandomValues(r);
  let s = "";
  for (let i = 0; i < 5; i++) s += CODE_CHARS[r[i] % CODE_CHARS.length];
  return s;
}

/* 房间放多久算过期。开一局麻将撑死几个小时，
   留 12 小时足够第二天早上接着打，也不至于把老房间攒成山。 */
const ROOM_TTL = 12 * 3600 * 1000;

export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sockets = new Map();      /* ws -> seat */
    this.room = null;

    /* 房间必须落盘。
       以前只存在内存里 —— 房主开完房，切到微信去发链接，
       手机把页面挂起、连接断掉，屋里一个人都没有了，
       Cloudflare 就把这个对象回收了，房间凭空消失。
       等他发完消息切回来，只会看到「房间不存在或已解散」。
       现在开机先从磁盘捞一次，捞不到才算真没有。 */
    state.blockConcurrencyWhile(async () => {
      const saved = await state.storage.get("room");
      if (saved && saved.at && Date.now() - saved.at < ROOM_TTL) {
        this.room = saved.room;
        /* 磁盘上的「在线」是上次崩之前的，一律先当成掉线，
           谁连回来谁再标成在线 */
        if (this.room && this.room.seats) {
          for (const s of this.room.seats) if (!s.ai) s.online = false;
        }
      }
    });
  }

  /* 有改动就写回磁盘。不 await —— 写盘慢一点没关系，
     别把出牌的响应也拖慢。 */
  save() {
    if (!this.room) return;
    try {
      this.state.storage.put("room", { at: Date.now(), room: this.room })
        .catch(() => {});
    } catch (e) {}
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    const code = url.searchParams.get("code") || "";
    const name = (url.searchParams.get("name") || "玩家").slice(0, 8);
    const token = url.searchParams.get("token") || "";
    const create = url.searchParams.get("create") === "1";

    this.attach(server, { code, name, token, create });
    return new Response(null, { status: 101, webSocket: client });
  }

  send(ws, msg) {
    try { ws.send(JSON.stringify(msg)); } catch (e) {}
  }
  broadcast(msg, exceptSeat) {
    for (const [ws, seat] of this.sockets) {
      if (exceptSeat != null && seat === exceptSeat) continue;
      this.send(ws, msg);
    }
  }
  sendTo(seat, msg) {
    for (const [ws, s] of this.sockets) if (s === seat) this.send(ws, msg);
  }

  /* 一个座位只保留一条连接。
     重连时（刷新页面、切后台回来、断线重连）新连接会先建好，
     旧的那条要等 close 事件才被清掉；这中间同一个人挂着两条连接，
     广播就会发两遍 —— 客户端照单收下，牌河里会凭空多出一张牌，
     一副牌变成 145 张。所以新连接一挂上，就把该座位的旧连接踢掉。 */
  dropOtherSockets(seat, keep) {
    for (const [old, s] of [...this.sockets]) {
      if (s === seat && old !== keep) {
        this.sockets.delete(old);
        try { old.close(1000, "replaced"); } catch (e) {}
      }
    }
  }

  attach(ws, info) {
    const R = this.room;

    if (info.create) {
      this.room = {
        code: info.code,
        hostToken: info.token,
        started: false,
        opts: { difficulty: "rookie", base: 10, flowerScore: 5, cap: 100 },
        seats: [
          { token: info.token, name: info.name, ai: false, ready: true, online: true },
          { token: null, name: "电脑", ai: true, ready: true, online: true },
          { token: null, name: "电脑", ai: true, ready: true, online: true },
          { token: null, name: "电脑", ai: true, ready: true, online: true }
        ],
        g: null
      };
      this.sockets.set(ws, 0);
      this.bind(ws, 0);
      this.pushRoom();
      return;
    }

    if (!R) { this.send(ws, { t: "err", m: "房间不存在或已解散" }); ws.close(); return; }

    /* 断线重连：同一个 token 回到原座位 */
    let seat = R.seats.findIndex(s => s.token && s.token === info.token);
    if (seat < 0) {
      if (R.started) { this.send(ws, { t: "err", m: "牌局已经开始了" }); ws.close(); return; }
      seat = R.seats.findIndex(s => s.ai);
      if (seat < 0) { this.send(ws, { t: "err", m: "房间满了" }); ws.close(); return; }
      R.seats[seat] = { token: info.token, name: info.name, ai: false, ready: false, online: true };
    } else {
      R.seats[seat].online = true;
      R.seats[seat].name = info.name || R.seats[seat].name;
    }
    this.sockets.set(ws, seat);
    this.dropOtherSockets(seat, ws);   /* 先挂上新的，再踢掉这个座位的旧连接 */
    this.bind(ws, seat);
    this.pushRoom();
    if (R.started && R.g) {
      this.pushResume(seat);
      /* 这人不在的时候，发给他的电脑请求全丢了。
         等他把局面收完，再把挂起的请求重发一遍，不然电脑一直不动。 */
      this.repostAI();
    }
  }

  bind(ws, seat) {
    ws.addEventListener("message", ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      this.onMsg(seat, m);
    });
    const bye = () => {
      this.sockets.delete(ws);
      const R = this.room;
      if (!R) return;
      const stillHere = [...this.sockets.values()].includes(seat);
      if (!stillHere && R.seats[seat]) {
        /* 只标掉线，座位给他留着。
           以前没开局就把座位收回变成电脑、token 也清空 ——
           结果：切个屏回来就成了新座位、准备状态归零；
           掉的要是房主，hostToken 再也对不上任何人，房间等于废了。
           现在人走了位子还在，等他回来照样是原来的座和原来的准备状态。 */
        R.seats[seat].online = false;
        this.pushRoom();
      }
      /* 走的人可能正是替电脑算牌的那个。换个还在线的立刻接手，
         不用等他回来，电脑也不会停在半路。 */
      if (R.started && R.g && !R.g.over) this.repostAI();
    };
    ws.addEventListener("close", bye);
    ws.addEventListener("error", bye);
  }

  pushRoom() {
    const R = this.room;
    if (!R) return;
    const seats = R.seats.map((s, i) => ({
      i, name: s.name, ai: s.ai, ready: s.ready, online: s.online,
      host: !!(s.token && s.token === R.hostToken)
    }));
    /* 每个人要知道自己坐几号位，所以逐个发，带上 you */
    for (const [ws, seat] of this.sockets) {
      this.send(ws, {
        t: "room", code: R.code, started: R.started, opts: R.opts,
        seats, you: seat
      });
    }
    this.save();
  }

  onMsg(seat, m) {
    const R = this.room;
    if (!R) return;

    /* 心跳。手机上的连接经常「看着还在、其实已经死了」，
       客户端靠这一问一答判断，没回音就重连。 */
    if (m.t === "ping") { this.sendTo(seat, { t: "pong" }); return; }

    const isHost = R.seats[seat] && R.seats[seat].token === R.hostToken;

    if (m.t === "ready") {
      if (R.started) return;
      R.seats[seat].ready = !!m.v;
      this.pushRoom();
      return;
    }
    if (m.t === "rename") {
      const n = (m.name || "").slice(0, 8);
      if (n && R.seats[seat] && !R.seats[seat].ai) {
        R.seats[seat].name = n;
        this.pushRoom();
      }
      return;
    }
    if (m.t === "opts") {
      if (!isHost || R.started) return;
      if (m.difficulty) R.opts.difficulty = m.difficulty;
      if (m.base != null) R.opts.base = m.base | 0;
      if (m.flowerScore != null) R.opts.flowerScore = m.flowerScore | 0;
      if (m.cap != null) R.opts.cap = m.cap | 0;
      this.pushRoom();
      return;
    }
    if (m.t === "kick") {
      if (!isHost || R.started) return;
      const k = m.seat | 0;
      if (k > 0 && k < 4 && !R.seats[k].ai) {
        R.seats[k] = { token: null, name: "电脑", ai: true, ready: true, online: true };
        this.pushRoom();
      }
      return;
    }
    if (m.t === "start") {
      if (!isHost || R.started) return;
      /* 只有「还在线又没准备」的人才拦着不让开。
         掉线的人不算 —— 否则有人手机一锁屏，
         房主就永远卡在「还有 1 人没准备」上，开不了局。
         他们回来还是原来的座位，中途也能接着打。 */
      const waiting = R.seats.filter(s => !s.ai && s.online && !s.ready).length;
      if (waiting) {
        this.sendTo(seat, { t: "err", m: "还有 " + waiting + " 人没点准备" });
        return;
      }
      this.startRound(true);
      return;
    }
    if (m.t === "next") {
      if (!isHost || !R.started) return;
      this.startRound(false);
      return;
    }
    if (m.t === "act") { this.onAct(seat, m); this.save(); return; }
  }

  /* ══════════ 发牌 ══════════ */
  startRound(first) {
    const R = this.room;
    R.started = true;
    const wall = shuffle(makeWall(), cryptoRand);
    const dealer = first ? 0 : (R.g ? R.g.nextDealer : 0);
    const g = {
      wall, dealer, current: dealer, round: R.g ? R.g.round + 1 : 1,
      hands: [[], [], [], []], melds: [[], [], [], []],
      flowers: [[], [], [], []], discards: [[], [], [], []],
      lastDiscard: null, lastFrom: -1,
      phase: "deal", over: false, nextDealer: dealer,
      claim: null, drewThisTurn: false
    };
    R.g = g;

    for (let r = 0; r < 13; r++) {
      for (let i = 0; i < 4; i++) g.hands[(dealer + i) % 4].push(g.wall.shift());
    }
    g.hands[dealer].push(g.wall.shift());
    for (let i = 0; i < 4; i++) this.autoFlower(i);

    this.pushRoom();
    for (let i = 0; i < 4; i++) {
      this.sendTo(i, {
        t: "deal", seat: i, round: g.round, dealer,
        hand: g.hands[i].map(x => ({ id: x.id, key: x.key })),
        flowers: g.flowers.map(f => f.map(x => ({ id: x.id, key: x.key }))),
        counts: g.hands.map(h => h.length),
        wall: g.wall.length, opts: R.opts
      });
    }
    g.phase = "discard";
    g.drewThisTurn = true;
    this.pushTurn();
  }

  /* 补一张花：把手里那张花亮到花区，再从牌尾摸一张回来。
     没花了返回 null；牌墙空了 tile 为 null。 */
  oneFlower(i) {
    const g = this.room.g;
    const ix = g.hands[i].findIndex(t => isFlower(t.key));
    if (ix < 0) return null;
    const fl = g.hands[i].splice(ix, 1)[0];
    g.flowers[i].push(fl);
    let got = null;
    if (g.wall.length) { got = g.wall.pop(); g.hands[i].push(got); }
    return { flower: fl, tile: got };
  }

  /* 一口气补到没花为止 —— 开局发牌、电脑、以及掉线托管的座位走这条 */
  autoFlower(i) {
    let guard = 0;
    while (guard++ < 20 && this.oneFlower(i)) {}
  }

  hasFlower(i) {
    return this.room.g.hands[i].some(t => isFlower(t.key));
  }

  /* 摸完牌之后：手里有花就停下来，等这个人亲手点「补花」。
     电脑和掉了线的人点不了，仍旧替他们自动补掉。
     返回 true 表示要等人。 */
  settleFlower(i) {
    if (!this.hasFlower(i)) return false;
    if (this.unattended(i)) { this.autoFlower(i); return false; }
    this.room.g.phase = "flower";
    return true;
  }

  pushTurn() {
    const g = this.room.g;
    this.broadcast({
      t: "turn", who: g.current, phase: g.phase,
      wall: g.wall.length, counts: g.hands.map(h => h.length)
    });
    if (this.room.seats[g.current].ai) this.aiTurn();
    else this.armAIWatch();   /* 轮到掉线的人也要上闹钟，不然牌局停在这儿 */
    this.save();
  }

  /* 电脑出牌：服务器不做复杂 AI，找一台在线的客户端算好了报上来。
     这样电脑的水平跟着房主选的难度走，也不用在服务器里再写一套 AI。

     谁来代算：优先房主，房主不在线就换任何一个在线的真人。
     以前写死发给房主 —— 房主一断线，这条请求就丢了，
     人再进来也没人重发，电脑就永远卡在那儿不动。 */
  aiDriver() {
    const R = this.room;
    if (!R) return -1;
    const online = new Set(this.sockets.values());
    const host = R.seats.findIndex(s => s.token === R.hostToken);
    if (host >= 0 && online.has(host)) return host;
    for (let i = 0; i < 4; i++) if (R.seats[i] && !R.seats[i].ai && online.has(i)) return i;
    return -1;
  }

  aiTurn() {
    const g = this.room.g;
    const to = this.aiDriver();
    if (to >= 0) {
      this.sendTo(to, {
        t: "aiask", seat: g.current,
        hand: g.hands[g.current].map(x => ({ id: x.id, key: x.key })),
        melds: g.melds[g.current], flowers: g.flowers[g.current].map(x => x.key),
        discards: g.discards.map(d => d.map(x => x.key)),
        wall: g.wall.length, drew: g.drewThisTurn
      });
    }
    this.armAIWatch();
  }

  askAIClaim(i) {
    const R = this.room, g = R.g, c = g.claim;
    if (!c) return;
    const o = (c.opts || []).find(x => x.i === i);
    if (!o) return;
    const to = this.aiDriver();
    if (to < 0) return;
    this.sendTo(to, {
      t: "aiclaim", seat: i, from: c.from, tile: { id: c.tile.id, key: c.tile.key },
      hu: o.canHu, gang: o.canGang, peng: o.canPeng,
      hand: g.hands[i].map(x => ({ id: x.id, key: x.key })),
      melds: g.melds[i], discards: g.discards.map(d => d.map(x => x.key))
    });
  }

  /* 把还没人应答的电脑请求重新发一遍。
     有人退出又进来的时候，之前那条请求是发给已经断掉的连接的，
     不重发牌局就一直停在那里。 */
  repostAI() {
    const R = this.room, g = R && R.g;
    if (!g || g.over) return;
    if (g.claim) {
      for (const i of g.claim.pending) if (R.seats[i] && R.seats[i].ai) this.askAIClaim(i);
      this.armAIWatch();
    } else if (R.seats[g.current] && R.seats[g.current].ai) {
      this.aiTurn();
    }
  }

  /* 兜底：轮到电脑却迟迟没人替它算（比如真人全退了），
     服务器自己替它走一步。宁可打得笨，也不能把整局卡死。 */
  /* 这个座位现在没人管：要么本来就是电脑，要么是掉了线的真人。
     掉线的真人也得管 —— 不然一个人手机锁屏，
     另外三家就永远等着他，一局麻将就此定格。 */
  unattended(i) {
    const s = this.room.seats[i];
    return !!s && (s.ai || !s.online);
  }

  armAIWatch() {
    if (this.aiTimer) { clearTimeout(this.aiTimer); this.aiTimer = null; }
    const R = this.room, g = R && R.g;
    if (!g || g.over) return;
    const need = g.claim
      ? g.claim.pending.some(i => this.unattended(i))
      : this.unattended(g.current);
    if (!need) return;
    /* 电脑等 12 秒就够了；掉线的真人多给点时间，
       万一只是切出去看了眼消息，别急着替他打 */
    const humanWaiting = g.claim
      ? g.claim.pending.some(i => R.seats[i] && !R.seats[i].ai && !R.seats[i].online)
      : !!(R.seats[g.current] && !R.seats[g.current].ai && !R.seats[g.current].online);
    const gen = (this.aiGen = (this.aiGen || 0) + 1);
    this.aiTimer = setTimeout(() => {
      if (gen !== this.aiGen) return;   /* 局面已经往前走了，这个闹钟作废 */
      this.aiFallback();
    }, humanWaiting ? 30000 : 12000);
  }

  aiFallback() {
    const R = this.room, g = R && R.g;
    if (!g || g.over) return;
    if (g.claim) {
      /* 没人替这些座位决定碰不碰，那就一律过 */
      for (const i of [...g.claim.pending]) {
        if (!this.unattended(i)) continue;
        g.claim.answers[i] = "pass";
        g.claim.pending = g.claim.pending.filter(x => x !== i);
      }
      if (!g.claim.pending.length) this.resolveClaims();
      else this.armAIWatch();
      return;
    }
    const cur = g.current;
    if (!this.unattended(cur)) return;
    const hand = g.hands[cur];
    if (!hand || !hand.length) return;
    /* 人跑了还欠着花：替他补完再说，不然那张花会被当废牌打出去 */
    if (g.phase === "flower") {
      this.autoFlower(cur);
      g.phase = "discard";
      this.broadcast({ t: "drewn", who: cur, wall: g.wall.length,
                       counts: g.hands.map(h => h.length),
                       flowers: g.flowers.map(f => f.map(x => x.key)) });
      this.pushTurn();
      return;
    }
    /* 打刚摸进来的那张，任何时候都是合法的一步 */
    this.onAct(cur, { a: "discard", id: hand[hand.length - 1].id });
  }

  onAct(seat, m) {
    const R = this.room, g = R.g;
    if (!g || g.over) return;

    /* 替电脑代答：谁在替电脑算，谁说了才算。
       以前只认房主，房主掉线后就没人能替电脑答了。 */
    let who = seat;
    if (m.forSeat != null && R.seats[m.forSeat] && R.seats[m.forSeat].ai &&
        seat === this.aiDriver()) {
      who = m.forSeat | 0;
    }

    /* 亲手补花：亮一张、补一张。要是补进来的还是花，就继续停在这儿等下一次点。 */
    if (m.a === "flower") {
      if (g.current !== who || g.claim || g.phase !== "flower") return;
      const r = this.oneFlower(who);
      if (!r) { g.phase = "discard"; this.pushTurn(); return; }
      if (!r.tile) { this.finishDraw(); return; }   /* 牌尾也摸空了，流局 */
      const more = this.hasFlower(who);
      g.phase = more ? "flower" : "discard";
      this.sendTo(who, { t: "drew", tile: { id: r.tile.id, key: r.tile.key },
                         hand: g.hands[who].map(x => ({ id: x.id, key: x.key })),
                         flowers: g.flowers.map(f => f.map(x => x.key)), needFlower: more });
      this.broadcast({ t: "drewn", who, wall: g.wall.length,
                       counts: g.hands.map(h => h.length),
                       flowers: g.flowers.map(f => f.map(x => x.key)) }, who);
      this.pushTurn();
      return;
    }

    if (m.a === "discard") {
      if (g.current !== who || g.claim) return;
      /* 还欠着花就收到出牌请求 —— 只可能是没更新的老客户端（它不认补花）。
         替他把花补完再处理这一手，别让新服务端配旧客户端把牌局卡死。
         新客户端在补花期间根本不给出牌按钮，走不到这儿。 */
      if (g.phase === "flower") {
        this.autoFlower(who);
        g.phase = "discard";
        this.broadcast({ t: "drewn", who, wall: g.wall.length,
                         counts: g.hands.map(h => h.length),
                         flowers: g.flowers.map(f => f.map(x => x.key)) });
        /* 他要打的那张要是刚好被当花补走了，就只补花、这一手作罢 */
        if (!g.hands[who].some(t => t.id === m.id)) { this.pushTurn(); return; }
      }
      const ix = g.hands[who].findIndex(t => t.id === m.id);
      if (ix < 0) return;
      const tile = g.hands[who].splice(ix, 1)[0];
      g.discards[who].push(tile);
      g.lastDiscard = tile; g.lastFrom = who;
      g.drewThisTurn = false;
      this.broadcast({ t: "discard", who, tile: { id: tile.id, key: tile.key },
                       counts: g.hands.map(h => h.length) });
      this.openClaims(who, tile);
      return;
    }

    if (m.a === "claim" && g.claim) {
      const c = g.claim;
      if (!c.pending.includes(who)) return;
      c.answers[who] = m.pick || "pass";
      c.pending = c.pending.filter(x => x !== who);
      if (!c.pending.length) this.resolveClaims();
      else this.armAIWatch();   /* 还有人没答，看门狗重新计时 */
      return;
    }

    if (m.a === "hu" && !g.claim) {
      /* 自摸 */
      if (g.current !== who) return;
      this.finishWin([who], { selfDraw: true });
      return;
    }

    if (m.a === "gang" && !g.claim) {
      if (g.current !== who) return;
      this.doSelfGang(who, m.key);
      return;
    }
  }

  /* 谁能碰、谁能杠、谁能胡 —— 服务器算，因为只有它看得到所有手牌 */
  openClaims(from, tile) {
    const R = this.room, g = R.g;
    const opts = [];
    for (let i = 0; i < 4; i++) {
      if (i === from) continue;
      const keys = g.hands[i].map(t => t.key);
      const n = countKey(keys, tile.key);
      const canHu = canWinShape(keys.concat([tile.key]), g.melds[i].length);
      const canGang = n >= 3 && g.wall.length > 0;
      const canPeng = n >= 2;
      if (canHu || canGang || canPeng) opts.push({ i, canHu, canGang, canPeng });
    }
    if (!opts.length) { this.nextTurn(from); return; }

    g.claim = { from, tile, pending: opts.map(o => o.i), answers: {}, opts };
    for (const o of opts) {
      this.sendTo(o.i, { t: "claim", from, tile: { id: tile.id, key: tile.key },
                         hu: o.canHu, gang: o.canGang, peng: o.canPeng });
      if (R.seats[o.i].ai) this.askAIClaim(o.i);
    }
    this.armAIWatch();
  }

  resolveClaims() {
    const g = this.room.g;
    const c = g.claim;
    g.claim = null;
    const huers = [];
    let gangBy = -1, pengBy = -1;
    for (const o of c.opts) {
      const a = c.answers[o.i];
      if (a === "hu" && o.canHu) huers.push(o.i);
      else if (a === "gang" && o.canGang && gangBy < 0) gangBy = o.i;
      else if (a === "peng" && o.canPeng && pengBy < 0) pengBy = o.i;
    }
    if (huers.length) { this.finishWin(huers, { ron: true, from: c.from, tile: c.tile }); return; }
    if (gangBy >= 0) { this.doMingGang(gangBy, c.from, c.tile); return; }
    if (pengBy >= 0) { this.doPeng(pengBy, c.from, c.tile); return; }
    this.nextTurn(c.from);
  }

  takeFrom(i, key, n) {
    const g = this.room.g;
    let got = 0;
    for (let x = g.hands[i].length - 1; x >= 0 && got < n; x--) {
      if (g.hands[i][x].key === key) { g.hands[i].splice(x, 1); got++; }
    }
  }

  doPeng(i, from, tile) {
    const g = this.room.g;
    this.takeFrom(i, tile.key, 2);
    g.melds[i].push({ type: "peng", key: tile.key, concealed: false, from });
    g.discards[from] = g.discards[from].filter(t => t.id !== tile.id);
    g.lastDiscard = null;
    g.current = i; g.drewThisTurn = false; g.phase = "discard";
    this.broadcast({ t: "meld", who: i, kind: "peng", key: tile.key, from,
                     melds: g.melds, counts: g.hands.map(h => h.length) });
    this.pushTurn();
  }

  doMingGang(i, from, tile) {
    const g = this.room.g;
    this.takeFrom(i, tile.key, 3);
    g.melds[i].push({ type: "gang", key: tile.key, concealed: false, from, added: false });
    g.discards[from] = g.discards[from].filter(t => t.id !== tile.id);
    g.lastDiscard = null;
    g.current = i;
    this.broadcast({ t: "meld", who: i, kind: "gang", key: tile.key, from,
                     melds: g.melds, counts: g.hands.map(h => h.length) });
    this.drawBack(i);
  }

  doSelfGang(i, key) {
    const g = this.room.g;
    const keys = g.hands[i].map(t => t.key);
    const n = countKey(keys, key);
    const has = g.melds[i].find(x => x.type === "peng" && x.key === key);
    if (n >= 4) {
      this.takeFrom(i, key, 4);
      g.melds[i].push({ type: "gang", key, concealed: true, from: i, added: false });
    } else if (has && n >= 1) {
      this.takeFrom(i, key, 1);
      has.type = "gang"; has.added = true; has.concealed = false;
    } else return;
    this.broadcast({ t: "meld", who: i, kind: "gang", key, from: i,
                     melds: g.melds, counts: g.hands.map(h => h.length) });
    this.drawBack(i);
  }

  drawBack(i) {
    const g = this.room.g;
    if (!g.wall.length) { this.finishDraw(); return; }
    const t = g.wall.pop();
    g.hands[i].push(t);
    const needFlower = this.settleFlower(i);
    g.drewThisTurn = true;
    if (!needFlower) g.phase = "discard";
    this.sendTo(i, { t: "drew", tile: { id: t.id, key: t.key },
                     hand: g.hands[i].map(x => ({ id: x.id, key: x.key })),
                     flowers: g.flowers.map(f => f.map(x => x.key)), needFlower });
    this.broadcast({ t: "drewn", who: i, wall: g.wall.length,
                     counts: g.hands.map(h => h.length),
                     flowers: g.flowers.map(f => f.map(x => x.key)) }, i);
    this.pushTurn();
  }

  nextTurn(from) {
    const g = this.room.g;
    g.current = (from + 1) % 4;
    if (!g.wall.length) { this.finishDraw(); return; }
    const t = g.wall.shift();
    g.hands[g.current].push(t);
    const needFlower = this.settleFlower(g.current);
    g.drewThisTurn = true;
    if (!needFlower) g.phase = "discard";
    const i = g.current;
    this.sendTo(i, { t: "drew", tile: { id: t.id, key: t.key },
                     hand: g.hands[i].map(x => ({ id: x.id, key: x.key })),
                     flowers: g.flowers.map(f => f.map(x => x.key)), needFlower });
    this.broadcast({ t: "drewn", who: i, wall: g.wall.length,
                     counts: g.hands.map(h => h.length),
                     flowers: g.flowers.map(f => f.map(x => x.key)) }, i);
    this.pushTurn();
  }

  /* 结束：把四家的牌全摊开广播，谁都能自己验一遍 */
  reveal() {
    const g = this.room.g;
    return {
      hands: g.hands.map(h => h.map(x => x.key)),
      melds: g.melds,
      flowers: g.flowers.map(f => f.map(x => x.key)),
      discards: g.discards.map(d => d.map(x => x.key))
    };
  }

  finishWin(winners, flags) {
    const g = this.room.g;
    g.over = true;
    g.nextDealer = winners.includes(g.dealer) ? g.dealer : (g.dealer + 1) % 4;
    this.broadcast({ t: "over", kind: "hu", winners, flags,
                     dealer: g.dealer, nextDealer: g.nextDealer,
                     reveal: this.reveal() });
  }

  finishDraw() {
    const g = this.room.g;
    g.over = true;
    g.nextDealer = g.dealer;
    this.broadcast({ t: "over", kind: "liuju", winners: [], flags: {},
                     dealer: g.dealer, nextDealer: g.nextDealer,
                     reveal: this.reveal() });
  }

  /* 断线重连：把当前局面补给回来的人 */
  pushResume(seat) {
    const g = this.room.g;
    if (!g) return;

    /* 断线的那一刻正好有人在问他碰不碰：那条 claim 是发给已经断掉的连接的，
       不在这里补一遍，他回来就再也不会被问到。
       而且 armAIWatch 看他已经在线，会认为「有真人在想，等着就行」，
       连兜底闹钟都不上 —— 整桌永久停在这里，四个人都不知道在等谁。
       下面的 needFlower 是同一类问题的另一半，当初只补了那一半。 */
    const c = g.claim;
    const 轮到他答 = c && c.pending.includes(seat);
    const o = 轮到他答 ? (c.opts || []).find(x => x.i === seat) : null;

    this.sendTo(seat, {
      t: "resume", seat, round: g.round, dealer: g.dealer,
      hand: g.hands[seat].map(x => ({ id: x.id, key: x.key })),
      melds: g.melds, flowers: g.flowers.map(f => f.map(x => x.key)),
      discards: g.discards.map(d => d.map(x => ({ id: x.id, key: x.key }))),
      counts: g.hands.map(h => h.length),
      current: g.current, wall: g.wall.length, over: g.over,
      lastDiscard: g.lastDiscard ? { id: g.lastDiscard.id, key: g.lastDiscard.key } : null,
      lastFrom: g.lastFrom, opts: this.room.opts,
      /* 断线前还欠着一张花，回来要接着补，不然他这轮点不动 */
      needFlower: g.phase === "flower" && g.current === seat,
      /* 断线前还欠一个「碰不碰」的回答，字段和 claim 消息保持一致 */
      claim: o ? { from: c.from, tile: { id: c.tile.id, key: c.tile.key },
                   hu: o.canHu, gang: o.canGang, peng: o.canPeng } : null
    });
  }
}

/* ══════════ 入口 ══════════ */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    /* 开房：分配一个不重复的房间号 */
    if (url.pathname === "/new") {
      const code = makeCode();
      return new Response(JSON.stringify({ code }), {
        headers: { "content-type": "application/json", ...cors }
      });
    }

    /* 连房间 */
    if (url.pathname === "/ws") {
      const code = (url.searchParams.get("code") || "").toUpperCase();
      if (!/^[A-Z0-9]{4,8}$/.test(code)) return new Response("bad code", { status: 400, headers: cors });
      const id = env.ROOM.idFromName(code);
      const stub = env.ROOM.get(id);
      return stub.fetch(req);
    }

    if (url.pathname === "/health") {
      return new Response("ok " + VERSION, { headers: cors });
    }

    return new Response("金坛麻将联机服务", { headers: cors });
  }
};
