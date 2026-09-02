/* 三个真实抱怨，逐个复现：
 *
 *  甲) 房主复制链接、切去微信发给朋友，回来房间没了
 *      —— 房间状态以前只在内存里，屋里没人服务器就把它回收了。
 *
 *  乙) 大家都准备了，房主还显示「还有 1 人没准备」，开不了局
 *      —— 有人掉过线，座位被收回、准备状态清零，他自己界面上却还是「已准备」。
 *
 *  丙) 掉线的人回来，座位和房主身份还在不在
 *      —— 以前 token 被清空，回来是个陌生新座位，房主更是直接失去房主身份。
 *
 * 跑法：先 npx wrangler dev --port 8787 --local，再 node _测试_房间稳定性.mjs
 */
const BASE = process.env.MJ || "ws://127.0.0.1:8787";
const HTTP = BASE.replace(/^ws/, "http");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };

function connect(code, token, name, opts = {}) {
  const url = `${BASE}/ws?code=${code}&token=${token}&name=${encodeURIComponent(name)}` +
              (opts.create ? "&create=1" : "");
  const ws = new WebSocket(url);
  const st = { ws, name, seat: -1, seats: null, started: false, err: null, closed: 0, opens: 0 };
  ws.addEventListener("open", () => st.opens++);
  ws.addEventListener("close", () => st.closed++);
  ws.addEventListener("message", (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.t === "err") st.err = m.m;
    if (m.t === "room") {
      st.seat = m.you; st.seats = m.seats; st.started = m.started;
      st.isHost = !!(m.seats[m.you] && m.seats[m.you].host);
    }
    if (m.t === "deal") st.dealt = true;
  });
  return st;
}
const opened = (st) => new Promise((res) => {
  if (st.ws.readyState === 1) return res(true);
  st.ws.addEventListener("open", () => res(true));
  st.ws.addEventListener("close", () => res(false));
  setTimeout(() => res(false), 8000);
});

let fail = 0;
const check = (name, ok, extra) => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${extra ? "  （" + extra + "）" : ""}`);
  if (!ok) fail++;
};

/* ── 甲：房主开完房就走开，隔一会儿回来 ── */
async function caseHostAway() {
  console.log("【甲】房主开房后切去别的 app，房间还在不在");
  const { code } = await (await fetch(`${HTTP}/new`)).json();
  const host = connect(code, "H1", "房主", { create: true });
  await opened(host);
  await sleep(500);
  check("房间开出来了", host.seat === 0 && host.isHost);

  /* 屋里一个人都没有 —— 正是切去微信的那个状态 */
  host.ws.close();
  console.log("  房主走了，屋里空了，等 8 秒…");
  await sleep(8000);

  const back = connect(code, "H1", "房主");
  const ok = await opened(back);
  await sleep(900);
  check("回来还能进这个房间", ok && !back.err, back.err || "");
  check("还是 0 号座", back.seat === 0);
  check("房主身份还在", !!back.isHost);
  back.ws.close();
  await sleep(300);
}

/* ── 乙：都准备好了能不能开 ── */
async function caseReady() {
  console.log("\n【乙】有人掉线又回来，准备状态还对不对");
  const { code } = await (await fetch(`${HTTP}/new`)).json();
  const host = connect(code, "H2", "房主", { create: true });
  await opened(host); await sleep(400);
  const mate = connect(code, "M2", "朋友");
  await opened(mate); await sleep(500);

  send(mate.ws, { t: "ready", v: true });
  await sleep(600);
  const readyBefore = host.seats[1].ready;
  check("朋友点了准备，房主看到了", readyBefore === true);

  /* 朋友掉线一下再回来 —— 就是手机锁屏那种 */
  mate.ws.close();
  await sleep(1500);
  const mate2 = connect(code, "M2", "朋友");
  await opened(mate2); await sleep(900);

  check("回来还是 1 号座", mate2.seat === 1, "座位号 " + mate2.seat);
  check("准备状态没被清掉", !!(host.seats[1] && host.seats[1].ready),
        "房主看到的 ready=" + (host.seats[1] && host.seats[1].ready));
  check("座位没被换成电脑", !(host.seats[1] && host.seats[1].ai));

  /* 房主现在应该开得了局 */
  send(host.ws, { t: "start" });
  await sleep(1500);
  check("房主能开始游戏", host.started === true, host.err || "");
  host.ws.close(); mate2.ws.close();
  await sleep(300);
}

/* ── 丙：有人一直没回来，房主还开不开得了 ── */
async function caseOfflineNoBlock() {
  console.log("\n【丙】有人掉线没回来，房主能不能开局");
  const { code } = await (await fetch(`${HTTP}/new`)).json();
  const host = connect(code, "H3", "房主", { create: true });
  await opened(host); await sleep(400);
  const mate = connect(code, "M3", "朋友");
  await opened(mate); await sleep(500);
  /* 朋友没点准备就掉线了 */
  mate.ws.close();
  await sleep(1200);
  check("房主看到朋友掉线了", !!(host.seats[1] && host.seats[1].online === false));

  send(host.ws, { t: "start" });
  await sleep(1500);
  check("掉线的人不拦着开局", host.started === true, host.err ? "被拦下了：" + host.err : "");
  host.ws.close();
  await sleep(300);
}

(async () => {
  await caseHostAway();
  await caseReady();
  await caseOfflineNoBlock();
  console.log(fail ? `\n${fail} 项没过` : "\n三项全过");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("出错:", e.message); process.exit(2); });
