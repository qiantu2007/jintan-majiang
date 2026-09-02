/* 一条命令把能自动跑的都跑一遍。
 *
 *   node _测试_全部.mjs
 *
 * 联机那四个要先有服务端在 8787 上跑着。没有的话这里会跳过并告诉你怎么起，
 * 不会算失败 —— 大部分时候改的是界面和规则，没必要每次都开服务器。
 * 要连联机一起测：
 *
 *   npx wrangler dev --port 8787 --local     （在 _服务端 目录里，另开一个窗口）
 *   node _测试_全部.mjs
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));

const 本地 = [
  ["产物是不是最新的", ["构建.mjs", "--检查"], ROOT],
  ["联机消息约定",     ["_测试_协议.mjs"],      ROOT],
  ["规则 / 算番 / AI", ["_测试_规则.mjs"],      ROOT],
  ["补花死结（纯逻辑）", ["_测试_补花死结.mjs"], join(ROOT, "_服务端")]
];

const 联机 = [
  ["断线重连",     "_测试_断线重连.mjs"],
  ["叫牌时掉线",   "_测试_叫牌时掉线.mjs"],
  ["代算接手",     "_测试_代算接手.mjs"],
  ["手动补花",     "_测试_手动补花.mjs"],
  ["房间稳定性",   "_测试_房间稳定性.mjs"]
];

let 失败 = 0;

function 跑(标题, 参数, 目录) {
  process.stdout.write(`  ${标题.padEnd(20, "　")} `);
  const r = spawnSync(process.execPath, 参数, { cwd: 目录, encoding: "utf8" });
  if (r.status === 0) {
    /* 从输出里捞一句有信息量的当作摘要 */
    const 行 = (r.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    const 摘要 = 行.reverse().find(s => /通过|一致|最新|✓/.test(s)) || "通过";
    console.log("✓  " + 摘要.slice(0, 60));
  } else {
    失败++;
    console.log("✗");
    const 输出 = ((r.stdout || "") + (r.stderr || "")).split("\n")
      .filter(s => s.trim()).slice(-12);
    for (const l of 输出) console.log("       " + l);
  }
}

async function 服务端在跑吗() {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 2000);
    const r = await fetch("http://127.0.0.1:8787/health", { signal: c.signal });
    clearTimeout(t);
    return r.ok;
  } catch { return false; }
}

console.log("\n本地测试（不用起服务器）");
for (const [标题, 参数, 目录] of 本地) 跑(标题, 参数, 目录);

console.log("\n联机测试（要服务端在 8787）");
if (await 服务端在跑吗()) {
  for (const [标题, 文件] of 联机) 跑(标题, [文件], join(ROOT, "_服务端"));
} else {
  console.log("  跳过 —— 8787 上没有服务端。要跑的话另开一个窗口：");
  console.log("    cd _服务端");
  console.log("    npx wrangler dev --port 8787 --local");
}

if (失败) {
  console.log(`\n${失败} 项失败\n`);
  process.exit(1);
}
console.log("\n全部通过\n");
