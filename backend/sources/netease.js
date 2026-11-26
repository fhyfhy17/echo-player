"use strict";
// Port of sources/netease.py: NetEase Cloud Music public source plugin.
// All music.163.com traffic goes through NeteaseCloudMusicApi Enhanced (../netease_api).

const { call } = require("../netease_api");
const { BaseSource, searchKey } = require("./base");

const NETEASE = "https://music.163.com";
// Python's \b is Unicode-aware, hence the explicit lookarounds.
const ALTERNATE_RECORDING =
  /(?<![\p{L}\p{N}_])(?:cover|live|karaoke|instrumental|remix)(?![\p{L}\p{N}_])|翻唱|翻自|翻唱版|现场|現場|伴奏|消音|纯音乐|純音樂/iu;

// Python str.split() whitespace (str.isspace characters).
const PY_WS = /[\t\n\v\f\r\x1c-\x1f \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/u;

const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isPyInt = (v) => typeof v === "number" && Number.isInteger(v);

/** urllib.parse.urlsplit for absolute URLs: [scheme, netloc, path, query, fragment]. */
function urlsplit(url) {
  let rest = url;
  let scheme = "";
  const m = /^([A-Za-z][A-Za-z0-9+\-.]*):/u.exec(rest);
  if (m) {
    scheme = m[1].toLowerCase();
    rest = rest.slice(m[0].length);
  }
  let netloc = "";
  if (rest.startsWith("//")) {
    const end = rest.slice(2).search(/[/?#]/u);
    netloc = end === -1 ? rest.slice(2) : rest.slice(2, 2 + end);
    rest = end === -1 ? "" : rest.slice(2 + end);
  }
  let fragment = "";
  const hash = rest.indexOf("#");
  if (hash !== -1) {
    fragment = rest.slice(hash + 1);
    rest = rest.slice(0, hash);
  }
  let query = "";
  const q = rest.indexOf("?");
  if (q !== -1) {
    query = rest.slice(q + 1);
    rest = rest.slice(0, q);
  }
  return [scheme, netloc, rest, query, fragment];
}

/** urllib.parse.urlunsplit */
function urlunsplit([scheme, netloc, path, query, fragment]) {
  let url = path;
  if (netloc || (scheme && path.startsWith("//"))) {
    if (path && !path.startsWith("/")) url = "/" + url;
    url = "//" + (netloc || "") + url;
  }
  if (scheme) url = scheme + ":" + url;
  if (query) url = url + "?" + query;
  if (fragment) url = url + "#" + fragment;
  return url;
}

class NeteaseSource extends BaseSource {
  constructor() {
    super();
    this.id = "netease";
    this.name = "网易云音乐(免登录)";
    this.priority = 30;
  }

  /** Python _netease_json(path, params): call the library module, require code == 200. */
  async _neteaseJson(moduleName, params) {
    const response = await call(moduleName, params, 0);
    if (!isDict(response)) throw new Error("Unexpected upstream response structure");
    if (response.code !== 200) throw new Error("NetEase catalog unavailable");
    return response;
  }

  async _getMediaBatch(trackIds) {
    let response;
    try {
      // /api/song/enhance/player/url {ids, br: 128000}
      response = await this._neteaseJson("song_url", { id: trackIds.join(","), br: 128000 });
    } catch {
      return new Map();
    }

    const items = response.data;
    if (!Array.isArray(items)) return new Map();
    const media = new Map();
    for (const item of items) {
      if (!isDict(item)) continue;
      const trackId = item.id ?? null;
      const url = item.url ?? null;
      const duration = item.time ?? null;
      const trial = item.freeTrialPrivilege ?? null;
      if (
        !trackIds.includes(trackId) ||
        item.code !== 200 ||
        !(item.fee === 0 || item.fee === 8) ||
        (item.freeTrialInfo ?? null) !== null ||
        (isDict(trial) && ["listenType", "cannotListenReason"].some((key) => (trial[key] ?? null) !== null)) ||
        item.type !== "mp3" ||
        !isPyInt(duration) ||
        duration <= 0 ||
        typeof url !== "string" ||
        Array.from(url).some((ch) => ch.codePointAt(0) < 33 || ch.codePointAt(0) === 127)
      ) {
        continue;
      }
      const parsed = urlsplit(url);
      if (
        (parsed[0] === "https" || parsed[0] === "http") &&
        /^m[0-9a-z]+\.music\.126\.net$/u.test(parsed[1]) &&
        parsed[2].endsWith(".mp3")
      ) {
        media.set(trackId, [urlunsplit(["https", ...parsed.slice(1)]), duration]);
      }
    }
    return media;
  }

  async search(query, limit = 30) {
    const key = searchKey(query);
    if (!key) return [];
    let response;
    try {
      // /api/search/get/web {s, type: 1, offset: 0, limit, total: true}
      response = await this._neteaseJson("search", { keywords: query, type: 1, offset: 0, limit });
    } catch {
      return [];
    }

    const result = response.result;
    if (!isDict(result)) return [];
    const songs = result.songs;
    if (!Array.isArray(songs)) return [];

    const words = String(query)
      .split(PY_WS)
      .map((part) => searchKey(part))
      .filter((word) => word);
    const candidates = new Map();
    for (const song of songs.slice(0, limit)) {
      if (!isDict(song) || !(song.fee === 0 || song.fee === 8)) continue;
      const trackId = song.id ?? null;
      const title = song.name ?? null;
      const duration = song.duration ?? null;
      const artists = song.artists ?? null;
      const album = song.album ?? null;
      const albumName = isDict(album) ? album.name || "" : "";
      if (
        !isPyInt(trackId) ||
        trackId <= 0 ||
        typeof title !== "string" ||
        !title.trim() ||
        !isPyInt(duration) ||
        duration <= 0 ||
        !Array.isArray(artists) ||
        typeof albumName !== "string" ||
        ALTERNATE_RECORDING.test(title) ||
        ALTERNATE_RECORDING.test(albumName)
      ) {
        continue;
      }
      const artist = artists
        .filter((person) => isDict(person) && typeof person.name === "string")
        .map((person) => person.name)
        .join(" / ");
      if (!artist) continue;
      const baseTitle = title.split(/[(（]/u)[0] || title;
      const titleKey = searchKey(baseTitle);
      const artistKey = searchKey(artist);
      const compactMatch = (artistKey + titleKey).includes(key) || (titleKey + artistKey).includes(key);
      const splitMatch =
        words.some((word) => artistKey.includes(word)) &&
        words.some((word) => titleKey.includes(word)) &&
        words.every((word) => titleKey.includes(word) || artistKey.includes(word));
      if (!(compactMatch || splitMatch)) continue;
      candidates.set(trackId, {
        id: String(trackId),
        title,
        artist,
        album: albumName,
        duration: duration / 1000,
        source: this.id,
        source_name: this.name,
      });
    }
    if (!candidates.size) return [];
    const media = await this._getMediaBatch([...candidates.keys()]);
    const out = [];
    for (const [trackIdInt, track] of candidates) {
      if (media.has(trackIdInt) && Math.abs(track.duration - media.get(trackIdInt)[1] / 1000) <= 3) out.push(track);
    }
    return out;
  }

  async getMediaUrl(trackId, quality = "standard") {
    const text = String(trackId);
    if (!/^\s*[+-]?\d+(?:_\d+)*\s*$/u.test(text)) return null;
    const tid = Number.parseInt(text.trim().replaceAll("_", ""), 10);
    const media = await this._getMediaBatch([tid]);
    const info = media.get(tid);
    return info ? info[0] : null;
  }
}

module.exports = { NeteaseSource, NETEASE, ALTERNATE_RECORDING };
