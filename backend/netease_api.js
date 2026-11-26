"use strict";
// NetEase Cloud Music access through NeteaseCloudMusicApi Enhanced
// (https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced, MIT).
// The library handles weapi/eapi encryption, anonymous tokens and headers;
// this module only adds the response cache the Python backend relied on.

const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { TtlCache, singleFlight, getLogger } = require("./pyutil");

const logger = getLogger("echo.netease-api");

// The library writes its anonymous token into os.tmpdir(); make sure it exists.
try {
  fs.mkdirSync(os.tmpdir(), { recursive: true });
  const tokenPath = path.join(os.tmpdir(), "anonymous_token");
  if (!fs.existsSync(tokenPath)) fs.writeFileSync(tokenPath, "", "utf-8");
} catch (err) {
  logger.warning("cannot prepare netease token file: %s", err);
}

let api = null;
function lib() {
  // The library calls dotenv.config() on load; keep it from printing its banner.
  if (process.env.DOTENV_CONFIG_QUIET === undefined) process.env.DOTENV_CONFIG_QUIET = "true";
  if (!api) api = require("@neteasecloudmusicapienhanced/api");
  return api;
}

const cache = new TtlCache(600);
const flight = singleFlight();

class NeteaseApiError extends Error {
  constructor(name, status, body) {
    super(`NetEase API ${name} failed (${status})`);
    this.name = "NeteaseApiError";
    this.code = status;
    this.body = body;
  }
}

/**
 * Call a NeteaseCloudMusicApi module and return its JSON body.
 * @param {string} name   module name, e.g. "cloudsearch", "lyric", "playlist_detail"
 * @param {object} params module query object
 * @param {number} ttl    cache seconds (0 disables caching)
 */
async function call(name, params = {}, ttl = 30 * 60) {
  const fn = lib()[name];
  if (typeof fn !== "function") throw new Error(`Unknown NetEase API module: ${name}`);
  const key = name + "|" + JSON.stringify(params);
  if (ttl > 0) {
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
  }
  return flight(key, async () => {
    let res;
    try {
      res = await fn({ ...params });
    } catch (err) {
      // The library rejects with { status, body } for upstream errors.
      const status = Number(err?.status) || 502;
      throw new NeteaseApiError(name, status, err?.body);
    }
    const body = res?.body;
    if (!body || typeof body !== "object") throw new NeteaseApiError(name, res?.status || 502, body);
    if (ttl > 0) cache.set(key, body, ttl);
    return body;
  });
}

// Thin, named wrappers that match the endpoints the Python backend used.
const ne = {
  /** /api/cloudsearch/pc  (type 1 = songs, 100 = artists) */
  cloudsearch: ({ s, type = 1, limit = 30, offset = 0 }, ttl) =>
    call("cloudsearch", { keywords: s, type, limit, offset }, ttl),
  /** /api/search/get/web */
  search: ({ s, type = 1, limit = 30, offset = 0 }, ttl) => call("search", { keywords: s, type, limit, offset }, ttl),
  /** /api/song/lyric?lv=1&tv=-1 */
  lyric: (id, ttl = 6 * 3600) => call("lyric", { id: String(id) }, ttl),
  /** /api/artist/{id} -> { artist, hotSongs } */
  artist: (id, ttl) => call("artists", { id: String(id) }, ttl),
  /** /api/artist/albums/{id} -> { hotAlbums } */
  artistAlbums: (id, limit = 200, offset = 0, ttl) => call("artist_album", { id: String(id), limit, offset }, ttl),
  /** /api/v1/album/{id} -> { album, songs } */
  album: (id, ttl) => call("album", { id: String(id) }, ttl),
  /** /api/v6/playlist/detail?n=1000 -> { playlist: { trackIds, tracks, ... } } */
  playlistDetail: (id, ttl) => call("playlist_detail", { id: String(id), s: 0 }, ttl),
  /** /api/v3/song/detail -> { songs } */
  songDetail: (ids, ttl) => call("song_detail", { ids: ids.map(String).join(",") }, ttl),
  /** /api/playlist/highquality/list */
  highquality: ({ cat = "全部", limit = 30 }, ttl = 1800) => call("top_playlist_highquality", { cat, limit }, ttl),
  /** /api/toplist */
  toplist: (ttl = 1800) => call("toplist", {}, ttl),
};

module.exports = { call, ne, NeteaseApiError };
