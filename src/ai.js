/* 金坛麻将 · 电脑出牌（向听 / 进张 / 弃牌选择）
 * 依赖牌局现状的三个函数由 setAiView 注入，本文件本身不读全局。
 * 由 拆分.py 从 index.html 抽出。改这里，然后跑 `node 构建.mjs`。 */

import { KEYS34, isFlower, isHonor, isNum, suitOf, numOf, incKey, keyIndex, countKey, handKeys, counts34, isQiDui, suitPattern } from "./rules.js";
import { waitingTiles } from "./score.js";

  /* { knownCount(key), safeScore(key), diff() } —— 由 app 在启动时装进来 */
  var VIEW = null;
  export function setAiView(v) { VIEW = v; }

  export function handEff(keys, p) {
    var waits;
    var tmp = { hand: keys.map(function (k, i) { return { id: i, key: k }; }), melds: p.melds, flowers: p.flowers, guoShui: p.guoShui };
    if (keys.length === 13 - 3 * p.melds.length) {
      waits = waitingTiles(tmp);
      if (waits.length) {
        var uk = 0;
        for (var w = 0; w < waits.length; w++) uk += Math.max(0, 4 - VIEW.knownCount(waits[w]) - countKey(keys, waits[w]));
        return 8000 + uk * 20;
      }
    }
    var cnt = counts34(keys);
    var v = 0, i, k, c;
    for (i = 0; i < 34; i++) {
      c = cnt[i]; k = KEYS34[i];
      if (c >= 3) v += 130;
      else if (c === 2) v += isHonor(k) ? 78 : 52;
      else if (c === 1) {
        if (isHonor(k)) v += 3;
        else {
          var left = numOf(k) > 1 ? suitOf(k) + (numOf(k) - 1) : null;
          var right = incKey(k);
          var adj = (left && cnt[keyIndex(left)] > 0) || (right && cnt[keyIndex(right)] > 0);
          var k2 = isNum(k) && numOf(k) <= 7 ? suitOf(k) + (numOf(k) + 2) : null;
          var k0 = isNum(k) && numOf(k) >= 3 ? suitOf(k) + (numOf(k) - 2) : null;
          var kan = (k2 && cnt[keyIndex(k2)] > 0) || (k0 && cnt[keyIndex(k0)] > 0);
          if (adj) v += 30;
          else if (kan) v += 18;
          else v += 5;
        }
      }
    }
    return v;
  }

  export function isolateScore(key, keys) {
    var c = countKey(keys, key);
    if (isHonor(key)) return c === 1 ? 100 : 0;
    if (c >= 2) return 0;
    var left = numOf(key) > 1 ? suitOf(key) + (numOf(key) - 1) : null;
    var right = incKey(key);
    if ((left && countKey(keys, left)) || (right && countKey(keys, right))) return 10;
    return 80;
  }

  export function goingPongHand(p) {
    var keys = handKeys(p);
    var cnt = counts34(keys);
    var sets = p.melds.length;
    for (var i = 0; i < 34; i++) if (cnt[i] >= 2) sets++;
    return sets >= 3;
  }
  export function goingHalfFlush(p, pengKey) {
    var keys = handKeys(p).concat([pengKey]);
    var pat = suitPattern(keys, p.melds);
    return pat.nSuit <= 1;
  }
  /* ══════════ 向听 / 进张 ══════════
     KEYS34 的排列是 万0-8、条9-17、筒18-26、字27-33。
     向听数 = 还差几张才听牌；0 已听牌，-1 已和牌。 */
  export function isNumIdx(i) { return i < 27; }

  export function shantenStd(cnt, nMelds) {
    var best = 8;
    function walk(i, melds, partials, pairUsed) {
      while (i < 34 && cnt[i] === 0) i++;
      if (i >= 34) {
        var m = nMelds + melds, d = partials, pr = pairUsed ? 1 : 0;
        /* 一副牌最多 5 个块：4 个面子 + 1 个雀头，多出来的搭子不算数 */
        if (m + d + pr > 5) d = 5 - m - pr;
        if (d < 0) d = 0;
        var t = d + pr;
        var s = 8 - 2 * m - t;
        /* 五个块全是面子/搭子、一个雀头都没有，还得再多花一步做将 */
        if (m + t === 5 && !pr) s += 1;
        if (s < best) best = s;
        return;
      }
      if (best <= -1) return;
      if (cnt[i] >= 3) { cnt[i] -= 3; walk(i, melds + 1, partials, pairUsed); cnt[i] += 3; }
      if (isNumIdx(i) && i % 9 <= 6 && cnt[i + 1] && cnt[i + 2]) {
        cnt[i]--; cnt[i + 1]--; cnt[i + 2]--;
        walk(i, melds + 1, partials, pairUsed);
        cnt[i]++; cnt[i + 1]++; cnt[i + 2]++;
      }
      if (cnt[i] >= 2) {
        if (!pairUsed) { cnt[i] -= 2; walk(i, melds, partials, true); cnt[i] += 2; }
        cnt[i] -= 2; walk(i, melds, partials + 1, pairUsed); cnt[i] += 2;
      }
      if (isNumIdx(i) && i % 9 <= 7 && cnt[i + 1]) {
        cnt[i]--; cnt[i + 1]--; walk(i, melds, partials + 1, pairUsed); cnt[i]++; cnt[i + 1]++;
      }
      if (isNumIdx(i) && i % 9 <= 6 && cnt[i + 2]) {
        cnt[i]--; cnt[i + 2]--; walk(i, melds, partials + 1, pairUsed); cnt[i]++; cnt[i + 2]++;
      }
      cnt[i]--; walk(i, melds, partials, pairUsed); cnt[i]++;
    }
    walk(0, 0, 0, false);
    return best;
  }

  export function shantenQiDui(cnt, nMelds) {
    if (nMelds !== 0) return 99;
    var pairs = 0, kinds = 0;
    for (var i = 0; i < 34; i++) {
      if (cnt[i] >= 2) pairs++;
      if (cnt[i] >= 1) kinds++;
    }
    var s = 6 - pairs;
    if (kinds < 7) s += 7 - kinds;      /* 牌种不够，还得再摸新种类 */
    return s;
  }

  export function shantenOf(cnt, nMelds) {
    var a = shantenStd(cnt, nMelds);
    var b = shantenQiDui(cnt, nMelds);
    return a < b ? a : b;
  }

  /* 进张：打出后还有多少张牌能让向听前进一步。
     剩余张数扣掉牌河、副露里已经露面的（记牌），所以是真概率不是拍脑袋。 */
  export function ukeireOf(keys, nMelds) {
    var cnt = counts34(keys);
    var base = shantenOf(cnt, nMelds);
    var total = 0, kinds = 0;
    for (var i = 0; i < 34; i++) {
      if (cnt[i] >= 4) continue;
      cnt[i]++;
      var s = shantenOf(cnt, nMelds);
      cnt[i]--;
      if (s < base) {
        var left = 4 - VIEW.knownCount(KEYS34[i]) - cnt[i];
        if (left > 0) { total += left; kinds++; }
      }
    }
    return { shanten: base, tiles: total, kinds: kinds };
  }

  /* 高手：先用形状启发式筛掉明显不该打的，再对候选做完整概率计算 */
  export function aiDiscardMaster(p) {
    var keys = handKeys(p);
    var cand = [];
    for (var i = 0; i < p.hand.length; i++) {
      var t = p.hand[i];
      if (isFlower(t.key)) continue;
      var rest0 = keys.slice();
      rest0.splice(rest0.indexOf(t.key), 1);
      cand.push({ t: t, rough: handEff(rest0, p) + isolateScore(t.key, keys) * 0.15, rest: rest0 });
    }
    if (!cand.length) return p.hand[p.hand.length - 1];
    cand.sort(function (a, b) { return b.rough - a.rough; });
    cand = cand.slice(0, 7);                 /* 只对前 7 个候选做重计算，省手机的电 */

    var best = null, bestV = -1e18;
    for (var j = 0; j < cand.length; j++) {
      var c = cand[j];
      var e = ukeireOf(c.rest, p.melds.length);
      var v = -e.shanten * 100000 + e.tiles * 900 + e.kinds * 120;
      /* 金坛特色：字牌刻子算花，成对的字牌别轻易拆 */
      if (isHonor(c.t.key) && countKey(keys, c.t.key) === 2) v -= 4200;
      /* 防守：照牌河打现物 */
      v += VIEW.safeScore(c.t.key) * 1500;
      v += c.rough * 0.4;
      if (v > bestV) { bestV = v; best = c.t; }
    }
    return best || p.hand[p.hand.length - 1];
  }

  export function aiWantPeng(p, key) {
    if (Math.random() < VIEW.diff().sloppy) return false;
    var tmpKeys = handKeys(p);
    var seven = isQiDui(tmpKeys.concat(["m1"]).slice(0, 14), p.melds.length);
    var waits = waitingTiles(p);
    if (p.melds.length === 0) {
      var qkeys = tmpKeys;
      var c = counts34(qkeys);
      var pairs = 0;
      for (var i = 0; i < 34; i++) pairs += Math.floor(c[i] / 2);
      if (pairs >= 5 && !isHonor(key)) return false;
    }
    if (isHonor(key)) return true;
    if (goingPongHand(p) || goingHalfFlush(p, key)) return true;
    return false;
  }

  export function aiWantGang(p, key, kind) {
    if (Math.random() < VIEW.diff().sloppy) return false;
    var waits = waitingTiles(p);
    if (waits.length && kind === "bu") return true;
    return true;
  }

  export function aiChooseDiscard(p) {
    var keys = handKeys(p);
    var best = null, bestV = -1e9;
    var candidates = p.hand;
    var d = VIEW.diff();
    if (Math.random() < d.sloppy) {
      var isol = p.hand.filter(function (t) { return isolateScore(t.key, keys) >= 80; });
      if (isol.length) return isol[Math.floor(Math.random() * isol.length)];
      var pick = p.hand.filter(function (t) { return !isFlower(t.key); });
      if (!pick.length) pick = p.hand;
      return pick[Math.floor(Math.random() * pick.length)];
    }
    if (d.master) return aiDiscardMaster(p);
    for (var i = 0; i < candidates.length; i++) {
      var t = candidates[i];
      if (isFlower(t.key)) continue;
      var rest = keys.slice();
      var ix = rest.indexOf(t.key);
      rest.splice(ix, 1);
      var v = handEff(rest, p) + isolateScore(t.key, keys) * 0.15;
      if (isHonor(t.key) && countKey(keys, t.key) === 2) v -= 40;
      if (d.defend) v += VIEW.safeScore(t.key) * 14 * d.defend;   /* 高手偏向打安全牌 */
      if (v > bestV) { bestV = v; best = t; }
    }
    return best || p.hand[p.hand.length - 1];
  }
