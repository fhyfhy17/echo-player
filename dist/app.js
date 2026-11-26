"use strict";

const icons = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  wave: '<path d="M3 11v2m4-6v10m5-15v20m5-15v10m4-6v2"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  roam: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  chart: '<path d="M4 20h16M6 16v-4m6 4V5m6 11V9"/>',
  note: '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  heart:
    '<path d="M20.8 5.7a5 5 0 0 0-7 0L12 7.5l-1.8-1.8a5 5 0 0 0-7 7l8.8 8.2 8.8-8.2a5 5 0 0 0 0-7Z"/>',
  list: '<path d="M4 6h15M4 11h15m-15 5h9m4 5v-7h4"/><circle cx="15.5" cy="21" r="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  folder:
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
  queue: '<path d="M4 6h15M4 11h15M4 16h8m3-1v6l5-3z"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  shuffle:
    '<path d="M3 6h2c5 0 7 12 12 12h4m-4-4 4 4-4 4M3 18h2c2 0 3-1 4-3m5-6c1-2 2-3 4-3h3m-4-4 4 4-4 4"/>',
  previous:
    '<path fill="currentColor" d="m17 5-10 7 10 7z"/><path d="M5 5v14"/>',
  play: '<path fill="currentColor" d="m8 4 12 8-12 8z"/>',
  pause: '<path fill="currentColor" d="M7 5h3v14H7zm7 0h3v14h-3z"/>',
  next: '<path fill="currentColor" d="m7 5 10 7-10 7z"/><path d="M19 5v14"/>',
  repeat:
    '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
  volume:
    '<path d="M3 9v6h4l5 4V5L7 9zm13 0a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/>',
  muted: '<path d="M3 9v6h4l5 4V5L7 9zm13 1 5 5m0-5-5 5"/>',
  dots: '<path stroke-width="3" d="M5 12h.01M12 12h.01M19 12h.01"/>',
  link: '<path d="m10 14 4-4m-6 6-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m2 8a3.5 3.5 0 0 0 5 0l4-4a3.5 3.5 0 1 0-5-5l-1 1"/>',
  file: '<path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8m-8 4h6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 19h16"/>',
  upload: '<path d="M12 15V3m-5 5 5-5 5 5M4 19h16"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.6 1.3c0 1.7-2.1 2.2-2.1 3.7"/><path d="M12 17.5h.01"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
};
const $ = (selector) => document.querySelector(selector);
const audio = $("#audio");
const main = $("#main");
main.addEventListener(
  "scroll",
  () => {
    if (main.scrollTop + main.clientHeight >= main.scrollHeight - 400)
      loadMoreCatalog();
  },
  { passive: true },
);
const dialog = $("#dialog");
const dialogContent = $("#dialog-content");
const narrow = matchMedia("(max-width: 960px)");
const demos = [
  {
    id: "demo-1",
    title: "夜色频率",
    artist: "回声 · 氛围电子",
    duration: 24,
    tone: 0,
  },
  {
    id: "demo-2",
    title: "渡过蓝色",
    artist: "回声 · 极简器乐",
    duration: 24,
    tone: 1,
  },
  {
    id: "demo-3",
    title: "月台微光",
    artist: "回声 · 柔和合成器",
    duration: 24,
    tone: 2,
  },
].map((track, index) => ({
  ...track,
  source: "demo",
  url: `assets/sample-${index + 1}.wav`,
}));
const demoIds = demos.map((track) => track.id);
const viewNames = {
  discover: "发现",
  daily: "每日推荐",
  charts: "排行榜",
  "online-lists": "在线歌单",
  library: "本地音乐",
  recent: "最近播放",
  favorites: "我喜欢的音乐",
  search: "搜索",
  roam: "私人漫游",
  artist: "歌手",
  album: "专辑",
};
const storageKey = "echo-player-settings-v1";
const searchModes = new Map([
  ["catalog", "在线曲库"],
  ["local", "资料库"],
]);

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

const saved = loadSettings();
if (!saved.lyricOffsets || typeof saved.lyricOffsets !== "object" || Array.isArray(saved.lyricOffsets)) {
  saved.lyricOffsets = {};
}
const tracks = new Map(
  [...demos, ...(saved.remoteTracks || [])].map((track) => [
    track.id,
    track,
  ]),
);
const favorites = new Set(saved.favorites || []);
const history = saved.history || [];
const playlists = saved.playlists || [];
let queue = saved.queue || [];
let shuffleHistory = [];
let currentId = null;
let view = "discover";
let panel = "playing";
let panelOpen = !narrow.matches;
let searchQuery = "";
let searchMode = "catalog";
let searchResults = null;
let catalogPending = false;
let catalogPage = 1;
const roamState = {
  active: false,
  mode: saved.roam?.mode || "default",
  scene: saved.roam?.scene || "",
  banned: Array.isArray(saved.roam?.banned) ? saved.roam.banned : [],
  played: Array.isArray(saved.roam?.played) ? saved.roam.played : [],
  loading: false,
  error: "",
  scenes: [],
};
const tasteState = {
  artists: saved.taste?.artists && typeof saved.taste.artists === "object" ? saved.taste.artists : {},
  tracks: saved.taste?.tracks && typeof saved.taste.tracks === "object" ? saved.taste.tracks : {},
};
let playSession = {
  id: null,
  maxPos: 0,
  playedMs: 0,
  lastTickAt: 0,
  hasStarted: false,
  failed: false,
  finalized: false,
};
let searchArtists = [];
let searchMoreTracks = [];
let searchMoreExpanded = false;
let browseArtist = null;
let browseAlbum = null;
let browseFrom = "search";
let catalogMoreLoading = false;
let catalogHasMore = false;
let charts = null;
let chartsPromise;
let publicLists;
let publicListsPromise;
let openedListId;
let openedFrom = "online-lists";
const publicListDetails = new Map();
const publicListRequests = new Set();
let searchController;
let searchToken = 0;
let toastTimer;
let activeObjectUrl;
let targetVolume = typeof saved.volume === "number" ? Math.min(1, Math.max(0, saved.volume)) : 0.7;
let lastVolume = targetVolume || 0.7;
let fadeVolumeGuard = false;
let quietAudioState = null;
let volumeFade = { raf: 0, timer: 0, token: 0, active: false, kind: "", to: 0, onDone: null };
const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
let shuffle = Boolean(saved.shuffle);
let repeat = [0, 1, 2].includes(saved.repeat) ? saved.repeat : 0;
let database;
let dialogSubmit;
let isImporting = false;
let activeLyric = -1;

function saveSettings() {
  const referenced = new Set([
    ...favorites,
    ...history,
    ...queue,
    ...playlists.flatMap((list) => list.ids),
    ...localTracks()
      .filter((track) => track.source === "url")
      .map((track) => track.id),
  ]);
  const remoteTracks = [...referenced]
    .map((id) => tracks.get(id))
    .filter(
      (track) =>
        track &&
        ["url", "kuwo", "qq", "public", "netease", "public-catalog"].includes(track.source),
    );
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        favorites: [...favorites],
        history,
        playlists,
        queue,
        remoteTracks,
        volume: targetVolume,
        muted: audio.muted,
        shuffle,
        repeat,
        roam: {
          mode: roamState.mode,
          scene: roamState.scene,
          banned: roamState.banned.slice(-200),
          played: roamState.played.slice(-600),
        },
        taste: pruneTasteState(),
        lyricOffsets: saved.lyricOffsets,
      }),
    );
  } catch {
    toast("浏览器存储不可用，设置未能保存");
  }
}

function el(tag, css, content) {
  const element = document.createElement(tag);
  if (css) element.className = css;
  if (content !== undefined) element.textContent = content;
  return element;
}

function applyTheme(theme) {
  const light = theme === "light";
  if (light) document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem("echo-theme-v2", light ? "light" : "dark");
  } catch {}
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    applyIcon(toggle, light ? "moon" : "sun");
    const label = light ? "切换到暗色模式" : "切换到明亮模式";
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#f4f4f7" : "#07070a");
}

function applyIcon(element, name) {
  element.querySelector(":scope > .icon")?.remove();
  element.dataset.icon = name;
  element.insertAdjacentHTML(
    "afterbegin",
    `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`,
  );
}

function button(label, css, iconName, action, value) {
  const iconOnly = /\b(?:icon-button|play-button|roam-btn)\b/.test(css || "");
  const element = el("button", css, iconOnly ? undefined : label);
  element.type = "button";
  if (iconName) applyIcon(element, iconName);
  if (iconOnly) {
    element.setAttribute("aria-label", label);
    element.title = label;
  }
  if (action) element.dataset.action = action;
  if (value !== undefined) element.dataset.value = value;
  return element;
}

function cover(track, css = "") {
  const element = el("span", `cover ${css}`);
  setCover(element, track);
  return element;
}

function setCover(element, track) {
  const hash = [...(track?.id || "")].reduce(
    (sum, ch) => sum + ch.charCodeAt(0),
    0,
  );
  element.dataset.tone = track?.tone ?? hash % 3;
  const art = track?.art || "";
  const prevUrl = element.dataset.artUrl || "";
  const existingImg = element.querySelector(":scope > img");
  if (art && prevUrl === art && existingImg) return;
  const token = String((Number(element.dataset.artToken) || 0) + 1);
  element.dataset.artToken = token;
  if (!art) {
    delete element.dataset.artUrl;
    existingImg?.remove();
    if (!element.querySelector(":scope > .icon")) applyIcon(element, "note");
    return;
  }
  element.dataset.artUrl = art;
  const img = el("img");
  img.alt = "";
  img.referrerPolicy = "no-referrer";
  img.decoding = "async";
  if (existingImg) {
    img.addEventListener("load", () => {
      if (element.dataset.artToken !== token || !element.isConnected) return;
      element.querySelector(":scope > .icon")?.remove();
      existingImg.replaceWith(img);
    });
    img.addEventListener("error", () => {
      if (element.dataset.artToken !== token || !element.isConnected) return;
      delete element.dataset.artUrl;
      existingImg.remove();
      applyIcon(element, "note");
    });
    img.src = art;
  } else if (element.isConnected && element.querySelector(":scope > .icon")) {
    img.addEventListener("load", () => {
      if (element.dataset.artToken !== token || !element.isConnected) return;
      element.replaceChildren(img);
    });
    img.addEventListener("error", () => {
      if (element.dataset.artToken !== token || !element.isConnected) return;
      delete element.dataset.artUrl;
      if (!element.querySelector(":scope > .icon")) applyIcon(element, "note");
    });
    img.src = art;
  } else {
    element.replaceChildren();
    img.addEventListener("error", () => {
      if (element.dataset.artToken === token && img.parentElement === element) {
        delete element.dataset.artUrl;
        img.remove();
        applyIcon(element, "note");
      }
    });
    img.src = art;
    element.append(img);
  }
}

function toast(message) {
  $("#toast").textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $("#toast").textContent = "";
  }, 3200);
}

function timeLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function localTracks() {
  return [...tracks.values()].filter(
    (track) => track.source === "local" || track.source === "url",
  );
}

function resolve(ids) {
  return ids
    .map((id) => tracks.get(id))
    .filter(Boolean);
}

function trackLink(label, kind, value) {
  const link = el("span", "track-link", label);
  link.dataset.link = kind;
  link.dataset.value = value;
  link.tabIndex = 0;
  link.setAttribute("role", "link");
  return link;
}

function trackSubline(track, withSource = true) {
  const line = el("span", "song-artist");
  const parts = [];
  const names = (track.artist || "").split(" / ").filter(Boolean);
  const artistPart = document.createDocumentFragment();
  names.forEach((name, index) => {
    if (index) artistPart.append(" / ");
    const linked = index === 0 && track.artistId && ["kuwo", "netease"].includes(track.source);
    artistPart.append(
      linked
        ? trackLink(name, "artist", browseRef(track, track.artistId))
        : ["kuwo", "qq", "netease"].includes(track.source)
          ? trackLink(name, "artist-name", name)
          : name,
    );
  });
  if (names.length) parts.push(artistPart);
  if (track.album)
    parts.push(track.albumId ? trackLink(track.album, "album", browseRef(track, track.albumId)) : track.album);
  if (withSource && track.reason && view === "daily") parts.push(track.reason);
  parts.forEach((part, index) => {
    if (index) line.append(" · ");
    line.append(part);
  });
  return line;
}

function browseRef(item, id) {
  return item.source === "netease" ? "ne:" + id : String(id);
}

function browseApi(kind, ref) {
  const [isNe, id] = String(ref).startsWith("ne:") ? [true, String(ref).slice(3)] : [false, String(ref)];
  return (isNe ? `/api/netease/${kind}?id=` : `/api/browse/${kind}?id=`) + encodeURIComponent(id);
}

async function openArtistByName(name) {
  try {
    const data = await catalogResponse("/api/netease/artists?" + new URLSearchParams({ query: name }));
    const artist = data.artists?.[0];
    if (artist) return openArtist(browseRef(artist, artist.id));
  } catch {}
  toast(`没有找到歌手「${name}」的主页`);
}

function followTrackLink(link) {
  const { link: kind, value } = link.dataset;
  if (kind === "artist") openArtist(value);
  else if (kind === "artist-name") openArtistByName(value);
  else if (kind === "album") openAlbum(value);
}

function makeRow(track, context = view) {
  const row = el(
    "div",
    `song-row${currentId === track.id ? " current" : ""}`,
  );
  row.dataset.trackId = track.id;
  const play = button(
    "",
    "song-main",
    null,
    track.embed ? "open-embed" : "select-track",
    track.id,
  );
  const copy = el("span", "track-text");
  const titleLine = el("span", "song-title-line");
  titleLine.append(el("strong", "song-name", track.title));
  if (track.sourceLabel && (context.startsWith("catalog") || view === "search" || view === "charts" || view === "daily")) {
    titleLine.append(el("span", "row-source", track.sourceLabel));
  }
  copy.append(titleLine, trackSubline(track));
  play.append(cover(track), copy);
  const heart = button("喜欢", "icon-button", "heart", "favorite", track.id);
  heart.classList.add("song-favorite");
  heart.setAttribute("aria-pressed", String(favorites.has(track.id)));
  const menu =
    context === "queue"
      ? button("移出队列", "icon-button", "x", "dequeue", track.id)
      : button("歌曲选项", "icon-button", "dots", "track-menu", track.id);
  row.append(
    play,
    el("span", "song-time", timeLabel(track.duration)),
    heart,
    menu,
  );
  return row;
}

function syncTrackList(list, items, context = list?.dataset.context || view) {
  if (!list) return;
  list.dataset.context = context;
  list.classList.toggle("queue-list", context === "queue");
  const pool = new Map();
  for (const existing of [...list.children]) {
    const id = existing.dataset?.trackId;
    if (!id) {
      existing.remove();
      continue;
    }
    let bucket = pool.get(id);
    if (!bucket) {
      bucket = [];
      pool.set(id, bucket);
    }
    bucket.push(existing);
  }
  const nextRows = items.map((track) => {
    const bucket = pool.get(track.id);
    const reused = bucket?.shift();
    if (reused) {
      reused.classList.toggle("current", currentId === track.id);
      const coverEl = reused.querySelector(".song-main > .cover");
      if (coverEl) setCover(coverEl, track);
      const nameEl = reused.querySelector(".song-name");
      if (nameEl && nameEl.textContent !== track.title) nameEl.textContent = track.title;
      const timeEl = reused.querySelector(".song-time");
      const nextTime = timeLabel(track.duration);
      if (timeEl && timeEl.textContent !== nextTime) timeEl.textContent = nextTime;
      const heart = reused.querySelector(".song-favorite");
      if (heart) heart.setAttribute("aria-pressed", String(favorites.has(track.id)));
      return reused;
    }
    return makeRow(track, context);
  });
  for (const leftover of pool.values()) {
    for (const node of leftover) node.remove();
  }
  nextRows.forEach((row, index) => {
    const atIndex = list.children[index];
    if (row !== atIndex) list.insertBefore(row, atIndex || null);
  });
}

function rows(items, context = view) {
  const list = el("div", `tracks${context === "queue" ? " queue-list" : ""}`);
  list.dataset.context = context;
  for (const track of items) {
    list.append(makeRow(track, context));
  }
  return list;
}

function pageHead(title, subtitle, action) {
  const element = el("div", "page-head");
  const copy = el("div");
  copy.append(el("h1", "", title));
  if (subtitle) copy.append(el("p", "", subtitle));
  element.append(copy);
  if (action) element.append(action);
  return element;
}

function empty(title, description, action) {
  const element = el("div", "empty");
  const mark = el("span");
  applyIcon(mark, "wave");
  element.append(mark, el("strong", "empty-title", title));
  if (description) element.append(el("span", "", description));
  if (action) element.append(action);
  return element;
}

function section(title, content, action) {
  const element = el("section", "section");
  const heading = el("div", "section-head");
  heading.append(el("h2", "", title));
  if (action) heading.append(action);
  element.append(heading, content);
  return element;
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "夜深了" : h < 11 ? "早上好" : h < 14 ? "中午好" : h < 18 ? "下午好" : "晚上好";
}

function discover() {
  if (!homeHot) loadHomeHot();
  if (!publicLists && !publicListsByCat.has("全部")) loadPublicLists("全部");
  const hot = Array.isArray(homeHot) ? resolve(homeHot) : [];
  const now = tracks.get(currentId);

  // Hero: greeting + a collage of today's hot covers.
  const hero = el("section", "hero");
  const copy = el("div", "hero-copy");
  copy.append(
    el("span", "eyebrow", greeting()),
    el("h1", "", now ? "继续听 " + now.title : "今天想听点什么？"),
    el(
      "p",
      "",
      now
        ? [now.artist, now.album].filter(Boolean).join(" · ")
        : "搜歌手、搜歌名，或者让私人漫游按你的口味一直放下去。",
    ),
  );
  const actions = el("div", "hero-actions");
  actions.append(
    button("开始漫游", "primary", "roam", "go-view", "roam"),
    button("今日热歌", "secondary", "chart", "go-view", "charts"),
  );
  copy.append(actions);
  const collage = el("div", "hero-collage");
  const arts = hot.filter((t) => t.art).slice(0, 5);
  for (const [i, track] of arts.entries()) {
    const tile = button("", `collage-tile t${i}`, null, "play-hot", track.id);
    tile.title = `${track.title} · ${track.artist}`;
    setCover(tile, track);
    collage.append(tile);
  }
  hero.append(copy, collage);
  main.append(hero);

  // Shortcuts.
  const shortcuts = el("div", "shortcuts");
  for (const [label, sub, action, icon] of [
    ["每日推荐", "每天更新", "daily", "calendar"],
    ["私人漫游", "一直听下去", "roam", "roam"],
    ["排行榜", "热歌 · 新歌", "charts", "chart"],
  ]) {
    const item = button("", "shortcut", null, action === "import-playlist" ? action : "go-view", action);
    const mark = el("span", "shortcut-icon");
    applyIcon(mark, icon);
    const text = el("span", "shortcut-copy");
    text.append(el("strong", "", label), el("small", "", sub));
    item.append(mark, text);
    shortcuts.append(item);
  }
  main.append(shortcuts);

  const curated = Array.isArray(publicLists) ? publicLists : publicListsByCat.get("全部");
  if (Array.isArray(curated) && curated.length) {
    main.append(
      section(
        "精选歌单",
        listCards(curated.slice(0, 6), "open-public-list"),
        button("全部歌单 →", "text-button", null, "go-view", "online-lists"),
      ),
    );
  }

  if (hot.length) {
    const top = hot.slice(0, 10);
    main.append(
      section("今日热歌", rows(top, "home-hot"), button("完整榜单 →", "text-button", null, "go-view", "charts")),
    );
  }
  const recent = resolve(history).slice(0, 6);
  if (recent.length) main.append(section("最近播放", rows(recent, "recent")));
}
let homeHot = null;
function syncDiscoverHot() {
  const hot = Array.isArray(homeHot) ? resolve(homeHot) : [];
  const collage = main.querySelector(".hero-collage");
  if (collage) {
    const arts = hot.filter((t) => t.art).slice(0, 5);
    const existingTiles = [...collage.querySelectorAll(".collage-tile")];
    const sameTiles =
      existingTiles.length === arts.length &&
      arts.every((t, i) => existingTiles[i]?.dataset.value === t.id);
    if (!sameTiles) {
      arts.forEach((track, i) => {
        let tile = existingTiles[i];
        if (!tile) {
          tile = button("", `collage-tile t${i}`, null, "play-hot", track.id);
          collage.append(tile);
        } else {
          tile.className = `collage-tile t${i}`;
          tile.dataset.value = track.id;
        }
        tile.title = `${track.title} · ${track.artist}`;
        setCover(tile, track);
      });
      for (let i = arts.length; i < existingTiles.length; i++) existingTiles[i].remove();
    }
  }
  if (!hot.length) return;
  const top = hot.slice(0, 10);
  const existingList = main.querySelector('.tracks[data-context="home-hot"]');
  if (existingList) {
    syncTrackList(existingList, top, "home-hot");
    return;
  }
  const nextSection = section(
    "今日热歌",
    rows(top, "home-hot"),
    button("完整榜单 →", "text-button", null, "go-view", "charts"),
  );
  const shortcuts = main.querySelector(".shortcuts");
  if (shortcuts) shortcuts.after(nextSection);
  else main.prepend(nextSection);
}
async function loadHomeHot() {
  homeHot = "loading";
  try {
    const data = await catalogResponse("/api/netease/chart?id=3778678");
    homeHot = data.tracks.map(kuwoTrack);
  } catch {
    try {
      const data = await catalogResponse("/api/kuwo/chart?id=16");
      homeHot = data.tracks.map(kuwoTrack);
    } catch {
      homeHot = [];
    }
  }
  if (view === "discover") syncDiscoverHot();
}

