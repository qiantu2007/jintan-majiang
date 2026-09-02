/* 复现「补花状态没清干净会把出牌按钮锁死」这个死结。
 *
 * 路径：欠着花 → 掉线 → 服务端 30 秒兜底替他补掉并出牌 → 他连回来
 * （resume 里 needFlower=false）→ 可 ui.flowerWait 还留着 true
 * → netRefreshBar() 第一行就 return → 这一局再也点不了出牌。
 *
 * 把 index.html 里相关的那几行抽出来单独跑，带修复/不带修复各跑一遍。
 * 跑法：node _测试_补花死结.mjs
 */

function makeBar(fixEnabled) {
  const ui = { flowerWait: null, flowerId: null };
  const game = { phase: "discard", current: 0, over: false };
  let actHTML = "";
  const setAct = (h) => { actHTML = h || ""; };

  /* —— 下面三段跟 index.html 里的实现一致 —— */
  function netRefreshBar() {
    if (ui.flowerWait || game.phase === "flower") { setAct(""); return; }
    if (game.over || game.current !== 0) { setAct(""); return; }
    setAct("<button>打出</button>");
  }
  function clearFlowerWait() {
    if (typeof ui.flowerWait === "function") { try { ui.flowerWait(); } catch (e) {} }
    ui.flowerWait = null; ui.flowerId = null;
  }
  function netAskFlower() { ui.flowerWait = true; ui.flowerId = 1; setAct(""); }
  function netResume(m) {
    game.phase = m.needFlower ? "flower" : "discard";
    if (fixEnabled) clearFlowerWait();        // ← 这一行就是修复
    game.current = 0; game.over = false;
    if (m.needFlower) { netAskFlower(); return; }
    netRefreshBar();
  }
  return { netAskFlower, netResume, act: () => actHTML };
}

function run(fixEnabled) {
  const s = makeBar(fixEnabled);
  s.netAskFlower();                     /* 1) 摸到花，弹「补花」，出牌按钮收起 */
  const atFlower = s.act();
  s.netResume({ needFlower: false });   /* 2) 掉线→兜底补掉→连回来，已经不欠花了 */
  const afterResume = s.act();
  return {
    补花时: atFlower || "(空)",
    重连后: afterResume || "(空)",
    还能出牌: afterResume.indexOf("打出") > -1
  };
}

const bad = run(false);
const good = run(true);

console.log("【不带修复】");
console.log("  补花时的操作栏 :", bad.补花时);
console.log("  重连后的操作栏 :", bad.重连后);
console.log("  还能出牌吗     :", bad.还能出牌 ? "能" : "不能 ← 这一局卡死了");
console.log("");
console.log("【带修复】");
console.log("  补花时的操作栏 :", good.补花时);
console.log("  重连后的操作栏 :", good.重连后);
console.log("  还能出牌吗     :", good.还能出牌 ? "能" : "不能");
console.log("");

const valid = !bad.还能出牌 && good.还能出牌;
console.log(valid
  ? "✓ 测试有效：不修就卡死，修了就正常"
  : "✗ 测试没能区分出来");
process.exit(valid ? 0 : 1);
