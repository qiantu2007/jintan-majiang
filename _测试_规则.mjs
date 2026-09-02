/* 规则 / 算番 / AI 的测试。
 *
 *   node _测试_规则.mjs
 *
 * 跟 _服务端 里那几个测试不一样的地方：那些测试是把 index.html 的逻辑
 * 「抄一份」出来跑，抄的那份和真代码会各走各的；这个测试直接 import
 * src/ 下的真文件，跟浏览器和服务端跑的是同一份代码。改坏了它一定红。
 *
 * 用例大部分是从 index.html 的 selfTest() 搬过来的（那个只在浏览器里跑，
 * 而且要开着控制台才看得到结果）。这里还多测了几条 selfTest 覆盖不到的：
 * 牌墙守恒、洗牌不丢牌、服务端和客户端判胡是不是同一个答案。
 */

import { KEYS34, handKeys, isQiDui, makeWall, shuffle, canWinShape, countKey } from "./src/rules.js";
import { analyzeWin, canWinHand, waitingTiles, setScoreOpts } from "./src/score.js";
import { setAiView, aiChooseDiscard, shantenOf, ukeireOf, isolateScore } from "./src/ai.js";
import { counts34 } from "./src/rules.js";

setScoreOpts({ base: 10, flowerScore: 5, cap: 100 });

/* AI 要看牌局现状。测试里给一个确定的假现状，这样结果可复现。 */
setAiView({
  knownCount: () => 0,
  safeScore: () => 0,
  diff: () => ({ sloppy: 0, defend: 0, master: false })
});

let 通过 = 0;
const 失败 = [];
function ok(name, cond) { if (cond) 通过++; else 失败.push(name); }
function eq(name, got, want) {
  if (got === want) 通过++;
  else 失败.push(`${name}（得到 ${JSON.stringify(got)}，应为 ${JSON.stringify(want)}）`);
}

const P = (keys, melds) => ({
  hand: keys.map((k, i) => ({ id: i + 1, key: k })),
  melds: melds || [], flowers: [], guoShui: false, passed: [], name: "测"
});
const 有番 = (a, n) => a.ok && a.fans.some(f => f.name === n);

/* ══════════ 牌型判定 ══════════ */
{
  const p = P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","z1","z1"]);
  ok("标准鸡胡", canWinHand(p, null));

  const q = P(["m1","m1","m2","m2","m3","m3","m4","m4","s5","s5","p6","p6","z1","z1"]);
  ok("七对", canWinHand(q, null) && isQiDui(handKeys(q), 0));

  const q2 = P(["m1","m1","m1","m1","m2","m2","m3","m3","s5","s5","p6","p6","z1","z1"]);
  ok("七对四张算两对", isQiDui(handKeys(q2), 0));

  const peng = P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","z1","z1"],
                 [{ type: "peng", key: "z2", concealed: false }]);
  ok("副露后标准胡", canWinHand(peng, null));

  ok("差一张不算胡", !canWinHand(P(["m1","m2","m4","m5","m6","m7","m8","m9","s1","s2","s3","p1","p1","z3"]), null));

  const ting = P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","z1"]);
  eq("单钓将只听一张", waitingTiles(ting).length, 1);
  eq("听的是 z1", waitingTiles(ting)[0], "z1");
}

/* ══════════ 番种 ══════════ */
{
  const q7 = P(["m1","m1","m2","m2","m3","m3","m4","m4","m5","m5","m6","m6","m7","m7"]);
  const a = analyzeWin(q7, "m7", { selfDraw: true, addWin: false });
  ok("七对成立", 有番(a, "七对"));
  ok("七对不算对对胡", !有番(a, "对对胡"));
  ok("七对可叠加清一色", 有番(a, "清一色"));

  ok("对对胡", 有番(analyzeWin(P(["m1","m1","m1","m3","m3","m3","s5","s5","s5","p9","p9","p9","z1","z1"]),
      "z1", { selfDraw: true, addWin: false }), "对对胡"));
  ok("清一色", 有番(analyzeWin(P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","m1","m1","m1","m9","m9"]),
      "m9", { selfDraw: true, addWin: false }), "清一色"));
  ok("混一色", 有番(analyzeWin(P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","z1","z1","z1","z2","z2"]),
      "z2", { selfDraw: true, addWin: false }), "混一色"));

  const diao = P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s1","s1","z2"]);
  ok("独吊", analyzeWin(diao, "z2", { selfDraw: false, addWin: true }).diao);

  const gk = P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","p1","p1"]);
  ok("杠开加一番", 有番(analyzeWin(gk, "p1", { selfDraw: true, kongDraw: true, addWin: false }), "杠开"));
  ok("抢杠不加杠开", !有番(analyzeWin(gk, "p1", { robKong: true, selfDraw: true, addWin: false }), "杠开"));
}

