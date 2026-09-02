# -*- coding: utf-8 -*-
"""把 Wikimedia 的公有领域麻将牌面装进 index.html。

原来的牌面是逐笔画出来的（engraved / coin / bamboo / sparrow 那一套），
外婆说看着不习惯 —— 画得再像也不是实物的画法。
这个脚本把那一整块换成真牌的矢量图案：
  · 数据来自 jintan-tiles.json（42 张，已经剥掉牌身、归一化到 60x82 视框）
  · 替换 index.html 里从「牌面绘制」注释到 faceBody 结束的整段
  · faceBody 变成一句查表

可以重复运行：脚本会先认出已经装配过的标记，再原样替换。
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
HTML = os.path.join(ROOT, "index.html")
DATA = os.path.join(HERE, "jintan-tiles.json")

MARK_BEGIN = "  /* ══════════ 牌面 ══════════"
ANCHOR_END = "  /* 牌面做成一张「雪碧图」"


def build_block(tiles):
    """生成新的牌面代码块。"""
    keys = []
    for suit in ("m", "s", "p"):
        keys += ["%s%d" % (suit, i) for i in range(1, 10)]
    keys += ["z%d" % i for i in range(1, 8)]
    keys += ["f%d" % i for i in range(1, 9)]

    missing = [k for k in keys if k not in tiles]
    if missing:
        sys.exit("这些牌没有图案，装不了：%s" % ", ".join(missing))

    lines = [
        MARK_BEGIN,
        "     牌面用的是实物麻将的画法，不是自己画的。",
        "     来源：Wikimedia Commons 的中式麻将牌矢量图（作者 Shizhao，公有领域，",
        "     无需署名、无附加条件）。原图是整张牌，这里已经剥掉牌身的黑框和白底，",
        "     只留图案，并按比例摆进牌面凹槽（视框 60x82，和原来一致）。",
        "     筒子的铜钱花瓣纹、萬字的靛蓝数字、五萬写作「伍」—— 都是实物的样子。",
        "     素材和装配脚本在 _牌面素材 文件夹里，改动重跑一次就行。 */",
        "  var FACE_CACHE = {};",
        "  var TILE_ART = {",
    ]
    for i, k in enumerate(keys):
        art = tiles[k].replace("\\", "\\\\").replace('"', '\\"')
        comma = "," if i < len(keys) - 1 else ""
        lines.append('    %s: "%s"%s' % (k, art, comma))
    lines.append("  };")
    lines.append("")
    lines.append("  function faceBody(key) { return TILE_ART[key] || \"\"; }")
    lines.append("")
    return "\n".join(lines) + "\n"


def main():
    with open(DATA, "r", encoding="utf-8") as f:
        tiles = json.load(f)
    with open(HTML, "r", encoding="utf-8") as f:
        html = f.read()

    end = html.find(ANCHOR_END)
    if end < 0:
        sys.exit("找不到雪碧图那段注释，index.html 结构变了，脚本要跟着改")

    # 起点：已经装配过就从标记开始，否则从原来的「牌面绘制」注释开始
    begin = html.find(MARK_BEGIN)
    if begin < 0 or begin > end:
        begin = html.find("  /* ══════════ 牌面绘制 ══════════")
    if begin < 0 or begin > end:
        sys.exit("找不到牌面代码块的起点")

    new_html = html[:begin] + build_block(tiles) + html[end:]
    with open(HTML, "w", encoding="utf-8") as f:
        f.write(new_html)

    print("装配完成")
    print("  牌面数        : %d" % len(tiles))
    print("  替换掉的旧代码: %d 字符" % (end - begin))
    print("  新代码        : %d 字符" % len(build_block(tiles)))
    print("  index.html    : %.1f KB -> %.1f KB" % (len(html) / 1024.0, len(new_html) / 1024.0))


if __name__ == "__main__":
    main()
