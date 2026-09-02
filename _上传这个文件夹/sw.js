/* 金坛麻将 · 离线缓存
   装进主屏幕后就完全离线可用，断网、没流量、服务器挂了都照样能打。
   策略：缓存优先 + 后台悄悄更新（stale-while-revalidate）——
   老人永远不会看到白屏或转圈，新版本在下次打开时自动生效。 */

var CACHE = "jintan-mj-v181";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  /* 金坛话录音包。没传这个文件也不影响 —— 抓不到会被下面的 catch 咽掉，
     游戏自动退回手机自带的普通话。 */
  "./语音包.json"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* 单个文件抓不到也不要让整次安装失败 */
      return Promise.all(ASSETS.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  if (req.url.indexOf("http") !== 0) return;
  /* 版本文件永远走网络，不进缓存，否则永远查不到新版 */
  if (req.url.indexOf("version.json") > -1) return;
  /* 联机服务器的请求一律不碰：
     /new 被缓存的话每次开房都会拿到同一个房间号，
     /health 被缓存的话服务器早就挂了体检还显示打勾。 */
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && res.type !== "opaque") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return null; });

      /* 有缓存就先给缓存，网络请求丢后台去更新 */
      if (hit) return hit;

      return net.then(function (res) {
        /* 彻底没网又没缓存时，页面导航请求兜底回首页 */
        if (res) return res;
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status: 504, statusText: "offline" });
      });
    })
  );
});
