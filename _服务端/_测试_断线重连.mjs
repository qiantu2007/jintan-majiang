/* 复现并验证：联机中途有人退出、过一会儿再进来，电脑会不会卡住。
 *
 * 场景就是用户描述的那个：
 *   房主开房 → 开局 → 房主断线 → 隔几秒重连 → 看电脑还走不走。
 * 房主的手机负责替电脑算牌，所以房主一断，服务器发出去的
 * 「该电脑出牌了」就没人接。修好之前，牌局会永远停在那里。
 *
 * 跑法：先 npx wrangler dev --port 8787 --local，再 node _测试_断线重连.mjs
 */
const BASE = process.env.MJ || "ws://127.0.0.1:8787";
const HTTP = BASE.replace(/^ws/, "http");
/* 电脑思考多久。放慢一点，一局才撑得过整个断线-重连的时间线，
   否则牌还没等到房主掉线就已经打完了。 */
const AI_MS = 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 一个极简客户端：只做两件事 —— 记住牌局进度、替电脑随便出一张 */
function connect(code, token, name, opts = {}) {
  const url = `${BASE}/ws?code=${code}&token=${token}&name=${encodeURIComponent(name)}` +
              (opts.create ? "&create=1" : "");
  const ws = new WebSocket(url);
  const st = {
    ws, name, seat: -1, msgs: [], discards: 0, aiAsks: 0, aiClaims: 0,
    lastTurn: null, over: null, dealt: false,
    driveAI: opts.driveAI !== false
  };
  ws.addEventListener("message", (ev) => {
    let m;
    try { m = JSON.parse(ev.data); } catch { return; }
    st.msgs.push(m.t);
    if (m.t === "room" && m.you != null) st.seat = m.you;
    if (m.t === "deal" || m.t === "resume") {
      st.dealt = true;
      st.hand = m.hand;
      /* 庄家开局就是 14 张，不会收到 drew，得自己先打一张 */
      if (m.dealer === m.seat && m.hand && m.hand.length % 3 === 2) {
        setTimeout(() => send(ws, { t: "act", a: "discard", id: m.hand[m.hand.length - 1].id }), 120);
      }
    }
    if (m.t === "discard") st.discards++;
    if (m.t === "turn") st.lastTurn = m.who;
    if (m.t === "over") st.over = m.kind;

    /* 替电脑算牌：真客户端会认真算，这里随便打一张就够验证流程 */
    if (m.t === "aiask" && st.driveAI) {
      st.aiAsks++;
      setTimeout(() => {
        const t = m.hand[m.hand.length - 1];
        send(ws, { t: "act", a: "discard", id: t.id, forSeat: m.seat });
      }, AI_MS);
    }
    if (m.t === "aiclaim" && st.driveAI) {
      st.aiClaims++;
      setTimeout(() => send(ws, { t: "act", a: "claim", pick: "pass", forSeat: m.seat }), AI_MS);
    }
    /* 自己被问到吃碰杠：一律过，专心测电脑 */
    if (m.t === "claim") setTimeout(() => send(ws, { t: "act", a: "claim", pick: "pass" }), 60);
    /* 轮到自己：打最后一张 */
    if (m.t === "drew") {
      setTimeout(() => {
        const t = m.hand[m.hand.length - 1];
        send(ws, { t: "act", a: "discard", id: t.id });
      }, 60);
    }
  });
  return st;
}

function send(ws, m) {
  if (ws.readyState === 1) ws.send(JSON.stringify(m));
}

const opened = (st) => new Promise((res, rej) => {
  if (st.ws.readyState === 1) return res();
  st.ws.addEventListener("open", () => res());
  st.ws.addEventListener("error", () => rej(new Error(st.name + " 连不上")));
  setTimeout(() => rej(new Error(st.name + " 连接超时")), 8000);
});

async function main() {
  const r = await fetch(`${HTTP}/new`);
  const { code } = await r.json();
  console.log("房间号:", code);

  /* 房主 + 一个朋友，剩下两个座位是电脑 */
  const host = connect(code, "tok-host", "房主", { create: true });
  await opened(host);
  await sleep(300);
  /* 朋友故意不代算电脑：这样「谁替电脑算」只落在房主身上，
     房主一掉线问题才暴露得出来 */
  const mate = connect(code, "tok-mate", "朋友", { driveAI: false });
  await opened(mate);
  await sleep(400);

  send(mate.ws, { t: "ready", v: true });
  await sleep(400);
  send(host.ws, { t: "start" });
  await sleep(1500);

  if (!host.dealt) { console.log("✗ 没发牌，测不下去"); process.exit(1); }
  console.log("开局成功，先让它自己跑 4 秒");
  await sleep(4000);
  const before = host.discards;
  console.log(`  这 4 秒里四家一共出了 ${before} 张`);

  /* ── 关键动作：房主断线，等 5 秒再回来 ── */
  console.log("\n房主掉线…");
  host.ws.close();
  await sleep(5000);
  const duringOut = mate.discards;
  console.log(`  房主不在的 5 秒里，朋友那边看到出了 ${duringOut} 张`);

  if (mate.over) { console.log("✗ 牌局提前结束了，这次没测到断线场景"); process.exit(2); }

  console.log("房主重新连回来…");
  const beforeJoin = mate.discards;
  const host2 = connect(code, "tok-host", "房主");
  await opened(host2);

  /* 重连后 4 秒内就该恢复：服务器把挂起的电脑请求重发给他 */
  console.log("  盯着看 4 秒内电脑会不会重新动起来");
  await sleep(4000);
  const afterJoin = mate.discards;

  const stalled = duringOut - before;      /* 房主不在时走了几步 */
  const resumed = afterJoin - beforeJoin;  /* 回来后 4 秒走了几步 */
  console.log("\n──────── 结果 ────────");
  console.log(`房主不在的 5 秒里走了   : ${stalled} 步（只有房主能代算，理应停住）`);
  console.log(`重连后 4 秒里走了       : ${resumed} 步`);
  console.log(`重连后收到的电脑请求    : ${host2.aiAsks} 次出牌 / ${host2.aiClaims} 次碰杠`);
  console.log(`牌局                    : ${mate.over || "还在进行"}`);

  const ok = resumed > 0 && host2.aiAsks + host2.aiClaims > 0;
  console.log(ok
    ? "✓ 重连后服务器把挂起的请求重发了，电脑立刻接着走"
    : "✗ 电脑卡住了 —— 重连后 4 秒一步没动，也没收到任何电脑请求");

  host2.ws.close(); mate.ws.close();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error("测试出错:", e.message); process.exit(2); });
