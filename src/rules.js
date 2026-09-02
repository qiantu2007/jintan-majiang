/* 金坛麻将 · 规则内核
 *
 * 浏览器和 Cloudflare Worker 共用这一份。纯函数，不碰 DOM、不读全局状态。
 * 服务端 import 它，客户端由 构建.mjs 内联进 index.html。
 * 由 拆分.py 从 index.html 抽出。改这里，然后跑 `node 构建.mjs`。 */

  export var NUM_CN = "一二三四五六七八九";
  export var HONOR = { z1: "東", z2: "南", z3: "西", z4: "北", z5: "中", z6: "發", z7: "白" };
  export var FLOWER = { f1: "春", f2: "夏", f3: "秋", f4: "冬", f5: "梅", f6: "蘭", f7: "竹", f8: "菊" };
  export var KEYS34 = [];
  export var SUITS = ["m", "s", "p"];
  for (var si = 0; si < 3; si++) for (var n = 1; n <= 9; n++) KEYS34.push(SUITS[si] + n);
  for (var zi = 1; zi <= 7; zi++) KEYS34.push("z" + zi);
  export function isFlower(k) { return k.charAt(0) === "f"; }
  export function isHonor(k) { return k.charAt(0) === "z"; }
  export function isNum(k) { return k.charAt(0) === "m" || k.charAt(0) === "s" || k.charAt(0) === "p"; }
  export function suitOf(k) { return k.charAt(0); }
  export function numOf(k) { return parseInt(k.slice(1), 10); }
  export function incKey(k) {
    if (!isNum(k)) return null;
    var n = numOf(k);
    return n < 9 ? suitOf(k) + (n + 1) : null;
  }
  export function keyIndex(k) { return KEYS34.indexOf(k); }
  export function cmpKey(a, b) { return keyIndex(a) - keyIndex(b); }
  export function countKey(arr, k) {
    var c = 0;
    for (var i = 0; i < arr.length; i++) if (arr[i] === k) c++;
    return c;
  }
  export function removeN(arr, k, n) {
    var out = arr.slice();
    var left = n;
    for (var i = out.length - 1; i >= 0 && left > 0; i--) {
      if (out[i] === k) { out.splice(i, 1); left--; }
    }
    return out;
  }
  export function sortKeys(arr) { return arr.slice().sort(cmpKey); }
  export function handKeys(p) {
    var a = [];
    for (var i = 0; i < p.hand.length; i++) a.push(p.hand[i].key);
    return a;
  }
  export function tileName(k) {
    if (isFlower(k)) return FLOWER[k];
    if (isHonor(k)) return HONOR[k];
    var s = suitOf(k) === "m" ? "万" : suitOf(k) === "s" ? "条" : "筒";
    return NUM_CN.charAt(numOf(k) - 1) + s;
  }
  export function capDefault(base, fs) { return (base + 3 * fs) * 4; }
  export function counts34(keys) {
    var c = [];
    for (var i = 0; i < 34; i++) c[i] = 0;
    for (var j = 0; j < keys.length; j++) {
      var ix = keyIndex(keys[j]);
      if (ix >= 0) c[ix]++;
    }
    return c;
  }

  export function allMeldForms(keys) {
    if (keys.length === 0) return [[]];
    if (keys.length % 3 !== 0) return [];
    var a = sortKeys(keys);
    var first = a[0];
    var out = [];
    if (countKey(a, first) >= 3) {
      var rest = removeN(a, first, 3);
      var forms = allMeldForms(rest);
      for (var i = 0; i < forms.length; i++) out.push([{ t: "ke", key: first }].concat(forms[i]));
    }
    if (isNum(first)) {
      var k2 = incKey(first), k3 = k2 ? incKey(k2) : null;
      if (k2 && k3 && a.indexOf(k2) >= 0 && a.indexOf(k3) >= 0) {
        var rest2 = removeN(removeN(removeN(a, first, 1), k2, 1), k3, 1);
        var forms2 = allMeldForms(rest2);
        for (var j = 0; j < forms2.length; j++) out.push([{ t: "shun", key: first }].concat(forms2[j]));
      }
    }
    return out;
  }

  export function allStandardParses(keys) {
    if (keys.length % 3 !== 2) return [];
    var a = sortKeys(keys);
    var tried = {};
    var res = [];
    for (var i = 0; i < a.length - 1; i++) {
      if (a[i] === a[i + 1] && !tried[a[i]]) {
        tried[a[i]] = 1;
        var rest = a.slice(0, i).concat(a.slice(i + 2));
        var forms = allMeldForms(rest);
        for (var j = 0; j < forms.length; j++) res.push({ pair: a[i], melds: forms[j] });
      }
    }
    return res;
  }

  export function isQiDui(keys, nExposed) {
    if (nExposed !== 0) return false;
    if (keys.length !== 14) return false;
    var c = counts34(keys);
    var pairs = 0;
    for (var i = 0; i < 34; i++) {
      if (c[i] % 2 !== 0) return false;
      pairs += c[i] / 2;
    }
    return pairs === 7;
  }

  export function suitPattern(keys, melds) {
    var has = { m: 0, s: 0, p: 0, z: 0 };
    function add(k) { has[suitOf(k)] = 1; }
    for (var i = 0; i < keys.length; i++) add(keys[i]);
    for (var j = 0; j < melds.length; j++) add(melds[j].key);
    var nSuit = has.m + has.s + has.p;
    return { nSuit: nSuit, hasHonor: !!has.z, hasNum: nSuit > 0 };
  }
  /* —— 牌墙 / 开局 ——
     造牌和洗牌分开，因为两边对随机性的要求不一样：
     单机用 Math.random 够了；联机必须用 crypto，否则牌序理论上可预测。
     alloc 是 id 分配器，不传就从 1 开始编号。 */
  export function makeWall(alloc) {
    var next = 1;
    var give = alloc || function () { return next++; };
    var tiles = [];
    for (var i = 0; i < KEYS34.length; i++) {
      for (var n = 0; n < 4; n++) tiles.push({ id: give(), key: KEYS34[i] });
    }
    for (var f = 1; f <= 8; f++) tiles.push({ id: give(), key: "f" + f });
    return tiles;
  }

  /* rnd 返回 [0,1)。单机不传，联机传 crypto 版。 */
  export function shuffle(tiles, rnd) {
    var r = rnd || Math.random;
    for (var a = tiles.length - 1; a > 0; a--) {
      var b = Math.floor(r() * (a + 1));
      var t = tiles[a]; tiles[a] = tiles[b]; tiles[b] = t;
    }
    return tiles;
  }

  /* 「这副牌能不能和」——只判牌型，不算番。
     服务端仲裁碰杠胡优先级要用它；客户端 canWinHand 也是它的包装。
     以前这段在 index.html 和 worker.js 里各写了一遍，现在只有这一份。 */
  export function canWinShape(keys, nMelds) {
    var a = keys.filter(function (k) { return !isFlower(k); });
    if (isQiDui(a, nMelds)) return true;
    var parses = allStandardParses(a);
    var need = 4 - nMelds;
    for (var i = 0; i < parses.length; i++) if (parses[i].melds.length === need) return true;
    return false;
  }
