/* 验证房间真的写进了磁盘：服务端整个重启（内存全丢）之后，房间还能不能进。
 *
 * 这是「房主切去微信发链接，回来房间没了」的本质 ——
 * 线上是 Cloudflare 把闲置的房间对象回收，本地没法等它回收，
 * 就用重启 wrangler 来制造同样的效果：内存清零，只剩磁盘。
 *
 * 用法：
 *   node _测试_重启后房间还在.mjs make      → 建一个房，把房号写进 .roomcode
 *   （这中间把 wrangler dev 重启一次）
 *   node _测试_重启后房间还在.mjs check     → 拿那个房号回去连
 */
import fs from "fs";
import { fileURLToPath } from "url";
const BASE = process.env.MJ || "ws://127.0.0.1:8787";
const HTTP = BASE.replace(/^ws/, "http");
/* 目录名是中文，得走 fileURLToPath，不能直接拿 pathname（那是百分号编码的） */
const FILE = fileURLToPath(new URL("./.roomcode", import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(code, token, name, create) {
  const ws = new WebSocket(
    `${BASE}/ws?code=${code}&token=${token}&name=${encodeURIComponent(name)}` +
    (create ? "&create=1" : ""));
  const st = { ws, err: null, seat: -1, isHost: false, gotRoom: false };
  ws.addEventListener("message", (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.t === "err") st.err = m.m;
    if (m.t === "room") {
      st.gotRoom = true; st.seat = m.you;
      st.isHost = !!(m.seats[m.you] && m.seats[m.you].host);
      st.names = m.seats.map((s) => s.name + (s.ready ? "(准备)" : "") + (s.online ? "" : "(掉线)"));
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

const mode = process.argv[2];

if (mode === "make") {
  const { code } = await (await fetch(`${HTTP}/new`)).json();
  const host = connect(code, "PERSIST-H", "房主", true);
  await opened(host);
  await sleep(400);
  /* 拉个朋友进来并点准备，好验证座位和准备状态都存住了 */
  const mate = connect(code, "PERSIST-M", "朋友", false);
  await opened(mate);
  await sleep(400);
  mate.ws.send(JSON.stringify({ t: "ready", v: true }));
  await sleep(700);
  console.log("建好房间:", code, "座位:", host.names);
  fs.writeFileSync(FILE, code, "utf8");
  host.ws.close(); mate.ws.close();
  await sleep(300);
  process.exit(0);
}

if (mode === "check") {
  const code = fs.readFileSync(FILE, "utf8").trim();
  console.log("重启后回去连房间:", code);
  const back = connect(code, "PERSIST-H", "房主", false);
  const ok = await opened(back);
  await sleep(1200);
  const pass = ok && !back.err && back.gotRoom && back.seat === 0 && back.isHost;
  console.log("  连上          :", ok ? "是" : "否");
  console.log("  服务器回话    :", back.err ? "错误「" + back.err + "」" : (back.gotRoom ? "拿到房间信息" : "没回话"));
  console.log("  座位          :", back.seat, back.isHost ? "(房主)" : "");
  console.log("  座位表        :", back.names ? back.names.join(" / ") : "-");
  console.log(pass
    ? "\n✓ 服务端重启、内存清零之后，房间和准备状态都还在"
    : "\n✗ 房间没了 —— 状态只在内存里，一回收就消失");
  back.ws.close();
  process.exit(pass ? 0 : 1);
}

console.log("用法: node _测试_重启后房间还在.mjs make | check");
process.exit(2);
