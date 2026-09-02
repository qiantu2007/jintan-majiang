/* 客户端和服务端的消息约定有没有对上。
 *
 *   node _测试_协议.mjs
 *
 * 这个测试不跑代码，只读代码：把 _服务端/worker.js 和 src/net.js 里所有的
 * 消息类型字面量扫出来，和 src/protocol.js 登记的对一遍。
 *
 * 值得单独做一个测试，是因为这类错误是无声的 —— 服务端把 "drewn" 写成
 * "drawn"，客户端收到不认识就丢掉，牌局停住，没有任何报错，
 * 而且只有真的四个人连上打才会暴露。
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { 下行类型, 上行类型, 分发表之外 } from "./src/protocol.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const 服务端 = readFileSync(join(ROOT, "_服务端", "worker.js"), "utf8");
const 客户端 = readFileSync(join(ROOT, "src", "net.js"), "utf8");

/* 出站消息不只在 net.js 里发 —— rename 在 app.js、next 在 flow.js。
   所以整个 src/ 一起扫，但只认 netSend({t:"..."}) 这个形状，
   免得把别的对象里恰好叫 t 的字段也算进来。 */
const 全部客户端 = readdirSync(join(ROOT, "src"))
  .filter(f => f.endsWith(".js") && f !== "protocol.js")
  .map(f => readFileSync(join(ROOT, "src", f), "utf8"))
  .join("\n");

const 抓 = (文本, 正则) => [...new Set(
  [...文本.matchAll(正则)].map(m => m[1] || m[2]).filter(Boolean)
)].sort();

/* 服务端往外发的：send/broadcast/sendTo 里的 { t: "xxx" } */
const 服务端发 = 抓(服务端, /\bt:\s*"([a-zA-Z_]+)"/g);
/* 服务端认的：onMsg 里的 m.t === "xxx" */
const 服务端收 = 抓(服务端, /m\.t === "([a-zA-Z_]+)"/g);
/* 客户端发的（全 src 扫，限定 netSend）、收的（只在 net.js 分发） */
const 客户端发 = 抓(全部客户端, /netSend\(\{\s*t:\s*"([a-zA-Z_]+)"/g);
const 客户端收 = 抓(客户端, /m\.t === "([a-zA-Z_]+)"/g);

const 失败 = [];
const 差集 = (a, b) => a.filter(x => !b.includes(x));

function 检查(标题, 少了) {
  if (少了.length) 失败.push(`${标题}：${少了.join(", ")}`);
}

检查("服务端发了但客户端不认（牌局会无声停住）", 差集(服务端发, 客户端收));
检查("客户端等着但服务端从不发（这个分支是死代码）", 差集(客户端收, 服务端发));
检查("客户端发了但服务端不认（这个操作会石沉大海）", 差集(客户端发, 服务端收));
检查("服务端认但客户端从不发（这个分支是死代码）", 差集(服务端收, 客户端发));

检查("服务端发了但 protocol.js 没登记", 差集(服务端发, 下行类型));
检查("protocol.js 登记了但服务端从不发", 差集(下行类型, 服务端发));
检查("客户端发了但 protocol.js 没登记", 差集(客户端发, 上行类型));
检查("protocol.js 登记了但客户端从不发", 差集(上行类型, 客户端发));

/* netOnMsg 里每一种下行都得有分支（pong 除外，它在 onmessage 里就地处理） */
const 分发表 = 抓(客户端.slice(客户端.indexOf("function netOnMsg")), /m\.t === "([a-zA-Z_]+)"/g);
检查("下行类型在 netOnMsg 里没有分支", 差集(下行类型, [...分发表, ...分发表之外]));

/* 收到不认识的类型必须出声，不能静默丢弃 */
const 兜底 = /function netOnMsg[\s\S]*?console\.warn/.test(客户端);
if (!兜底) 失败.push("netOnMsg 没有兜底分支：不认识的消息会被静默丢掉，出了事查不到");

console.log(`\n协议核对`);
console.log(`  下行 ${服务端发.length} 种：${服务端发.join(", ")}`);
console.log(`  上行 ${客户端发.length} 种：${客户端发.join(", ")}`);
if (失败.length) {
  console.log("");
  for (const f of 失败) console.log("  ✗ " + f);
  console.log(`\n${失败.length} 项不一致\n`);
  process.exit(1);
}
console.log("\n两端一致，且都在 protocol.js 里登记过\n");
