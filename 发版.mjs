/* 金坛麻将 · 发版
 *
 *   node 发版.mjs "这次改了什么"
 *
 * 把以前那一串手工动作合成一条命令：
 *   构建 → 自检 → 本地测试 → 提交 → 推 GitHub → 等 Pages 生效 → 核对线上版本号
 *
 * 以前是：手动构建、手动把 8 个文件拖到 GitHub 网页上、然后凭感觉相信它成了。
 * 漏传一个文件不会有任何提示，线上是新是旧也看不出来。现在这两件事都由
 * 这个脚本兜住：漏传不可能（git 推的是整个仓库），成没成看最后那张核对表。
 *
 * 服务端不在这条流程里 —— 它部署在 Cloudflare，改了 _服务端/ 要另外跑
 * wrangler，而且要先于网页。详见 README 的「部署」一节。
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const 网页 = "https://qiantu2007.github.io/jintan-majiang";
const 服务端 = "https://jintan-mj.pages.dev";

const 说明 = process.argv.slice(2).join(" ").trim();

function 跑(命令, 参数, 静默) {
  const r = spawnSync(命令, 参数, { cwd: ROOT, encoding: "utf8" });
  if (!静默 && r.stdout) process.stdout.write(r.stdout);
  if (r.status !== 0) {
    if (静默 && r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
  }
  return r;
}
const git = (...a) => 跑("git", a, true);

function 停(理由) { console.error("\n✗ " + 理由 + "\n"); process.exit(1); }

/* ── 1. 构建 ────────────────────────────────────────────────── */
console.log("【1/5】构建");
if (跑(process.execPath, ["构建.mjs"]).status !== 0) 停("构建失败");

/* ── 2. 本地测试 ────────────────────────────────────────────── */
console.log("\n【2/5】本地测试");
const t = 跑(process.execPath, ["_测试_全部.mjs"]);
if (t.status !== 0) 停("测试没过。先修好再发版 —— 装到别人手机上的东西不该带着红灯出门。");

/* ── 3. 提交 ────────────────────────────────────────────────── */
console.log("\n【3/5】提交");
const 有改动 = git("status", "--porcelain").stdout.trim().length > 0;
if (有改动) {
  if (!说明) 停('这次有改动，得说一句改了什么：\n\n    node 发版.mjs "把补花改成手动"');
  git("add", "-A");
  const c = git("commit", "-m", 说明);
  if (c.status !== 0) 停("提交失败：\n" + (c.stdout || "") + (c.stderr || ""));
  console.log("  已提交：" + 说明);
} else {
  console.log("  没有新改动，跳过提交");
}

/* ── 4. 推送 ────────────────────────────────────────────────── */
console.log("\n【4/5】推送到 GitHub");
const 本地 = git("rev-parse", "HEAD").stdout.trim();
const 远端前 = git("rev-parse", "origin/main").stdout.trim();
if (本地 === 远端前) {
  console.log("  远端已经是这一版，不用推");
} else {
  const p = git("push", "origin", "main");
  if (p.status !== 0) 停("推送失败：\n" + (p.stdout || "") + (p.stderr || ""));
  console.log("  已推送 " + 远端前.slice(0, 7) + " → " + 本地.slice(0, 7));
}

/* ── 5. 等 Pages 生效并核对 ─────────────────────────────────── */
const 版本 = JSON.parse(readFileSync(join(ROOT, "version.json"), "utf8")).version;
console.log(`\n【5/5】等 GitHub Pages 生效（目标 v${版本}，最多等 3 分钟）`);

const 抓 = async (u) => {
  try {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 15000);
    const r = await fetch(u + "?t=" + Date.now(), { cache: "no-store", signal: c.signal });
    clearTimeout(timer);
    return r.ok ? (await r.text()).trim() : null;
  } catch { return null; }
};

let 线上 = null;
const 截止 = Date.now() + 180000;
while (Date.now() < 截止) {
  const s = await 抓(网页 + "/version.json");
  if (s) {
    try { 线上 = JSON.parse(s).version; } catch { 线上 = s; }
    if (线上 === 版本) break;
  }
  process.stdout.write(".");
  await new Promise((r) => setTimeout(r, 6000));
}
console.log("");

const 健康 = await 抓(服务端 + "/health");
const 服务端版本 = (健康 || "").replace(/^ok\s*/, "") || "(没报版本号，说明是 1.19.0 之前的)";

console.log("\n──────── 核对 ────────");
console.log(`  网页   ${网页}`);
console.log(`         线上 ${线上 || "取不到"}   本地 ${版本}   ${线上 === 版本 ? "✓" : "✗"}`);
console.log(`  服务端 ${服务端}/health`);
console.log(`         线上 ${服务端版本}   本地 ${版本}   ${服务端版本 === 版本 ? "✓" : "✗ 需要另外部署，见 README"}`);

if (线上 !== 版本) {
  console.log("\n网页还没生效。GitHub Pages 有时要多等几分钟，过会儿再打开上面那个地址看看。");
  process.exit(1);
}
if (服务端版本 !== 版本) {
  console.log("\n网页好了，但服务端还是旧的。改过 _服务端/ 的话记得：");
  console.log('  cd "_服务端"; npx wrangler deploy');
  console.log('  cd "_服务端Pages"; npx wrangler pages deploy --branch production');
  process.exit(1);
}
console.log("\n两边都是 v" + 版本 + "，发版完成。手机上打开会自动提示更新。\n");
