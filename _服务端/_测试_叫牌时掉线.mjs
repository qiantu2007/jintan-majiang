/* 在「有人问你碰不碰」的那一刻掉线，再连回来，牌桌会不会永久卡死。
 *
 * 跑法：先 npx wrangler dev --port 8787 --local，再 node _测试_叫牌时掉线.mjs
 *
 * 这个洞是怎么来的：
 *   服务端把「你可以碰这张」发给某个座位之后，就在 g.claim.pending 里等他回答。
 *   他这时候掉线 —— 那条消息发给了一条已经死掉的连接。
 *   重连时 pushResume 只补了「你还欠一张花」，没补「还有人等你回答」；
 *   repostAI 只对电脑座位重发，不管回来的真人；
 *   armAIWatch 又看到他已经 online，判定「有真人在想，等着就是了」，兜底闹钟也不上。
 *   于是四个人一起等一个永远不会来的回答。
 *
 * 欠花那半边当初修了，叫牌这半边漏了 —— 同一类问题的两半。
 */

const BASE = process.env.MJ || "ws://127.0.0.1:8787";
const HTTP = BASE.replace(/^ws/, "http");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const isFlower = (k) => String(k).charAt(0) === "f";

let fail = 0;
const check = (name, ok, extra) => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${extra ? "  （" + extra + "）" : ""}`);
  if (!ok) fail++;
};

/* 迷你客户端。关键：收到 claim 不自动回答 —— 这条测试要的就是那一刻。 */
function connect(code, token, name, opts = {}) {
  const ws = new WebSocket(
    `${BASE}/ws?code=${code}&token=${token}&name=${encodeURIComponent(name)}` +
    (opts.create ? "&create=1" : ""));
  const st = { ws, name, seat: -1, dealt: false, over: null, discards: 0,
               claim: null, resume: null, autoClaim: !!opts.autoClaim };
  ws.addEventListener("message", (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.t === "room" && m.you != null) st.seat = m.you;
    if (m.t === "discard") st.discards++;
    if (m.t === "over") st.over = m.kind;

    if (m.t === "deal" || m.t === "resume") {
      st.dealt = true;
      if (m.t === "resume") st.resume = m;
      if (m.hand && m.hand.length % 3 === 2) {
        setTimeout(() => {
          if (m.needFlower) { send(ws, { t: "act", a: "flower" }); return; }
          send(ws, { t: "act", a: "discard", id: m.hand[m.hand.length - 1].id });
        }, 120);
      }
    }
    if (m.t === "drew") {
      setTimeout(() => {
        if (m.needFlower) { send(ws, { t: "act", a: "flower" }); return; }
        send(ws, { t: "act", a: "discard", id: m.hand[m.hand.length - 1].id });
      }, 60);
    }
    /* 被问碰杠胡：记下来。autoClaim 的那个客户端一律过，好让牌局继续走。 */
    if (m.t === "claim") {
      st.claim = m;
      if (st.autoClaim) setTimeout(() => send(ws, { t: "act", a: "claim", pick: "pass" }), 60);
    }
    /* 替电脑座位算：随便打一张 / 一律过 */
    if (m.t === "aiask") setTimeout(() => {
      send(ws, { t: "act", a: "discard", id: m.hand[m.hand.length - 1].id, forSeat: m.seat });
    }, 200);
    if (m.t === "aiclaim") setTimeout(() => {
      send(ws, { t: "act", a: "claim", pick: "pass", forSeat: m.seat });
    }, 200);
  });
  return st;
}

const opened = (st) => new Promise((res, rej) => {
  if (st.ws.readyState === 1) return res();
  st.ws.addEventListener("open", () => res());
  st.ws.addEventListener("error", () => rej(new Error(st.name + " 连不上")));
  setTimeout(() => rej(new Error(st.name + " 连接超时")), 8000);
});

/* 碰/杠/胡的机会得靠牌运，一局不一定轮得到我。开几局直到问到我为止。 */
async function 打到有人问我(最多试几局) {
  for (let 第几局 = 1; 第几局 <= 最多试几局; 第几局++) {
    const { code } = await (await fetch(`${HTTP}/new`)).json();
    const me = connect(code, "C-me", "我", { create: true });
    await opened(me);
    await sleep(300);
    const mate = connect(code, "C-mate", "朋友", { autoClaim: true });
    await opened(mate);
    await sleep(400);
    send(mate.ws, { t: "ready", v: true });
    await sleep(400);
    send(me.ws, { t: "start" });
    await sleep(1500);
    if (!me.dealt) { try { me.ws.close(); mate.ws.close(); } catch {} continue; }

    const 截止 = Date.now() + 25000;
    while (Date.now() < 截止 && !me.claim && !me.over) await sleep(120);
    if (me.claim) return { code, me, mate, 第几局 };

    console.log(`  （第 ${第几局} 局没轮到我叫牌，换个房间重开）`);
    try { me.ws.close(); mate.ws.close(); } catch {}
    await sleep(300);
  }
  return null;
}

async function main() {
  console.log("【一】打到有人问我碰不碰");
  const 场 = await 打到有人问我(8);
  if (!场) {
    check("能问到我一次碰杠胡", false, "连开 8 局都没被问到，八成是叫牌逻辑坏了");
    console.log(`\n${fail} 项没过`); process.exit(1);
  }
  const { code, me, mate, 第几局 } = 场;
  const 问的牌 = me.claim.tile.key;
  check("被问到了", true, `${第几局 > 1 ? "第 " + 第几局 + " 局，" : ""}问的是 ${问的牌}`);

  console.log("\n【二】就在这一刻掉线（不回答），隔一会儿再连回来");
  me.ws.close();
  await sleep(2000);
  const back = connect(code, "C-me", "我", {});
  await opened(back);
  await sleep(2000);

  check("重连后拿到局面", !!back.resume);
  const r = back.resume || {};
  check("resume 把没答完的叫牌带回来了", !!r.claim,
        r.claim ? "" : "服务端没补 claim —— 回来的人不会再被问，整桌会一直等他");
  if (r.claim) {
    check("带回来的是同一张牌", r.claim.tile && r.claim.tile.key === 问的牌,
          (r.claim.tile && r.claim.tile.key) + " vs " + 问的牌);
    check("碰/杠/胡的可选项也带回来了",
          r.claim.peng === me.claim.peng && r.claim.gang === me.claim.gang && r.claim.hu === me.claim.hu,
          `碰=${r.claim.peng} 杠=${r.claim.gang} 胡=${r.claim.hu}`);
  }

  console.log("\n【三】回答「过」，牌局要能接着走");
  const 之前 = mate.discards;
  send(back.ws, { t: "act", a: "claim", pick: "pass" });
  const 截止 = Date.now() + 15000;
  while (Date.now() < 截止 && mate.discards <= 之前 && !mate.over) await sleep(200);
  check("牌局恢复推进", mate.discards > 之前 || !!mate.over,
        `牌河 ${之前} → ${mate.discards}${mate.over ? "，牌局结束=" + mate.over : ""}`);

  try { back.ws.close(); mate.ws.close(); } catch {}
  console.log(fail ? `\n${fail} 项没过` : "\n全部通过");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("测试出错:", e.message); process.exit(2); });
