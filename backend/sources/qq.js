"use strict";
// Port of sources/qq.py: QQ Music source plugin with Kuwo master audio stream fallback.

const { httpRequest } = require("../net");
const { htmlUnescape, quote, getLogger } = require("../pyutil");
const { BaseSource } = require("./base");

const logger = getLogger("echo.qq");

const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Python dict.get(key, default) — raises (AttributeError) when obj is not a dict. */
function pyGet(obj, key, fallback = null) {
  if (!isDict(obj)) throw new TypeError(`'${Array.isArray(obj) ? "list" : obj === null ? "NoneType" : typeof obj}' object has no attribute 'get'`);
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : fallback;
}

/** Python iteration over a value that came from `x or []`. */
function pyIter(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return Array.from(value);
  if (isDict(value)) return Object.keys(value);
  if (typeof value === "number" || typeof value === "boolean") throw new TypeError("object is not iterable");
  return [];
}

class QQMusicSource extends BaseSource {
  constructor() {
    super();
    this.id = "qq";
    this.name = "QQ音乐(官方精选)";
    this.priority = 12;
    this.supportsPaging = true;
  }

  async search(query, limit = 40, { page = 1 } = {}) {
    const cleanQ = String(query).trim();
    if (!cleanQ) return [];

    const url = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp` + `?p=${page}&n=${limit}&w=${quote(cleanQ)}&format=json`;

    let data;
    try {
      const resp = await httpRequest(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://y.qq.com/",
        },
        timeout: 5000,
        maxBytes: Infinity,
      });
      data = JSON.parse(resp.text());
    } catch (e) {
      logger.warning("QQ Music search error: %s", e);
      return [];
    }

    const songs = pyGet(pyGet(pyGet(data, "data", {}), "song", {}), "list", []);
    if (!Array.isArray(songs)) return [];

    const tracks = [];
    for (const s of songs) {
      const songmid = pyGet(s, "songmid");
      const songname = pyGet(s, "songname") || "";
      if (!songmid || !songname) continue;

      // Format artists
      const singers = pyGet(s, "singer") || [];
      const names = [];
      for (const a of pyIter(singers)) {
        if (isDict(a) && a.name) {
          const name = pyGet(a, "name", "");
          if (typeof name !== "string") throw new TypeError("sequence item: expected str instance");
          names.push(name);
        }
      }
      const artist = names.join(" / ") || "未知歌手";

      // Album & Cover
      const album = pyGet(s, "albumname") || "";
      const albummid = pyGet(s, "albummid");
      const coverArt = albummid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albummid}.jpg` : null;

      const duration = pyGet(s, "interval") || 0;

      tracks.push({
        id: songmid,
        title: htmlUnescape(songname),
        artist: htmlUnescape(artist),
        album: htmlUnescape(album) || "精选专辑",
        duration,
        art: coverArt,
        source: this.id,
        source_name: this.name,
        // Metadata tags for audio fallback resolution
        songname,
        singername: artist,
      });
    }

    return tracks;
  }

  /** Resolve media URL by matching song title and artist to Kuwo master stream. */
  async getMediaUrl(trackId, quality = "standard") {
    const { manager } = require("./manager");

    // 1. First check if track metadata exists in cache or query QQ song detail
    const url = `https://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?songmid=${trackId}&format=json`;
    let songTitle = "";
    let songArtist = "";
    try {
      const resp = await httpRequest(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Referer: "https://y.qq.com/",
        },
        timeout: 4000,
        maxBytes: Infinity,
      });
      const data = JSON.parse(resp.text());
      const info = (pyGet(data, "data") || [{}])[0];
      songTitle = pyGet(info, "title") || pyGet(info, "name") || "";
      const singers = pyGet(info, "singer") || [];
      if (Array.isArray(singers) ? singers.length : singers) {
        songArtist = pyGet(singers[0], "name") || "";
      }
    } catch {
      // pass
    }

    // 2. Fallback matching via Kuwo
    const kuwoSource = manager.getSource("kuwo");
    if (!kuwoSource || !songTitle) return null;

    // Search Kuwo for exact song title and singer
    const query = `${songTitle} ${songArtist}`.trim();
    let candidates = await kuwoSource.search(query, 5);
    if (!candidates.length) candidates = await kuwoSource.search(songTitle, 5);

    if (candidates.length) {
      // Pick the best candidate and stream via Kuwo reverse channel
      const bestId = candidates[0].id ?? null;
      return kuwoSource.getMediaUrl(bestId, quality);
    }

    return null;
  }
}

module.exports = { QQMusicSource };
