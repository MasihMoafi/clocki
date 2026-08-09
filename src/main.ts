import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  screen,
} from "electron";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal");
Menu.setApplicationMenu(null);

interface Session {
  start: number;
  end: number | null;
}

interface WindowPosition {
  x: number;
  y: number;
}

interface State {
  date: string;
  sessions: Session[];
  window?: WindowPosition;
}

const LEGACY_STATE_FILE = path.join(
  os.homedir(),
  ".local",
  "share",
  "clocki",
  "state.json"
);

function resolveStateFile(): string {
  if (process.env.SNAP_USER_DATA) {
    return path.join(process.env.SNAP_USER_DATA, "state.json");
  }

  const modern = path.join(app.getPath("userData"), "clocki-data", "state.json");
  if (fs.existsSync(modern)) return modern;
  if (fs.existsSync(LEGACY_STATE_FILE)) return LEGACY_STATE_FILE;
  return modern;
}

const STATE_FILE = resolveStateFile();

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): State {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as State;
      if (raw.date !== todayStr()) {
        return { date: todayStr(), sessions: [], window: raw.window };
      }
      return raw;
    }
  } catch (_) {}
  return { date: todayStr(), sessions: [] };
}

function saveState(state: State): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function isRunning(state: State): boolean {
  return (
    state.sessions.length > 0 &&
    state.sessions[state.sessions.length - 1].end === null
  );
}

function toggleTimer(state: State): State {
  if (isRunning(state)) {
    state.sessions[state.sessions.length - 1].end = Date.now();
  } else {
    state.sessions.push({ start: Date.now(), end: null });
  }
  saveState(state);
  return state;
}

function resetTimer(state: State): State {
  const reset: State = {
    date: todayStr(),
    sessions: [],
    window: state.window,
  };
  saveState(reset);
  return reset;
}

function totalMs(state: State): number {
  return state.sessions.reduce((acc, session) => {
    const end = session.end ?? Date.now();
    return acc + (end - session.start);
  }, 0);
}

let win: BrowserWindow | null = null;
let state: State = loadState();

function broadcastState(): void {
  if (win && !win.isDestroyed()) {
    win.webContents.send("state-update", {
      running: isRunning(state),
      totalMs: totalMs(state),
    });
  }
}

function visiblePosition(position?: WindowPosition): WindowPosition {
  if (!position) return { x: 0, y: 0 };

  const visible = screen.getAllDisplays().some(({ workArea }) => {
    return (
      position.x >= workArea.x - 65 &&
      position.x < workArea.x + workArea.width &&
      position.y >= workArea.y - 23 &&
      position.y < workArea.y + workArea.height
    );
  });

  return visible ? position : { x: 0, y: 0 };
}

function showContextMenu(): void {
  if (!win) return;

  const menu = Menu.buildFromTemplate([
    {
      label: isRunning(state) ? "Pause" : "Resume",
      click: () => {
        state = toggleTimer(state);
        broadcastState();
      },
    },
    {
      label: "Reset",
      click: () => {
        state = resetTimer(state);
        broadcastState();
      },
    },
    { type: "separator" },
    { label: "Hide", click: () => win?.hide() },
    { label: "Quit", click: () => app.quit() },
  ]);

  menu.popup({ window: win });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    if (commandLine.includes("--reset")) {
      state = resetTimer(state);
    }
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      broadcastState();
    }
  });

  if (process.argv.includes("--reset")) {
    state = resetTimer(state);
  }

  app.whenReady().then(() => {
    const position = visiblePosition(state.window);

    win = new BrowserWindow({
      icon: path.join(__dirname, "../assets/icon.png"),
      width: 66,
      height: 24,
      x: position.x,
      y: position.y,
      frame: false,
      transparent: false,
      backgroundColor: "#000A0E",
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: false,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    win.setAlwaysOnTop(true, "screen-saver");

    ipcMain.on("drag-move", (_, { dx, dy }: { dx: number; dy: number }) => {
      if (!win) return;
      const [x, y] = win.getPosition();
      win.setPosition(x + dx, y + dy);
      const [newX, newY] = win.getPosition();
      state.window = { x: newX, y: newY };
    });

    ipcMain.on("drag-end", () => saveState(state));
    ipcMain.on("hide", () => win?.hide());
    ipcMain.on("context-menu", showContextMenu);

    win.loadFile(path.join(__dirname, "../src/overlay.html"));

    win.webContents.on("did-finish-load", broadcastState);

    globalShortcut.register("CommandOrControl+Alt+C", () => {
      state = toggleTimer(state);
      broadcastState();
    });

    globalShortcut.register("CommandOrControl+Alt+H", () => {
      if (!win) return;
      if (win.isVisible()) {
        win.hide();
      } else {
        if (win.isMinimized()) win.restore();
        win.show();
      }
    });

    globalShortcut.register("CommandOrControl+Alt+R", () => {
      state = resetTimer(state);
      broadcastState();
    });

    ipcMain.on("toggle", () => {
      state = toggleTimer(state);
      broadcastState();
    });

    ipcMain.on("reset", () => {
      state = resetTimer(state);
      broadcastState();
    });

    ipcMain.on("get-state", broadcastState);
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  app.on("window-all-closed", () => {
    // Clocki stays alive when its overlay is hidden.
  });
}
