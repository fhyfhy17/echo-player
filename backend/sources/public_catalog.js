"use strict";
// Port of sources/public_catalog.py: public catalog plugin scraping static audio
// resources and built-in Jay Chou lossless classics.

const { httpRequest } = require("../net");
const { monotonic, quote, sha256Hex } = require("../pyutil");
const { BaseSource, MEDIA_LIMIT, searchKey } = require("./base");

const PUBLIC_PLAYER = "https://yyy.yy.al/";
const PUBLIC_CATALOG_TTL = 12 * 60 * 60;

// Built-in original lossless tracks (CDN backed, instant response)
// (id, title, album, duration, path, artist)
const BUILTIN_TRACKS = [
  ["anzhiyu-common-jasmine-orange", "七里香", "七里香", 296, "anzhiyu-music@1.0.2/七里香/七里香.mp3", "周杰伦"],
  ["anzhiyu-sunny-day", "晴天", "叶惠美", 269, "anzhiyu-music@1.0.2/晴天/晴天.mp3", "周杰伦"],
  ["anzhiyu-rice-field", "稻香", "魔杰座", 223, "anzhiyu-music@1.0.1/周杰伦/稻香/稻香.mp3", "周杰伦"],
  ["anzhiyu-blue-and-white-porcelain", "青花瓷", "我很忙", 237, "anzhiyu-music@1.0.4/青花瓷/青花瓷.mp3", "周杰伦"],
  ["glass-nocturne", "夜曲", "11月的萧邦", 226, "music/china/周杰伦-夜曲.mp3", "周杰伦"],
  ["anzhiyu-orchid-pavilion", "兰亭序", "魔杰座", 253, "anzhiyu-music@1.0.1/周杰伦/兰亭序/兰亭序.mp3", "周杰伦"],
  ["anzhiyu-flower-sea", "花海", "魔杰座", 264, "anzhiyu-music@1.0.1/周杰伦/花海/花海.mp3", "周杰伦"],
  ["anzhiyu-clock", "反方向的钟", "杰伦", 258, "anzhiyu-music@1.0.2/反方向的钟/反方向的钟.mp3", "周杰伦"],
  ["anzhiyu-obviously", "明明就", "十二新作", 258, "anzhiyu-music@1.0.1/周杰伦/明明就/明明就.mp3", "周杰伦"],
  ["anzhiyu-mom", "听妈妈的话", "依然范特西", 263, "anzhiyu-music@1.0.2/听妈妈的话/听妈妈的话.mp3", "周杰伦"],
  ["anzhiyu-happiness", "说好的幸福呢", "魔杰座", 256, "anzhiyu-music@1.0.2/说好的辛福呢/说好的辛福呢.mp3", "周杰伦"],
  ["anzhiyu-after-class", "等你下课", "最伟大的作品", 270, "anzhiyu-music@1.0.1/周杰伦/等你下课/等你下课.mp3", "周杰伦 / 杨瑞代"],
  ["anzhiyu-tearful", "我落泪情绪零碎", "跨时代", 258, "anzhiyu-music@1.0.2/我落泪情绪零碎/我落泪情绪零碎.mp3", "周杰伦"],
  ["anzhiyu-believe", "我是如此相信", "最伟大的作品", 266, "anzhiyu-music@1.0.2/我是如此相信/我是如此相信.mp3", "周杰伦"],
  ["anzhiyu-snow", "发如雪", "11月的萧邦", 299, "anzhiyu-music@1.0.3/发如雪/发如雪.mp3", "周杰伦"],
  ["anzhiyu-father", "以父之名", "叶惠美", 342, "anzhiyu-music@1.0.3/以父之名/以父之名.mp3", "周杰伦"],
  ["anzhiyu-fun-fair", "园游会", "七里香", 253, "anzhiyu-music@1.0.3/园游会/园游会.mp3", "周杰伦"],
  ["anzhiyu-compendium", "本草纲目", "依然范特西", 206, "anzhiyu-music@1.0.4/本草纲目/本草纲目.mp3", "周杰伦"],
  ["anzhiyu-tornado", "龙卷风", "杰伦", 250, "anzhiyu-music@1.0.4/龙卷风/龙卷风.mp3", "周杰伦"],
  ["glass-chapter-seven", "夜的第七章", "依然范特西", 228, "music/china/周杰伦 潘儿-夜的第七章.mp3", "周杰伦 / 潘儿"],
  ["glass-far-away", "千里之外", "依然范特西", 254, "music/china/周杰伦 费玉清-千里之外.mp3", "周杰伦 / 费玉清"],
  ["glass-class-3-2", "三年二班", "叶惠美", 280, "music/china/周杰伦-三年二班.mp3", "周杰伦"],
  ["glass-east-wind", "东风破", "叶惠美", 315, "music/china/周杰伦-东风破.mp3", "周杰伦"],
  ["glass-excuse", "借口", "七里香", 258, "music/china/周杰伦-借口.mp3", "周杰伦"],
  ["glass-love-confession", "告白气球", "周杰伦的床边故事", 215, "music/china/周杰伦-告白气球.mp3", "周杰伦"],
  ["glass-back-in-time", "回到过去", "八度空间", 233, "music/china/周杰伦-回到过去.mp3", "周杰伦"],
  ["glass-silence", "安静", "范特西", 334, "music/china/周杰伦-安静.mp3", "周杰伦"],
  ["glass-broken-string", "断了的弦", "寻找周杰伦", 297, "music/china/周杰伦-断了的弦.mp3", "周杰伦"],
  ["glass-longest-movie", "最长的电影", "我很忙", 235, "music/china/周杰伦-最长的电影.mp3", "周杰伦"],
  ["glass-love-bc", "爱在西元前", "范特西", 234, "music/china/周杰伦-爱在西元前.mp3", "周杰伦"],
  ["glass-sweet", "甜甜的", "我很忙", 243, "music/china/周杰伦-甜甜的.mp3", "周杰伦"],
  ["glass-simple-love", "简单爱", "范特西", 271, "music/china/周杰伦-简单爱.mp3", "周杰伦"],
  ["glass-red-dust-inn", "红尘客栈", "十二新作", 275, "music/china/周杰伦-红尘客栈.mp3", "周杰伦"],
  ["glass-chrysanthemum", "菊花台", "依然范特西", 294, "music/china/周杰伦-菊花台.mp3", "周杰伦"],
];