function renderSearch() {
  main.append(pageHead("搜索", "“" + searchQuery + "”"));
  const tabs = el("div", "search-tabs");
  for (const [mode, label] of searchModes) {
    const tab = button(label, "", null, "search-mode", mode);
    tab.setAttribute("aria-pressed", String(mode === searchMode));
    tabs.append(tab);
  }
  main.append(tabs);
  if (searchMode === "local") {
    const matching = [...localTracks(), ...demos].filter((track) =>
      matchesWords(searchQuery, track.title, track.artist),
    );
    main.append(
      matching.length
        ? rows(matching)
        : empty(
            "资料库中没有匹配歌曲",
            "",
            button("搜索在线音频", "secondary", null, "search-mode", "catalog"),
          ),
    );
  } else if (searchResults?.error) {
    main.append(
      empty(
        searchResults.partial ? "部分在线曲库暂时不可用" : "在线曲库暂时不可用",
        "可以稍后重试这次搜索。",
        button("重试", "secondary", null, "search-mode", searchMode),
      ),
    );
  } else if (searchResults) {
    if (searchMode === "catalog") {
      const items = resolve(searchResults);
      if (!items.length && !searchArtists.length) {
        main.append(empty("没有找到这首歌", "可以试试换个关键词。"));
      } else if (!searchArtists.length && items.length) {
        const topTrack = items[0];
        const spotlight = el("div", `search-spotlight${items.length === 1 ? " single" : ""}`);

        const topCard = el("div", "top-result-card");
        const topHead = el("div", "top-result-head");
        const topPic = cover(topTrack, "top-result-cover");
        const topMeta = el("div", "top-result-meta");
        topMeta.append(
          el("span", "top-result-tag", "最佳匹配"),
          el("strong", "top-result-title", topTrack.title),
          trackSubline(topTrack, false),
        );
        topHead.append(topPic, topMeta);
        const topFoot = el("div", "top-result-actions");
        const playTopBtn = button("播放", "primary small", "play", "play-top-result", topTrack.id);
        const favTopBtn = button("喜欢", "icon-button", "heart", "favorite", topTrack.id);
        favTopBtn.classList.add("song-favorite");
        favTopBtn.setAttribute("aria-pressed", String(favorites.has(topTrack.id)));
        const menuTopBtn = button("歌曲选项", "icon-button", "dots", "track-menu", topTrack.id);
        topFoot.append(playTopBtn, favTopBtn, menuTopBtn);
        topCard.append(topHead, topFoot);
        spotlight.append(section("最佳匹配", topCard));

        if (items.length > 1) {
          spotlight.append(section(`精选歌曲 · ${items.length} 首`, rows(items, "catalog-audio")));
        }
        main.append(spotlight);
      } else {
        if (searchArtists.length) main.append(section("歌手", artistCards(searchArtists)));
        main.append(
          items.length
            ? section(`代表作 · ${items.length} 首`, rows(items, "catalog-audio"))
            : empty("没有找到这首歌", "可以试试换个关键词。"),
        );
      }

      if (searchMoreTracks.length && !catalogPending) {
        const moreWrap = el("section", "section more-versions-box");
        const toggleBtn = button(
          searchMoreExpanded
            ? `收起其他版本与相关歌曲（${searchMoreTracks.length} 首） ▾`
            : `查看其他版本与相关歌曲（${searchMoreTracks.length} 首） ▸`,
          "more-versions-toggle",
          null,
          "toggle-search-more",
        );
        toggleBtn.setAttribute("aria-expanded", String(searchMoreExpanded));
        moreWrap.append(toggleBtn);
        if (searchMoreExpanded) {
          const moreItems = resolve(searchMoreTracks);
          if (moreItems.length) moreWrap.append(rows(moreItems, "catalog-audio-more"));
        }
        main.append(moreWrap);
      }
      if (items.length && !catalogPending && (catalogMoreLoading || catalogHasMore))
        main.append(
          el(
            "p",
            "list-footer",
            catalogMoreLoading ? "正在加载更多…" : "继续下滑加载更多",
          ),
        );
    }
  } else {
    const sk = el("div", "skeleton-list");
    for (let i = 0; i < 6; i++) {
      const r = el("div", "skeleton-row");
      r.append(el("span", "skeleton-art"), el("span", "skeleton-lines"));
      sk.append(r);
    }
    main.append(sk);
  }
}

function renderMain(resetScroll = false) {
  const scroll = resetScroll ? 0 : main.scrollTop;
  main.replaceChildren();
  if (view === "discover") {
    discover();
  } else if (view === "daily") {
    renderDaily();
  } else if (view === "charts") {
    renderCharts();
  } else if (view === "online-lists") {
    renderPublicLists();
  } else if (view === "online-list") {
    renderPublicList();
  } else if (view === "search") {
    renderSearch();
  } else if (view === "roam") {
    renderRoam();
  } else if (view === "artist") {
    renderArtist();
  } else if (view === "album") {
    renderAlbum();
  } else {
    const list = playlists.find((item) => item.id === view);
    const items = list
      ? resolve(list.ids)
      : {
          library: localTracks(),
          recent: resolve(history),
          favorites: resolve([...favorites]),
        }[view] || [];
    const action =
      view === "library"
        ? button("导入音乐", "primary", "plus", "import")
        : view === "favorites"
          ? button("备份 / 恢复", "secondary", "download", "backup-menu")
          : list &&
            button("歌单选项", "secondary", "dots", "playlist-menu", list.id);
    main.append(
      pageHead(list?.name || viewNames[view], `${items.length} 首歌曲`, action),
    );
    if (items.length) {
      const controls = el("div", "actions");
      if (items.some((track) => !track.embed)) {
        controls.append(button("播放全部", "secondary", "play", "play-view"));
        main.append(controls);
      }
      main.append(rows(items));
    } else {
      const descriptions = {
        library: [
          "资料库还是空的",
          "选择文件、文件夹，也可以把音乐直接拖进这里。",
        ],
        recent: ["还没有播放记录", "听过的歌曲会显示在这里。"],
        favorites: ["还没有收藏歌曲", "点歌曲旁的爱心即可收藏。"],
      };
      const [title, description] = descriptions[view] || [
        "这张歌单还是空的",
        "打开歌曲选项，就可以添加歌曲。",
      ];
      main.append(
        empty(
          title,
          description,
          view === "library"
            ? button("选择音乐文件", "secondary", "folder", "files")
            : null,
        ),
      );
    }
  }
  main.scrollTop = scroll;
}

function renderNav() {
  const lists = $("#playlists");
  lists.replaceChildren();
  for (const list of playlists) {
    const item = button("", "", "list");
    item.dataset.view = list.id;
    item.append(el("span", "", list.name));
    item.title = list.name;
    lists.append(item);
  }
  for (const item of document.querySelectorAll(".navigation [data-view]")) {
    const active = item.dataset.view === view;
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  }
  $("#location").textContent =
    viewNames[view] ||
    playlists.find((list) => list.id === view)?.name ||
    "在线歌单";
}

let restoringHistory = false;

function navigate(nextView) {
  if (
    nextView === view &&
    !["artist", "album", "search", "online-list"].includes(nextView) &&
    main.childElementCount > 0
  ) {
    if (view === "roam") syncRoamView();
    return;
  }
  const browsing = nextView === "artist" || nextView === "album";
  if (!restoringHistory && browsing) window.history.pushState({ echoBrowse: true }, "");
  view = nextView;
  renderNav();
  renderMain(true);
  if (view === "charts" && !charts) loadCharts();
  if (view === "online-lists" && !publicLists) loadPublicLists();
}






function listCards(lists, action) {
  const grid = el("div", "album-grid");
  for (const list of lists) {
    const card = button("", "album-card", null, action, list.id);
    const pic = el("span", "album-cover");
    setCover(pic, { id: "pl" + list.id, art: list.art });
    card.append(pic, el("strong", "", list.name), el("small", "", list.sub || ""));
    grid.append(card);
  }
  return grid;
}

async function loadCharts() {
  if (chartsPromise) return;
  charts = null;
  if (view === "charts") renderMain();
  chartsPromise = catalogResponse("/api/netease/charts");
  try {
    const data = await chartsPromise;
    charts = { list: data.charts, active: data.charts[0]?.id, tracks: new Map() };
    await openChart(charts.active);
  } catch {
    charts = { error: true };
  } finally {
    chartsPromise = null;
    if (view === "charts") renderMain();
  }
}

async function openChart(id) {
  if (!charts?.list) return;
  charts.active = Number(id);
  if (view === "charts") renderMain(true);
  if (charts.tracks.has(charts.active)) return;
  try {
    const data = await catalogResponse("/api/netease/chart?id=" + charts.active);
    charts.tracks.set(charts.active, data.tracks.map(kuwoTrack));
  } catch {
    charts.tracks.set(charts.active, { error: true });
  }
  if (view === "charts") renderMain();
}

function renderCharts() {
  main.append(pageHead("排行榜", "网易云音乐 · 每日更新"));
  if (charts?.error)
    return main.append(
      empty("排行榜暂时不可用", "检查网络后再试。", button("重试", "secondary", null, "retry-charts")),
    );
  if (!charts?.list) return main.append(empty("正在加载排行榜"));
  const tabs = el("div", "search-tabs chart-tabs");
  for (const item of charts.list) {
    const tab = button(item.name, "", null, "open-chart", item.id);
    tab.setAttribute("aria-pressed", String(item.id === charts.active));
    tabs.append(tab);
  }
  main.append(tabs);
  const ids = charts.tracks.get(charts.active);
  if (!ids) return main.append(empty("正在加载榜单"));
  if (ids.error)
    return main.append(
      empty("榜单暂时不可用", "", button("重试", "secondary", null, "reload-chart", charts.active)),
    );
  const controls = el("div", "actions");
  controls.append(button("播放全部", "primary", "play", "play-view"));
  main.append(controls, rows(resolve(ids), "charts"));
}

let publicListCat = "全部";
let publicListCats = ["全部", "华语", "欧美", "日语", "粤语", "电子", "民谣", "摇滚", "轻音乐", "影视原声", "怀旧", "治愈"];
const publicListsByCat = new Map();
let publicListsToken = 0;

async function loadPublicLists(cat = publicListCat, force = false) {
  const targetCat = typeof cat === "string" && cat ? cat : publicListCat;
  publicListCat = targetCat;
  if (!force && publicListsByCat.has(targetCat)) {
    publicLists = publicListsByCat.get(targetCat);
    if (view === "online-lists") renderMain(true);
    return;
  }
  const token = ++publicListsToken;
  publicLists = null;
  if (view === "online-lists") renderMain(true);
  try {
    const data = await catalogResponse(
      "/api/netease/playlists?" + new URLSearchParams({ cat: targetCat, limit: "30" }),
    );
    if (token !== publicListsToken) return;
    if (Array.isArray(data.categories) && data.categories.length) {
      publicListCats = data.categories;
    }
    const items = (data.playlists || []).map((list) => {
      const entry = {
        id: String(list.id),
        name: list.name,
        art: list.art,
        sub: `${list.count} 首` + (list.plays ? ` · ${formatCount(list.plays)} 次播放` : ""),
        creator: list.creator,
      };
      publicListDetails.set(entry.id, { ...publicListDetails.get(entry.id), ...entry });
      return entry;
    });
    publicListsByCat.set(targetCat, items);
    publicLists = items;
  } catch {
    if (token !== publicListsToken) return;
    publicLists = { error: true };
  } finally {
    if (token === publicListsToken) {
      if (view === "online-lists") renderMain();
      else if (view === "discover") renderMain();
    }
  }
}

function formatCount(n) {
  return n >= 1e8 ? (n / 1e8).toFixed(1) + "亿" : n >= 1e4 ? Math.round(n / 1e4) + "万" : String(n);
}

function renderPublicLists() {
  main.append(
    pageHead("在线歌单", "网易云精品歌单 · 分类精选", button("导入歌单", "primary", "plus", "import-playlist")),
  );
  const tabs = el("div", "search-tabs chart-tabs");
  for (const cat of publicListCats) {
    const tab = button(cat, "", null, "select-list-cat", cat);
    tab.setAttribute("aria-pressed", String(cat === publicListCat));
    tabs.append(tab);
  }
  main.append(tabs);
  if (publicLists?.error)
    return main.append(
      empty("在线歌单暂时不可用", "检查网络后再试。", button("重试", "secondary", null, "retry-lists")),
    );
  if (!publicLists) return main.append(empty("正在加载在线歌单"));
  main.append(publicLists.length ? listCards(publicLists, "open-public-list") : empty("暂无歌单"));
}

async function openPublicList(id) {
  id = String(id);
  const list = publicListDetails.get(id) || { id };
  publicListDetails.set(id, list);
  if (view !== "online-list") openedFrom = view;
  openedListId = id;
  if (list.items?.error) list.items = null;
  navigate("online-list");
  if (list.items || publicListRequests.has(id)) return;
  publicListRequests.add(id);
  try {
    const data = await catalogResponse("/api/netease/playlist?id=" + encodeURIComponent(id));
    Object.assign(list, { name: data.name || list.name, art: data.art || list.art, brief: data.brief });
    list.items = data.tracks.map(kuwoTrack);
  } catch {
    list.items = { error: true };
  } finally {
    publicListRequests.delete(id);
    if (view === "online-list" && openedListId === id) renderMain();
  }
}

function renderPublicList() {
  const list = publicListDetails.get(openedListId);
  const bar = el("div", "browse-bar");
  bar.append(button("返回", "back-button", "back", "back-to-lists"));
  main.append(bar);
  const head = el("div", "browse-head");
  const pic = el("span", "browse-cover");
  setCover(pic, { id: "pl" + list.id, art: list.art });
  const copy = el("div", "browse-copy");
  copy.append(el("h1", "", list.name || "歌单"));
  const count = Array.isArray(list.items) ? `${list.items.length} 首` : "";
  copy.append(el("p", "", [list.creator, count].filter(Boolean).join(" · ")));
  if (Array.isArray(list.items) && list.items.length) {
    const actions = el("div", "browse-actions");
    actions.append(
      button("播放全部", "primary", "play", "play-view"),
      button("收藏到我的歌单", "secondary", "list", "save-public-list", list.id),
    );
    copy.append(actions);
  }
  head.append(pic, copy);
  main.append(head);
  if (list.brief) main.append(el("p", "browse-brief", list.brief));
  if (!list.items) return main.append(empty("正在加载曲目"));
  if (list.items.error)
    return main.append(
      empty("歌单暂时不可用", "检查网络后再试。", button("重试", "secondary", null, "open-public-list", list.id)),
    );
  main.append(list.items.length ? rows(resolve(list.items), "online-list") : empty("歌单里没有可播放的曲目"));
}

function savePublicList(id) {
  const source = publicListDetails.get(String(id));
  if (!Array.isArray(source?.items) || !source.items.length) return;
  let list = playlists.find((item) => item.publicSource === "kuwo-" + id);
  if (!list) {
    list = { id: `saved-kuwo-${id}`, name: source.name, ids: [...source.items], publicSource: "kuwo-" + id };
    playlists.push(list);
    saveSettings();
    renderNav();
    toast("已收藏到我的歌单");
  }
  navigate(list.id);
}

function showMissingSummary(importedCount, totalCount, missing) {
  const wrap = el("div", "missing-summary");
  wrap.append(
    el(
      "p",
      "dialog-message",
      `已成功匹配并导入 ${importedCount} / ${totalCount} 首歌曲；以下 ${missing.length} 首未匹配到可播放音源：`,
    ),
  );
  const ul = el("ul", "missing-list");
  for (const item of missing) ul.append(el("li", "", item));
  const actions = el("div", "dialog-submit");
  actions.append(button("知道了", "primary", null, "close-dialog"));
  wrap.append(ul, actions);
  openDialog("导入完成", wrap);
}

function showPlaylistImport(defaultMode = "link") {
  let importMode = defaultMode === "text" ? "text" : "link";
  const tabs = el("div", "dialog-tabs");
  const linkTab = button("歌单链接", "", null);
  const textTab = button("批量文本", "", null);
  tabs.append(linkTab, textTab);

  const linkInput = textInput("link", "", "text");
  linkInput.placeholder = "粘贴网易云 / QQ 音乐 / 酷我的歌单分享链接";
  linkInput.maxLength = 2048;
  const linkName = textInput("linkName", "", "text");
  linkName.required = false;
  linkName.maxLength = 60;
  linkName.placeholder = "留空则使用原歌单名称";
  const linkHint = el(
    "p",
    "dialog-message",
    "网易云歌单直接完整导入；QQ 音乐和酷我歌单会按歌名/歌手逐首匹配。",
  );
  const linkPanel = el("div", "");
  linkPanel.append(field("歌单链接", linkInput), field("自定义名称（可选）", linkName), linkHint);

  const textName = textInput("textName", "", "text");
  textName.required = false;
  textName.maxLength = 60;
  textName.placeholder = "文本导入歌单";
  const textarea = el("textarea");
  textarea.name = "text";
  textarea.rows = 7;
  textarea.required = true;
  textarea.maxLength = 65536;
  textarea.placeholder = "每行一首歌，例如：\n晴天 - 周杰伦\n1. 七里香 - 周杰伦 [04:59]\nLemon — 米津玄师";
  const textHint = el(
    "p",
    "dialog-message",
    "支持「歌名 - 歌手」或仅歌名，自动清理编号与时长标记，单次最多解析 120 首。",
  );
  const textPanel = el("div", "");
  textPanel.append(field("歌单名称（可选）", textName), field("歌曲文本", textarea), textHint);

  const syncMode = (nextMode) => {
    importMode = nextMode;
    const isLink = importMode === "link";
    linkTab.setAttribute("aria-pressed", String(isLink));
    textTab.setAttribute("aria-pressed", String(!isLink));
    linkPanel.hidden = !isLink;
    textPanel.hidden = isLink;
    linkInput.disabled = !isLink;
    linkName.disabled = !isLink;
    textarea.disabled = isLink;
    textName.disabled = isLink;
    (isLink ? linkInput : textarea).focus();
  };
  linkTab.addEventListener("click", () => syncMode("link"));
  textTab.addEventListener("click", () => syncMode("text"));

  const content = formContent([tabs, linkPanel, textPanel], "开始导入");
  syncMode(importMode);
  openDialog("导入歌单", content, async (data) => {
    const payload =
      importMode === "link"
        ? {
            link: String(data.get("link") || "").trim(),
            name: String(data.get("linkName") || "").trim(),
          }
        : {
            text: String(data.get("text") || "").trim(),
            name: String(data.get("textName") || "").trim(),
          };
    if (importMode === "link" && !payload.link) return toast("请粘贴歌单链接");
    if (importMode === "text" && !payload.text) return toast("请粘贴歌曲文本");

    const submit = dialogContent.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.textContent = "正在导入并匹配…";
    try {
      const response = await fetch("/api/kuwo/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(180000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "导入失败");
      const imported = Array.isArray(result.tracks) ? result.tracks : [];
      const missing = Array.isArray(result.missing) ? result.missing : [];
      if (!imported.length) {
        if (missing.length) {
          showMissingSummary(0, result.total || missing.length, missing);
          return;
        }
        throw new Error("没有匹配到可播放的歌曲");
      }
      const ids = imported.map(kuwoTrack);
      const list = {
        id: `imported-${Date.now()}`,
        name: result.name || (importMode === "text" ? "文本导入歌单" : "导入的歌单"),
        ids,
      };
      playlists.push(list);
      saveSettings();
      renderNav();
      navigate(list.id);
      if (missing.length) {
        showMissingSummary(ids.length, result.total || ids.length + missing.length, missing);
      } else {
        closeDialog();
        toast(`已导入 ${ids.length} 首到「${list.name}」`);
      }
    } catch (error) {
      submit.disabled = false;
      submit.textContent = "开始导入";
      toast(error.name === "TimeoutError" ? "导入超时，请稍后再试" : error.message);
    }
  });
  syncMode(importMode);
}
function normalizeSearchText(value) {
  return value.normalize("NFKC").toLocaleLowerCase().replaceAll("倫", "伦");
}

function matchesWords(query, ...fields) {
  const candidate = normalizeSearchText(fields.join(" "));
  const words = normalizeSearchText(query)
    .split(/[\s·/,，_-]+/)
    .filter(Boolean);
  return (
    words.length > 0 &&
    words.every(
      (word) =>
        candidate.includes(word) || candidate.replace(/\s/g, "").includes(word),
    )
  );
}

async function catalogResponse(url, signal) {
  const response = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(14000)])
      : AbortSignal.timeout(14000),
  });
  if (!response.ok) throw new Error("Catalog response " + response.status);
  return response.json();
}





function searchKey(value) {
  return normalizeSearchText(value).replace(/[^\p{L}\p{N}]/gu, "");
}


async function searchAudioCatalog(term, signal, token) {
  catalogPending = true;
  catalogPage = 1;
  catalogHasMore = false;
  searchArtists = [];
  searchMoreTracks = [];
  searchMoreExpanded = false;
  searchResults = null;
  navigate("search");
  loadSearchArtists(term, signal, token);
  try {
    const data = await catalogResponse(
      "/api/netease/search?" + new URLSearchParams({ query: term, page: "1" }),
      signal,
    );
    if (token !== searchToken) return;
    searchResults = data.tracks.map(kuwoTrack);
    searchMoreTracks = Array.isArray(data.moreTracks) ? data.moreTracks.map(kuwoTrack) : [];
    catalogHasMore = Boolean(data.hasMore);
  } catch (error) {
    if (token !== searchToken || error.name === "AbortError") return;
    searchResults = { error: true };
  }
  catalogPending = false;
  if (view === "search") renderMain();
}

function kuwoTrack(item) {
  return browseTrack(item);
}

function browseTrack(item) {
  const isNetease = item.source === "netease";
  const source = isNetease ? "netease" : "kuwo";
  const id = (isNetease ? "ne-" : "kuwo-") + item.id;
  const audioParams = new URLSearchParams({
    source,
    id: String(item.id),
    title: item.title || "",
    artist: item.artist || "",
    duration: String(item.duration || 0),
  });
  const fallbackParams = new URLSearchParams(audioParams);
  fallbackParams.set("skip", "kuwo");
  const previous = tracks.get(id);
  tracks.set(id, {
    ...item,
    id,
    source,
    sourceLabel: isNetease ? "网易云" : "酷我原声",
    audioSource: previous?.audioSource,
    audioBvid: previous?.audioBvid,
    selectedAudioUrl: previous?.selectedAudioUrl,
    selectedBvid: previous?.selectedBvid,
    lyrics: previous?.lyrics,
    lyricsMissing: previous?.lyricsMissing,
    url: "/api/catalog/audio?" + audioParams.toString(),
    fallbackUrl: "/api/catalog/audio?" + fallbackParams.toString(),
    permalink: isNetease
      ? "https://music.163.com/#/song?id=" + item.id
      : "https://www.kuwo.cn/play_detail/" + item.id,
  });
  return id;
}

