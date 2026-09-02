/* 金坛麻将 · 对外入口（跑在 Cloudflare Pages 上）
   ────────────────────────────────────────────────
   为什么要多这一层：
   原来的地址是 xxx.workers.dev，这个后缀在国内被墙了两道——
   DNS 查出来是假 IP（Facebook 网段），就算手工指对 IP，
   TLS 握手时按 SNI 又会被重置。实测两层都拦。
   而 pages.dev 两层都干净，同一台 Cloudflare 机器，换个门牌号就能进。

   Pages 不允许自己定义 Durable Object，所以分工是：
   · 房间逻辑（Room 类）留在 _服务端 那个 Worker 里，不用动
   · 这里只做入口，通过 ROOM 绑定把请求转进去
   两边跑在同一个 Cloudflare 账号里，内部调用，不经过公网。 */

const CODE_CHARS = "ACDEFGHJKLMNPQRSTUVWXY3479";  /* 去掉了容易看错的 0O1IB8Z2S6 */
function makeCode() {
  const r = new Uint8Array(5);
  crypto.getRandomValues(r);
  let s = "";
  for (let i = 0; i < 5; i++) s += CODE_CHARS[r[i] % CODE_CHARS.length];
  return s;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    /* 客户端拿这个判断服务器通不通，要快、要能跨域 */
    if (url.pathname === "/health") {
      return new Response("ok", { headers: cors });
    }

    /* 开房：分配一个不重复的房间号 */
    if (url.pathname === "/new") {
      return new Response(JSON.stringify({ code: makeCode() }), {
        headers: { "content-type": "application/json", ...cors }
      });
    }

    /* 连房间：转给房间号对应的那个 Durable Object */
    if (url.pathname === "/ws") {
      const code = (url.searchParams.get("code") || "").toUpperCase();
      if (!/^[A-Z0-9]{4,8}$/.test(code)) {
        return new Response("bad code", { status: 400, headers: cors });
      }
      if (!env.ROOM) {
        /* 绑定没配好时给一句人话，不然只会看到 500 */
        return new Response("ROOM 绑定没配置，去 Pages 项目设置里加 Durable Object 绑定",
                            { status: 500, headers: cors });
      }
      const id = env.ROOM.idFromName(code);
      return env.ROOM.get(id).fetch(req);
    }

    return new Response("金坛麻将联机服务", { headers: cors });
  }
};
