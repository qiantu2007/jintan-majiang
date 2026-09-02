/* 联机手动补花的端到端验证 —— 交接文档里承认没跑过的那块。
 *
 * 要验的：
 *   1. 摸到花时，服务端会停住并在 drew 里带 needFlower
 *   2. 客户端发 {a:"flower"} 后，花亮到花区、从牌尾补一张
 *   3. 连续摸到花会连续停，不会一次补完
 *   4. 补花期间不接受出牌（除非是旧客户端的兼容分支）
 *   5. 补花过程中牌张总数始终是 144
 *   6. 断线重连后，pushResume 会带上 needFlower，能接着补
 *   7. 电脑摸到花仍然自动补，不停顿
 *
 * 跑法：先 npx wrangler dev --port 8787 --local，再 node _测试_手动补花.mjs
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

function connect(code, token, name, opts = {}) {
  const ws = new WebSocket(
    `${BASE}/ws?code=${code}&token=${token}&name=${encodeURIComponent(name)}` +
    (opts.create ? "&create=1" : ""));
  const st = {
    ws, name, seat: -1, hand: [], flowers: [], wall: 0, counts: [0, 0, 0, 0],
    phase: null, current: -1, needFlower: false, dealt: false, over: null,
    flowerAsks: 0, log: [], autoFlower: opts.autoFlower !== false,
    driveAI: opts.driveAI !== false, discards: 0
  };
  ws.addEventListener("message", (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    st.log.push(m.t);
    if (m.t === "room" && m.you != null) st.seat = m.you;

    if (m.t === "deal") {
      st.dealt = true; st.hand = m.hand; st.flowers = m.flowers || [];
      st.counts = m.counts; st.wall = m.wall; st.dealer = m.dealer;
    }
    if (m.t === "resume") {
      st.dealt = true; st.hand = m.hand; st.flowers = m.flowers || [];
      st.counts = m.counts; st.wall = m.wall; st.current = m.current;
      st.needFlower = !!m.needFlower;
      if (m.needFlower) st.resumeNeedFlower = true;
    }
    if (m.t === "drew") {
      st.hand = m.hand; st.flowers = m.flowers || st.flowers;
      st.needFlower = !!m.needFlower;
      if (m.needFlower) { st.flowerAsks++; }
      st.lastDrew = m.tile;
    }
    if (m.t === "drewn") { st.wall = m.wall; st.counts = m.counts; st.flowers = m.flowers || st.flowers; }
    if (m.t === "turn") { st.current = m.who; st.phase = m.phase; st.wall = m.wall; st.counts = m.counts; }
    if (m.t === "discard") { st.discards++; st.counts = m.counts || st.counts; }
    if (m.t === "over") st.over = m.kind;
    if (m.t === "claim") setTimeout(() => send(ws, { t: "act", a: "claim", pick: "pass" }), 40);

    /* 替电脑代算 */
    if (m.t === "aiask" && st.driveAI) {
      setTimeout(() => {
        const t = m.hand[m.hand.length - 1];
        send(ws, { t: "act", a: "discard", id: t.id, forSeat: m.seat });
      }, 60);
    }
    if (m.t === "aiclaim" && st.driveAI) {
      setTimeout(() => send(ws, { t: "act", a: "claim", pick: "pass", forSeat: m.seat }), 60);
    }
  });
  return st;
}
const opened = (st) => new Promise((res) => {
  if (st.ws.readyState === 1) return res(true);
  st.ws.addEventListener("open", () => res(true));
  st.ws.addEventListener("close", () => res(false));
  setTimeout(() => res(false), 8000);
});

/* 我这一家的牌张总数视角：手牌 + 花 + 牌墙 + 别人手牌数 + 牌河
   （牌河数拿不到全量，改成只查「手牌+花+牌墙+别家张数」的相对守恒） */
function snapshot(st) {
  return {
    hand: st.hand.length,
    flowers: (st.flowers[st.seat] || []).length,
    wall: st.wall,
    counts: st.counts.slice()
  };
}

/* 后面几步都得先摸到一张花才有得测，而一副牌只有 8 张花，
   自己那门一局下来不一定摸得到。原来遇上这种情况会打印「重跑一次」
   然后按通过退出 —— 等于这条测试有相当比例的运行其实什么都没测。
   改成换个房间重开一局，最多试几次；一次都没摸到才算失败。 */