// Python str.split()/strip() whitespace (str.isspace characters).
const PY_WS_CLASS = "[\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000]";
const PY_WS = new RegExp(PY_WS_CLASS + "+", "u");
const PY_STRIP = new RegExp("^" + PY_WS_CLASS + "+|" + PY_WS_CLASS + "+$", "gu");
const pyStrip = (s) => s.replace(PY_STRIP, "");

const CATEGORY_RE = /(?<![\p{L}\p{N}_])const\s+categoryData\s*=\s*/u;
const SRC_RE = /^music\/[\p{L}\p{N}_-]+\/[^/\\\x00-\x1f\x7f]+\.mp3$/iu;

const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** json.JSONDecoder().raw_decode(text, idx)[0] for an object/array value. */
function rawDecode(text, idx) {
  const open = text[idx];
  if (open !== "{" && open !== "[") throw new SyntaxError("Expecting value");
  let depth = 0;
  let inString = false;
  for (let i = idx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(idx, i + 1));
    }
  }
  throw new SyntaxError("Unterminated JSON value");
}

class PublicCatalogSource extends BaseSource {
  constructor() {
    super();
    this.id = "public";
    this.name = "精选原唱库";
    this.priority = 10;
    this._lock = null; // in-flight refresh promise (threading.Lock equivalent)
    this._cache = [];
    this._refreshAt = 0;
  }

  _buildBuiltinEntries() {
    const entries = new Map();
    for (const [tid, title, album, duration, path, artist] of BUILTIN_TRACKS) {
      let url;
      if (tid.startsWith("anzhiyu-")) url = `https://npm.elemecdn.com/${path}`;
      else url = new URL(quote(path), PUBLIC_PLAYER).toString();
      const track = {
        id: tid,
        title,
        artist,
        album,
        duration,
        source: this.id,
        source_name: this.name,
        url,
      };
      entries.set(tid, [searchKey(title), searchKey(artist), track]);
    }
    return entries;
  }