async function loadSearchArtists(term, signal, token) {
  try {
    const data = await catalogResponse(
      "/api/netease/artists?" + new URLSearchParams({ query: term }),
      signal,
    );
    if (token !== searchToken) return;
    searchArtists = Array.isArray(data.artists) ? data.artists.slice(0, 4) : [];
    if (view === "search") renderMain();
  } catch {
    if (token === searchToken) searchArtists = [];
  }
}

function artistCards(list) {
  const items = el("div", "artist-cards");
  for (const artist of list) {
    const card = button("", "artist-card", null, "open-artist", browseRef(artist, artist.id));
    const pic = el("span", "artist-avatar");
    setCover(pic, { id: "ar" + artist.id, art: artist.art });
    const copy = el("span", "mix-copy");
    copy.append(
      el("strong", "", artist.name),
      el("small", "", artist.albumSize ? `${artist.albumSize} 张专辑` : "歌手"),
    );
    card.append(pic, copy);
    items.append(card);
  }
  return items;
}

function albumGrid(albums) {
  const grid = el("div", "album-grid");
  for (const album of albums) {
    const card = button("", "album-card", null, "open-album", album.id);
    const pic = el("span", "album-cover");
    setCover(pic, { id: "al" + album.id, art: album.art });
    const year = album.year || "";
    card.append(
      pic,
      el("strong", "", album.name),
      el("small", "", [year, album.size ? album.size + " 首" : ""].filter(Boolean).join(" · ")),
    );
    grid.append(card);
  }
  return grid;
}

async function openArtist(ref) {
  ref = String(ref);
  if (view !== "artist" && view !== "album") browseFrom = view;
  browseArtist = { id: ref, loading: true, tab: "songs" };
  navigate("artist");
  try {
    const data = await catalogResponse(browseApi("artist", ref));
    if (browseArtist?.id !== ref) return;
    const albums = (data.albums || []).map((al) => ({ ...al, id: browseRef(al.source ? al : data, al.id) }));
    browseArtist = { ...data, id: ref, albums, tab: "songs", ids: data.songs.map(browseTrack) };
  } catch {
    if (browseArtist?.id === ref) browseArtist = { id: ref, error: true };
  }
  if (view === "artist") renderMain();
}

async function openAlbum(ref) {
  ref = String(ref);
  if (view !== "artist" && view !== "album") browseFrom = view;
  browseAlbum = { id: ref, loading: true, from: view };
  navigate("album");
  try {
    const data = await catalogResponse(browseApi("album", ref));
    if (browseAlbum?.id !== ref) return;
    browseAlbum = {
      ...data,
      id: ref,
      artistId: data.artistId ? browseRef(data, data.artistId) : null,
      from: browseAlbum.from,
      ids: data.songs.map(browseTrack),
    };
  } catch {
    if (browseAlbum?.id === ref) browseAlbum = { id: ref, error: true, from: browseAlbum.from };
  }
  if (view === "album") renderMain();
}

function browseHead(title, subtitle, art, back, extra) {
  const bar = el("div", "browse-bar");
  bar.append(button("返回", "back-button", "back", "browse-back", back));
  main.append(bar);
  const head = el("div", "browse-head");
  const pic = el("span", "browse-cover");
  setCover(pic, { id: "bh" + title, art });
  const copy = el("div", "browse-copy");
  copy.append(el("h1", "", title));
  if (subtitle) copy.append(el("p", "", subtitle));
  if (extra) copy.append(extra);
  head.append(pic, copy);
  return head;
}

function renderArtist() {
  const artist = browseArtist;
  if (!artist || artist.loading) return main.append(empty("正在加载歌手"));
  if (artist.error)
    return main.append(
      empty("歌手信息暂时不可用", "检查网络后再试。", button("重试", "secondary", null, "open-artist", artist.id)),
    );
  const actions = el("div", "browse-actions");
  actions.append(button("播放热门 50", "primary", "play", "play-browse", "artist"));
  main.append(
    browseHead(
      artist.name,
      `${artist.songCount || artist.songs.length} 首歌曲 · ${artist.albums.length} 张专辑`,
      artist.art,
      "artist",
      actions,
    ),
  );
  if (artist.brief) main.append(el("p", "browse-brief", artist.brief));
  const tabs = el("div", "search-tabs");
  for (const [tab, label] of [["songs", "热门 50 首"], ["albums", "专辑"]]) {
    const t = button(label, "", null, "artist-tab", tab);
    t.setAttribute("aria-pressed", String(artist.tab === tab));
    tabs.append(t);
  }
  main.append(tabs);
  if (artist.tab === "albums")
    main.append(artist.albums.length ? albumGrid(artist.albums) : empty("没有专辑"));
  else main.append(rows(resolve(artist.ids), "artist-songs"));
}

function renderAlbum() {
  const album = browseAlbum;
  if (!album || album.loading) return main.append(empty("正在加载专辑"));
  if (album.error)
    return main.append(
      empty("专辑暂时不可用", "检查网络后再试。", button("重试", "secondary", null, "open-album", album.id)),
    );
  const year = album.year ? album.year + " · " : "";
  const actions = el("div", "browse-actions");
  actions.append(button("播放专辑", "primary", "play", "play-browse", "album"));
  if (album.artistId)
    actions.append(button(album.artist, "secondary", null, "open-artist", album.artistId));
  main.append(
    browseHead(album.name, `${year}${album.songs.length} 首`, album.art, "album", actions),
  );
  if (album.brief) main.append(el("p", "browse-brief", album.brief));
  main.append(rows(resolve(album.ids), "album-songs"));
}

function browseBack() {
  if (view === "artist" || view === "album") leaveBrowse();
}

function leaveBrowse() {
  restoringHistory = true;
  if (view === "album" && browseAlbum?.from === "artist" && browseArtist) navigate("artist");
  else navigate(browseFrom === "artist" || browseFrom === "album" ? "search" : browseFrom || "search");
  restoringHistory = false;
}

window.addEventListener("popstate", () => {
  if (view === "artist" || view === "album") leaveBrowse();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || dialog.open) return;
  if (view !== "artist" && view !== "album") return;
  const field = event.target instanceof Element
    ? event.target.closest("input, textarea, select, [contenteditable]")
    : null;
  if (field && field.id !== "search-input") return;
  {
    event.preventDefault();
    field?.blur();
    browseBack();
  }
});

const roamModes = [
  ["default", "默认", "沿着你的口味继续听"],
  ["familiar", "熟悉", "喜欢过的歌手与相似歌"],
  ["explore", "探索", "同口味的新歌手"],
];

function roamKey(track) {
  const title = String(track?.title || "");
  const artist = String(track?.artist || "").split(" / ")[0];
  return searchKey(title.replace(/[(（\[【].*?[)）\]】]|-.*$/g, "")) + "|" + searchKey(artist);
}

const TASTE_HALF_LIFE_MS = 14 * 86400 * 1000;
function tasteDecay(updatedAt) {
  const age = Math.max(0, Date.now() - (Number(updatedAt) || 0));
  return Math.pow(0.5, age / TASTE_HALF_LIFE_MS);
}

function tasteArtistName(trackOrArtist) {
  const raw = typeof trackOrArtist === "string" ? trackOrArtist : trackOrArtist?.artist || "";
  return raw.split(" / ")[0].trim();
}

function tasteArtistScore(artistKey) {
  const entry = tasteState.artists[artistKey];
  if (!entry) return 0;
  return (Number(entry.score) || 0) * tasteDecay(entry.updatedAt);
}

function tasteTrackScore(key) {
  const entry = tasteState.tracks[key];
  if (!entry) return 0;
  return (Number(entry.score) || 0) * tasteDecay(entry.updatedAt);
}

function pruneTasteState() {
  const cleanMap = (obj, maxEntries) => {
    const entries = Object.entries(obj || {}).filter(
      ([k, v]) => k && v && typeof v === "object" && (Math.abs(Number(v.score) || 0) * tasteDecay(v.updatedAt) >= 0.05 || (Number(v.completes) || 0) > 0),
    );
    entries.sort((a, b) => {
      const sa = Math.abs(Number(a[1].score) || 0) * tasteDecay(a[1].updatedAt);
      const sb = Math.abs(Number(b[1].score) || 0) * tasteDecay(b[1].updatedAt);
      return sb - sa || (Number(b[1].updatedAt) || 0) - (Number(a[1].updatedAt) || 0);
    });
    return Object.fromEntries(entries.slice(0, maxEntries));
  };
  tasteState.artists = cleanMap(tasteState.artists, 100);
  tasteState.tracks = cleanMap(tasteState.tracks, 200);
  return { artists: tasteState.artists, tracks: tasteState.tracks };
}

function bumpArtistTaste(artistName, delta, field) {
  const cleanName = String(artistName || "").trim();
  const key = searchKey(cleanName);
  if (!key) return;
  const prev = tasteState.artists[key] || { name: cleanName, score: 0, completes: 0, skips: 0, likes: 0, updatedAt: Date.now() };
  const decayed = (Number(prev.score) || 0) * tasteDecay(prev.updatedAt);
  const nextScore = Math.max(-8, Math.min(18, decayed + delta));
  tasteState.artists[key] = {
    name: cleanName || prev.name,
    score: Number(nextScore.toFixed(3)),
    completes: (Number(prev.completes) || 0) + (field === "completes" ? 1 : 0),
    skips: (Number(prev.skips) || 0) + (field === "skips" ? 1 : 0),
    likes: Math.max(0, (Number(prev.likes) || 0) + (field === "likes" ? 1 : field === "unlikes" ? -1 : 0)),
    updatedAt: Date.now(),
  };
}

function bumpTrackTaste(track, delta, field) {
  if (!track || !track.title || track.source === "demo") return;
  const key = roamKey(track);
  if (!key || key === "|") return;
  const prev = tasteState.tracks[key] || {
    id: track.id,
    title: track.title,
    artist: track.artist || "",
    score: 0,
    completes: 0,
    skips: 0,
    updatedAt: Date.now(),
  };
  const decayed = (Number(prev.score) || 0) * tasteDecay(prev.updatedAt);
  const nextScore = Math.max(-6, Math.min(12, decayed + delta));
  tasteState.tracks[key] = {
    id: track.id || prev.id,
    title: track.title || prev.title,
    artist: track.artist || prev.artist,
    score: Number(nextScore.toFixed(3)),
    completes: (Number(prev.completes) || 0) + (field === "completes" ? 1 : 0),
    skips: (Number(prev.skips) || 0) + (field === "skips" ? 1 : 0),
    updatedAt: Date.now(),
  };
}

function recordTasteComplete(track) {
  if (!track || !track.title || track.source === "demo") return;
  bumpArtistTaste(tasteArtistName(track), 1.5, "completes");
  bumpTrackTaste(track, 2.0, "completes");
  saveSettings();
}

function recordTasteSkip(track) {
  if (!track || !track.title || track.source === "demo") return;
  bumpArtistTaste(tasteArtistName(track), -1.0, "skips");
  bumpTrackTaste(track, -2.5, "skips");
  saveSettings();
}

function recordTasteFavorite(track, liked) {
  if (!track || !track.title || track.source === "demo") return;
  bumpArtistTaste(tasteArtistName(track), liked ? 3.0 : -1.5, liked ? "likes" : "unlikes");
  bumpTrackTaste(track, liked ? 3.5 : -1.5, liked ? "likes" : "unlikes");
}

function recordTasteDislike(track) {
  if (!track || !track.title || track.source === "demo") return;
  bumpArtistTaste(tasteArtistName(track), -6.0, "skips");
  bumpTrackTaste(track, -6.0, "skips");
}

function resetPlaySession(id = currentId) {
  playSession = {
    id: id || null,
    maxPos: 0,
    playedMs: 0,
    lastTickAt: 0,
    hasStarted: false,
    failed: false,
    finalized: false,
  };
}

function tickPlaySession() {
  if (!currentId || playSession.id !== currentId || playSession.finalized) return;
  if (audio.paused || audio.readyState < 2) {
    playSession.lastTickAt = 0;
    return;
  }
  const now = performance.now();
  if (playSession.lastTickAt) {
    playSession.playedMs += Math.min(2000, Math.max(0, now - playSession.lastTickAt));
  }
  playSession.lastTickAt = now;
  playSession.hasStarted = true;
  if (Number.isFinite(audio.currentTime)) {
    playSession.maxPos = Math.max(playSession.maxPos, audio.currentTime);
  }
}

function finalizePlaySession(reason) {
  if (!playSession.id || playSession.finalized || playSession.failed) return;
  tickPlaySession();
  playSession.finalized = true;
  const track = tracks.get(playSession.id);
  if (!track || !track.title || track.source === "demo") return;
  const dur = Number.isFinite(audio.duration) ? audio.duration : Number(track.duration) || 0;
  const shortComplete = dur > 0 && dur < 25 && playSession.playedMs >= dur * 700;
  const fullListen = playSession.hasStarted && (
    (reason === "ended" && (playSession.playedMs >= 15000 || shortComplete)) ||
    playSession.playedMs >= 75000 ||
    (dur >= 20 && playSession.maxPos >= dur * 0.72 && playSession.playedMs >= 15000)
  );
  const earlySkip = reason === "switch" &&
    playSession.hasStarted &&
    playSession.playedMs >= 2500 &&
    playSession.playedMs < 30000 &&
    playSession.maxPos < 35 &&
    (!dur || playSession.maxPos < dur * 0.35);
  if (fullListen) recordTasteComplete(track);
  else if (earlySkip) recordTasteSkip(track);
}

function tastePayload() {
  const artistWeights = {};
  const ranked = Object.entries(tasteState.artists)
    .map(([key, entry]) => [key, tasteArtistScore(key), entry])
    .filter(([, score]) => Math.abs(score) >= 0.12)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 80);
  for (const [key, score] of ranked) {
    const norm = Math.max(-0.9, Math.min(2.0, Number((score / 5).toFixed(3))));
    if (norm) artistWeights[key] = norm;
  }
  const skipped = Object.entries(tasteState.tracks)
    .filter(([key, entry]) => (Number(entry.skips) || 0) > 0 && tasteTrackScore(key) <= -0.8)
    .sort((a, b) => (Number(b[1].updatedAt) || 0) - (Number(a[1].updatedAt) || 0))
    .slice(0, 300)
    .map(([key]) => key);
  return { artistWeights, skipped };
}

function tasteSummary() {
  const artists = Object.entries(tasteState.artists)
    .map(([key, entry]) => ({
      key,
      name: entry.name || key,
      score: tasteArtistScore(key),
      completes: Number(entry.completes) || 0,
      skips: Number(entry.skips) || 0,
    }))
    .filter((item) => item.name);
  const topArtists = artists
    .filter((item) => item.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const completes = artists.reduce((sum, item) => sum + item.completes, 0);
  const skips = artists.reduce((sum, item) => sum + item.skips, 0);
  const artistCount = artists.filter((item) => Math.abs(item.score) >= 0.2).length;
  return { topArtists, completes, skips, artistCount };
}

function resetTasteMemory() {
  tasteState.artists = {};
  tasteState.tracks = {};
  resetPlaySession(currentId);
  try {
    localStorage.removeItem(dailyStorageKey);
  } catch {}
  saveSettings();
  toast("已清空本地口味记忆");
  if (view === "roam") syncRoamView();
  else if (view === "daily") renderMain();
}

const dailyStorageKey = "echo-daily-v2"; // v2: QQ-only picks now carry covers
const dailyState = {
  date: "",
  salt: 0,
  ids: [],
  loading: false,
  error: "",
};

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function restoreDailyCache() {
  const today = todayKey();
  if (dailyState.date === today && dailyState.ids.length) return true;
  try {
    const raw = JSON.parse(localStorage.getItem(dailyStorageKey) || "null");
    if (raw && raw.date === today && Array.isArray(raw.tracks) && raw.tracks.length) {
      dailyState.date = raw.date;
      dailyState.salt = Number(raw.salt) || 0;
      dailyState.ids = raw.tracks.map((item) => {
        const existing = tracks.get(item.id);
        const merged = existing ? { ...existing, ...item } : item;
        tracks.set(item.id, merged);
        return item.id;
      });
      return true;
    }
  } catch {
    // Ignore corrupt cache.
  }
  return false;
}

async function loadDaily(forceRefresh = false) {
  if (dailyState.loading) return;
  const today = todayKey();
  if (!forceRefresh && restoreDailyCache()) return;
  dailyState.loading = true;
  dailyState.error = "";
  if (forceRefresh) dailyState.salt = (dailyState.salt || 0) + 1;
  else if (dailyState.date !== today) dailyState.salt = 0;
  dailyState.date = today;
  if (view === "daily") renderMain();

  try {
    const seeds = roamSeeds().slice(0, 10);
    const { artistWeights, skipped } = tastePayload();
    const response = await fetch("/api/kuwo/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seeds,
        bannedArtists: roamState.banned,
        artistWeights,
        skipped,
        date: today,
        salt: String(dailyState.salt),
      }),
    });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.tracks)) {
      throw new Error(data.error || "每日推荐加载失败");
    }
    const list = data.tracks.map((item) => {
      const id = kuwoTrack(item);
      if (item.reason) {
        const stored = tracks.get(id);
        if (stored) stored.reason = item.reason;
      }
      return tracks.get(id);
    }).filter(Boolean);
    dailyState.ids = list.map((t) => t.id);
    try {
      localStorage.setItem(
        dailyStorageKey,
        JSON.stringify({ date: today, salt: dailyState.salt, tracks: list }),
      );
    } catch {
      // Storage quota full: keep in memory.
    }
  } catch (err) {
    dailyState.error = err.message || "每日推荐加载失败";
  } finally {
    dailyState.loading = false;
    if (view === "daily") renderMain();
  }
}

function renderDaily() {
  if (!dailyState.loading && !restoreDailyCache() && !dailyState.error) {
    // loadDaily() re-renders this view itself once loading is set; rendering here as well
    // would append a second header.
    loadDaily(false);
    return;
  }
  const now = new Date();
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const head = el("section", "daily-head");
  const cal = el("div", "daily-cal");
  cal.append(
    el("div", "daily-cal-top", weekdays[now.getDay()]),
    el("div", "daily-cal-day", String(now.getDate())),
  );
  const copy = el("div", "daily-copy");
  const list = resolve(dailyState.ids);
  copy.append(
    el("h1", "", "每日歌曲推荐"),
    el(
      "p",
      "",
      list.length
        ? `根据你的${tasteSummary().artistCount ? "口味记忆与喜欢" : "音乐口味"}生成 · 共 ${list.length} 首 · 每天 0 点更新`
        : "根据你的喜欢与听歌记录每日生成专属歌单",
    ),
  );
  const acts = el("div", "daily-actions");
  if (list.length) {
    acts.append(button("播放全部", "primary", "play", "play-view"));
  }
  acts.append(
    button(dailyState.loading ? "生成中…" : "换一批", "secondary", "roam", "refresh-daily"),
  );
  copy.append(acts);
  head.append(cal, copy);
  main.append(head);

  if (dailyState.loading && !list.length) {
    main.append(empty("正在为你挑选今日歌曲…", "马上就好"));
    return;
  }
  if (dailyState.error && !list.length) {
    const errBox = empty("每日推荐暂时不可用", dailyState.error);
    errBox.append(button("重试", "primary", "roam", "refresh-daily"));
    main.append(errBox);
    return;
  }
  if (list.length) {
    main.append(rows(list, "daily"));
  }
}

function roamSeeds() {
  const banned = new Set(roamState.banned.map(searchKey));
  const candidates = new Map();
  const addCandidate = (track, base) => {
    if (!track || !track.title || track.source === "demo") return;
    const key = roamKey(track);
    if (!key || key === "|") return;
    const artistKey = searchKey(tasteArtistName(track));
    if (banned.has(artistKey)) return;
    const tScore = tasteTrackScore(key);
    if (tScore <= -1.0) return;
    const aScore = Math.max(-2, Math.min(4, tasteArtistScore(artistKey)));
    const score = Math.max(0.3, base + Math.max(-1, tScore * 0.5) + aScore * 0.45);
    const prev = candidates.get(key);
    if (!prev || score > prev.score) {
      candidates.set(key, { title: track.title, artist: track.artist || "", score });
    }
  };
  for (const t of resolve([...favorites])) addCandidate(t, 4.0);
  for (const t of resolve(history.slice(0, 60))) addCandidate(t, 1.8);
  for (const t of resolve(queue.slice(-10))) addCandidate(t, 1.2);
  for (const [key, entry] of Object.entries(tasteState.tracks)) {
    const sc = tasteTrackScore(key);
    if (sc >= 0.8 && entry.title) {
      addCandidate({ title: entry.title, artist: entry.artist || "", source: "taste" }, 2.2);
    }
  }
  return [...candidates.values()]
    .map((item) => ({ ...item, jitter: item.score * (0.65 + Math.random() * 0.7) }))
    .sort((a, b) => b.jitter - a.jitter)
    .slice(0, 8)
    .map((item) => ({
      title: item.title,
      artist: item.artist,
      weight: Math.max(0.5, Math.min(2.5, Number((item.score / 4).toFixed(2)))),
    }));
}

