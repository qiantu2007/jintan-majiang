/* 金坛麻将 · 给人的即时反馈
 * 说话（金坛话录音 / 系统 TTS）、牌桌音效、振动、屏幕上那条提示。
 * 凑一块是因为它们回答同一个问题：怎么让人知道刚才发生了什么。
 * 录音那部分是给子女用的 —— 照着念一遍，外婆就能听到乡音。
 *
 * 由 构建.mjs 拼进 index.html。改这里，不要改根目录那个。 */

  /* ══════════ 语音播报 ══════════
     系统自带的中文语音只有普通话、粤语、台湾腔 —— 没有金坛话，
     吴语毗陵小片任何一家 TTS 都不支持。想听地道乡音只有一条路：真人录一遍。
     所以这里分两层：
       · 有录音包就放录音（真金坛话）
       · 没有就退回系统合成（普通话，至少能听清是什么牌）
     录音在「设置 → 金坛话语音」里当场录，录完导出一个文件传上去，
     全家的手机就都听得到了。 */
  var VOICE_KEY = "jintan_mj_voice_v1";
  var VOICE_PACK_FILE = "语音包.json";

  /* 要录的词条。id 是内部键，text 是提示录音人念什么 */
  var VOICE_LIST = (function () {
    var a = [], i;
    for (i = 1; i <= 9; i++) a.push({ id: "m" + i, text: NUM_CN.charAt(i - 1) + "万" });
    for (i = 1; i <= 9; i++) a.push({ id: "s" + i, text: NUM_CN.charAt(i - 1) + "条" });
    for (i = 1; i <= 9; i++) a.push({ id: "p" + i, text: NUM_CN.charAt(i - 1) + "筒" });
    for (i = 1; i <= 7; i++) a.push({ id: "z" + i, text: HONOR["z" + i] });
    a.push({ id: "act_peng", text: "碰" });
    a.push({ id: "act_gang", text: "杠" });
    a.push({ id: "act_hu", text: "胡了" });
    a.push({ id: "act_zimo", text: "自摸" });
    a.push({ id: "act_your", text: "该你了" });
    a.push({ id: "act_liuju", text: "流局" });
    return a;
  })();

  var voicePack = null;       /* id -> data url，null 表示还没加载或没有 */
  var voiceAudio = null;      /* 复用一个 <audio>，别每次新建 */

  function voiceText(id) {
    for (var i = 0; i < VOICE_LIST.length; i++) if (VOICE_LIST[i].id === id) return VOICE_LIST[i].text;
    return "";
  }

  /* 加载录音包：先看本机录的（localStorage），再看跟游戏一起传上来的文件 */
  function loadVoicePack() {
    try {
      var local = localStorage.getItem(VOICE_KEY);
      if (local) {
        var d = JSON.parse(local);
        if (d && typeof d === "object" && Object.keys(d).length) { voicePack = d; return; }
      }
    } catch (e) {}
    /* 站点上带的包。没有就静静地退回合成音，不弹任何错 */
    try {
      fetch(VOICE_PACK_FILE, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && typeof d === "object" && Object.keys(d).length) voicePack = d;
        })
        .catch(function () {});
    } catch (e) {}
  }

  function hasClip(id) { return !!(voicePack && voicePack[id]); }
  function voicePackCount() { return voicePack ? Object.keys(voicePack).length : 0; }

  /* 说一句。优先放录音，没有录音才用系统合成。 */
  function voiceOn() { return settings.voice === "act" || settings.voice === "all"; }

  function say(id, fallbackText) {
    if (!voiceOn()) return;
    if (hasClip(id)) {
      try {
        if (!voiceAudio) voiceAudio = new Audio();
        voiceAudio.pause();
        voiceAudio.src = voicePack[id];
        voiceAudio.currentTime = 0;
        var pr = voiceAudio.play();
        if (pr && pr.catch) pr.catch(function () {});
        return;
      } catch (e) {}
    }
    speak(fallbackText != null ? fallbackText : voiceText(id));
  }

  /* 报一张牌。「每张都报」那档才会走到这儿 */
  function sayTile(key) {
    if (settings.voice !== "all") return;
    if (isFlower(key)) return;              /* 花牌是自动补的，不用报 */
    say(key, tileName(key));
  }

  /* ── 录音 ──
     录出来的原始格式各家不一样：Chrome 给 webm/opus，Safari 给 mp4/aac，
     互相放不出来。录完一律转成 12kHz 单声道 WAV —— 体积能接受，
     而且没有哪台手机放不响。牌名就一两个字，12k 采样完全够清楚。 */
  var REC = { on: false, id: null, mr: null, chunks: [], stream: null, timer: null };
  var REC_MS = 1800;          /* 每条录这么久，够说「三万」了 */
  var WAV_HZ = 12000;

  function wavFromBuffer(buf) {
    /* 混成单声道并重采样 */
    var src = buf.getChannelData(0);
    if (buf.numberOfChannels > 1) {
      var b = buf.getChannelData(1);
      var mixed = new Float32Array(src.length);
      for (var i = 0; i < src.length; i++) mixed[i] = (src[i] + b[i]) / 2;
      src = mixed;
    }

    /* 掐掉前后的空白，再把音量拉齐。
       录的时候是固定 1.8 秒，真正说话往往只占中间半秒多 ——
       不剪的话每条 54KB，四十条就两兆多，而且每次播报前还要干等一下。 */
    var peak = 0, i2;
    for (i2 = 0; i2 < src.length; i2++) { var a2 = Math.abs(src[i2]); if (a2 > peak) peak = a2; }
    if (peak > 0.01) {
      var thr = peak * 0.05;    /* 阈值别太高，中文字尾是渐弱的，容易被削掉 */
      var s0 = 0, s1 = src.length - 1;
      while (s0 < src.length && Math.abs(src[s0]) < thr) s0++;
      while (s1 > s0 && Math.abs(src[s1]) < thr) s1--;
      var pad = Math.round(buf.sampleRate * 0.08);   /* 前后各留一点点，别切掉字头字尾 */
      s0 = Math.max(0, s0 - pad);
      s1 = Math.min(src.length - 1, s1 + pad);
      if (s1 > s0 + buf.sampleRate * 0.1) {
        var cut = new Float32Array(s1 - s0 + 1);
        var gain = Math.min(4, 0.85 / peak);         /* 音量拉到接近满，但别爆 */
        for (var c = 0; c < cut.length; c++) cut[c] = src[s0 + c] * gain;
        src = cut;
      }
    }

    var ratio = buf.sampleRate / WAV_HZ;
    var n = Math.floor(src.length / ratio);
    var out = new Int16Array(n);
    for (var j = 0; j < n; j++) {
      var v = src[Math.floor(j * ratio)];
      v = v < -1 ? -1 : v > 1 ? 1 : v;
      out[j] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    var bytes = new ArrayBuffer(44 + out.length * 2);
    var dv = new DataView(bytes);
    var put = function (off, s) { for (var k = 0; k < s.length; k++) dv.setUint8(off + k, s.charCodeAt(k)); };
    put(0, "RIFF"); dv.setUint32(4, 36 + out.length * 2, true); put(8, "WAVE");
    put(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true); dv.setUint32(24, WAV_HZ, true);
    dv.setUint32(28, WAV_HZ * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    put(36, "data"); dv.setUint32(40, out.length * 2, true);
    for (var q = 0; q < out.length; q++) dv.setInt16(44 + q * 2, out[q], true);
    /* 转成 data url 存进去 */
    var u8 = new Uint8Array(bytes), s = "";
    for (var z = 0; z < u8.length; z++) s += String.fromCharCode(u8[z]);
    return "data:audio/wav;base64," + btoa(s);
  }

  function saveVoicePack() {
    try { localStorage.setItem(VOICE_KEY, JSON.stringify(voicePack || {})); }
    catch (e) { toast("存不下了，手机存储可能满了"); }
  }

  async function recStart(id) {
    if (REC.on) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      toast("这个浏览器不支持录音，换 Chrome 或 Safari 试试");
      return;
    }
    try {
      REC.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      toast("没拿到麦克风权限，先在浏览器里允许一下");
      return;
    }
    REC.on = true; REC.id = id; REC.chunks = [];
    renderSettings();
    try {
      REC.mr = new MediaRecorder(REC.stream);
    } catch (e) { recCleanup(); toast("录不了音"); return; }
    REC.mr.ondataavailable = function (ev) { if (ev.data && ev.data.size) REC.chunks.push(ev.data); };
    REC.mr.onstop = function () { recFinish(); };
    REC.mr.start();
    REC.timer = setTimeout(function () { recStop(); }, REC_MS);
  }

  function recStop() {
    if (!REC.on || !REC.mr) return;
    if (REC.timer) { clearTimeout(REC.timer); REC.timer = null; }
    try { REC.mr.stop(); } catch (e) { recCleanup(); }
  }

  function recCleanup() {
    if (REC.timer) { clearTimeout(REC.timer); REC.timer = null; }
    if (REC.stream) { try { REC.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} }
    REC.on = false; REC.mr = null; REC.chunks = []; REC.stream = null;
    var keep = REC.id; REC.id = null;
    return keep;
  }

  async function recFinish() {
    var id = REC.id;
    var blob = new Blob(REC.chunks);
    recCleanup();
    if (!blob.size) { renderSettings(); toast("没录到声音"); return; }
    try {
      var arr = await blob.arrayBuffer();
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      var buf = await ac.decodeAudioData(arr);
      try { ac.close(); } catch (e) {}
      if (!voicePack) voicePack = {};
      voicePack[id] = wavFromBuffer(buf);
      saveVoicePack();
      renderSettings();
      /* 录完马上放一遍，让人听着对不对 */
      try { var a = new Audio(voicePack[id]); a.play().catch(function () {}); } catch (e) {}
    } catch (e) {
      renderSettings();
      toast("这段没转成功，再录一次");
    }
  }

  function voicePackSize() {
    try { return Math.round(JSON.stringify(voicePack || {}).length / 1024); } catch (e) { return 0; }
  }

  /* 导出成一个文件。放进 _上传这个文件夹 跟游戏一起传，
     全家的手机打开就都是金坛话了。 */
  function exportVoicePack() {
    if (!voicePackCount()) { toast("还一条都没录"); return; }
    try {
      var blob = new Blob([JSON.stringify(voicePack)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = VOICE_PACK_FILE;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
      toast("导出好了，把 " + VOICE_PACK_FILE + " 放进上传文件夹");
    } catch (e) { toast("导不出来"); }
  }

  function importVoicePack() {
    var inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json,application/json";
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        var d = null;
        try { d = JSON.parse(fr.result); } catch (e) {}
        if (!d || typeof d !== "object" || Array.isArray(d) || !Object.keys(d).length) {
          toast("这个文件读不出来"); return;
        }
        voicePack = d;
        saveVoicePack();
        renderSettings();
        toast("导入好了，共 " + voicePackCount() + " 条");
      };
      fr.readAsText(f);
    };
    inp.click();
  }

  function speak(text) {
    if (!voiceOn() || !window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 0.92;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ── 牌桌音效：Web Audio 现场合成，不带任何音频文件 ── */
  var actx = null;
  function audio() {
    if (actx === null) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { actx = false; }
    }
    if (actx && actx.state === "suspended") { try { actx.resume(); } catch (e) {} }
    return actx || null;
  }
  /* 一声「嗒」：短噪声过带通，像牌磕在桌面上 */
  function clack(gain, freq, dur) {
    var a = audio(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur);
    var buf = a.createBuffer(1, n, a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
    var src = a.createBufferSource(); src.buffer = buf;
    var bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 1.4;
    var g = a.createGain(); g.gain.value = gain;
    src.connect(bp); bp.connect(g); g.connect(a.destination);
    src.start();
  }
  /* 一个音符，用于胡牌的上行琶音 */
  function tone(freq, at, dur, gain) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = "triangle"; o.frequency.value = freq;
    var t = a.currentTime + at;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  /* ── 屏幕常亮 ──
     老人一张牌能想半分钟，屏幕自己灭掉最烦人。进牌桌时锁住，离开就放开。
     系统会在切后台时自动释放，所以回前台要重新申请。 */
  var wakeLock = null;
  function keepAwake(on) {
    try {
      if (!("wakeLock" in navigator)) return;
      if (on) {
        if (wakeLock) return;
        navigator.wakeLock.request("screen").then(function (l) {
          wakeLock = l;
          l.addEventListener("release", function () { wakeLock = null; });
        }).catch(function () { wakeLock = null; });
      } else if (wakeLock) {
        wakeLock.release().catch(function () {});
        wakeLock = null;
      }
    } catch (e) { wakeLock = null; }
  }

  /* ── 震动 ──（安卓有效，iOS 的浏览器不支持，静默跳过） */
  function buzz(pattern) {
    if (!settings.vibrate || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) {}
  }

  var BUZZ = {
    discard: 12, draw: 0, flower: [0, 18, 60, 18],
    peng: [0, 26, 55, 26], gang: [0, 26, 50, 26, 50, 40],
    turn: [0, 20, 90, 20], hu: [0, 55, 60, 55, 60, 130], lose: [0, 90]
  };

  function sfx(kind) {
    if (BUZZ[kind]) buzz(BUZZ[kind]);
    if (!settings.sound) return;
    try {
      if (kind === "draw") clack(0.16, 1500, 0.045);
      else if (kind === "discard") clack(0.34, 1000, 0.075);
      else if (kind === "peng") { clack(0.4, 780, 0.08); setTimeout(function () { clack(0.34, 620, 0.09); }, 75); }
      else if (kind === "gang") { clack(0.42, 700, 0.09); setTimeout(function () { clack(0.4, 560, 0.09); }, 70);
                                  setTimeout(function () { clack(0.36, 450, 0.11); }, 145); }
      else if (kind === "flower") clack(0.2, 2100, 0.05);
      else if (kind === "turn") { tone(660, 0, 0.14, 0.1); tone(880, 0.1, 0.18, 0.09); }
      else if (kind === "hu") { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.1, 0.34, 0.13); }); }
      else if (kind === "lose") { tone(392, 0, 0.22, 0.1); tone(294, 0.14, 0.3, 0.09); }
    } catch (e) {}
  }

  function toast(text, ms) {
    var el = document.getElementById("toast");
    el.textContent = text;
    el.classList.add("on");
    setTimeout(function () { el.classList.remove("on"); }, ms || 1600);
  }

  function setMsg(t, hot) {
    var el = document.getElementById("msg");
    el.textContent = t || "";
    el.classList.toggle("hot", !!hot);
  }