  async _loadCatalog() {
    const entries = this._buildBuiltinEntries();

    try {
      const response = await httpRequest(PUBLIC_PLAYER, {
        headers: { "User-Agent": "EchoLocal/2.0" },
        timeout: 5000,
        maxBytes: Infinity,
      });
      // Python reads MEDIA_LIMIT + 1 bytes and decodes strictly as UTF-8.
      const raw = response.buffer.subarray(0, MEDIA_LIMIT + 1);
      const html = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw);
      const index = CATEGORY_RE.exec(html);
      if (index) {
        const categories = rawDecode(html, index.index + index[0].length);
        if (isDict(categories)) {
          for (const category of Object.values(categories)) {
            const songs = isDict(category) ? category.songs ?? null : null;
            if (!Array.isArray(songs)) continue;
            for (const song of songs) {
              if (!isDict(song)) continue;
              let label = song.title ?? null;
              const path = song.src ?? null;
              if (typeof label !== "string" || !pyStrip(label) || typeof path !== "string" || !SRC_RE.test(path)) {
                continue;
              }
              let artist = song.artist ?? null;
              if (typeof artist !== "string" || !pyStrip(artist)) {
                const sep = label.indexOf("-");
                const prefix = sep === -1 ? label : label.slice(0, sep);
                const title = sep === -1 ? "" : label.slice(sep + 1);
                if (sep !== -1 && pyStrip(title)) {
                  artist = prefix;
                  label = title;
                } else {
                  artist = "";
                }
              }

              const trackId = "public-" + sha256Hex(path).slice(0, 24);
              if (!entries.has(trackId)) {
                const track = {
                  id: trackId,
                  title: pyStrip(label),
                  artist: pyStrip(artist) || "华语群星",
                  album: "精选集",
                  duration: 0,
                  source: this.id,
                  source_name: this.name,
                  url: PUBLIC_PLAYER + quote(path),
                };
                entries.set(trackId, [searchKey(track.title), searchKey(track.artist), track]);
              }
            }
          }
        }
      }
    } catch {
      // Fallback gracefully to built-in entries
    }

    return [...entries.values()];
  }

  async _getEntries() {
    while (this._lock) await this._lock;
    if (monotonic() >= this._refreshAt) {
      this._lock = (async () => {
        try {
          this._cache = await this._loadCatalog();
          this._refreshAt = monotonic() + PUBLIC_CATALOG_TTL;
        } catch {
          if (!this._cache.length) this._cache = [...this._buildBuiltinEntries().values()];
          this._refreshAt = monotonic() + 60;
        }
      })();
      try {
        await this._lock;
      } finally {
        this._lock = null;
      }
    }
    return this._cache;
  }

  async search(query, limit = 50) {
    const entries = await this._getEntries();
    const key = searchKey(query);
    if (!key) return [];
    const words = String(query)
      .split(PY_WS)
      .map((part) => searchKey(part))
      .filter((word) => word);
    const matches = [];
    for (const [title, artist, track] of entries) {
      const combined = [artist + title, title + artist];
      let rank;
      if (combined.includes(key)) rank = 0;
      else if (key === title) rank = 1;
      else if (key === artist) rank = 2;
      else if (
        combined.some((text) => text.includes(key)) ||
        words.every((word) => title.includes(word) || artist.includes(word))
      )
        rank = 3;
      else continue;
      matches.push([rank, track]);
    }
    matches.sort((a, b) => a[0] - b[0]);
    return matches.slice(0, limit).map(([, track]) => ({ ...track }));
  }

  async getMediaUrl(trackId, quality = "standard") {
    const entries = await this._getEntries();
    for (const [, , track] of entries) {
      if (track.id === trackId) return track.url ?? null;
    }
    return null;
  }
}

module.exports = { PublicCatalogSource, PUBLIC_PLAYER, PUBLIC_CATALOG_TTL, BUILTIN_TRACKS };