async function fetchRoamBatch() {
  if (roamState.scene) {
    const data = await catalogResponse(
      "/api/kuwo/roam-scene?" + new URLSearchParams({ id: roamState.scene, page: String(1 + Math.floor(Math.random() * 3)) }),
    );
    return data.tracks;
  }
  const seeds = roamSeeds();
  if (!seeds.length) {
    // Cold start: borrow today's hot songs as taste seeds.
    const hot = await catalogResponse("/api/netease/chart?id=3778678");
    seeds.push(...hot.tracks.slice(0, 20).sort(() => Math.random() - 0.5).slice(0, 5)
      .map((t) => ({ title: t.title, artist: t.artist, weight: 1.0 })));
  }
  const { artistWeights, skipped } = tastePayload();
  const exclude = [
    ...roamState.played,
    ...resolve(queue).map(roamKey),
    ...resolve([...favorites]).map(roamKey),
  ];
  const response = await fetch("/api/kuwo/roam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seeds,
      exclude: exclude.slice(-1500),
      skipped,
      bannedArtists: roamState.banned,
      artistWeights,
      mode: roamState.mode,
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error("roam " + response.status);
  return (await response.json()).tracks;
}

async function refillRoam(force = false, playNow = false) {
  if (roamState.loading) return;
  const ahead = queue.length - Math.max(queue.indexOf(currentId), 0) - 1;
  if (!force && ahead >= 4) return;
  roamState.loading = true;
  roamState.error = "";
  if (view === "roam") syncRoamView();
  try {
    const banned = new Set(roamState.banned.map(searchKey));
    // A fresh roam must not hand back the song that is playing right now.
    const known = new Set([...roamState.played, ...resolve(queue).map(roamKey), roamKey(tracks.get(currentId))]);
    const ids = (await fetchRoamBatch())
      .filter((t) => !banned.has(searchKey(t.artist.split(" / ")[0])))
      .map(kuwoTrack)
      .filter((id) => {
        const key = roamKey(tracks.get(id));
        if (known.has(key)) return false;
        known.add(key);
        return true;
      });
    if (!ids.length) throw new Error("empty");
    if (!roamState.active) return;
    if (playNow) {
      // Starting or retuning roam switches to the new batch right away (like NetEase 私人FM),
      // keeping what was already heard so "previous" still works.
      const at = queue.indexOf(currentId);
      const heard = at >= 0 ? queue.slice(Math.max(0, at - 49), at + 1) : [];
      queue = [...heard, ...ids];
      saveSettings();
      setTrack(ids[0]);
    } else {
      queue = [...queue, ...ids];
      saveSettings();
      if (!currentId || (audio.paused && force)) setTrack(queue[queue.indexOf(currentId) + 1] || ids[0]);
    }
    renderPanel();
  } catch (error) {
    roamState.error = error.name === "TimeoutError" ? "推荐超时了，再试一次" : "这会儿没拿到推荐，换个模式或稍后再试";
  } finally {
    roamState.loading = false;
    if (view === "roam") syncRoamView();
  }
}

function startRoam() {
  roamState.active = true;
  shuffle = false;
  repeat = 0;
  updateControls();
  if (view !== "roam") navigate("roam");
  else syncRoamView();
  refillRoam(true, true);
}

function stopRoam() {
  roamState.active = false;
  if (view === "roam") syncRoamView();
}

function setRoamMode(mode) {
  roamState.mode = mode;
  roamState.scene = "";
  resetRoamQueue();
}

function setRoamScene(scene) {
  roamState.scene = roamState.scene === scene ? "" : scene;
  resetRoamQueue();
}

function resetRoamQueue() {
  saveSettings();
  if (!roamState.active) return syncRoamView();
  refillRoam(true, true);
  syncRoamView();
}

function roamDislike() {
  const track = tracks.get(currentId);
  if (!track) return;
  finalizePlaySession("dislike");
  recordTasteDislike(track);
  const artist = (track.artist || "").split(" / ")[0];
  if (artist && !roamState.banned.includes(artist)) roamState.banned.push(artist);
  favorites.delete(track.id);
  // Drop queued songs by the same artist, then skip.
  const key = searchKey(artist);
  const index = queue.indexOf(currentId);
  queue = queue.filter((id, i) => i <= index || searchKey((tracks.get(id)?.artist || "").split(" / ")[0]) !== key);
  saveSettings();
  toast(`不再推荐 ${artist} 的歌`);
  step(1);
}

function roamNoteTrack(id) {
  if (!roamState.active) return;
  const track = tracks.get(id);
  if (!track) return;
  const key = roamKey(track);
  if (!roamState.played.includes(key)) roamState.played.push(key);
  if (roamState.played.length > 800) roamState.played.splice(0, 200);
  refillRoam();
}

async function loadRoamScenes() {
  if (roamState.scenes.length) return;
  try {
    roamState.scenes = (await catalogResponse("/api/kuwo/roam-scenes")).scenes;
    if (view === "roam") syncRoamView();
  } catch {}
}

function buildRoamControls(track) {
  const controls = el("div", "roam-controls");
  if (roamState.active && track) {
    const like = button("喜欢", "roam-btn", "heart", "favorite", track.id);
    like.setAttribute("aria-pressed", String(favorites.has(track.id)));
    controls.append(
      button("不喜欢", "roam-btn", "trash", "roam-dislike"),
      like,
      button("上一首", "roam-btn", "previous", "roam-prev"),
      button(audio.paused ? "播放" : "暂停", "roam-btn primary-round", audio.paused ? "play" : "pause", "roam-toggle"),
      button("下一首", "roam-btn", "next", "roam-next"),
      button("结束漫游", "text-button roam-stop", null, "roam-stop"),
    );
    controls.dataset.mode = "active";
  } else {
    controls.append(button(roamState.loading ? "正在准备…" : "开始漫游", "primary", "roam", "roam-start"));
    controls.dataset.mode = "idle";
  }
  return controls;
}

function buildRoamScenesContent() {
  const scenes = el("div", "search-tabs roam-scenes");
  for (const scene of roamState.scenes) {
    const tab = button(scene.name, "", null, "roam-scene", scene.id);
    tab.setAttribute("aria-pressed", String(roamState.scene === scene.id));
    scenes.append(tab);
  }
  return scenes;
}

function buildRoamTasteSection() {
  const taste = tasteSummary();
  const tasteBox = el("div", "roam-taste");
  if (taste.topArtists.length) {
    const chips = el("div", "roam-banned");
    for (const item of taste.topArtists) {
      const chip = button(item.name, "chip taste-chip", null, "taste-search", item.name);
      chip.title = `偏好权重 +${item.score.toFixed(1)} · 点击搜索歌手`;
      chips.append(chip);
    }
    tasteBox.append(chips);
  }
  tasteBox.append(
    el(
      "p",
      "roam-taste-note",
      taste.artistCount || taste.completes || taste.skips
        ? `已记忆 ${taste.artistCount} 位歌手偏好 · ${taste.completes} 次完整播放 · ${taste.skips} 次早跳过`
        : "完整听歌、红心收藏或切歌跳过都会在本地累积你的听歌偏好",
    ),
  );
  const sec = section(
    "口味记忆",
    tasteBox,
    taste.artistCount || taste.completes || taste.skips
      ? button("清空记忆", "text-button", null, "reset-taste")
      : undefined,
  );
  sec.dataset.roamSection = "taste";
  return sec;
}

function buildRoamBannedSection() {
  const list = el("div", "roam-banned");
  for (const name of roamState.banned.slice(-30).reverse()) list.append(button(name + " ×", "chip", null, "roam-unban", name));
  const sec = section("不再推荐的歌手", list);
  sec.dataset.roamSection = "banned";
  return sec;
}

function renderRoam() {
  loadRoamScenes();
  const track = roamState.active ? tracks.get(currentId) : null;
  const stage = el("section", "roam-stage");
  const art = el("div", "roam-art");
  const disc = el("span", "roam-cover");
  setCover(disc, track || { id: "roam", art: null });
  art.append(disc);
  const info = el("div", "roam-info");
  info.append(el("div", "roam-label", roamState.scene
    ? "场景漫游 · " + (roamState.scenes.find((s) => s.id === roamState.scene)?.name || "")
    : "私人漫游 · " + roamModes.find(([m]) => m === roamState.mode)[1] + "模式"));
  if (track) {
    info.append(el("h1", "", track.title), el("p", "", [track.artist, track.album].filter(Boolean).join(" · ")));
  } else {
    info.append(
      el("h1", "", "私人漫游"),
      el("p", "", "根据你喜欢和常听的歌，一直推荐下去。听得越多、点的喜欢越多，就越准。"),
    );
  }
  info.append(buildRoamControls(track));
  const errEl = el("p", "roam-error", roamState.error || "");
  errEl.hidden = !roamState.error;
  info.append(errEl);
  if (roamState.active && track) {
    const near = track.lyrics?.length
      ? track.lyrics.filter((l) => l.time <= audio.currentTime - getLyricOffset(track.id) + 0.3).pop()
      : null;
    info.append(el("p", "roam-lyric", near ? near.text : "\u00A0"));
  }
  stage.append(art, info);
  main.append(stage);

  const modes = el("div", "search-tabs roam-modes");
  for (const [mode, label, hint] of roamModes) {
    const tab = button(label, "", null, "roam-mode", mode);
    tab.title = hint;
    tab.setAttribute("aria-pressed", String(!roamState.scene && roamState.mode === mode));
    modes.append(tab);
  }
  const modesSec = section("模式", modes);
  modesSec.dataset.roamSection = "modes";
  main.append(modesSec);

  if (roamState.scenes.length) {
    const scenesSec = section("场景 · 心情", buildRoamScenesContent());
    scenesSec.dataset.roamSection = "scenes";
    main.append(scenesSec);
  }
  main.append(buildRoamTasteSection());
  if (roamState.banned.length) main.append(buildRoamBannedSection());
}

function syncRoamView() {
  if (view !== "roam") return;
  const stage = main.querySelector(".roam-stage");
  if (!stage) return renderMain();
  const track = roamState.active ? tracks.get(currentId) : null;
  const disc = stage.querySelector(".roam-cover");
  if (disc) setCover(disc, track || { id: "roam", art: null });
  const info = stage.querySelector(".roam-info");
  if (info) {
    const label = info.querySelector(".roam-label");
    if (label) {
      label.textContent = roamState.scene
        ? "场景漫游 · " + (roamState.scenes.find((s) => s.id === roamState.scene)?.name || "")
        : "私人漫游 · " + roamModes.find(([m]) => m === roamState.mode)[1] + "模式";
    }
    const h1 = info.querySelector("h1");
    const sub = info.querySelector(":scope > p:not(.roam-error):not(.roam-lyric)");
    if (h1) h1.textContent = track ? track.title : "私人漫游";
    if (sub) {
      sub.textContent = track
        ? [track.artist, track.album].filter(Boolean).join(" · ")
        : "根据你喜欢和常听的歌，一直推荐下去。听得越多、点的喜欢越多，就越准。";
    }
    const controls = info.querySelector(".roam-controls");
    const nextMode = roamState.active && track ? "active" : "idle";
    if (!controls || controls.dataset.mode !== nextMode) {
      controls?.replaceWith(buildRoamControls(track));
    } else if (nextMode === "active") {
      const like = controls.querySelector("[data-action='favorite']");
      if (like) {
        like.dataset.value = track.id;
        like.setAttribute("aria-pressed", String(favorites.has(track.id)));
      }
      const toggle = controls.querySelector("[data-action='roam-toggle']");
      if (toggle) {
        applyIcon(toggle, audio.paused ? "play" : "pause");
        toggle.setAttribute("aria-label", audio.paused ? "播放" : "暂停");
        toggle.title = audio.paused ? "播放" : "暂停";
      }
    } else {
      const startBtn = controls.querySelector("[data-action='roam-start']");
      if (startBtn) {
        const labelText = roamState.loading ? "正在准备…" : "开始漫游";
        for (const node of startBtn.childNodes) {
          if (node.nodeType === 3) {
            node.textContent = labelText;
            break;
          }
        }
      }
    }
    const errEl = info.querySelector(".roam-error");
    if (errEl) {
      errEl.textContent = roamState.error || "";
      errEl.hidden = !roamState.error;
    }
    let lyricEl = info.querySelector(".roam-lyric");
    if (roamState.active && track) {
      const near = track.lyrics?.length
        ? track.lyrics.filter((l) => l.time <= audio.currentTime - getLyricOffset(track.id) + 0.3).pop()
        : null;
      const nextText = near ? near.text : "\u00A0";
      if (!lyricEl) {
        lyricEl = el("p", "roam-lyric", nextText);
        info.append(lyricEl);
      } else if (lyricEl.textContent !== nextText) {
        lyricEl.textContent = nextText;
      }
    } else {
      lyricEl?.remove();
    }
  }
  for (const tab of main.querySelectorAll(".roam-modes [data-action='roam-mode']")) {
    tab.setAttribute("aria-pressed", String(!roamState.scene && roamState.mode === tab.dataset.value));
  }
  const modesSec = main.querySelector('[data-roam-section="modes"]');
  let scenesSec = main.querySelector('[data-roam-section="scenes"]');
  if (roamState.scenes.length) {
    if (!scenesSec) {
      scenesSec = section("场景 · 心情", buildRoamScenesContent());
      scenesSec.dataset.roamSection = "scenes";
      modesSec?.after(scenesSec);
    } else {
      for (const tab of scenesSec.querySelectorAll("[data-action='roam-scene']")) {
        tab.setAttribute("aria-pressed", String(roamState.scene === tab.dataset.value));
      }
    }
  }
  const tasteSec = main.querySelector('[data-roam-section="taste"]');
  const taste = tasteSummary();
  const tasteKey = `${taste.artistCount}:${taste.completes}:${taste.skips}:${taste.topArtists.map((a) => `${a.name}=${a.score.toFixed(1)}`).join(",")}`;
  if (!tasteSec) {
    const nextTaste = buildRoamTasteSection();
    nextTaste.dataset.tasteKey = tasteKey;
    main.append(nextTaste);
  } else if (tasteSec.dataset.tasteKey !== tasteKey) {
    const nextTaste = buildRoamTasteSection();
    const head = tasteSec.querySelector(".section-head");
    const nextHead = nextTaste.querySelector(".section-head");
    const body = tasteSec.querySelector(".roam-taste");
    const nextBody = nextTaste.querySelector(".roam-taste");
    if (head && nextHead) head.replaceWith(nextHead);
    if (body && nextBody) body.replaceWith(nextBody);
    tasteSec.dataset.tasteKey = tasteKey;
  }
  const bannedSec = main.querySelector('[data-roam-section="banned"]');
  const bannedKey = roamState.banned.slice(-30).join("\0");
  if (roamState.banned.length) {
    if (!bannedSec) {
      const nextBanned = buildRoamBannedSection();
      nextBanned.dataset.bannedKey = bannedKey;
      main.append(nextBanned);
    } else if (bannedSec.dataset.bannedKey !== bannedKey) {
      const list = bannedSec.querySelector(".roam-banned");
      const nextBanned = buildRoamBannedSection();
      const nextList = nextBanned.querySelector(".roam-banned");
      if (list && nextList) list.replaceWith(nextList);
      bannedSec.dataset.bannedKey = bannedKey;
    }
  } else {
    bannedSec?.remove();
  }
}

async function loadMoreCatalog() {
  if (catalogMoreLoading || !catalogHasMore || catalogPending) return;
  if (view !== "search" || searchMode !== "catalog" || !Array.isArray(searchResults)) return;
  catalogMoreLoading = true;
  const token = searchToken;
  const next = catalogPage + 1;
  const footer = $(".list-footer");
  if (footer) footer.textContent = "正在加载更多…";
  else renderMain();
  try {
    const data = await catalogResponse(
      "/api/netease/search?" + new URLSearchParams({ query: searchQuery, page: String(next) }),
      searchController?.signal,
    );
    if (token !== searchToken) return;
    const seen = new Set(searchResults);
    const fresh = data.tracks.map(kuwoTrack).filter((id) => !seen.has(id));
    catalogPage = next;
    catalogHasMore = data.hasMore && fresh.length > 0;
    searchResults = searchResults.concat(fresh);
  } catch {
    catalogHasMore = false;
  } finally {
    if (token === searchToken) {
      catalogMoreLoading = false;
      if (view === "search") renderMain();
    }
  }
}

async function performSearch(query, mode = "catalog") {
  const term = query.trim();
  if (!term) return;
  searchQuery = term;
  $("#search-input").value = term;
  searchMode = mode;
  const token = ++searchToken;
  searchController?.abort();
  searchController = new AbortController();
  const { signal } = searchController;
  if (mode === "catalog") return searchAudioCatalog(term, signal, token);
  catalogPending = false;
  searchResults = [];
  navigate("search");
}

function updateTimeline() {
  tickPlaySession();
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  const position = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  $("#seek").disabled = duration <= 0;
  $("#seek").value = duration ? (position / duration) * 1000 : 0;
  $("#seek").style.setProperty("--fill", (duration ? (position / duration) * 100 : 0) + "%");
  $("#elapsed").textContent = timeLabel(position);
  $("#duration").textContent = timeLabel(duration);
  if (panel === "lyrics" || immersiveOpen) syncLyrics(position);
  if (view === "roam") syncRoamLyric();
  if (immersiveOpen) syncImmersiveTimeline(position, duration);
}

const CREDIT_LINE =
  /^(?:[^:：\n]{1,18}\s*[:：]\s*\S|.{1,36}\s+-\s+.{1,36}$|(?:作词|作曲|编曲|词|曲|制作人?|监制|艺人统筹|统筹|企划|出品人?|策划|推广|发行|版权|词曲版权|版税|代理|混音|母带|录音|配唱|和声|合声|和音|人声|音频|剪辑|弦乐|吉他|贝斯|鼓|键盘|钢琴|封面|视觉|设计|鸣谢|OP|SP|Lyricist|Composer|Arranger|Producer|Mixed|Mastered)\b|(?:Music|Lyrics|Words|Written|Composed|Produced|Arranged|Mixed|Mastered|Performed)\s+by\b)/i;
const STRICT_CREDIT_LINE = /^[^:：。！？,.!?\n]{1,18}\s*[:：]\s*\S/;
let showLyricCredits = false;

function splitLyrics(lines) {
  const list = Array.isArray(lines) ? lines : [];
  let firstLyric = 0;
  while (firstLyric < list.length && firstLyric < 35 && CREDIT_LINE.test((list[firstLyric].text || "").trim())) {
    firstLyric++;
  }
  let lastLyric = list.length;
  while (
    lastLyric > firstLyric &&
    list.length - lastLyric < 15 &&
    STRICT_CREDIT_LINE.test((list[lastLyric - 1].text || "").trim())
  ) {
    lastLyric--;
  }
  const tailCount = list.length - lastLyric;
  if (tailCount < 2) lastLyric = list.length;
  const headCredits = list.slice(0, firstLyric);
  const tailCredits = list.slice(lastLyric);
  const lyricLines = list.slice(firstLyric, lastLyric);
  // If all lines looked like credits (e.g. spoken-word track), keep everything as body.
  if (!lyricLines.length) {
    return { credits: [], tailCredits: [], lyricLines: list, body: list };
  }
  return { credits: headCredits, tailCredits, lyricLines, body: lyricLines };
}

function buildCreditsBar(credits) {
  if (!credits.length) return null;
  const box = el("div", "lyric-credits-box");
  const cleanItems = credits.filter((c) => c.text && c.text.trim());
  if (!cleanItems.length) return null;
  const creditOnly = cleanItems.filter((c) => /[:：]/.test(c.text));
  const displayItems = creditOnly.length ? creditOnly : cleanItems;
  if (displayItems.length <= 3) {
    const plain = el("div", "lyric-credits-plain");
    for (const c of displayItems) plain.append(el("div", "lyric-credit-line", c.text.trim()));
    box.append(plain);
    return box;
  }
  const preview = displayItems[0].text.trim();
  const toggle = button(
    showLyricCredits ? `收起制作信息 (${cleanItems.length}) ▾` : `${preview} · 等 ${cleanItems.length} 项制作信息 ▸`,
    "lyric-credits-toggle",
    null,
    "toggle-lyric-credits",
  );
  toggle.setAttribute("aria-expanded", String(showLyricCredits));
  box.append(toggle);
  if (showLyricCredits) {
    const list = el("div", "lyric-credits-list");
    for (const c of cleanItems) list.append(el("div", "lyric-credit-item", c.text.trim()));
    box.append(list);
  }
  return box;
}

function getLyricOffset(id = currentId) {
  if (!id) return 0;
  const val = saved.lyricOffsets?.[id];
  return typeof val === "number" && Number.isFinite(val) ? val : 0;
}

function formatLyricOffset(offset) {
  if (!offset) return "0.0s";
  return `${offset > 0 ? "+" : ""}${offset.toFixed(1)}s`;
}

function setLyricOffset(delta, reset = false) {
  if (!currentId) return;
  const next = reset
    ? 0
    : Math.max(-30, Math.min(30, Math.round((getLyricOffset(currentId) + delta) * 10) / 10));
  if (next === 0) delete saved.lyricOffsets[currentId];
  else saved.lyricOffsets[currentId] = next;
  saveSettings();
  for (const valBtn of document.querySelectorAll(".lyric-offset-val")) {
    valBtn.textContent = formatLyricOffset(next);
    valBtn.classList.toggle("is-tuned", next !== 0);
  }
  activeLyric = -2;
  syncLyrics(audio.currentTime, false);
  if (view === "roam") syncRoamLyric();
}

function syncLyrics(position, smooth = true) {
  const rawLines = resolve([currentId])[0]?.lyrics || [];
  const { lyricLines } = splitLyrics(rawLines);
  const lyricPos = position - getLyricOffset(currentId);
  let next = -1;
  for (let i = 0; i < lyricLines.length && lyricLines[i].time <= lyricPos + 0.25; i++) next = i;
  if (next === activeLyric && !immersiveOpen) return;
  activeLyric = next;
  for (const scroller of document.querySelectorAll("#panel-content .lyric-scroll, #immersive-stage .lyric-scroll")) {
    for (const line of scroller.querySelectorAll(".lyric-line[data-line]")) {
      const index = Number(line.dataset.line);
      const distance = next < 0 ? Math.min(index + 1, 4) : Math.abs(index - next);
      if (index === next) line.setAttribute("aria-current", "true");
      else line.removeAttribute("aria-current");
      line.style.setProperty("--dist", String(Math.min(distance, 4)));
    }
    if (lyricUserScrolling) continue;
    const target = scroller.querySelector(`[data-line="${Math.max(next, 0)}"]`);
    if (target) {
      const lineBox = target.getBoundingClientRect();
      const boxTop = scroller.getBoundingClientRect().top;
      const top = scroller.scrollTop + (lineBox.top - boxTop) - scroller.clientHeight / 2 + lineBox.height / 2;
      scroller.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
    }
  }
}

let lyricUserScrolling = false;
let showLyricTrans = localStorage.getItem("echo-lyric-trans") !== "0";
let lyricScrollTimer;
let renderedPanelKind = "";
let renderedPanelTrackId = "";
let renderedPanelQueueKey = "";
let renderedPanelLyricKey = "";

function syncCurrentRows() {
  for (const row of document.querySelectorAll(".song-row")) {
    const btn = row.querySelector("[data-action='select-track'], [data-action='open-embed']");
    row.classList.toggle("current", Boolean(btn && btn.dataset.value === currentId));
  }
}

function syncTrackDuration(track) {
  if (!track) return;
  const label = timeLabel(track.duration);
  for (const row of document.querySelectorAll(".song-row")) {
    const btn = row.querySelector("[data-action='select-track'], [data-action='open-embed']");
    if (btn?.dataset.value === track.id) {
      const timeEl = row.querySelector(".song-time");
      if (timeEl) timeEl.textContent = label;
    }
  }
}

function syncDiscoverHero() {
  const now = tracks.get(currentId);
  const h1 = main.querySelector(".hero-copy h1");
  const sub = main.querySelector(".hero-copy > p");
  if (!h1 || !sub) return;
  h1.textContent = now ? "继续听 " + now.title : "今天想听点什么？";
  sub.textContent = now
    ? [now.artist, now.album].filter(Boolean).join(" · ")
    : "搜歌手、搜歌名，或者让私人漫游按你的口味一直放下去。";
}

function syncDiscoverRecent() {
  const recent = resolve(history).slice(0, 6);
  const existing = main.querySelector('.tracks[data-context="recent"]');
  if (!recent.length) {
    existing?.closest("section.section")?.remove();
    return;
  }
  if (existing) syncTrackList(existing, recent, "recent");
  else main.append(section("最近播放", rows(recent, "recent")));
}

function syncRecentView() {
  const items = resolve(history);
  const subtitle = main.querySelector(".page-head p");
  const existing = main.querySelector('.tracks[data-context="recent"]');
  if (!items.length || !existing) return renderMain();
  if (subtitle) subtitle.textContent = `${items.length} 首歌曲`;
  syncTrackList(existing, items, "recent");
}

function syncFavoritesView() {
  const items = resolve([...favorites]);
  const subtitle = main.querySelector(".page-head p");
  const existing = main.querySelector(".tracks");
  if (!items.length || !existing) return renderMain();
  if (subtitle) subtitle.textContent = `${items.length} 首歌曲`;
  syncTrackList(existing, items, "favorites");
}

function syncRoamLyric() {
  const info = main.querySelector(".roam-info");
  const track = roamState.active ? tracks.get(currentId) : null;
  if (!info || !track) return;
  let line = info.querySelector(".roam-lyric");
  const near = track.lyrics?.length
    ? track.lyrics.filter((l) => l.time <= audio.currentTime - getLyricOffset(track.id) + 0.3).pop()
    : null;
  const nextText = near ? near.text : "\u00A0";
  if (!line) {
    line = el("p", "roam-lyric", nextText);
    info.append(line);
  } else if (line.textContent !== nextText) {
    line.textContent = nextText;
  }
}

function buildPlayingActions(track) {
  if (!track?.permalink) return null;
  const actions = el("div", "panel-actions");
  const link = el(
    "a",
    "text-button",
    {
      netease: "在网易云音乐查看",
      "public-catalog": "查看音源",
      qq: "在 QQ 音乐查看",
      kuwo: "在酷我音乐查看",
      public: "查看音源",
    }[track.source] || "查看来源",
  );
  link.href = track.permalink;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  actions.append(link);
  return actions;
}

function renderPanel() {
  const container = $("#panel-content");
  const track = tracks.get(currentId);
  for (const tab of document.querySelectorAll("[data-panel]")) {
    tab.setAttribute("aria-pressed", String(tab.dataset.panel === panel));
  }
  if (panel === "queue") {
    // Roam is a radio: never reveal upcoming picks, only what has already played.
    const items = roamState.active ? resolve(queue.slice(0, queue.indexOf(currentId) + 1)) : resolve(queue);
    const queueKey = items.map((t) => t.id).join("\0");
    const existing = container.querySelector(".tracks");
    if (renderedPanelKind === "queue") {
      if (!items.length) {
        if (!container.querySelector(".empty")) {
          container.replaceChildren(empty("队列为空", "播放曲目或把歌曲加入队列。"));
        }
        renderedPanelQueueKey = "";
        return;
      }
      if (existing) {
        if (renderedPanelQueueKey === queueKey) {
          syncCurrentRows();
          return;
        }
        const scroll = container.scrollTop;
        syncTrackList(existing, items, "queue");
        renderedPanelQueueKey = queueKey;
        container.scrollTop = scroll;
        return;
      }
    }
    container.replaceChildren(
      items.length
        ? rows(items, "queue")
        : empty("队列为空", "播放曲目或把歌曲加入队列。"),
    );
    renderedPanelKind = "queue";
    renderedPanelTrackId = "";
    renderedPanelQueueKey = queueKey;
    renderedPanelLyricKey = "";
    return;
  }
  if (panel === "lyrics") {
    const trackId = track?.id || "";
    const lyricKey = `${trackId}:${track?.lyrics?.length || 0}:${track?.lyricsMissing ? 1 : 0}:${showLyricTrans ? 1 : 0}`;
    if (renderedPanelKind === "lyrics" && renderedPanelLyricKey === lyricKey && container.querySelector(".lyric-view")) {
      syncLyrics(audio.currentTime, false);
      return;
    }
    const canReuseHead =
      renderedPanelKind === "lyrics" &&
      renderedPanelTrackId === trackId &&
      Boolean(container.querySelector(".lyric-view"));
    let view = canReuseHead ? container.querySelector(".lyric-view") : null;
    if (view) {
      const head = view.querySelector(".lyric-head");
      if (head && track) {
        let toggle = head.querySelector(".lyric-trans-toggle");
        if (track.lyrics?.some((l) => l.trans)) {
          if (!toggle) {
            toggle = button("译", "lyric-trans-toggle", null, "toggle-lyric-trans");
            head.append(toggle);
          }
          toggle.setAttribute("aria-pressed", String(showLyricTrans));
          toggle.title = showLyricTrans ? "隐藏翻译" : "显示翻译";
        } else {
          toggle?.remove();
        }
      }
      for (const child of [...view.children]) {
        if (child !== head) child.remove();
      }
      container.querySelector(".panel-actions")?.remove();
    } else {
      container.replaceChildren();
      view = el("div", "lyric-view");
      if (track) {
        const head = el("div", "lyric-head");
        const art = cover(track, "lyric-art");
        const copy = el("div", "lyric-meta");
        copy.append(el("strong", "", track.title), el("span", "", [track.artist, track.album].filter(Boolean).join(" · ")));
        head.append(art, copy);
        const expBtn = button("全屏沉浸", "icon-button panel-expand-btn", "expand", "toggle-immersive");
        head.append(expBtn);
        if (track.lyrics?.some((l) => l.trans)) {
          const toggle = button("译", "lyric-trans-toggle", null, "toggle-lyric-trans");
          toggle.setAttribute("aria-pressed", String(showLyricTrans));
          toggle.title = showLyricTrans ? "隐藏翻译" : "显示翻译";
          head.append(toggle);
        }
        view.append(head);
      }
      container.append(view);
    }
    activeLyric = -1;
    if (track?.lyrics?.length) {
      const { credits, tailCredits, lyricLines } = splitLyrics(track.lyrics);
      const creditsBar = buildCreditsBar(credits);
      if (creditsBar) view.append(creditsBar);
      const scroller = el("div", "lyric-scroll");
      scroller.append(el("div", "lyric-pad"));
      for (const [index, line] of lyricLines.entries()) {
        const item = button(line.text, "lyric-line", null, "seek-lyric", line.time);
        if (line.trans && showLyricTrans) item.append(el("small", "lyric-trans", line.trans));
        item.dataset.line = index;
        item.style.setProperty("--dist", String(Math.min(index + 1, 4)));
        scroller.append(item);
      }
      for (const tc of tailCredits) {
        scroller.append(el("div", "lyric-line lyric-credit", tc.text));
      }
      scroller.append(el("div", "lyric-pad"));
      const markUserScroll = () => {
        lyricUserScrolling = true;
        clearTimeout(lyricScrollTimer);
        lyricScrollTimer = setTimeout(() => {
          lyricUserScrolling = false;
          activeLyric = -2;
          syncLyrics(audio.currentTime);
        }, 2500);
      };
      scroller.addEventListener("wheel", markUserScroll, { passive: true });
      scroller.addEventListener("touchmove", markUserScroll, { passive: true });
      view.append(scroller);
      requestAnimationFrame(() => syncLyrics(audio.currentTime, false));
    } else {
      if (track && !track.lyricsMissing && !track.lyricsError && isOnlineTrack(track)) loadOnlineLyrics(track);
      const loading = track && !track.lyricsMissing && !track.lyricsError && !["local", "url", "demo"].includes(track.source);
      view.append(
        empty(
          track?.lyricsError ? "歌词加载失败" : loading ? "正在加载歌词…" : "暂无歌词",
          track?.source === "local" ? "可导入同名 LRC 文件，也可以为这首歌选择歌词。" : "",
          track?.lyricsError ? button("重试加载歌词", "secondary", null, "retry-lyrics") : undefined,
        ),
      );
      if (track?.source === "local") {
        const actions = el("div", "panel-actions");
        actions.append(button("选择 LRC 文件", "secondary", "file", "attach-lyrics", track.id));
        container.append(actions);
      }
    }
    renderedPanelKind = "lyrics";
    renderedPanelTrackId = trackId;
    renderedPanelQueueKey = "";
    renderedPanelLyricKey = lyricKey;
    return;
  }
  const trackId = track?.id || "";
  const existingAlbum = renderedPanelKind === "playing" ? container.querySelector(".panel-album") : null;
  if (existingAlbum) {
    existingAlbum.classList.toggle("standby", !track);
    setCover(existingAlbum, track);
    const h2 = container.querySelector(":scope > h2");
    if (h2) h2.textContent = track?.title || "还没有播放歌曲";
    const sub = container.querySelector(":scope > .panel-sub, :scope > p");
    const nextSub = track ? Object.assign(trackSubline(track, false), { className: "panel-sub" }) : el("p", "", "从发现或本地资料库选择一首歌。");
    if (sub) sub.replaceWith(nextSub);
    else container.append(nextSub);
    const existingActions = container.querySelector(":scope > .panel-actions");
    const nextActions = buildPlayingActions(track);
    if (nextActions) {
  if (immersiveOpen) {
    const iPlay = $("#immersive-play");
    if (iPlay) {
      applyIcon(iPlay, paused ? "play" : "pause");
      iPlay.setAttribute("aria-label", paused ? "播放" : "暂停");
    }
  }
      if (existingActions) existingActions.replaceWith(nextActions);
      else container.append(nextActions);
    } else {
      existingActions?.remove();
    }
    renderedPanelTrackId = trackId;
    return;
  }
  container.replaceChildren();
  container.append(cover(track, `panel-album${track ? "" : " standby"}`));
  container.append(el("h2", "", track?.title || "还没有播放歌曲"));
  container.append(
    track ? Object.assign(trackSubline(track, false), { className: "panel-sub" }) : el("p", "", "从发现或本地资料库选择一首歌。"),
  );
  const actions = buildPlayingActions(track);
  if (actions) container.append(actions);
  renderedPanelKind = "playing";
  renderedPanelTrackId = trackId;
  renderedPanelQueueKey = "";
  renderedPanelLyricKey = "";
}

function setPanel(next, open = true) {
  panel = next;
  panelOpen = open;
  $(".columns").classList.toggle("panel-hidden", !open);
  $("#listen-panel").classList.toggle("open", open);
  $("#queue-toggle").setAttribute("aria-expanded", String(open));
  renderPanel();
}

function updateControls() {
  const paused = audio.paused;
  document.body.classList.toggle("is-playing", !paused);
  if (view === "roam") {
    const toggle = $("[data-action='roam-toggle']");
    if (toggle) {
      applyIcon(toggle, paused ? "play" : "pause");
      toggle.setAttribute("aria-label", paused ? "播放" : "暂停");
      toggle.title = paused ? "播放" : "暂停";
    }
  }
  applyIcon($("#play"), paused ? "play" : "pause");
  $("#play").setAttribute("aria-label", paused ? "播放" : "暂停");
  $("#play").title = paused ? "播放" : "暂停";
  $("#shuffle").setAttribute("aria-pressed", String(shuffle));
  $("#repeat").setAttribute("aria-pressed", String(Boolean(repeat)));
  $("#repeat").classList.toggle("repeat-one", repeat === 2);
  const repeatLabel = ["顺序播放", "列表循环", "单曲循环"][repeat];
  $("#repeat").setAttribute("aria-label", `循环模式，${repeatLabel}`);
  $("#repeat").title = repeatLabel;
  const isMutedUI = audio.muted || !targetVolume;
  applyIcon($("#mute"), isMutedUI ? "muted" : "volume");
  $("#mute").setAttribute(
    "aria-label",
    isMutedUI ? "取消静音" : "静音",
  );
  $("#mute").title = isMutedUI ? "取消静音 (M)" : "静音 (M)";
}

const tintCache = new Map();
let tintToken = 0;

function applyTint([r, g, b]) {
  const root = document.documentElement.style;
  root.setProperty("--tint-r", r);
  root.setProperty("--tint-g", g);
  root.setProperty("--tint-b", b);
}

function vividColor(data) {
  // Weighted average of saturated, mid-bright pixels; dull covers fall back to amber.
  let r = 0, g = 0, b = 0, weight = 0;
  for (let i = 0; i < data.length; i += 4) {
    const pr = data[i], pg = data[i + 1], pb = data[i + 2];
    const max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb);
    const sat = max ? (max - min) / max : 0;
    const light = (max + min) / 510;
    if (light < 0.18 || light > 0.92) continue;
    const w = sat * sat * (1 - Math.abs(light - 0.55));
    r += pr * w; g += pg * w; b += pb * w; weight += w;
  }
  if (weight < 0.5) return [255, 158, 112];
  const c = [r / weight, g / weight, b / weight];
  const max = Math.max(...c);
  const boost = max < 210 ? 210 / max : 1; // keep the accent readable on dark glass
  return c.map((v) => Math.min(255, Math.round(v * boost)));
}