/* ══════════ 一花起胡 / 过水 ══════════ */
{
  const 鸡 = P(["m1","m2","m4","m5","m6","m7","m8","m9","s1","s2","s3","p1","p1"]);
  eq("无花无番不能点炮", analyzeWin(鸡, "m3", { selfDraw: false, addWin: true }).blocked, "nofan");

  const 鸡14 = P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","p1","p1"]);
  const a = analyzeWin(鸡14, "m3", { selfDraw: true, addWin: false });
  ok("无花无番可自摸", a.ok && a.fan === 0);

  鸡.guoShui = true;
  鸡.flowers = [{ id: 99, key: "f1" }];
  eq("过水不能胡", analyzeWin(鸡, "m3", { selfDraw: false, addWin: true }).blocked, "guoshui");

  /* 出牌只锁自己打过的那张，不锁全部 */
  const seq = P(["m1","m2","s4","s5","s6","p7","p8","p9","z1","z1","z1","z5","z5"]);
  seq.passed = ["p2"];
  ok("打过别的牌不挡点炮胡", analyzeWin(seq, "m3", { selfDraw: false, addWin: true }).ok);
  seq.passed = ["m3"];
  eq("不能胡自己打过的那张", analyzeWin(seq, "m3", { selfDraw: false, addWin: true }).blocked, "guoshui");

  const diao = P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s1","s1","z2"]);
  diao.guoShui = true;
  diao.flowers = [{ id: 1, key: "f1" }];
  ok("独吊可过水胡", analyzeWin(diao, "z2", { selfDraw: false, addWin: true }).ok);
}

/* ══════════ 花数（金坛特色：字牌刻子算花，数牌不算）══════════ */
{
  const 暗 = analyzeWin(P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","p1","p1","z1","z1","z1"]),
                       "z1", { selfDraw: true, addWin: false });
  ok("字牌暗刻 2 花", 暗.ok && 暗.flowerItems.some(x => x.name.includes("暗刻") && x.n === 2));

  const 明 = analyzeWin(P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","p1","p1","z1","z1"]),
                       "z1", { selfDraw: false, addWin: true });
  ok("点炮字刻算明刻", 明.ok && 明.flowerItems.some(x => x.name.includes("明刻")));

  const 暗杠 = analyzeWin(P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","z1","z1"],
                          [{ type: "gang", key: "z5", concealed: true }]), null, { selfDraw: true, addWin: false });
  ok("字牌暗杠 4 花", 暗杠.ok && 暗杠.flowers >= 4);

  const 明杠 = analyzeWin(P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s2","s2"],
                          [{ type: "gang", key: "p1", concealed: false }]), null, { selfDraw: true, addWin: false });
  eq("数牌明杠 1 花", 明杠.flowers, 1);

  const 数刻 = analyzeWin(P(["m1","m1","m1","m4","m5","m6","m7","m8","m9","s1","s2","s3","p2","p2"]),
                        "p2", { selfDraw: true, addWin: false });
  eq("数牌刻子不计花", 数刻.flowers, 0);
}

/* ══════════ 计分公式 ══════════ */
{
  setScoreOpts({ base: 10, flowerScore: 5, cap: 100 });
  const a = analyzeWin(P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","m1","m1","m1","m9","m9"]),
                       "m9", { selfDraw: true, addWin: false });
  /* 清一色 2 番 + 独吊 1 番 = 3 番，(10 + 0×5) × 2³ = 80，没到封顶 */
  eq("清一色独吊 3 番", a.fan, 3);
  eq("分数 80", a.score, 80);

  setScoreOpts({ base: 10, flowerScore: 5, cap: 50 });
  const b = analyzeWin(P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","m1","m1","m1","m9","m9"]),
                       "m9", { selfDraw: true, addWin: false });
  eq("封顶生效", b.score, 50);
  ok("封顶说明写进公式", b.formula.includes("封顶"));
  setScoreOpts({ base: 10, flowerScore: 5, cap: 100 });
}