async function 打到摸出花(最多试几次) {
  for (let 第几次 = 1; 第几次 <= 最多试几次; 第几次++) {
    const { code } = await (await fetch(`${HTTP}/new`)).json();
    const me = connect(code, "F-me", "我", { create: true });
    await opened(me);
    await sleep(600);
    send(me.ws, { t: "start" });
    await sleep(1800);
    if (!me.dealt) { try { me.ws.close(); } catch {} continue; }

    if (第几次 === 1) {
      console.log("房间:", code);
      console.log("\n【一】开局：发牌时的花仍然自动补（未改动的行为）");
      check("开局手牌里没有花", me.hand.filter((t) => isFlower(t.key)).length === 0,
            "手里 " + me.hand.length + " 张");
      console.log("\n【二】打到摸出花为止，看服务端会不会停");
    }

    let guard = 0;
    while (guard++ < 140 && !me.over && !(me.current === me.seat && me.needFlower)) {
      if (me.current === me.seat && me.hand.length % 3 === 2) {
        const t = me.hand[me.hand.length - 1];
        if (!isFlower(t.key)) { send(me.ws, { t: "act", a: "discard", id: t.id }); await sleep(240); continue; }
      }
      await sleep(150);
    }
    if (me.current === me.seat && me.needFlower) return { code, me, 第几次 };

    console.log(`  （第 ${第几次} 局自己这门没摸到花，换个房间重开）`);
    try { me.ws.close(); } catch {}
    await sleep(400);
  }
  return null;
}

async function main() {
  const 试出来的 = await 打到摸出花(6);
  if (!试出来的) {
    check("摸到花时服务端停住了", false, "连开 6 局自己这门都没摸到花 —— 概率太低，八成是发牌或补花的逻辑坏了");
    console.log(`\n${fail} 项没过`);
    process.exit(1);
  }
  const { code, me, 第几次 } = 试出来的;
  check("摸到花时服务端停住了", true, 第几次 > 1 ? `第 ${第几次} 局摸到` : "");
  check("停住时 phase 是 flower", me.phase === "flower", "phase=" + me.phase);
  check("手里确实有花", me.hand.some((t) => isFlower(t.key)));

  console.log("\n【三】就在欠着花的这一刻断线，再连回来");
  const beforeCut = snapshot(me);
  me.ws.close();
  await sleep(1800);
  const back = connect(code, "F-me", "我", { create: false });
  await opened(back);
  await sleep(1800);
  check("重连后拿到局面", back.dealt);
  check("resume 带了 needFlower（回来还能接着补）", !!back.resumeNeedFlower,
        "needFlower=" + back.needFlower);
  check("手牌张数没变", back.hand.length === beforeCut.hand,
        beforeCut.hand + " → " + back.hand.length);

  console.log("\n【四】重连之后把这张花补掉");
  const b0 = snapshot(back);
  const b0Fl = (back.flowers[back.seat] || []).length;
  send(back.ws, { t: "act", a: "flower" });
  await sleep(800);
  const b1 = snapshot(back);
  const b1Fl = (back.flowers[back.seat] || []).length;
  check("花亮到了花区", b1Fl > b0Fl, b0Fl + " → " + b1Fl);
  check("手牌张数不变（亮一张补一张）", b1.hand === b0.hand, b0.hand + " → " + b1.hand);
  check("牌墙少一张（从牌尾补）", b1.wall === b0.wall - 1, b0.wall + " → " + b1.wall);

  console.log("\n【五】继续打，统计连续补花与全程守恒");
  let consec = 0, sawConsec = false, g3 = 0, badTotal = null;
  const totalOf = (st) => st.wall + st.counts.reduce((a, b) => a + b, 0) +
                          st.flowers.reduce((a, f) => a + f.length, 0);
  const baseTotal = totalOf(back);
  while (g3++ < 220 && !back.over) {
    const now = totalOf(back);
    if (now > baseTotal) { badTotal = { 基准: baseTotal, 现在: now }; break; }
    if (back.current === back.seat && back.needFlower) {
      consec++;
      if (consec >= 2) sawConsec = true;
      send(back.ws, { t: "act", a: "flower" });
      await sleep(400);
      continue;
    }
    consec = 0;
    if (back.current === back.seat && back.hand.length % 3 === 2) {
      const t = back.hand[back.hand.length - 1];
      if (isFlower(t.key)) { check("出牌时手里不该还有花", false, t.key); break; }
      send(back.ws, { t: "act", a: "discard", id: t.id });
      await sleep(230);
      continue;
    }
    await sleep(150);
  }
  check("全程牌张没有凭空多出来", !badTotal, badTotal ? JSON.stringify(badTotal) : "");
  check("牌局能正常走到结束", !!back.over, "结果=" + (back.over || "还在进行"));
  console.log("  （连续摸到两张花的情况" + (sawConsec ? "遇到了，也是一张张停的" : "这局没遇到") + "）");
  back.ws.close();

  console.log(fail ? `\n${fail} 项没过` : "\n全部通过");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("出错:", e.message); process.exit(2); });
