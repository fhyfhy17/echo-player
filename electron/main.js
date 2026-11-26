"use strict";
// Electron main process.
// Same structure as YesPlayMusic's electron background (qier222/YesPlayMusic, MIT):
// the main process starts the bundled local API server, then a BrowserWindow loads it
// over http://127.0.0.1 so the existing web frontend runs unchanged.

const path = require("node:path");
const { app, BrowserWindow, Menu, shell, session } = require("electron");

// The data stored by the frontend (localStorage, IndexedDB library) is tied to the
// origin, so keep the port stable and fall back only if it is taken.
const PREFERRED_PORT = 8780;
const isMac = process.platform === "darwin";

let mainWindow = null;
let serverHandle = null;
let appUrl = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

async function startBackend() {
  const { startServer } = require("../backend/server");
  const staticDir = path.join(__dirname, "..", "dist");
  try {
    return await startServer({ port: PREFERRED_PORT, staticDir });
  } catch (err) {
    if (err && err.code === "EADDRINUSE") {
      console.warn(`port ${PREFERRED_PORT} busy, using a random port`);
      return startServer({ port: 0, staticDir });
    }
    throw err;
  }
}

function isAppUrl(target) {
  return Boolean(appUrl) && typeof target === "string" && target.startsWith(appUrl);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "回声",
    backgroundColor: "#07070a",
    show: false,
    // Hide the system title bar (NetEase-style); the page leaves a drag strip on top.
    titleBarStyle: "hidden",
    ...(isMac
      ? { trafficLightPosition: { x: 16, y: 11 } }
      : { titleBarOverlay: { color: "#00000000", symbolColor: "#8a8896", height: 34 } }),
    autoHideMenuBar: !isMac,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      // Audio should keep playing when the window is hidden or minimised.
      backgroundThrottling: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // External links open in the system browser; the app stays on its own origin.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url) && !isAppUrl(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isAppUrl(url)) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.on("close", (event) => {
    // macOS convention: closing the window hides it; playback continues.
    if (isMac && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(appUrl);
}

function buildMenu() {
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about", label: "关于回声" },
              { type: "separator" },
              { role: "hide", label: "隐藏回声" },
              { role: "hideOthers", label: "隐藏其他" },
              { role: "unhide", label: "全部显示" },
              { type: "separator" },
              { role: "quit", label: "退出回声" },
            ],
          },
        ]
      : []),
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "显示",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "全屏" },
      ],
    },
    {
      label: "窗口",
      submenu: [
        { role: "minimize", label: "最小化" },
        ...(isMac ? [{ role: "zoom", label: "缩放" }, { role: "front", label: "前置全部窗口" }] : [{ role: "close", label: "关闭" }]),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  // Only the local origin may use media / clipboard style permissions.
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    callback(isAppUrl(details.requestingUrl || wc.getURL()));
  });

  try {
    serverHandle = await startBackend();
  } catch (err) {
    const { dialog } = require("electron");
    dialog.showErrorBox("回声无法启动", String(err && err.stack ? err.stack : err));
    app.exit(1);
    return;
  }
  appUrl = serverHandle.url;
  console.log(`Echo backend ready at ${appUrl}`);

  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (mainWindow) mainWindow.show();
    else createWindow();
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});

app.on("will-quit", () => {
  if (serverHandle) serverHandle.server.close();
});
