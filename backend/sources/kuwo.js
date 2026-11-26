"use strict";
// Port of sources/kuwo.py: Kuwo Music source plugin utilizing reverse-engineered car & VIP API channels.
// Delivers full studio-quality 320kbps original audio tracks without DJ/remix pollution.

const { httpRequest } = require("../net");
const { htmlUnescape, quote, urlencode, getLogger } = require("../pyutil");
const { BaseSource } = require("./base");

const logger = getLogger("echo.kuwo");

// Filter out low-quality/disruptive remixes, snippets, and accompaniments.
// Python's \b is Unicode-aware, hence the explicit lookarounds.
const DIRTY_PATTERN =
  /(?<![\p{L}\p{N}_])(?:dj|remix|mashup)(?![\p{L}\p{N}_])|DJ|慢摇|电音|搞笑|堵桥|片段|KTV|伴奏|伴唱|消音|铃声|快手|抖音|粗口|热舞|车载/iu;

// str.splitlines() separators
const SPLITLINES = /\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/u;

/** Python int(value) for the str/int inputs Kuwo returns; throws like ValueError otherwise. */
function pyInt(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("ValueError");
    return Math.trunc(value);
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  const text = String(value);
  if (!/^\s*[+-]?\d+\s*$/u.test(text)) throw new Error("ValueError");
  return Number.parseInt(text.trim(), 10);
}

class KuwoSource extends BaseSource {
  constructor() {
    super();
    this.id = "kuwo";
    this.name = "酷我无损原声";
    this.priority = 15;
    this.supportsPaging = true;
  }

  async search(query, limit = 100, { page = 1 } = {}) {
    const cleanQ = String(query).trim();
    if (!cleanQ) return [];

    const fetchCount = Math.min(Math.max(limit * 2, 80), 200);
    // Using VIP desktop cluster endpoint to surface official master recordings first
    const url =
      `http://search.kuwo.cn/r.s?all=${quote(cleanQ)}` +
      `&ft=music&client=kt&cluster=1&pn=${Math.max(page - 1, 0)}&rn=${fetchCount}` +
      `&rformat=json&encoding=utf8&vipver=MUSIC_9.1.1.2_BCS39`;

    let data;
    try {
      const resp = await httpRequest(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        timeout: 6000,
        maxBytes: Infinity,
      });
      const raw = resp.text();
      const rawFixed = raw.replaceAll("'", '"');
      data = JSON.parse(rawFixed);
    } catch (e) {
      logger.warning("Kuwo search failed: %s", e);
      return [];
    }

    // Python: data.get(...) raises AttributeError when the payload is not a dict.
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new TypeError("'" + (Array.isArray(data) ? "list" : typeof data) + "' object has no attribute 'get'");
    }
    const abslist = data.abslist;
    if (!Array.isArray(abslist)) return [];

    const highQualityTracks = [];
    const fallbackTracks = [];

    for (const item of abslist) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const rawRid = item.MUSICRID;
      if (!rawRid) continue;

      // Normalized rid (digits only or standard prefix)
      const rid = String(rawRid).replaceAll("MUSIC_", "").trim();
      if (!rid) continue;

      const rawTitle = item.SONGNAME || "";
      const rawArtist = item.ARTIST || "";
      const rawAlbum = item.ALBUM || "";

      const title = htmlUnescape(rawTitle).replaceAll("\xa0", " ").trim();
      const artist = htmlUnescape(rawArtist).replaceAll("\xa0", " ").trim();
      const album = htmlUnescape(rawAlbum).replaceAll("\xa0", " ").trim();

      const durationVal = item.DURATION || "0";
      let duration;
      try {
        duration = pyInt(durationVal);
      } catch {
        duration = 0;
      }

      const trackInfo = {
        id: rid,
        title: title || "未知歌曲",
        artist: artist || "未知歌手",
        album: album || "精选专辑",
        duration,
        source: this.id,
        source_name: this.name,
      };

      if (DIRTY_PATTERN.test(title)) fallbackTracks.push(trackInfo);
      else highQualityTracks.push(trackInfo);
    }

    const results = highQualityTracks;
    if (results.length < limit) results.push(...fallbackTracks.slice(0, Math.max(limit - results.length, 0)));

    return results.slice(0, limit);
  }

  /** Resolve master 320k stream via reverse-engineered car mobi endpoint. */
  async _resolveCarMobi(rid, quality = "320kmp3") {
    const params = {
      user: "0",
      source: "kwplayercar_ar_6.0.0.9_B_jiakong_vh.apk",
      type: "convert_url2",
      br: quality,
      format: "mp3",
      rid,
      network: "WIFI",
      f: "web",
      mode: "download",
    };
    const url = "http://anymatch.kuwo.cn/mobi.s?" + urlencode(params);
    try {
      const resp = await httpRequest(url, { headers: { "User-Agent": "okhttp/3.10.0" }, timeout: 5000, maxBytes: Infinity });
      const body = resp.text();
      for (const line of body.split(SPLITLINES)) {
        if (line.startsWith("url=")) {
          const streamUrl = line.slice(line.indexOf("url=") + 4).trim();
          if (streamUrl.startsWith("http://") || streamUrl.startsWith("https://")) return streamUrl;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Fallback to standard antiserver endpoint. */
  async _resolveAntiserver(rid) {
    const url = `http://antiserver.kuwo.cn/anti.s?type=convert_url&rid=MUSIC_${rid}&format=mp3&response=url`;
    try {
      const resp = await httpRequest(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        timeout: 5000,
        maxBytes: Infinity,
      });
      const mediaUrl = resp.text().trim();
      if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) return mediaUrl;
      return null;
    } catch {
      return null;
    }
  }

  async getMediaUrl(trackId, quality = "standard") {
    const cleanRid = String(trackId).replaceAll("MUSIC_", "").trim();
    if (!cleanRid) return null;

    // 1. Primary: 320k Studio Master stream
    let url = await this._resolveCarMobi(cleanRid, "320kmp3");
    if (url) return url;

    // 2. Secondary: 128k stream
    url = await this._resolveCarMobi(cleanRid, "128kmp3");
    if (url) return url;

    // 3. Fallback: Antiserver
    return this._resolveAntiserver(cleanRid);
  }
}

module.exports = { KuwoSource, DIRTY_PATTERN };
