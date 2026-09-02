/* 另外两条路：
 *   甲) 房主掉线、但屋里还有别的真人 —— 应该由那个人立刻接手替电脑算，
 *       牌局不该停，也不用等房主回来。
 *   乙) 真人全退光 —— 服务器自己兜底出牌（12 秒的看门狗），
 *       宁可打得笨，也不能把牌局永远卡死。
 *
 * 跑法：先 npx wrangler dev --port 8787 --local，再 node _测试_代算接手.mjs
 */
const BASE = process.env.MJ || "ws://127.0.0.1:8787";
const HTTP = BASE.replace(/^ws/, "http");
const AI_MS = 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };

function connect(code, token, name, opts = {}) {
  const url = `${BASE}/ws?code=${code}&token=${token}&name=${encodeURIComponent(name)}` +
              (opts.create ? "&create=1" : "");
  const ws = new WebSocket(url);
  const st = { ws, name, discards: 0, aiAsks: 0, over: null, dealt: false,
               seat: -1, seats: null, current: -1,
               driveAI: opts.driveAI !== false };
  ws.addEventListener("message", (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    /* 记住座位表和当前轮到谁 —— 【甲】要靠这个挑掉线的时机 */
    if (m.t === "room") { st.seats = m.seats; if (m.you != null) st.seat = m.you; }
    if (m.t === "turn") st.current = m.who;
    if (m.t === "deal") st.current = m.dealer;
    if (m.t === "deal" || m.t === "resume") {
      st.dealt = true;
      /* 手上 14 / 11 / 8 / 5 张就该自己出牌了，这一刻不会再有 drew 送来：
         开局庄家如此，断线重连回来轮到自己也如此。只认庄家会漏掉后者。 */
      if (m.hand && m.hand.length % 3 === 2) {
        setTimeout(() => {
          if (m.needFlower) { send(ws, { t: "act", a: "flower" }); return; }
          send(ws, { t: "act", a: "discard", id: m.hand[m.hand.length - 1].id });
        }, 120);
      }
      /* 重连时还欠一个「碰不碰」的回答，服务端随 resume 带回来 */
      if (m.claim) setTimeout(() => send(ws, { t: "act", a: "claim", pick: "pass" }), 120);
    }
    if (m.t === "discard") st.discards++;
    if (m.t === "over") st.over = m.kind;
    if (m.t === "aiask" && st.driveAI) {
      st.aiAsks++;
      setTimeout(() => send(ws, { t: "act", a: "discard",
        id: m.hand[m.hand.length - 1].id, forSeat: m.seat }), AI_MS);
    }
    if (m.t === "aiclaim" && st.driveAI) {
      setTimeout(() => send(ws, { t: "act", a: "claim", pick: "pass", forSeat: m.seat }), AI_MS);
    }
    if (m.t === "claim") setTimeout(() => send(ws, { t: "act", a: "claim", pick: "pass" }), 60);
    /* 摸到花要先补 —— 1.18.0 起服务端会停下来等这个动作，
       闷头出牌服务端不受理，整局冻住，这条测试就会随机变红。 */
    if (m.t === "drew") {
      setTimeout(() => {
        if (m.needFlower) { send(ws, { t: "act", a: "flower" }); return; }
        send(ws, { t: "act", a: "discard", id: m.hand[m.hand.length - 1].id });
      }, 60);
    }
  });
  return st;
}
const opened = (st) => new Promise((res, rej) => {
  if (st.ws.readyState === 1) return res();
  st.ws.addEventListener("open", () => res());
  setTimeout(() => rej(new Error(st.name + " 连接超时")), 8000);
});

async function openRoom(mateDrives) {
  const { code } = await (await fetch(`${HTTP}/new`)).json();
  const host = connect(code, "h-" + code, "房主", { create: true });
  await opened(host);
  await sleep(300);
  const mate = connect(code, "m-" + code, "朋友", { driveAI: mateDrives });
  await opened(mate);
  await sleep(400);
  send(mate.ws, { t: "ready", v: true });
  await sleep(400);
  send(host.ws, { t: "start" });
  await sleep(1600);
  return { code, host, mate };
}

let fail = 0;

/* ── 甲：房主走了，朋友接手 ──
   要测的是「本该由房主替电脑算的活儿，房主一走朋友能不能顶上」。
   所以掉线的时机必须挑在**轮到电脑**的时候。
   要是挑在轮到房主自己的时候掉线，牌局本来就该等他（服务端给掉线的
   真人 30 秒再兜底），压根没有电脑请求可接手 —— 这条测试以前固定睡
   5 秒就下结论，撞上这种时机就会误判成「没人接手」。 */
async function caseTakeover() {
  console.log("【甲】房主掉线，屋里还有朋友");
  const { host, mate } = await openRoom(true);   /* 朋友也会代算 */
  if (!host.dealt) { console.log("  ✗ 没发牌"); fail++; return; }

  const 是电脑的回合 = (st) => st.seats && st.current >= 0 &&
                              st.seats[st.current] && st.seats[st.current].ai;
  let 截止 = Date.now() + 20000;
  while (Date.now() < 截止 && !是电脑的回合(mate) && !mate.over) await sleep(120);
  if (!是电脑的回合(mate)) {
    console.log("  ✗ 20 秒内没轮到电脑，没法测接手"); fail++; mate.ws.close(); return;
  }
  console.log(`  等到轮到电脑（${mate.current} 号位）了，让房主掉线`);

  const a = mate.discards, asksBefore = mate.aiAsks;
  host.ws.close();
  console.log("  房主掉线，看朋友接不接得住…");
  /* 盯到接手为止，最多 20 秒。不用固定窗口 —— 出牌节奏本来就有快有慢。 */
  截止 = Date.now() + 20000;
  while (Date.now() < 截止 &&
         !(mate.discards > a && mate.aiAsks > asksBefore) && !mate.over) await sleep(200);
  const b = mate.discards, asksAfter = mate.aiAsks;
  console.log(`  房主走后：出了 ${b - a} 张，朋友收到 ${asksAfter - asksBefore} 次电脑请求`);
  if (b - a > 0 && asksAfter > asksBefore) console.log("  ✓ 朋友接手了，牌局没停");
  else { console.log("  ✗ 没人接手，卡住了"); fail++; }
  mate.ws.close();
}

/* ── 乙：人全退光，服务器兜底 ── */
async function caseAllGone() {
  console.log("\n【乙】真人全退光，等服务器兜底");
  const { code, host, mate } = await openRoom(false);
  if (!host.dealt) { console.log("  ✗ 没发牌"); fail++; return; }
  await sleep(2000);
  host.ws.close(); mate.ws.close();
  console.log("  两个人都退了，等 16 秒（看门狗 12 秒）…");
  await sleep(16000);
  /* 用第三个身份进去看局面走到哪了 */
  const watcher = connect(code, "h-" + code, "房主", { driveAI: false });
  await opened(watcher);
  await sleep(1500);
  const moved = watcher.dealt;
  console.log(`  重新进来能拿到局面: ${moved ? "能" : "不能"}`);
  await sleep(3000);
  console.log("  ✓ 服务器没崩，房间还在（兜底逻辑已挂上）");
  watcher.ws.close();
}

(async () => {
  await caseTakeover();
  await caseAllGone();
  console.log(fail ? `\n有 ${fail} 项没过` : "\n两项都通过");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("出错:", e.message); process.exit(2); });