function updateTint(track) {
  const token = ++tintToken;
  const art = track?.art;
  if (!art) return applyTint([255, 158, 112]);
  if (tintCache.has(art)) return applyTint(tintCache.get(art));
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.referrerPolicy = "no-referrer";
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 32;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, 32, 32);
      const color = vividColor(ctx.getImageData(0, 0, 32, 32).data);
      tintCache.set(art, color);
      if (token === tintToken) applyTint(color);
    } catch {
      // Cover served without CORS: keep the current tint.
    }
  };
  img.src = art;
}

function updateCurrent() {
  const track = tracks.get(currentId);
  updateTint(track);
  setCover($("#current-cover"), track);
  $("#current-title").textContent = track?.title || "未在播放";
  const artistLine = $("#current-artist");
  artistLine.replaceChildren();
  if (track) {
    const names = (track.artist || "").split(" / ").filter(Boolean);
    names.forEach((name, index) => {
      if (index) artistLine.append(" / ");
      artistLine.append(
        ["kuwo", "netease"].includes(track.source) && index === 0 && track.artistId
          ? trackLink(name, "artist", browseRef(track, track.artistId))
          : ["kuwo", "qq", "netease"].includes(track.source)
            ? trackLink(name, "artist-name", name)
            : name,
      );
    });
  } else artistLine.textContent = "选择一首歌开始";
  renderSourceBadge();
  $("#current-favorite").disabled = !track;
  $("#current-favorite").setAttribute(
    "aria-pressed",
    String(favorites.has(currentId)),
  );
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = track
      ? new MediaMetadata({ title: track.title, artist: track.artist })
      : null;
  }
  renderPanel();
  syncCurrentRows();
  if (view === "discover") syncDiscoverHero();
  else if (view === "roam") syncRoamView();
  updateTimeline();
  if (immersiveOpen) renderImmersive(true);
}

let immersiveOpen = false;
let renderedImmersiveKey = "";

function openImmersive() {
  const stage = $("#immersive-stage");
  if (!stage) return;
  if (!currentId) {
    const candidate = resolve(queue)[0] || (Array.isArray(homeHot) ? resolve(homeHot)[0] : null);
    if (candidate) startQueue([candidate.id], candidate.id);
  }
  immersiveOpen = true;
  stage.hidden = false;
  document.body.classList.add("immersive-open");
  $("#immersive-toggle")?.setAttribute("aria-pressed", "true");
  renderImmersive(true);
  requestAnimationFrame(() => stage.classList.add("open"));
}

function closeImmersive() {
  const stage = $("#immersive-stage");
  if (!stage) return;
  immersiveOpen = false;
  stage.classList.remove("open");
  document.body.classList.remove("immersive-open");
  $("#immersive-toggle")?.setAttribute("aria-pressed", "false");
  $("#player-lyrics-btn")?.setAttribute("aria-pressed", "true");
  setTimeout(() => {
    if (!immersiveOpen) stage.hidden = true;
  }, 220);
}

function toggleImmersive() {
  if (immersiveOpen) closeImmersive();
  else openImmersive();
}

function syncImmersiveTimeline(position, duration) {
  const seek = $("#immersive-seek");
  const elapsed = $("#immersive-elapsed");
  $("#player-lyrics-btn")?.setAttribute("aria-pressed", "false");
  const durEl = $("#immersive-duration");
  if (seek) {
    seek.disabled = duration <= 0;
    seek.value = duration ? (position / duration) * 1000 : 0;
    seek.style.setProperty("--fill", (duration ? (position / duration) * 100 : 0) + "%");
  }
  if (elapsed) elapsed.textContent = timeLabel(position);
  if (durEl) durEl.textContent = timeLabel(duration);
}

function renderImmersive(force = false) {
  const stage = $("#immersive-stage");
  if (!stage || !immersiveOpen) return;
  const track = tracks.get(currentId);
  const key = `${track?.id || ""}:${track?.lyrics?.length || 0}:${track?.lyricsMissing ? 1 : 0}:${showLyricTrans ? 1 : 0}`;
  if (!force && key === renderedImmersiveKey) return;
  renderedImmersiveKey = key;
  stage.replaceChildren();

  const bg = el("div", "immersive-bg");
  if (track?.art) {
    const bgImg = document.createElement("img");
    bgImg.src = track.art;
    bgImg.alt = "";
    bg.append(bgImg);
  }
  stage.append(bg);

  const top = el("div", "immersive-top");
  const topLeft = el("div", "immersive-top-left");
  if (track && isOnlineTrack(track)) {
    const srcBtn = button(track.audioSource === "bilibili" ? "B站音频 ▾" : "换音源 ▾", "ghost-pill small", null, "switch-source");
    topLeft.append(srcBtn);
  }
  const closeBtn = button("收起沉浸播放", "icon-button immersive-close", "down", "close-immersive");
  closeBtn.title = "收起沉浸播放 (Esc / F)";
  top.append(topLeft, closeBtn);
  stage.append(top);

  if (!track) {
    stage.append(empty("暂无正在播放的歌曲", "选择一首歌即可展开沉浸歌词。"));
    return;
  }

  const grid = el("div", "immersive-grid");
  const deck = el("div", "immersive-deck");
  const artWrap = el("div", "immersive-cover-wrap");
  artWrap.append(cover(track, "immersive-cover"));
  const info = el("div", "immersive-info");
  info.append(el("h2", "immersive-title", track.title), trackSubline(track, false));

  const seekWrap = el("div", "immersive-timeline");
  const elapsed = el("span", "", timeLabel(audio.currentTime || 0));
  elapsed.id = "immersive-elapsed";
  const seek = document.createElement("input");
  seek.id = "immersive-seek";
  seek.type = "range";
  seek.min = "0";
  seek.max = "1000";
  seek.step = "1";
  const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
  seek.disabled = dur <= 0;
  seek.value = dur ? String(((audio.currentTime || 0) / dur) * 1000) : "0";
  seek.style.setProperty("--fill", (dur ? ((audio.currentTime || 0) / dur) * 100 : 0) + "%");
  seek.addEventListener("input", (e) => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = (audio.duration * Number(e.target.value)) / 1000;
      updateTimeline();
    }
  });
  const durEl = el("span", "", timeLabel(dur));
  durEl.id = "immersive-duration";
  seekWrap.append(elapsed, seek, durEl);

  const ctrls = el("div", "immersive-controls");
  const favBtn = button("喜欢", "icon-button", "heart", "favorite", track.id);
  favBtn.setAttribute("aria-pressed", String(favorites.has(track.id)));
  const prevBtn = button("上一首", "icon-button", "previous", "immersive-prev");
  const playBtn = button(audio.paused ? "播放" : "暂停", "play-button immersive-play", audio.paused ? "play" : "pause", "immersive-play");
  playBtn.id = "immersive-play";
  const nextBtn = button("下一首", "icon-button", "next", "immersive-next");
  const menuBtn = button("更多", "icon-button", "dots", "track-menu", track.id);
  ctrls.append(favBtn, prevBtn, playBtn, nextBtn, menuBtn);

  deck.append(artWrap, info, seekWrap, ctrls);

  const lyricPane = el("div", "immersive-lyrics");
  const lyricTools = el("div", "immersive-lyric-tools");
  if (track.lyrics?.some((l) => l.trans)) {
    const transBtn = button("译", "lyric-trans-toggle", null, "toggle-lyric-trans");
    transBtn.setAttribute("aria-pressed", String(showLyricTrans));
    transBtn.title = showLyricTrans ? "隐藏翻译" : "显示翻译";
    lyricTools.append(transBtn);
  }
  lyricPane.append(lyricTools);

  if (track.lyrics?.length) {
    const { credits, tailCredits, lyricLines } = splitLyrics(track.lyrics);
    const creditsBar = buildCreditsBar(credits);
    if (creditsBar) lyricPane.append(creditsBar);
    const scroller = el("div", "lyric-scroll immersive-scroll");
    scroller.append(el("div", "lyric-pad"));
    for (const [i, line] of lyricLines.entries()) {
      const row = el("button", "lyric-line");
      row.type = "button";
      row.dataset.action = "seek-lyric";
      row.dataset.value = String(line.time);
      row.dataset.line = String(i);
      row.style.setProperty("--dist", String(Math.min(i + 1, 4)));
      row.append(el("span", "lyric-orig", line.text));
      if (showLyricTrans && line.trans) row.append(el("span", "lyric-trans", line.trans));
      scroller.append(row);
    }
    for (const tc of tailCredits) {
      scroller.append(el("div", "lyric-line lyric-credit", tc.text));
    }
    scroller.append(el("div", "lyric-pad"));
    const markUserScroll = () => {
      lyricUserScrolling = true;
      clearTimeout(lyricScrollTimer);
      lyricScrollTimer = setTimeout(() => {
        lyricUserScrolling = false;
        activeLyric = -2;
        syncLyrics(audio.currentTime);
      }, 2500);
    };
    scroller.addEventListener("wheel", markUserScroll, { passive: true });
    scroller.addEventListener("touchmove", markUserScroll, { passive: true });
    lyricPane.append(scroller);
  } else {
    if (!track.lyricsMissing && !track.lyricsError && isOnlineTrack(track)) loadOnlineLyrics(track);
    const loading = !track.lyricsMissing && !track.lyricsError && isOnlineTrack(track);
    lyricPane.append(
      empty(
        track.lyricsError ? "歌词加载失败" : loading ? "正在加载歌词…" : "暂无可用歌词",
        "",
        track.lyricsError ? button("重试加载歌词", "secondary", null, "retry-lyrics") : undefined,
      ),
    );
  }

  grid.append(deck, lyricPane);
  stage.append(grid);
  requestAnimationFrame(() => {
    activeLyric = -2;
    syncLyrics(audio.currentTime || 0, false);
  });
}

