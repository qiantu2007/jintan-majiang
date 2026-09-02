/* 金坛麻将 · 算番计分
 * 纯函数。番种、花数、封顶都在这里。
 * 分数上限等参数由 setScoreOpts 注入（传 settings 本体，后续改动自动生效）。
 * 由 拆分.py 从 index.html 抽出。改这里，然后跑 `node 构建.mjs`。 */

import { HONOR, FLOWER, KEYS34, isFlower, isHonor, countKey, sortKeys, handKeys,
         tileName, allStandardParses, isQiDui, suitPattern, canWinShape } from "./rules.js";

  var OPTS = { base: 10, flowerScore: 5, cap: 100 };
  export function setScoreOpts(o) { OPTS = o; }

  export function analyzeWin(p, winKey, flags) {
    flags = flags || {};
    var closed = handKeys(p).slice();
    if (winKey && flags.addWin !== false) closed.push(winKey);
    closed = sortKeys(closed.filter(function (k) { return !isFlower(k); }));
    var nExp = p.melds.length;
    var need = 4 - nExp;
    var candidates = [];
    var before = handKeys(p);

    if (isQiDui(closed, nExp)) {
      candidates.push({ kind: "qidui", pair: null, melds: [], winKey: winKey, diao: false });
    }
    var parses = allStandardParses(closed);
    for (var i = 0; i < parses.length; i++) {
      if (parses[i].melds.length !== need) continue;
      var diao = winKey && parses[i].pair === winKey;
      candidates.push({
        kind: "std", pair: parses[i].pair, melds: parses[i].melds,
        winKey: winKey, diao: diao
      });
    }
    if (!candidates.length) return { ok: false };

    var best = null;
    for (var c = 0; c < candidates.length; c++) {
      var an = scoreCandidate(p, candidates[c], before, flags);
      if (!best) best = an;
      else if (an.ok && !best.ok) best = an;
      else if (an.ok === best.ok && (an.raw > best.raw || (an.raw === best.raw && an.fan > best.fan))) best = an;
    }
    return best;
  }

  export function honorKeMing(p, keKey, winKey, flags, before) {
    if (flags.selfDraw || flags.robKong) return false;
    if (keKey !== winKey) return false;
    return countKey(before, winKey) < 3;
  }

  export function scoreCandidate(p, cand, before, flags) {
    var flowerItems = [];
    var flowers = 0;
    var i, m, k;
    for (i = 0; i < p.flowers.length; i++) {
      flowerItems.push({ name: "花牌" + FLOWER[p.flowers[i].key], n: 1 });
      flowers += 1;
    }
    for (i = 0; i < p.melds.length; i++) {
      m = p.melds[i];
      k = m.key;
      if (m.type === "peng") {
        if (isHonor(k)) { flowerItems.push({ name: "字牌明刻" + HONOR[k], n: 1 }); flowers += 1; }
      } else if (m.type === "gang") {
        if (isHonor(k)) {
          if (m.concealed) { flowerItems.push({ name: "字牌暗杠" + HONOR[k], n: 4 }); flowers += 4; }
          else { flowerItems.push({ name: "字牌明杠" + HONOR[k], n: 3 }); flowers += 3; }
        } else {
          if (m.concealed) { flowerItems.push({ name: tileName(k) + "暗杠", n: 2 }); flowers += 2; }
          else { flowerItems.push({ name: tileName(k) + "明杠", n: 1 }); flowers += 1; }
        }
      }
    }
    if (cand.kind === "std") {
      for (i = 0; i < cand.melds.length; i++) {
        m = cand.melds[i];
        if (m.t !== "ke" || !isHonor(m.key)) continue;
        var ming = honorKeMing(p, m.key, cand.winKey, flags, before);
        if (ming) { flowerItems.push({ name: "字牌明刻" + HONOR[m.key], n: 1 }); flowers += 1; }
        else { flowerItems.push({ name: "字牌暗刻" + HONOR[m.key], n: 2 }); flowers += 2; }
      }
    }

    var fans = [];
    var fan = 0;
    function addFan(name, n) { fans.push({ name: name, n: n }); fan += n; }

    var allKeys = handKeys(p).slice();
    if (cand.winKey && flags.addWin !== false) allKeys.push(cand.winKey);
    var pat = suitPattern(allKeys, p.melds);

    if (pat.nSuit === 1 && !pat.hasHonor) addFan("清一色", 2);
    else if (pat.nSuit <= 1 && (pat.hasHonor || pat.nSuit === 0)) addFan("混一色", 1);

    if (cand.kind === "qidui") {
      addFan("七对", 2);
    } else {
      var allKe = true;
      for (i = 0; i < cand.melds.length; i++) if (cand.melds[i].t !== "ke") allKe = false;
      for (i = 0; i < p.melds.length; i++) {
        if (p.melds[i].type !== "peng" && p.melds[i].type !== "gang") allKe = false;
      }
      if (allKe && cand.melds.length + p.melds.length === 4) addFan("对对胡", 1);
      if (flags.kongDraw) addFan("杠开", 1);
      if (cand.diao) addFan("独吊", 1);
    }

    var isSelf = !!(flags.selfDraw || flags.robKong);
    var blocked = null;
    if (!isSelf) {
      /* 两条独立的限制，别混为一谈：
         guoShui = 放弃过一次可胡的牌，之后到动牌前什么都不能胡；
         passed  = 自己这一轮打出去的那几张牌，只拦这几张。
         两者的例外都是独吊（拆将单钓算加了一番）。 */
      var isDiao = (cand.kind === "std" && cand.diao);
      var selfCut = !!(p.passed && cand.winKey && p.passed.indexOf(cand.winKey) >= 0);
      if ((p.guoShui || selfCut) && !isDiao) {
        blocked = "guoshui";
      } else if (flowers < 1 && fan < 1) {
        blocked = "nofan";
      }
    }

    var inner = OPTS.base + flowers * OPTS.flowerScore;
    var mult = fan <= 0 ? 1 : Math.pow(2, fan);
    var raw = inner * mult;
    var score = raw > OPTS.cap ? OPTS.cap : raw;
    var formula = "(" + OPTS.base + " + " + flowers + " × " + OPTS.flowerScore + ") × " + mult + " = " + raw;
    if (raw > OPTS.cap) formula += "，超过封顶，按 " + OPTS.cap + " 算";

    return {
      ok: !blocked,
      blocked: blocked,
      flowers: flowers,
      flowerItems: flowerItems,
      fans: fans,
      fan: fan,
      mult: mult,
      raw: raw,
      score: score,
      formula: formula,
      cand: cand,
      diao: !!(cand.kind === "std" && cand.diao),
      qidui: cand.kind === "qidui"
    };
  }

  /* 牌型判定本身在 rules.canWinShape 里，服务端仲裁用的是同一份。
     这里只是把「玩家对象 + 一张牌」翻译成它要的入参。 */
  export function canWinHand(p, extraKey) {
    var keys = handKeys(p);
    if (extraKey) keys = keys.concat([extraKey]);
    return canWinShape(keys, p.melds.length);
  }

  export function waitingTiles(p) {
    var needLen = 13 - 3 * p.melds.length;
    if (handKeys(p).length !== needLen) return [];
    var w = [];
    for (var i = 0; i < KEYS34.length; i++) {
      if (canWinHand(p, KEYS34[i])) w.push(KEYS34[i]);
    }
    return w;
  }

  export function checkHu(p, winKey, flags) {
    var f = {};
    flags = flags || {};
    for (var k in flags) f[k] = flags[k];
    if (f.addWin == null) f.addWin = !f.selfDraw;
    return analyzeWin(p, winKey, f);
  }
  export function possibleGangs(p) {
    var list = [];
    var keys = handKeys(p);
    var seen = {};
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (seen[k]) continue;
      seen[k] = 1;
      if (countKey(keys, k) >= 4) list.push({ kind: "an", key: k });
    }
    for (var j = 0; j < p.melds.length; j++) {
      var m = p.melds[j];
      if (m.type === "peng" && countKey(keys, m.key) >= 1) list.push({ kind: "bu", key: m.key, meld: j });
    }
    return list;
  }
