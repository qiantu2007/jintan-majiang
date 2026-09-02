/* 金坛麻将 · 构建
 *
 *   node 构建.mjs
 *
 * 把 src/ 下的五个模块拼回单文件 index.html，顺手做三件以前靠手动的事：
 *   1. 版本号只写在 src/app.js 里，sw.js 的缓存名和 version.json 由这里生成；
 *   2. 生成完自动同步到 _上传这个文件夹，两份不可能再对不上；
 *   3. 拼装前检查每个模块能不能被 Node 解析，语法错当场报，不用等浏览器白屏。
 *
 * 为什么是「拼回单文件」而不是让浏览器直接 import：
 * 单文件不需要服务器就能双击打开，PWA 缓存也只用管一个文件；
 * 而 src/ 里是真 ESM，服务端和测试可以直接 import，两边不冲突。
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
const OUT_DIR = join(ROOT, "_上传这个文件夹");

/* 顺序有讲究，改之前先看懂这两条：
   1. rules 必须最先 —— KEYS34 是在加载时用循环填出来的。
   2. app 必须最后 —— 结尾那段事件绑定和启动代码要等前面全部声明完。
   中间这几个的相对顺序也不能乱：pages / net / table 里各有几句顶层的
   addEventListener，同一个元素上谁先绑谁先跑，这个顺序和拆分前是一致的。 */
const MODULES = [
  "rules.js", "score.js", "ai.js", "tiles.js",
  "feedback.js", "store.js", "pages.js", "net.js", "table.js", "flow.js",
  "app.js"
];

/* 部署要带上的文件。index.html 是构建产物，其余是原样拷。 */
const DEPLOY = [
  "index.html", "sw.js", "manifest.webmanifest", "version.json",
  "icon-192.png", "icon-512.png", "apple-touch-icon.png", "语音包.json"
];

const read = (p) => readFileSync(p, "utf8");
const write = (p, s) => writeFileSync(p, s, "utf8");

/* ── 把 ESM 的壳剥掉 ───────────────────────────────────────────
   src/ 里的模块是真 ESM（Node 和 wrangler 直接 import 它们）。
   拼进同一个 IIFE 时所有名字本来就在一个作用域里，import/export 就多余了。 */
function stripModuleSyntax(text, name) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let skipping = false;

  for (const line of lines) {
    if (skipping) {                       /* 跨行的 import 列表 */
      if (/;\s*$/.test(line)) skipping = false;
      continue;
    }
    if (/^\s*import[\s{]/.test(line)) {
      if (!/;\s*$/.test(line)) skipping = true;
      continue;
    }
    out.push(line.replace(/^(\s*)export\s+/, "$1"));
  }

  const body = out.join("\r\n");
  const leak = body.match(/^\s*(?:import|export)\b.*/m);
  if (leak) throw new Error(`${name}: 还残留模块语法 → ${leak[0].trim()}`);
  return body;
}

/* ── 拿版本号 ──────────────────────────────────────────────── */
const appSrc = read(join(SRC, "app.js"));
const mv = appSrc.match(/var VERSION\s*=\s*"([^"]+)"/);
if (!mv) throw new Error("src/app.js 里找不到 VERSION");
const VERSION = mv[1];
const CACHE_NAME = "jintan-mj-v" + VERSION.replace(/\./g, "");

/* ── 拼装 ──────────────────────────────────────────────────── */
const pieces = [];
for (const m of MODULES) {
  const p = join(SRC, m);
  if (!existsSync(p)) throw new Error(`缺少 src/${m}`);
  pieces.push(`  /* ───────── ${m} ───────── */`);
  pieces.push(stripModuleSyntax(read(p), m));
  pieces.push("");
}

const tpl = read(join(SRC, "模板.html"));
if (!tpl.includes("/*@@BUNDLE@@*/")) throw new Error("src/模板.html 里没有 /*@@BUNDLE@@*/ 占位");
const html = tpl.replace("/*@@BUNDLE@@*/", pieces.join("\r\n"));

/* --检查：只比对，不写盘。用来挡住「改了 src/ 忘了重新构建就部署」。 */
const 只检查 = process.argv.includes("--检查") || process.argv.includes("--check");
if (只检查) {
  const 现有 = existsSync(join(ROOT, "index.html")) ? read(join(ROOT, "index.html")) : "";
  if (现有 === html) {
    console.log(`index.html 是最新的（v${VERSION}）`);
    process.exit(0);
  }
  console.error("index.html 和 src/ 对不上了 —— 跑一次 `node 构建.mjs`");
  process.exit(1);
}

write(join(ROOT, "index.html"), html);

/* ── 版本号只有一个源头，另外两处由这里派生 ───────────────── */
write(join(ROOT, "version.json"), `{ "version": "${VERSION}" }\r\n`);

const swPath = join(ROOT, "sw.js");
const sw = read(swPath);
const swNew = sw.replace(/var CACHE = "[^"]*";/, `var CACHE = "${CACHE_NAME}";`);
if (swNew === sw && !sw.includes(CACHE_NAME)) throw new Error("sw.js 里没找到 CACHE 声明");
write(swPath, swNew);

/* ── 同步到上传目录 ───────────────────────────────────────── */
let copied = 0;
for (const f of DEPLOY) {
  const from = join(ROOT, f);
  if (!existsSync(from)) { console.warn(`  ! 跳过（不存在）: ${f}`); continue; }
  copyFileSync(from, join(OUT_DIR, f));
  copied++;
}

/* ── 报告 ─────────────────────────────────────────────────── */
const kb = (n) => (n / 1024).toFixed(1) + " KB";
const sha = createHash("sha256").update(html).digest("hex").slice(0, 12);
const lines = html.split("\n").length;

console.log(`构建完成  v${VERSION}`);
console.log(`  index.html   ${kb(Buffer.byteLength(html))}  ${lines} 行  sha ${sha}`);
console.log(`  sw.js 缓存名 ${CACHE_NAME}`);
console.log(`  已同步 ${copied} 个文件到 _上传这个文件夹`);