function handlePlaybackFailure() {
  const track = tracks.get(currentId);
  if (!track || !audio.getAttribute("src")) return;
  if (track.selectedAudioUrl && audio.src.endsWith(track.selectedAudioUrl)) {
    track.selectedAudioUrl = undefined;
    track.selectedBvid = undefined;
  }
  if (track.fallbackUrl && audio.src.endsWith(track.url)) {
    audio.src = track.fallbackUrl;
    track.audioSource = undefined;
    track.audioBvid = undefined;
    renderSourceBadge();
    noteAudioSource(track, track.fallbackUrl);
    playMedia();
    return;
  }
  const failKey = `${track.id}:${audio.currentSrc || audio.src}`;
  if (lastFailedTrackKey === failKey) return;
  lastFailedTrackKey = failKey;
  playSession.failed = true;
  consecutivePlayErrors += 1;
  updateControls();

  const maxAutoSkips = Math.min(Math.max(queue.length - 1, 0), 5);
  const failedId = currentId;
  const label = track.title ? `「${track.title}」` : "这首曲目";
  if (maxAutoSkips > 0 && consecutivePlayErrors <= maxAutoSkips) {
    toast(`${label}无法播放，已自动跳过`);
    clearAutoSkip();
    autoSkipTimer = setTimeout(() => {
      autoSkipTimer = null;
      if (currentId !== failedId) return;
      if (!step(1, true, true)) {
        toast(`${label}无法播放，已到达列表末尾`);
      }
    }, 600);
  } else {
    toast(
      consecutivePlayErrors > 1
        ? "连续多首曲目无法播放，已暂停"
        : track.source && !["local", "url", "demo"].includes(track.source)
          ? "这首在线曲目暂时无法播放"
          : "无法播放该音频，请检查文件格式或链接",
    );
  }
}

function markQuietAudioState(volume = audio.volume, muted = audio.muted) {
  quietAudioState = { volume, muted, until: performance.now() + 450 };
}

function setAudioVolumeQuiet(level) {
  const clamped = Math.min(1, Math.max(0, level));
  fadeVolumeGuard = true;
  try {
    audio.volume = clamped;
    markQuietAudioState(clamped, audio.muted);
  } finally {
    fadeVolumeGuard = false;
  }
}

function cancelVolumeFade(restoreTarget = true) {
  volumeFade.token += 1;
  if (volumeFade.raf) {
    cancelAnimationFrame(volumeFade.raf);
    volumeFade.raf = 0;
  }
  if (volumeFade.timer) {
    clearTimeout(volumeFade.timer);
    volumeFade.timer = 0;
  }
  const wasActive = volumeFade.active;
  volumeFade.active = false;
  volumeFade.kind = "";
  volumeFade.onDone = null;
  if (wasActive && restoreTarget && !audio.muted) {
    setAudioVolumeQuiet(targetVolume);
  }
}

function finishVolumeFade(token) {
  if (token !== volumeFade.token || !volumeFade.active) return;
  if (volumeFade.raf) {
    cancelAnimationFrame(volumeFade.raf);
    volumeFade.raf = 0;
  }
  if (volumeFade.timer) {
    clearTimeout(volumeFade.timer);
    volumeFade.timer = 0;
  }
  const { to, onDone } = volumeFade;
  volumeFade.active = false;
  volumeFade.kind = "";
  volumeFade.onDone = null;
  setAudioVolumeQuiet(to);
  onDone?.();
}

function animateVolume(from, to, durationMs, kind, onDone) {
  cancelVolumeFade(false);
  const token = ++volumeFade.token;
  if (document.hidden || reducedMotionQuery.matches || durationMs <= 0 || Math.abs(to - from) < 0.01) {
    setAudioVolumeQuiet(to);
    onDone?.();
    return;
  }
  volumeFade.active = true;
  volumeFade.kind = kind;
  volumeFade.to = to;
  volumeFade.onDone = onDone || null;
  const start = performance.now();
  setAudioVolumeQuiet(from);
  const stepFade = (now) => {
    if (token !== volumeFade.token) return;
    if (document.hidden) {
      finishVolumeFade(token);
      return;
    }
    const progress = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 2);
    setAudioVolumeQuiet(from + (to - from) * eased);
    if (progress < 1) {
      volumeFade.raf = requestAnimationFrame(stepFade);
    } else {
      finishVolumeFade(token);
    }
  };
  volumeFade.raf = requestAnimationFrame(stepFade);
  volumeFade.timer = setTimeout(() => finishVolumeFade(token), durationMs + 120);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && volumeFade.active) {
    finishVolumeFade(volumeFade.token);
  }
});

function playMedia(fade = true) {
  const requested = currentId;
  const wasPaused = audio.paused || volumeFade.kind === "pause";
  const shouldFade =
    fade &&
    !document.hidden &&
    !reducedMotionQuery.matches &&
    wasPaused &&
    !audio.muted &&
    targetVolume > 0.02;
  cancelVolumeFade(true);
  if (shouldFade) {
    setAudioVolumeQuiet(0.02);
  } else if (!audio.muted) {
    setAudioVolumeQuiet(targetVolume);
  }
  audio.play().then(() => {
    if (currentId !== requested || audio.paused) return;
    if (shouldFade && !document.hidden) {
      animateVolume(audio.volume, targetVolume, 220, "in");
    } else if (!audio.muted) {
      setAudioVolumeQuiet(targetVolume);
    }
  }).catch((error) => {
    if (currentId !== requested) return;
    cancelVolumeFade(true);
    if (error.name === "NotAllowedError") {
      toast("点一下播放按钮继续");
    } else if (error.name !== "AbortError") {
      handlePlaybackFailure();
    }
  });
}

function pauseMediaWithFade() {
  if (audio.paused) return;
  if (document.hidden || audio.muted || targetVolume <= 0.02 || reducedMotionQuery.matches) {
    cancelVolumeFade(true);
    audio.pause();
    return;
  }
  const startVol = Math.min(targetVolume, Math.max(0.02, audio.volume));
  animateVolume(startVol, 0, 150, "pause", () => {
    audio.pause();
    setAudioVolumeQuiet(targetVolume);
  });
}

function toggleMuteWithFade() {
  if (!targetVolume && !audio.volume) {
    targetVolume = lastVolume || 0.7;
    audio.muted = false;
    $("#volume").value = targetVolume;
    paintVolume();
    if (audio.paused) {
      setAudioVolumeQuiet(targetVolume);
      updateControls();
      saveSettings();
    } else {
      updateControls();
      animateVolume(0, targetVolume, 160, "in", () => saveSettings());
    }
    return;
  }
  if (audio.muted) {
    const dest = targetVolume || lastVolume || 0.7;
    targetVolume = dest;
    audio.muted = false;
    $("#volume").value = dest;
    paintVolume();
    if (audio.paused) {
      setAudioVolumeQuiet(dest);
      updateControls();
      saveSettings();
    } else {
      updateControls();
      animateVolume(0, dest, 160, "in", () => saveSettings());
    }
    return;
  }
  if (audio.paused || document.hidden || reducedMotionQuery.matches) {
    cancelVolumeFade(true);
    audio.muted = true;
    markQuietAudioState(audio.volume, true);
    $("#volume").value = 0;
    paintVolume();
    updateControls();
    saveSettings();
    return;
  }
  const startVol = Math.min(targetVolume, audio.volume);
  animateVolume(startVol, 0, 130, "mute", () => {
    audio.muted = true;
    setAudioVolumeQuiet(targetVolume);
    $("#volume").value = 0;
    paintVolume();
    updateControls();
    saveSettings();
  });
}

function clearAutoSkip() {
  if (autoSkipTimer) {
    clearTimeout(autoSkipTimer);
    autoSkipTimer = null;
  }
}

function releaseSource() {
  clearAutoSkip();
  cancelVolumeFade(true);
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = undefined;
  }
}

function isOnlineTrack(track) {
  return Boolean(track?.url?.startsWith("/api/catalog/audio?"));
}

const AUDIO_SOURCE_LABELS = { kuwo: "酷我", bilibili: "B 站", netease: "网易云" };

