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

/* 一律按 LF 读、按 LF 写。
   .gitattributes 里写了 eol=lf，所以新 clone 出来的工作区是 LF，
   而这台机器上的老文件是 CRLF。不统一的话，同一份 src/ 在两边会构建出
   字节不同的 index.html，`--检查` 一 clone 就红 —— 实测过。
   浏览器不在乎行尾，统一成 LF 最省事。 */
const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const write = (p, s) => writeFileSync(p, s.replace(/\r\n/g, "\n"), "utf8");

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

  const body = out.join("\n");
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
const html = tpl.replace("/*@@BUNDLE@@*/", pieces.join("\n"));

/* --检查：只比对，一个字都不写。用来挡住「改了 src/ 忘了重新构建就部署」。 */
const 只检查 = process.argv.includes("--检查") || process.argv.includes("--check");
const 不同步的 = [];
const 派生 = [];

/* 版本号只有一个源头：src/app.js 的 VERSION。下面每一处都是从它派生的，
   别手动改。替换不到目标行就直接报错停下 —— 这个项目吃过太多次
   「改一处漏一处」的亏，宁可当场炸也不要默默漏掉一处。 */
function 同步(相对路径, 正则, 新内容, 说明) {
  const p = join(ROOT, ...相对路径.split("/"));
  if (!existsSync(p)) throw new Error(`找不到 ${相对路径}`);
  const 原文 = read(p);
  if (!正则.test(原文)) throw new Error(`${相对路径} 里找不到要同步的那一行（${说明}）`);
  const 新文 = 原文.replace(正则, 新内容);
  if (新文 === 原文) { 派生.push(`${相对路径} · ${说明}`); return; }
  if (只检查) 不同步的.push(`${相对路径} · ${说明}`);
  else write(p, 新文);
  派生.push(`${相对路径} · ${说明}`);
}

同步("version.json", /"version":\s*"[^"]*"/, `"version": "${VERSION}"`, "版本");
同步("sw.js", /var CACHE = "[^"]*";/, `var CACHE = "${CACHE_NAME}";`, "缓存名");
同步("package.json", /"version":\s*"[^"]*"/, `"version": "${VERSION}"`, "版本");
/* 服务端也带上版本：部署完在手机上打开 https://…/health 就能看出线上是哪一版，
   不用进游戏翻设置页。两个服务端文件夹要一起部署，否则这个数字会骗人。 */
同步("_服务端/worker.js", /const VERSION = "[^"]*";/, `const VERSION = "${VERSION}";`, "版本");
同步("_服务端Pages/public/_worker.js", /const VERSION = "[^"]*";/, `const VERSION = "${VERSION}";`, "版本");

if (只检查) {
  const 现有 = existsSync(join(ROOT, "index.html")) ? read(join(ROOT, "index.html")) : "";
  if (现有 !== html) 不同步的.unshift("index.html · 和 src/ 对不上");
  /* 上传目录里的那份也得和根目录一致，否则部署出去的是旧的 */
  for (const f of DEPLOY) {
    const a = join(ROOT, f), b = join(OUT_DIR, f);
    if (!existsSync(a)) continue;
    if (!existsSync(b) || read(b) !== read(a)) 不同步的.push(`_上传这个文件夹/${f} · 落后于根目录`);
  }
  if (!不同步的.length) {
    console.log(`全部是最新的（v${VERSION}）`);
    process.exit(0);
  }
  console.error("下面这些和 src/ 对不上，跑一次 `node 构建.mjs`：");
  for (const x of 不同步的) console.error("  · " + x);
  process.exit(1);
}

write(join(ROOT, "index.html"), html);

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
console.log(`  版本号已写进 ${派生.length} 处：`);
for (const x of 派生) console.log(`    · ${x}`);
console.log(`  已拷 ${copied} 个文件到 _上传这个文件夹`);