/* ══════════ 牌墙 ══════════ */
{
  const w = makeWall();
  eq("一副牌 144 张", w.length, 144);
  eq("牌 id 不重复", new Set(w.map(t => t.id)).size, 144);
  eq("花牌 8 张", w.filter(t => t.key[0] === "f").length, 8);
  ok("每种数牌字牌各 4 张", KEYS34.every(k => countKey(w.map(t => t.key), k) === 4));

  let n = 1000;
  const w2 = makeWall(() => n++);
  eq("id 分配器生效", w2[0].id, 1000);

  const before = makeWall().map(t => t.id).sort((a, b) => a - b).join();
  const after = shuffle(makeWall()).map(t => t.id).sort((a, b) => a - b).join();
  eq("洗牌不丢牌", after, before);

  /* 洗牌得真洗动。同一副牌洗 5 次，不该次次原样 */
  const 原序 = makeWall().map(t => t.key).join();
  let 动过 = false;
  for (let i = 0; i < 5; i++) if (shuffle(makeWall()).map(t => t.key).join() !== 原序) 动过 = true;
  ok("洗牌确实打乱了", 动过);

  /* 服务端传自己的随机源进来，也得洗得动 */
  let seed = 12345;
  const 假随机 = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  ok("可注入随机源", shuffle(makeWall(), 假随机).map(t => t.key).join() !== 原序);
}

/* ══════════ 服务端和客户端必须给同一个答案 ══════════
   canWinShape 是服务端仲裁「要不要给他弹胡」用的，canWinHand 是客户端
   算番前的门槛。以前两处各写一份，理论上可能不一致。现在后者就是前者
   的包装，这里再钉一遍，防止以后有人把包装改歪。 */
{
  const 样本 = [
    [["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","z1","z1"], 0, true],
    [["m1","m1","m2","m2","m3","m3","m4","m4","s5","s5","p6","p6","z1","z1"], 0, true],
    [["m1","m2","m4","m5","m6","m7","m8","m9","s1","s2","s3","p1","p1","z3"], 0, false],
    [["m1","m2","m3","m4","m5","m6","m7","m8","m9","z1","z1"], 1, true],
    [["m1","m2","m3","m4","m5","m6","m7","m8","s1","z1","z1"], 1, false],
    [["f1","m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","z1","z1"], 0, true]
  ];
  let 一致 = true;
  for (const [keys, nMelds, want] of 样本) {
    const 服务端 = canWinShape(keys, nMelds);
    const 客户端 = canWinHand(P(keys, Array(nMelds).fill({ type: "peng", key: "z7" })), null);
    if (服务端 !== want || 客户端 !== want) 一致 = false;
  }
  ok("服务端与客户端判胡一致", 一致);
}

/* ══════════ AI ══════════ */
{
  const 听牌 = ["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","z1"];
  eq("听牌向听为 0", shantenOf(counts34(听牌), 0), 0);
  eq("和了向听为 -1", shantenOf(counts34(听牌.concat(["z1"])), 0), -1);

  const 散牌 = ["m1","m3","m5","m7","m9","s2","s4","s6","s8","p1","p3","p5","z1"];
  ok("散牌向听更大", shantenOf(counts34(散牌), 0) > 2);

  const u = ukeireOf(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","z1"], 0);
  eq("进张计算的向听", u.shanten, 0);

  ok("孤张字牌最该打", isolateScore("z4", ["z4","m1","m2","m3"]) > isolateScore("m2", ["z4","m1","m2","m3"]));

  const 手 = P(["m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","z4","z6"]);
  const 打 = aiChooseDiscard(手);
  ok("AI 会打孤张字牌", 打 && ["z4","z6"].includes(打.key));
  ok("AI 不会打花牌", aiChooseDiscard(P(["f1","m1","m2","m3","m4","m5","m6","m7","m8","m9","s1","s2","s3","z4"])).key !== "f1");
}

/* ══════════ 报告 ══════════ */
console.log(`\n规则测试：${通过} 条通过，${失败.length} 条失败`);
if (失败.length) {
  for (const f of 失败) console.log("  ✗ " + f);
  process.exit(1);
}
console.log("全部通过\n");