// Ask the server which source it will use. The answer is cached server-side
// for a few minutes, so a later real request for the same song is instant.
const audioProbes = new Map();
function probeAudio(track, url = track.url) {
  if (!isOnlineTrack(track)) return Promise.resolve(null);
  const key = track.id + "|" + url;
  if (!audioProbes.has(key)) {
    const pending = fetch(url + "&probe=1", { signal: AbortSignal.timeout(30000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => (data?.source ? { source: data.source, bvid: data.bvid || "" } : null))
      .catch(() => null);
    audioProbes.set(key, pending);
    setTimeout(() => audioProbes.delete(key), 3 * 60 * 1000);
  }
  return audioProbes.get(key);
}

async function noteAudioSource(track, url) {
  const info = await probeAudio(track, url);
  const latest = tracks.get(track.id);
  if (!latest || !info?.source) return;
  latest.audioSource = info.source;
  latest.audioBvid = info.bvid || "";
  if (currentId === track.id) renderSourceBadge();
}

function renderSourceBadge() {
  const badge = $("#current-source");
  if (!badge) return;
  const track = tracks.get(currentId);
  const label = track && isOnlineTrack(track) ? AUDIO_SOURCE_LABELS[track.audioSource] : "";
  badge.hidden = !label;
  badge.textContent = label ? label : "";
  badge.title = label
    ? `当前音源：${label}${track.audioBvid ? ` (${track.audioBvid})` : ""}，点击选择音源`
    : "";
}

function buildTrackAudioUrl(track, { skipKuwo = false, bvid = "" } = {}) {
  const [base, query = ""] = (track.url || "").split("?");
  const params = new URLSearchParams(query);
  params.delete("skip");
  params.delete("force_bili");
  params.delete("bvid");
  if (skipKuwo) params.set("skip", "kuwo");
  if (bvid) params.set("bvid", bvid);
  return `${base}?${params.toString()}`;
}

let sourceSwitching = false;
let sourcePickerToken = 0;
let sourcePickerController = null;

async function applyAudioSourceChoice(track, choice, pickerBody, triggerBtn) {
  if (sourceSwitching || !track || currentId !== track.id) return;
  const trackId = track.id;
  const isDefault = choice.mode === "default";
  if (
    isDefault &&
    !track.selectedBvid &&
    (!track.selectedAudioUrl || track.selectedAudioUrl === track.url) &&
    audio.src.endsWith(track.url)
  ) {
    closeDialog();
    toast("当前已是默认音源");
    return;
  }
  if (
    !isDefault &&
    track.audioSource === "bilibili" &&
    track.audioBvid === choice.candidate.bvid
  ) {
    closeDialog();
    toast("当前正在播放该候选音源");
    return;
  }

  const nextUrl = isDefault
    ? track.url
    : buildTrackAudioUrl(track, { bvid: choice.candidate.bvid });
  const badge = $("#current-source");
  const buttons = [...pickerBody.querySelectorAll(".source-option")];
  sourceSwitching = true;
  if (badge) badge.disabled = true;
  for (const btn of buttons) btn.disabled = true;
  triggerBtn?.classList.add("is-loading");
  toast(isDefault ? "正在切回默认音源…" : "正在验证 B 站音频流…");
  try {
    const probed = await probeAudio(track, nextUrl);
    if (currentId !== trackId) return;
    if (!probed?.source) {
      toast(
        isDefault
          ? "默认音源暂不可用，已保留当前音源"
          : "该 B 站候选暂无可用音频流，已保留当前音源",
      );
      return;
    }
    const position = audio.currentTime || 0;
    const resume = !audio.paused;
    if (isDefault) {
      track.selectedAudioUrl = undefined;
      track.selectedBvid = undefined;
    } else {
      track.selectedAudioUrl = nextUrl;
      track.selectedBvid = choice.candidate.bvid;
    }
    track.audioSource = probed.source;
    track.audioBvid = probed.bvid || (isDefault ? "" : choice.candidate.bvid);
    audio.src = nextUrl;
    renderSourceBadge();
    audio.addEventListener(
      "loadedmetadata",
      () => {
        if (currentId === trackId && position > 1 && Number.isFinite(audio.duration)) {
          audio.currentTime = Math.min(position, audio.duration - 1);
        }
      },
      { once: true },
    );
    if (resume) playMedia();
    closeDialog();
    const label = AUDIO_SOURCE_LABELS[probed.source] || "其他";
    toast(
      isDefault
        ? `已切回${label}音源`
        : `已切换到 B 站 · ${choice.candidate.author || choice.candidate.bvid}`,
    );
  } finally {
    sourceSwitching = false;
    if (badge) badge.disabled = false;
    if (dialog.open) {
      for (const btn of buttons) btn.disabled = false;
      triggerBtn?.classList.remove("is-loading");
    }
  }
}

async function switchAudioSource() {
  const track = tracks.get(currentId);
  if (!track || !isOnlineTrack(track) || sourceSwitching) return;
  const trackId = track.id;
  const pickerToken = ++sourcePickerToken;
  sourcePickerController?.abort();
  sourcePickerController = new AbortController();
  const signal = sourcePickerController.signal;

  const root = el("div", "source-picker");
  const head = el("div", "source-picker-head");
  const summary = el("div", "source-picker-track");
  summary.append(
    el("strong", "", track.title || "当前曲目"),
    el("span", "", track.artist || "未知歌手"),
  );
  const currentLabel = AUDIO_SOURCE_LABELS[track.audioSource] || "自动检测";
  const currentPill = el(
    "span",
    "source-picker-current",
    track.audioSource === "bilibili" && track.audioBvid
      ? `${currentLabel} · ${track.audioBvid}`
      : `当前：${currentLabel}`,
  );
  head.append(summary, currentPill);
  root.append(head);

  const defaultActive =
    !track.selectedBvid && (!track.selectedAudioUrl || track.selectedAudioUrl === track.url);
  const defaultBtn = el("button", "source-option");
  defaultBtn.type = "button";
  if (defaultActive) defaultBtn.classList.add("is-active");
  const defaultMain = el("div", "source-option-main");
  defaultMain.append(el("strong", "", "自动默认音源"));
  if (defaultActive) defaultMain.append(el("span", "source-tag is-active", "当前"));
  defaultBtn.append(
    defaultMain,
    el("span", "source-option-meta", "优先酷我原声，无源时自动匹配 B 站"),
  );
  defaultBtn.addEventListener("click", () =>
    applyAudioSourceChoice(track, { mode: "default" }, root, defaultBtn),
  );
  root.append(defaultBtn);

  const subhead = el("div", "source-picker-subhead");
  subhead.append(
    el("span", "", "B 站候选音频"),
    el("span", "", track.duration ? `参考时长 ${timeLabel(track.duration)}` : ""),
  );
  const list = el("div", "source-candidates");
  list.append(el("p", "dialog-message", "正在搜索 B 站候选音频…"));
  root.append(subhead, list);

  openDialog("选择音源", root);

  try {
    const params = new URLSearchParams({
      title: track.title || "",
      artist: track.artist || "",
      duration: String(Math.round(track.duration || 0)),
      limit: "5",
    });
    const res = await fetch("/api/catalog/bili/candidates?" + params.toString(), {
      signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
    });
    if (!res.ok) throw new Error("candidates failed");
    const data = await res.json();
    if (pickerToken !== sourcePickerToken || !dialog.open || currentId !== trackId) return;
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    list.replaceChildren();
    if (!candidates.length) {
      list.append(el("p", "dialog-message", "未找到匹配的 B 站视频候选"));
      return;
    }
    for (const cand of candidates) {
      const isActive =
        track.audioSource === "bilibili" &&
        (track.selectedBvid === cand.bvid || (!track.selectedBvid && track.audioBvid === cand.bvid));
      const item = el("button", "source-option");
      item.type = "button";
      if (isActive) item.classList.add("is-active");
      const mainRow = el("div", "source-option-main");
      mainRow.append(el("strong", "", cand.title || cand.bvid));
      if (cand.tag) mainRow.append(el("span", "source-tag", cand.tag));
      if (isActive) mainRow.append(el("span", "source-tag is-active", "当前"));
      const metaText = [
        `UP主：${cand.author || "未知"}`,
        cand.duration ? `时长：${timeLabel(cand.duration)}` : "",
        cand.bvid,
      ]
        .filter(Boolean)
        .join(" · ");
      item.append(mainRow, el("span", "source-option-meta", metaText));
      item.addEventListener("click", () =>
        applyAudioSourceChoice(track, { mode: "bili", candidate: cand }, root, item),
      );
      list.append(item);
    }
  } catch (error) {
    if (error?.name === "AbortError" || pickerToken !== sourcePickerToken || !dialog.open) return;
    list.replaceChildren(el("p", "dialog-message", "获取 B 站候选列表失败，请稍后重试"));
  }
}

function upcomingId() {
  if (shuffle || repeat === 2) return null;
  const available = resolve(queue).map((t) => t.id);
  const index = available.indexOf(currentId);
  if (index < 0) return null;
  return available[index + 1] || (repeat === 1 ? available[0] : null);
}

let prefetchTimer;
function schedulePrefetch() {
  clearTimeout(prefetchTimer);
  // Wait until the current song is actually playing so it gets the bandwidth.
  prefetchTimer = setTimeout(() => {
    const next = tracks.get(upcomingId());
    if (next && next.id !== currentId) {
      probeAudio(next);
      loadOnlineLyrics(next);
    }
  }, 4000);
}

function setTrack(id, now = true) {
  const track = tracks.get(id);
  if (!track) return;
  if (currentId !== id) {
    if (currentId) finalizePlaySession("switch");
    releaseSource();
    currentId = id;
    resetPlaySession(id);
    const activeUrl = track.selectedAudioUrl || track.url;
    if (track.file) activeObjectUrl = URL.createObjectURL(track.file);
    audio.src = activeObjectUrl || activeUrl;
    updateCurrent();
    if (isOnlineTrack(track)) noteAudioSource(track, activeUrl);
  }
  loadOnlineLyrics(track);
  if (now) playMedia();
}

let consecutivePlayErrors = 0;
let autoSkipTimer = null;
let lastFailedTrackKey = "";
const lyricRequests = new Set();
async function loadOnlineLyrics(track) {
  if (!track || track.lyrics?.length || track.lyricsMissing || track.source === "local" || track.source === "url")
    return;
  if (lyricRequests.has(track.id)) return;
  track.lyricsError = false;
  lyricRequests.add(track.id);
  const neId = String(track.id).replace(/^ne-/, "");
  const rid = track.source === "kuwo"
    ? String(track.id).replace(/^kuwo-/, "")
    : track.source === "netease" && /^\d+$/.test(neId)
      ? "ne-" + neId
      : "";
  try {
    const data = await catalogResponse(
      "/api/kuwo/lyrics?" + new URLSearchParams({ id: rid, title: track.title || "", artist: track.artist || "" }),
    );
    const latest = tracks.get(track.id);
    if (!latest) return;
    if (data.lines?.length) {
      latest.lyrics = data.lines;
      latest.lyricsError = false;
    } else {
      latest.lyricsMissing = true;
    }
    if (currentId === track.id && panel === "lyrics") renderPanel();
    if (currentId === track.id && immersiveOpen) renderImmersive(true);
    if (currentId === track.id && view === "roam") syncRoamLyric();
  } catch {
    const latest = tracks.get(track.id);
    if (latest && !latest.lyrics?.length) {
      latest.lyricsError = true;
      if (currentId === track.id && panel === "lyrics") renderPanel();
      if (currentId === track.id && immersiveOpen) renderImmersive(true);
    }
  } finally {
    lyricRequests.delete(track.id);
  }
}

function startQueue(ids, starting = ids[0]) {
  consecutivePlayErrors = 0;
  lastFailedTrackKey = "";
  if (roamState.active && view !== "roam") roamState.active = false;
  const clean = resolve([...new Set(ids)])
    .filter((track) => !track.embed)
    .map((track) => track.id);
  if (!clean.length) return;
  queue = clean;
  shuffleHistory = [];
  const prevId = currentId;
  setTrack(clean.includes(starting) ? starting : clean[0]);
  saveSettings();
  if (panel === "queue" && currentId === prevId) renderPanel();
}

function visibleIds(context = view) {
  if (context === "search" && searchMode === "catalog") context = "catalog-audio";
  else if (context === "discover") context = "home-hot";
  const list = [...main.querySelectorAll(".tracks")].find(
    (item) => item.dataset.context === context,
  );
  return list
    ? [...list.querySelectorAll("[data-action='select-track']")].map(
        (item) => item.dataset.value,
      )
    : [];
}

function togglePlayback() {
  if (!currentId) {
    const available = resolve(queue).map((track) => track.id);
    const fromView = visibleIds();
    startQueue(
      available.length ? available : fromView.length ? fromView : demoIds,
    );
  } else if (audio.paused || volumeFade.kind === "pause") {
    playMedia();
  } else {
    pauseMediaWithFade();
  }
}

function step(direction, automatic = false, skipRepeatOne = false) {
  if (!automatic) {
    consecutivePlayErrors = 0;
    lastFailedTrackKey = "";
  }
  const available = resolve(queue).map((track) => track.id);
  if (!available.length) {
    if (!currentId && !automatic) startQueue(demoIds);
    return false;
  }
  if (automatic && !skipRepeatOne && repeat === 2 && currentId) {
    audio.currentTime = 0;
    resetPlaySession(currentId);
    playMedia();
    return true;
  }
  if (direction < 0 && audio.currentTime > 3) {
    audio.currentTime = 0;
    playSession.lastTickAt = performance.now();
    return true;
  }
  const index = available.indexOf(currentId);
  if (roamState.active && direction < 0 && index <= 0) {
    audio.currentTime = 0;
    return true;
  }
  let nextId;
  if (shuffle && direction < 0) {
    nextId = shuffleHistory.pop();
  } else if (shuffle && direction > 0) {
    const choices = available.filter(
      (id) => id !== currentId && !shuffleHistory.includes(id),
    );
    if (!choices.length && (repeat === 1 || !automatic)) {
      shuffleHistory = [];
      choices.push(...available.filter((id) => id !== currentId));
    }
    if (choices.length) {
      if (currentId) shuffleHistory.push(currentId);
      nextId = choices[Math.floor(Math.random() * choices.length)];
    }
  }
  if (!nextId && !(shuffle && direction > 0 && automatic && !repeat)) {
    const nextIndex = index === -1 ? 0 : index + direction;
    if (available[nextIndex]) nextId = available[nextIndex];
    else if (repeat === 1 || !automatic)
      nextId = available[(nextIndex + available.length) % available.length];
  }
  if (nextId === currentId) audio.currentTime = 0;
  if (nextId) {
    setTrack(nextId);
    return true;
  }
  return false;
}

function toggleFavorite(id) {
  if (!tracks.has(id)) return;
  const liked = !favorites.has(id);
  if (liked) favorites.add(id);
  else favorites.delete(id);
  recordTasteFavorite(tracks.get(id), liked);
  $("#current-favorite").setAttribute(
    "aria-pressed",
    String(favorites.has(currentId)),
  );
  for (const item of document.querySelectorAll("[data-action='favorite']")) {
    if (item.dataset.value === id)
      item.setAttribute("aria-pressed", String(favorites.has(id)));
  }
  saveSettings();
  if (view === "favorites") syncFavoritesView();
}

audio.addEventListener("playing", () => {
  if (!currentId) return;
  consecutivePlayErrors = 0;
  lastFailedTrackKey = "";
  tickPlaySession();
  schedulePrefetch();
  roamNoteTrack(currentId);
  const index = history.indexOf(currentId);
  if (index !== 0) {
    if (index > -1) history.splice(index, 1);
    history.unshift(currentId);
    history.splice(100);
    saveSettings();
    if (view === "discover") syncDiscoverRecent();
    else if (view === "recent") syncRecentView();
  }
});
audio.addEventListener("loadedmetadata", () => {
  const track = tracks.get(currentId);
  if (
    track &&
    Number.isFinite(audio.duration) &&
    track.duration !== audio.duration
  ) {
    track.duration = audio.duration;
    syncTrackDuration(track);
  }
  updateTimeline();
});
audio.addEventListener("timeupdate", updateTimeline);
audio.addEventListener("play", updateControls);
audio.addEventListener("pause", () => {
  tickPlaySession();
  updateControls();
});
audio.addEventListener("ended", () => {
  finalizePlaySession("ended");
  updateControls();
  step(1, true);
});
audio.addEventListener("error", handlePlaybackFailure);
audio.addEventListener("volumechange", () => {
  if (fadeVolumeGuard || volumeFade.active) return;
  if (
    quietAudioState &&
    performance.now() <= quietAudioState.until &&
    audio.muted === quietAudioState.muted &&
    Math.abs(audio.volume - quietAudioState.volume) < 0.005
  ) {
    return;
  }
  quietAudioState = null;
  if (!audio.muted) targetVolume = audio.volume;
  $("#volume").value = audio.muted ? 0 : targetVolume;
  paintVolume();
  updateControls();
  saveSettings();
});

if ("mediaSession" in navigator) {
  const handlers = {
    play: togglePlayback,
    pause: () => audio.pause(),
    nexttrack: () => step(1),
    previoustrack: () => step(-1),
    seekto: ({ seekTime }) => {
      if (Number.isFinite(audio.duration)) audio.currentTime = seekTime;
    },
  };
  for (const [action, handler] of Object.entries(handlers)) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {}
  }
}

function openDatabase() {
  return new Promise((resolveDb, reject) => {
    const request = indexedDB.open("echo-local-music", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("tracks", { keyPath: "id" });
    request.onsuccess = () => resolveDb(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readLocalTracks() {
  return new Promise((resolveDb, reject) => {
    const request = database
      .transaction("tracks")
      .objectStore("tracks")
      .getAll();
    request.onsuccess = () => resolveDb(request.result);
    request.onerror = () => reject(request.error);
  });
}

function changeDatabase(change) {
  return new Promise((resolveDb, reject) => {
    const transaction = database.transaction("tracks", "readwrite");
    change(transaction.objectStore("tracks"));
    transaction.oncomplete = () => resolveDb();
    transaction.onabort = () => reject(transaction.error);
  });
}

async function saveLocalTracks(records) {
  await changeDatabase((store) => {
    for (const track of records) store.put(track);
  });
}

function isAudio(file) {
  return (
    file.type.startsWith("audio/") ||
    /\.(mp3|m4a|mp4|aac|flac|ogg|oga|opus|wav|aif|aiff|webm)$/i.test(file.name)
  );
}

function parseLyrics(text) {
  const offset = Number(text.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0) / 1000;
  const result = [];
  for (const line of text.split(/\r?\n/)) {
    const stamps = [...line.matchAll(/\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const lyric = line.replace(/\[[^\]]+\]/g, "").trim();
    if (!lyric) continue;
    for (const [, minutes, seconds, fraction] of stamps) {
      const time =
        Number(minutes) * 60 +
        Number(seconds) +
        Number("0." + (fraction || "0")) +
        offset;
      result.push({ time: Math.max(time, 0), text: lyric });
    }
  }
  return result.sort((first, second) => first.time - second.time);
}

function stem(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLocaleLowerCase();
}

function describeFile(file) {
  const title = file.name.replace(/\.[^.]+$/, "");
  const [artist, ...parts] = title.split(" - ");
  return {
    id: `file:${JSON.stringify([file.webkitRelativePath || file.name, file.size, file.lastModified])}`,
    title: parts.length ? parts.join(" - ") : title,
    artist: parts.length ? artist : "本地文件",
    file,
    filename: file.name,
    path: file.webkitRelativePath || file.name,
    source: "local",
  };
}

async function importFiles(files) {
  if (isImporting) {
    toast("正在导入上一批文件，请稍后再试");
    return;
  }
  isImporting = true;
  try {
    await databaseReady;
    const incoming = new Map();
    const lyrics = [];
    for (const file of files) {
      if (/\.lrc$/i.test(file.name)) lyrics.push(file);
      else if (isAudio(file)) {
        const track = describeFile(file);
        if (!tracks.has(track.id)) incoming.set(track.id, track);
      }
    }
    const candidates = [
      ...localTracks().filter((track) => track.source === "local"),
      ...incoming.values(),
    ];
    const updates = new Map(incoming);
    let matched = 0;
    for (const file of lyrics) {
      const full = candidates.find(
        (track) =>
          stem(track.path) === stem(file.webkitRelativePath || file.name),
      );
      const matches = candidates.filter(
        (track) => stem(track.filename) === stem(file.name),
      );
      const track = full || (matches.length === 1 ? matches[0] : null);
      if (!track) continue;
      const lines = parseLyrics(await file.text());
      if (!lines.length) continue;
      updates.set(track.id, { ...track, lyrics: lines });
      matched++;
    }
    if (!updates.size) {
      toast(
        lyrics.length
          ? "没有找到对应歌曲或有效的时间轴歌词"
          : "没有发现新的音频文件",
      );
      return;
    }
    let persisted = false;
    if (database) {
      try {
        await saveLocalTracks([...updates.values()]);
        persisted = true;
      } catch {}
    }
    for (const track of updates.values()) tracks.set(track.id, track);
    navigate("library");
    renderPanel();
    toast(
      `${incoming.size ? `已导入 ${incoming.size} 首歌曲` : ""}${incoming.size && matched ? " · " : ""}${matched ? `已添加 ${matched} 份歌词` : ""}${persisted ? "" : "（仅本次会话）"}`,
    );
  } catch {
    toast("无法读取所选文件");
  } finally {
    isImporting = false;
  }
}

async function removeFromLibrary(track) {
  if (track.source === "local" && database) {
    try {
      await changeDatabase((store) => store.delete(track.id));
    } catch {
      toast("移除失败，资料库未修改");
      return;
    }
  }
  tracks.delete(track.id);
  favorites.delete(track.id);
  const past = history.indexOf(track.id);
  if (past >= 0) history.splice(past, 1);
  queue = queue.filter((id) => id !== track.id);
  for (const list of playlists)
    list.ids = list.ids.filter((id) => id !== track.id);
  if (currentId === track.id) {
    releaseSource();
    currentId = null;
    updateCurrent();
  }
  saveSettings();
  renderMain();
  renderPanel();
  toast("已从资料库移除");
}

function openDialog(title, content, submit) {
  $("#dialog-title").textContent = title;
  dialogContent.replaceChildren(content);
  dialogSubmit = submit;
  if (!dialog.open) dialog.showModal();
  if (submit) dialogContent.querySelector("input:not([disabled]), select:not([disabled]), textarea:not([disabled])")?.focus();
}
function closeDialog() {
  dialog.close();
}

function openEmbeddedTrack(id) {
  return;
}

function choices(...entries) {
  const content = el("div", "dialog-actions");
  for (const [label, iconName, action, value] of entries) {
    content.append(button(label, "secondary", iconName, action, value));
  }
  return content;
}

function field(label, control) {
  const element = el("label", "dialog-field");
  element.append(el("span", "", label), control);
  return element;
}

function textInput(name, value = "", type = "text") {
  const element = el("input");
  element.name = name;
  element.value = value;
  element.type = type;
  element.required = true;
  element.maxLength = type === "url" ? 2048 : 160;
  return element;
}

function formContent(fields, submitLabel) {
  const content = el("div");
  const actions = el("div", "dialog-submit");
  const submit = button(submitLabel, "primary");
  submit.type = "submit";
  actions.append(button("取消", "secondary", null, "close-dialog"), submit);
  content.append(...fields, actions);
  return content;
}

function showImport() {
  openDialog(
    "导入与备份",
    choices(
      ["选择音乐或 LRC 文件", "file", "files"],
      ["选择文件夹", "folder", "folder"],
      ["添加音频直链", "link", "url-form"],
      ["导入歌单（链接 / 文本）", "list", "import-playlist"],
      ["导出歌单与口味备份 (JSON)", "download", "export-backup"],
      ["从 JSON 备份恢复", "upload", "import-backup"],
    ),
  );
}

const BACKUP_REMOTE_SOURCES = new Set(["url", "kuwo", "qq", "public", "netease", "public-catalog"]);

function downloadTextFile(filename, text, mime = "application/json;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function serializeBackupTrack(track) {
  const copy = {
    id: String(track.id),
    title: String(track.title || ""),
    artist: String(track.artist || ""),
    source: track.source,
    url: String(track.url || ""),
  };
  for (const key of ["album", "duration", "art", "fallbackUrl", "artistId", "albumId", "mv", "embed", "tone", "reason"]) {
    if (track[key] !== undefined && track[key] !== null && track[key] !== "") copy[key] = track[key];
  }
  return copy;
}

function exportBackup() {
  const referenced = new Set([
    ...favorites,
    ...playlists.flatMap((list) => list.ids),
    ...[...tracks.values()].filter((t) => t.source === "url").map((t) => t.id),
  ]);
  const remoteTracks = [...referenced]
    .map((id) => tracks.get(id))
    .filter((t) => t && BACKUP_REMOTE_SOURCES.has(t.source))
    .map(serializeBackupTrack);
  const payload = {
    app: "echo-player",
    version: 1,
    exportedAt: new Date().toISOString(),
    favorites: [...favorites],
    playlists: playlists.map((p) => ({
      id: String(p.id),
      name: String(p.name || "歌单"),
      ids: [...new Set((p.ids || []).map(String))],
      ...(p.publicSource ? { publicSource: String(p.publicSource) } : {}),
    })),
    taste: pruneTasteState(),
    roam: {
      mode: roamState.mode,
      scene: roamState.scene,
      banned: roamState.banned.slice(-200),
    },
    remoteTracks,
    ...(saved.lyricOffsets && typeof saved.lyricOffsets === "object" ? { lyricOffsets: saved.lyricOffsets } : {}),
  };
  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadTextFile(`echo-backup-${dateStamp}.json`, JSON.stringify(payload, null, 2));
  closeDialog();
  toast(`已导出 ${payload.playlists.length} 个歌单、${payload.favorites.length} 首收藏及口味备份`);
}

function validateAndParseBackup(rawText) {
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error("备份文件不是有效的 JSON 格式");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("备份文件结构无效");
  }
  const hasKnownKey =
    data.app === "echo-player" ||
    Array.isArray(data.playlists) ||
    Array.isArray(data.favorites) ||
    (data.taste && typeof data.taste === "object");
  if (!hasKnownKey) throw new Error("不是回声 Echo 的备份文件");
  if ("version" in data && (typeof data.version !== "number" || !Number.isInteger(data.version) || data.version < 1 || data.version > 1)) {
    throw new Error(`不支持的备份版本：${data.version}`);
  }

  const cleanTracks = [];
  if (Array.isArray(data.remoteTracks)) {
    for (const raw of data.remoteTracks.slice(0, 5000)) {
      if (!raw || typeof raw !== "object") continue;
      const id = typeof raw.id === "string" ? raw.id.trim().slice(0, 300) : "";
      const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 200) : "";
      const source = typeof raw.source === "string" ? raw.source : "";
      const url = typeof raw.url === "string" ? raw.url.trim() : "";
      if (!id || !title || !BACKUP_REMOTE_SOURCES.has(source)) continue;
      if (!url.startsWith("/api/") && !/^https?:\/\//i.test(url)) continue;
      cleanTracks.push({
        id,
        title,
        artist: typeof raw.artist === "string" ? raw.artist.slice(0, 200) : "",
        source,
        url,
        ...(typeof raw.album === "string" && raw.album ? { album: raw.album.slice(0, 200) } : {}),
        ...(typeof raw.duration === "number" && Number.isFinite(raw.duration) && raw.duration >= 0 ? { duration: raw.duration } : {}),
        ...(typeof raw.art === "string" && raw.art ? { art: raw.art.slice(0, 1024) } : {}),
        ...(typeof raw.fallbackUrl === "string" && raw.fallbackUrl.startsWith("/api/") ? { fallbackUrl: raw.fallbackUrl } : {}),
        ...(raw.artistId !== undefined && raw.artistId !== null ? { artistId: raw.artistId } : {}),
        ...(raw.albumId !== undefined && raw.albumId !== null ? { albumId: raw.albumId } : {}),
        ...(raw.mv ? { mv: raw.mv } : {}),
        ...(typeof raw.embed === "boolean" ? { embed: raw.embed } : {}),
        ...(typeof raw.tone === "number" ? { tone: raw.tone } : {}),
        ...(typeof raw.reason === "string" && raw.reason ? { reason: raw.reason.slice(0, 120) } : {}),
      });
    }
  }

  const cleanFavorites = Array.isArray(data.favorites)
    ? [...new Set(data.favorites.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim().slice(0, 300)))].slice(0, 5000)
    : [];

  const cleanPlaylists = [];
  if (Array.isArray(data.playlists)) {
    const seenListIds = new Set();
    for (const raw of data.playlists.slice(0, 200)) {
      if (!raw || typeof raw !== "object") continue;
      const id = typeof raw.id === "string" ? raw.id.trim().slice(0, 120) : "";
      const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 60) : "";
      if (!id || !name || seenListIds.has(id)) continue;
      seenListIds.add(id);
      const ids = Array.isArray(raw.ids)
        ? [...new Set(raw.ids.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim().slice(0, 300)))].slice(0, 2000)
        : [];
      cleanPlaylists.push({
        id,
        name,
        ids,
        ...(typeof raw.publicSource === "string" && raw.publicSource ? { publicSource: raw.publicSource.slice(0, 100) } : {}),
      });
    }
  }

  const cleanTaste = { artists: {}, tracks: {} };
  if (data.taste && typeof data.taste === "object") {
    if (data.taste.artists && typeof data.taste.artists === "object") {
      for (const [k, v] of Object.entries(data.taste.artists).slice(0, 150)) {
        if (!k || !v || typeof v !== "object") continue;
        if (typeof v.score !== "number" || !Number.isFinite(v.score)) continue;
        const rawUpdated = v.updatedAt ?? v.updated;
        cleanTaste.artists[String(k).slice(0, 120)] = {
          name: typeof v.name === "string" ? v.name.slice(0, 120) : k,
          score: Math.max(-8, Math.min(18, v.score)),
          completes: typeof v.completes === "number" && Number.isFinite(v.completes) && v.completes >= 0 ? Math.floor(v.completes) : 0,
          skips: typeof v.skips === "number" && Number.isFinite(v.skips) && v.skips >= 0 ? Math.floor(v.skips) : 0,
          likes: typeof v.likes === "number" && Number.isFinite(v.likes) && v.likes >= 0 ? Math.floor(v.likes) : 0,
          updatedAt: typeof rawUpdated === "number" && Number.isFinite(rawUpdated) ? rawUpdated : Date.now(),
        };
      }
    }
    if (data.taste.tracks && typeof data.taste.tracks === "object") {
      for (const [k, v] of Object.entries(data.taste.tracks).slice(0, 300)) {
        if (!k || !v || typeof v !== "object") continue;
        if (typeof v.score !== "number" || !Number.isFinite(v.score)) continue;
        const rawUpdated = v.updatedAt ?? v.updated;
        cleanTaste.tracks[String(k).slice(0, 240)] = {
          ...(typeof v.id === "string" && v.id ? { id: v.id.slice(0, 300) } : {}),
          title: typeof v.title === "string" ? v.title.slice(0, 140) : "",
          artist: typeof v.artist === "string" ? v.artist.slice(0, 140) : "",
          score: Math.max(-6, Math.min(12, v.score)),
          completes: typeof v.completes === "number" && Number.isFinite(v.completes) && v.completes >= 0 ? Math.floor(v.completes) : 0,
          skips: typeof v.skips === "number" && Number.isFinite(v.skips) && v.skips >= 0 ? Math.floor(v.skips) : 0,
          updatedAt: typeof rawUpdated === "number" && Number.isFinite(rawUpdated) ? rawUpdated : Date.now(),
        };
      }
    }
  }

  const cleanBanned = Array.isArray(data.roam?.banned)
    ? [...new Set(data.roam.banned.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim().slice(0, 120)))].slice(-200)
    : [];

  const cleanOffsets = {};
  if (data.lyricOffsets && typeof data.lyricOffsets === "object" && !Array.isArray(data.lyricOffsets)) {
    for (const [k, v] of Object.entries(data.lyricOffsets).slice(0, 1000)) {
      if (typeof v === "number" && Number.isFinite(v)) {
        cleanOffsets[String(k).slice(0, 300)] = Math.max(-30, Math.min(30, Math.round(v * 10) / 10));
      }
    }
  }

  return {
    tracks: cleanTracks,
    favorites: cleanFavorites,
    playlists: cleanPlaylists,
    taste: cleanTaste,
    banned: cleanBanned,
    roamMode: ["default", "familiar", "explore"].includes(data.roam?.mode) ? data.roam.mode : null,
    roamScene: typeof data.roam?.scene === "string" ? data.roam.scene.slice(0, 40) : null,
    lyricOffsets: cleanOffsets,
  };
}

function applyBackupRestore(parsed, mode = "merge") {
  for (const track of parsed.tracks) {
    const existing = tracks.get(track.id);
    if (!existing || !["local", "demo"].includes(existing.source)) {
      tracks.set(track.id, { ...existing, ...track });
    }
  }

  let addedFavs = 0;
  let addedLists = 0;
  if (mode === "overwrite") {
    favorites.clear();
    for (const id of parsed.favorites) {
      favorites.add(id);
      addedFavs++;
    }
    playlists.splice(0, playlists.length, ...parsed.playlists);
    addedLists = parsed.playlists.length;
    tasteState.artists = parsed.taste.artists;
    tasteState.tracks = parsed.taste.tracks;
    roamState.banned = [...parsed.banned];
    if (parsed.roamMode) roamState.mode = parsed.roamMode;
    if (parsed.roamScene !== null) roamState.scene = parsed.roamScene;
    saved.lyricOffsets = { ...parsed.lyricOffsets };
  } else {
    for (const id of parsed.favorites) {
      if (!favorites.has(id)) {
        favorites.add(id);
        addedFavs++;
      }
    }
    for (const incoming of parsed.playlists) {
      const existing = playlists.find((p) => p.id === incoming.id);
      if (existing) {
        const seen = new Set(existing.ids);
        for (const tid of incoming.ids) {
          if (!seen.has(tid)) {
            seen.add(tid);
            existing.ids.push(tid);
          }
        }
      } else {
        playlists.push(incoming);
        addedLists++;
      }
    }
    for (const [k, v] of Object.entries(parsed.taste.artists)) {
      const existingAt = tasteState.artists[k]?.updatedAt ?? tasteState.artists[k]?.updated ?? 0;
      if (!tasteState.artists[k] || (v.updatedAt || 0) > existingAt) {
        tasteState.artists[k] = v;
      }
    }
    for (const [k, v] of Object.entries(parsed.taste.tracks)) {
      const existingAt = tasteState.tracks[k]?.updatedAt ?? tasteState.tracks[k]?.updated ?? 0;
      if (!tasteState.tracks[k] || (v.updatedAt || 0) > existingAt) {
        tasteState.tracks[k] = v;
      }
    }
    const banSet = new Set(roamState.banned);
    for (const b of parsed.banned) {
      if (!banSet.has(b)) {
        banSet.add(b);
        roamState.banned.push(b);
      }
    }
    roamState.banned = roamState.banned.slice(-200);
    saved.lyricOffsets = { ...parsed.lyricOffsets, ...(saved.lyricOffsets || {}) };
  }

  pruneTasteState();
  saveSettings();
  renderNav();
  renderMain();
  renderPanel();
  updateCurrent();
  return { addedFavs, addedLists, totalLists: parsed.playlists.length, totalFavs: parsed.favorites.length };
}

function showBackupRestore() {
  const fileInput = el("input");
  fileInput.type = "file";
  fileInput.name = "file";
  fileInput.accept = ".json,application/json";
  fileInput.required = true;

  const modeSelect = el("select");
  modeSelect.name = "mode";
  modeSelect.append(
    new Option("合并到现有数据（保留原有歌单与收藏）", "merge"),
    new Option("覆盖当前数据（替换歌单、收藏与口味记忆）", "overwrite"),
  );

  const hint = el(
    "p",
    "dialog-message",
    "支持恢复由「导出歌单与口味备份」生成的 JSON 文件；本地音频文件本身不随 JSON 导出。",
  );
  openDialog(
    "从 JSON 备份恢复",
    formContent([field("选择备份文件", fileInput), field("恢复方式", modeSelect), hint], "开始恢复"),
    async (data) => {
      const file = fileInput.files?.[0];
      if (!file) return toast("请选择备份 JSON 文件");
      const mode = data.get("mode") === "overwrite" ? "overwrite" : "merge";
      try {
        const parsed = validateAndParseBackup(await file.text());
        const stats = applyBackupRestore(parsed, mode);
        closeDialog();
        toast(
          mode === "overwrite"
            ? `已覆盖恢复 ${stats.totalLists} 个歌单、${stats.totalFavs} 首收藏`
            : `已合并恢复（新增 ${stats.addedLists} 个歌单、${stats.addedFavs} 首收藏）`,
        );
      } catch (error) {
        toast(error.message || "备份文件解析失败");
      }
    },
  );
}

function exportPlaylistAsText(id) {
  const list = playlists.find((item) => item.id === id);
  if (!list) return;
  const items = resolve(list.ids);
  if (!items.length) return toast("歌单为空，没有可导出的歌曲");
  const text = items.map((t) => (t.artist ? `${t.title} - ${t.artist}` : t.title)).join("\n");
  const safeName = (list.name || "playlist").replace(/[\\/:*?"<>|]/g, "_");
  downloadTextFile(`${safeName}.txt`, text, "text/plain;charset=utf-8");
  navigator.clipboard?.writeText(text).catch(() => {});
  closeDialog();
  toast(`已导出 ${items.length} 首歌曲文本`);
}
function showUrlForm() {
  const title = textInput("title");
  const url = textInput("url", "", "url");
  url.placeholder = "https://example.com/song.mp3";
  openDialog(
    "添加音频直链",
    formContent([field("歌曲名", title), field("音频地址", url)], "添加"),
    (data) => {
      let link;
      try {
        link = new URL(data.get("url"));
      } catch {}
      const name = data.get("title").trim();
      if (
        !link ||
        !["https:", "http:"].includes(link.protocol) ||
        link.username ||
        link.password
      ) {
        toast("请使用有效的 HTTP 或 HTTPS 音频地址");
        return;
      }
      if (!name) {
        toast("请填写歌曲名");
        return;
      }
      const id = `url:${link.href}`;
      tracks.set(id, {
        ...tracks.get(id),
        title: name,
        artist: "音频链接",
        source: "url",
        url: link.href,
        id,
      });
      if (currentId === id) updateCurrent();
      saveSettings();
      closeDialog();
      navigate("library");
      toast("已添加到资料库");
    },
  );
}

function editPlaylist(list, firstId) {
  const input = textInput("name", list?.name || "");
  input.maxLength = 60;
  openDialog(
    list ? "重命名歌单" : "新建歌单",
    formContent([field("歌单名称", input)], "保存"),
    (data) => {
      const name = data.get("name").trim();
      if (!name) {
        toast("请填写歌单名称");
        return;
      }
      const item = list || {
        id: `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ids: firstId ? [firstId] : [],
      };
      item.name = name;
      if (!list) playlists.push(item);
      saveSettings();
      closeDialog();
      navigate(item.id);
    },
  );
}

function addToPlaylist(track) {
  if (!playlists.length) {
    editPlaylist(undefined, track.id);
    return;
  }
  const select = el("select");
  select.name = "playlist";
  select.append(new Option("新建歌单", ""));
  for (const list of playlists) select.append(new Option(list.name, list.id));
  select.selectedIndex = 1;
  openDialog(
    "加入歌单",
    formContent([field("选择歌单", select)], "添加"),
    (data) => {
      const list = playlists.find((item) => item.id === data.get("playlist"));
      if (!list) {
        editPlaylist(undefined, track.id);
        return;
      }
      if (!list.ids.includes(track.id)) list.ids.push(track.id);
      saveSettings();
      closeDialog();
      if (view === list.id) renderMain();
      toast(`已加入「${list.name}」`);
    },
  );
}

function showTrackMenu(track) {
  if (!track) return;
  const entries = [["加入歌单", "list", "add-to-playlist", track.id]];
  if (!track.embed)
    entries.unshift(
      ["下一首播放", "next", "play-next", track.id],
      ["加入队列", "queue", "enqueue", track.id],
    );
  if (track.id === currentId && isOnlineTrack(track))
    entries.push(["切换音源", "wave", "pick-source", track.id]);
  if (track.source === "local")
    entries.push(["选择 LRC 文件", "file", "attach-lyrics", track.id]);
  if (playlists.some((list) => list.id === view)) {
    entries.push(["从此歌单移除", "x", "remove-playlist-track", track.id]);
  }
  if (["local", "url"].includes(track.source))
    entries.push(["从资料库移除", "x", "confirm-remove", track.id]);
  openDialog(track.title, choices(...entries));
}

function confirmAction(title, message, action) {
  const form = formContent([], "确认移除");
  form.prepend(el("p", "dialog-message", message));
  openDialog(title, form, () => {
    closeDialog();
    action();
  });
}

function openLyricsPicker(track) {
  closeDialog();
  const input = el("input");
  input.type = "file";
  input.accept = ".lrc";
  input.hidden = true;
  input.addEventListener(
    "change",
    async () => {
      const file = input.files[0];
      input.remove();
      if (!file) return;
      try {
        const lyrics = parseLyrics(await file.text());
        if (!lyrics.length) {
          toast("该文件没有有效的时间轴歌词");
          return;
        }
        const latest = tracks.get(track.id);
        if (!latest) return;
        const updated = { ...latest, lyrics };
        if (database) await saveLocalTracks([updated]);
        tracks.set(track.id, updated);
        if (currentId === track.id) setPanel("lyrics");
        toast(database ? "已添加歌词" : "已添加歌词（仅本次会话）");
      } catch {
        toast("保存歌词失败");
      }
    },
    { once: true },
  );
  input.addEventListener("cancel", () => input.remove(), { once: true });
  document.body.append(input);
  input.click();
}

const actionHandlers = {
  import: showImport,
  files: () => {
    closeDialog();
    $("#file-input").click();
  },
  folder: () => {
    closeDialog();
    $("#folder-input").click();
  },
  "url-form": showUrlForm,
  "close-dialog": closeDialog,
  "public-lists": () => navigate("online-lists"),
  "retry-lists": () => loadPublicLists(publicListCat, true),
  "retry-charts": loadCharts,
  "open-chart": openChart,
  "reload-chart": (id) => {
    charts?.tracks.delete(Number(id));
    openChart(id);
  },
  "go-view": (name) => navigate(name),
  "roam-start": startRoam,
  "roam-stop": stopRoam,
  "roam-next": () => step(1),
  "roam-prev": () => step(-1),
  "roam-toggle": togglePlayback,
  "roam-dislike": roamDislike,
  "roam-mode": setRoamMode,
  "roam-scene": setRoamScene,
  "roam-unban": (name) => {
    roamState.banned = roamState.banned.filter((n) => n !== name);
    saveSettings();
    if (view === "roam") syncRoamView();
  },
  "taste-search": (name) => performSearch(name, "catalog"),
  "reset-taste": () => {
    confirmAction("清空口味记忆", "将清除本地记录的歌手偏好、完整播放和跳过权重。", resetTasteMemory);
  },
  "import-playlist": () => showPlaylistImport("link"),
  "export-backup": exportBackup,
  "import-backup": showBackupRestore,
  "backup-menu": () => {
    openDialog(
      "备份与迁移",
      choices(
        ["导出歌单与口味备份 (JSON)", "download", "export-backup"],
        ["从 JSON 备份恢复", "upload", "import-backup"],
        ["导入歌单（链接 / 文本）", "list", "import-playlist"],
      ),
    );
  },
  "export-list-text": exportPlaylistAsText,
  "select-list-cat": (cat) => loadPublicLists(cat),
  "open-public-list": openPublicList,
  "open-artist": openArtist,
  "switch-source": switchAudioSource,
  "pick-source": (id) => {
    if (id === currentId) switchAudioSource();
  },
  "show-shortcuts": showShortcutsDialog,
  "toggle-theme": () => applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"),
  "lyric-offset": (val) => {
    const num = Number(val);
    if (num === 0) setLyricOffset(0, true);
    else if (Number.isFinite(num)) setLyricOffset(num, false);
  },
  "toggle-lyric-trans": () => {
    showLyricTrans = !showLyricTrans;
    try {
      localStorage.setItem("echo-lyric-trans", showLyricTrans ? "1" : "0");
    } catch {}
    renderPanel();
    if (immersiveOpen) renderImmersive(true);
  },
  "open-album": openAlbum,
  "artist-tab": (tab) => {
    if (browseArtist) browseArtist.tab = tab;
    renderMain();
  },
  "play-browse": (kind) => {
    const ids = kind === "artist" ? browseArtist?.ids : browseAlbum?.ids;
    if (ids?.length) startQueue(ids);
  },
  "browse-back": () => browseBack(),
  "back-to-lists": () => navigate(openedFrom),
  "save-public-list": savePublicList,
  "toggle-lyric-credits": () => {
    showLyricCredits = !showLyricCredits;
    if (panel === "lyrics") {
      renderedPanelLyricKey = "";
      renderPanel();
    }
    if (immersiveOpen) renderImmersive(true);
  },
  "search-mode": (mode) => performSearch(searchQuery, mode),
  "toggle-search-more": () => {
    searchMoreExpanded = !searchMoreExpanded;
    renderMain();
  },
  "open-embed": openEmbeddedTrack,
  demo: () => startQueue(demoIds),
  "play-view": () => startQueue(visibleIds()),
  "refresh-daily": () => loadDaily(true),
  "play-hot": (id) => {
    if (Array.isArray(homeHot)) startQueue(homeHot, id);
  },
  "play-top-result": (id) => {
    const ids = Array.isArray(searchResults) ? resolve(searchResults).map((t) => t.id) : [];
    if (ids.length) startQueue(ids, id);
  },
  "close-immersive": closeImmersive,
  "toggle-immersive": toggleImmersive,
  "immersive-prev": () => step(-1),
  "retry-lyrics": () => {
    const track = tracks.get(currentId);
    if (!track) return;
    track.lyricsMissing = false;
    track.lyricsError = false;
    loadOnlineLyrics(track);
    if (panel === "lyrics") renderPanel();
    if (immersiveOpen) renderImmersive(true);
  },
  "immersive-play": togglePlayback,
  "immersive-next": () => step(1),
  "select-track": (id, element) => {
    const context = element.closest(".tracks")?.dataset.context;
    if (context === "queue" || currentId === id) setTrack(id);
    else startQueue(visibleIds(context), id);
  },
  favorite: toggleFavorite,
  "track-menu": (id) => showTrackMenu(tracks.get(id)),
  "seek-lyric": (time) => {
    const offset = getLyricOffset(currentId);
    const target = Math.max(0, Number(time) + offset);
    if (Number.isFinite(audio.duration))
      audio.currentTime = Math.min(target, audio.duration);
    lyricUserScrolling = false;
    activeLyric = -2;
    syncLyrics(target);
    if (audio.paused) playMedia();
  },
  "attach-lyrics": (id) => openLyricsPicker(tracks.get(id)),
  enqueue: (id) => addToQueue(id),
  "play-next": (id) => addToQueue(id, true),
  dequeue: (id) => {
    queue = queue.filter((item) => item !== id);
    saveSettings();
    renderPanel();
  },
  "add-to-playlist": (id) => addToPlaylist(tracks.get(id)),
  "playlist-menu": (id) => {
    const list = playlists.find((item) => item.id === id);
    if (!list) return;
    openDialog(
      list.name,
      choices(
        ["导出歌曲文本", "file", "export-list-text", id],
        ["重命名", "list", "rename-list", id],
        ["移除歌单", "x", "delete-list", id],
      ),
    );
  },
  "remove-playlist-track": (id) => {
    const list = playlists.find((item) => item.id === view);
    if (!list) return;
    list.ids = list.ids.filter((item) => item !== id);
    closeDialog();
    saveSettings();
    renderMain();
  },
  "rename-list": (id) => editPlaylist(playlists.find((item) => item.id === id)),
  "delete-list": (id) => {
    const list = playlists.find((item) => item.id === id);
    if (!list) return;
    confirmAction("移除歌单", `移除「${list.name}」及其歌曲排列。`, () => {
      playlists.splice(playlists.indexOf(list), 1);
      saveSettings();
      navigate("discover");
    });
  },
  "confirm-remove": (id) => {
    const track = tracks.get(id);
    if (!track) return;
    confirmAction(
      "从资料库移除",
      `移除「${track.title}」及其收藏和歌单记录。`,
      () => removeFromLibrary(track),
    );
  },
};

function addToQueue(id, next = false) {
  if (next && id !== currentId) {
    queue = queue.filter((item) => item !== id);
    queue.splice(queue.indexOf(currentId) + 1, 0, id);
  } else if (!queue.includes(id)) {
    queue.push(id);
  }
  closeDialog();
  saveSettings();
  renderPanel();
  toast(next && id !== currentId ? "已放到下一首" : "已加入播放队列");
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-link]");
  if (link) {
    event.preventDefault();
    event.stopPropagation();
    followTrackLink(link);
    return;
  }
  const element = event.target.closest("button");
  if (!element || element.disabled) return;
  if (element.dataset.view) {
    navigate(element.dataset.view);
  } else if (element.dataset.panel) {
    setPanel(element.dataset.panel);
  } else if (element.dataset.action) {
    actionHandlers[element.dataset.action]?.(element.dataset.value, element);
  }
});

for (const element of document.querySelectorAll("[data-icon]"))
  applyIcon(element, element.dataset.icon);
$("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  performSearch($("#search-input").value);
});
$("#dialog-form").addEventListener("submit", (event) => {
  event.preventDefault();
  dialogSubmit?.(new FormData(event.currentTarget));
});
$("#close-dialog").addEventListener("click", closeDialog);
dialog.addEventListener("close", () => {
  sourcePickerController?.abort();
  sourcePickerController = null;
  if (!dialog.classList.contains("media-dialog")) return;
  dialog.classList.remove("media-dialog");
  dialogContent.replaceChildren();
});
$("#new-playlist").addEventListener("click", () => editPlaylist());
$("#queue-toggle").addEventListener("click", () =>
  setPanel("queue", !panelOpen || panel !== "queue"),
);
$("#close-panel").addEventListener("click", () => setPanel(panel, false));
narrow.addEventListener("change", () => setPanel(panel, !narrow.matches));
$("#current-cover").addEventListener("click", toggleImmersive);
$("#immersive-toggle")?.addEventListener("click", toggleImmersive);
$("#current-favorite").addEventListener("click", () =>
  toggleFavorite(currentId),
);
$("#import")?.addEventListener("click", showImport);
$("#sidebar-import").addEventListener("click", showImport);
$("#play").addEventListener("click", togglePlayback);
$("#prev").addEventListener("click", () => step(-1));
$("#next").addEventListener("click", () => step(1));
$("#shuffle").addEventListener("click", () => {
  shuffle = !shuffle;
  shuffleHistory = [];
  updateControls();
  saveSettings();
  toast(shuffle ? "随机播放已开启" : "随机播放已关闭");
});
$("#repeat").addEventListener("click", () => {
  repeat = (repeat + 1) % 3;
  updateControls();
  saveSettings();
  toast($("#repeat").title);
});
$("#seek").addEventListener("input", (event) => {
  if (Number.isFinite(audio.duration))
    audio.currentTime = (audio.duration * Number(event.target.value)) / 1000;
});
$("#volume").addEventListener("input", (event) => {
  cancelVolumeFade(false);
  quietAudioState = null;
  const level = Number(event.target.value);
  targetVolume = level;
  audio.volume = level;
  audio.muted = false;
  if (level) lastVolume = level;
  paintVolume();
});
$("#mute").addEventListener("click", toggleMuteWithFade);
for (const input of [$("#file-input"), $("#folder-input")]) {
  input.addEventListener("change", () => {
    const files = [...input.files];
    input.value = "";
    if (files.length) importFiles(files);
  });
}

function showShortcutsDialog() {
  const rows = [
    [["Space"], "播放 / 暂停"],
    [["←", "→"], "快退 / 快进 5 秒"],
    [["Shift", "← / →"], "上一首 / 下一首"],
    [["↑", "↓"], "音量 +5% / -5%"],
    [["M"], "静音 / 取消静音"],
    [["L"], "收藏 / 取消收藏当前歌曲"],
    [["R"], "切换循环模式"],
    [["S"], "切换随机播放"],
    [["/"], "聚焦搜索框"],
    [["?"], "打开 / 关闭此快捷键说明"],
  ];
  const wrap = el("div", "shortcut-list");
  for (const [keys, label] of rows) {
    const row = el("div", "shortcut-row");
    const keysEl = el("div", "shortcut-keys");
    for (const k of keys) keysEl.append(el("kbd", "", k));
    row.append(el("span", "", label), keysEl);
    wrap.append(row);
  }
  openDialog("桌面快捷键", wrap);
}

function nudgeVolume(delta) {
  cancelVolumeFade(false);
  quietAudioState = null;
  const base = audio.muted ? 0 : targetVolume;
  const next = Math.min(1, Math.max(0, Math.round((base + delta) * 20) / 20));
  targetVolume = next;
  audio.muted = next === 0;
  if (next > 0) lastVolume = next;
  audio.volume = next;
  $("#volume").value = next;
  paintVolume();
  toast(`音量 ${Math.round(next * 100)}%`);
}

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target.closest("input:not([type='range']), textarea, select, [contenteditable]")) return;
  if (event.key === "?" && !event.target.closest("input")) {
    event.preventDefault();
    if (dialog.open) closeDialog();
    else showShortcutsDialog();
    return;
  }
  if (dialog.open) return;
  if (event.key === "Escape" && immersiveOpen) {
    event.preventDefault();
    closeImmersive();
    return;
  }
  if (event.key === "/") {
    event.preventDefault();
    $("#search-input").focus();
    return;
  }
  const onRange = Boolean(event.target.closest("input[type='range']"));
  const onInteractive = Boolean(event.target.closest("button, a, [data-link]"));
  if (event.code === "Space" && !onInteractive) {
    event.preventDefault();
    togglePlayback();
    return;
  }
  if (onRange) return;
  const lower = event.key.toLowerCase();
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (event.shiftKey) step(-1);
    else if (Number.isFinite(audio.duration)) {
      audio.currentTime = Math.max(0, audio.currentTime - 5);
      updateTimeline();
    }
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    if (event.shiftKey) step(1);
    else if (Number.isFinite(audio.duration)) {
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
      updateTimeline();
    }
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    nudgeVolume(0.05);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    nudgeVolume(-0.05);
  } else if (!onInteractive && lower === "m") {
    event.preventDefault();
    toggleMuteWithFade();
  } else if (!onInteractive && lower === "l") {
    event.preventDefault();
    if (currentId) {
      toggleFavorite(currentId);
      toast(favorites.has(currentId) ? "已加入喜欢" : "已取消喜欢");
    }
  } else if (!onInteractive && lower === "r") {
    event.preventDefault();
    $("#repeat").click();
  } else if (!onInteractive && lower === "f") {
    event.preventDefault();
    toggleImmersive();
  } else if (!onInteractive && lower === "s") {
    event.preventDefault();
    $("#shuffle").click();
  }
});
let dragDepth = 0;
const overlay = $("#drop-overlay");
document.addEventListener("keydown", (event) => {
  const link = event.target.closest?.("[data-link]");
  if (link && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    followTrackLink(link);
  }
});
document.addEventListener("dragenter", (event) => {
  if (!event.dataTransfer.types.includes("Files")) return;
  event.preventDefault();
  dragDepth++;
  overlay.hidden = false;
});
document.addEventListener("dragover", (event) => {
  if (event.dataTransfer.types.includes("Files")) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }
});
document.addEventListener("dragleave", () => {
  if (dragDepth && --dragDepth === 0) overlay.hidden = true;
});
document.addEventListener("drop", (event) => {
  if (!event.dataTransfer.files.length) return;
  event.preventDefault();
  dragDepth = 0;
  overlay.hidden = true;
  importFiles([...event.dataTransfer.files]);
});

targetVolume =
  typeof saved.volume === "number"
    ? Math.min(1, Math.max(0, saved.volume))
    : 0.7;
audio.volume = targetVolume;
audio.muted = Boolean(saved.muted);
markQuietAudioState(targetVolume, audio.muted);
$("#volume").value = audio.muted ? 0 : targetVolume;
const paintVolume = () => $("#volume").style.setProperty("--fill", $("#volume").value * 100 + "%");
paintVolume();

async function checkSourceHealth() {
  try {
    const status = await catalogResponse("/api/kuwo/health");
    const names = { search: "搜索", stream: "播放", charts: "排行榜", lyrics: "歌词" };
    const broken = Object.entries(status).filter(([, ok]) => !ok).map(([key]) => names[key] || key);
    const banner = $("#source-status");
    banner.hidden = !broken.length;
    banner.textContent = broken.length
      ? `酷我接口异常：${broken.join("、")}暂时不可用。通常是上游改了接口，稍后再试。`
      : "";
  } catch {
    // Server unreachable is already obvious from failed requests.
  }
}
setTimeout(checkSourceHealth, 1500);
setInterval(checkSourceHealth, 10 * 60 * 1000);

const databaseReady = (async () => {
  let loadedCount = 0;
  try {
    database = await openDatabase();
    for (const track of await readLocalTracks()) {
      tracks.set(track.id, track);
      loadedCount += 1;
    }
  } catch {
    database = undefined;
    toast("本地存储不可用，导入内容仅在本次会话可用");
  }
  if (loadedCount > 0) {
    if (view === "discover") syncDiscoverRecent();
    else if (view === "recent") syncRecentView();
    else if (view === "favorites") syncFavoritesView();
    else if (view === "library" || playlists.some((p) => p.id === view)) renderMain();
    if (panel === "queue") renderPanel();
    if (tracks.has(currentId)) updateCurrent();
  }
})();

navigate("discover");
setPanel("playing", panelOpen);
applyTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
updateCurrent();
if (tracks.has(currentId)) loadOnlineLyrics(tracks.get(currentId));
updateControls();
