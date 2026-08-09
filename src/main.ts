import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
} from "electron";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const STATE_FILE = path.join(
  os.homedir(),
  ".local",
  "share",
  "clocki",
  "state.json"
);

interface Session {
  start: number;
  end: number | null;
}

interface State {
  date: string;
  sessions: Session[];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): State {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as State;
      // auto-reset if it's a new day
      if (raw.date !== todayStr()) {
        return { date: todayStr(), sessions: [] };
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
    // pause: close the last open session
    state.sessions[state.sessions.length - 1].end = Date.now();
  } else {
    // start/resume
    state.sessions.push({ start: Date.now(), end: null });
  }
  saveState(state);
  return state;
}

function totalMs(state: State): number {
  return state.sessions.reduce((acc, s) => {
    const end = s.end ?? Date.now();
    return acc + (end - s.start);
  }, 0);
}

app.disableHardwareAcceleration();

let win: BrowserWindow | null = null;
let state: State = loadState();

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    if (commandLine.includes("--reset")) {
      state = { date: todayStr(), sessions: [] };
      saveState(state);
    }
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.webContents.send("state-update", {
        running: isRunning(state),
        totalMs: totalMs(state),
      });
    }
  });

  // handle --reset flag on initial launch
  if (process.argv.includes("--reset")) {
    state = { date: todayStr(), sessions: [] };
    saveState(state);
  }

  app.whenReady().then(() => {
    const { workArea } = screen.getPrimaryDisplay();

    win = new BrowserWindow({
      icon: path.join(__dirname, "../assets/icon.png"),
      width: 66,
      height: 24,
      x: 0,
      y: 0,
      frame: false,
      transparent: false,
      backgroundColor: '#000A0E',
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: false,
      hasShadow: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    win.setAlwaysOnTop(true, "screen-saver");

    // JS-driven drag
    ipcMain.on('drag-move', (_, { dx, dy }: { dx: number; dy: number }) => {
      if (!win) return;
      const [x, y] = win.getPosition();
      win.setPosition(x + dx, y + dy);
    });

    // IPC: hide window
    ipcMain.on('hide', () => {
      win?.hide();
    });

    win.loadFile(path.join(__dirname, "../src/overlay.html"));

    // Push initial state to renderer
    win.webContents.on("did-finish-load", () => {
      win?.webContents.send("state-update", {
        running: isRunning(state),
        totalMs: totalMs(state),
      });
    });

    // Global hotkey: Ctrl+Alt+C → toggle timer (pause/resume)
    globalShortcut.register("CommandOrControl+Alt+C", () => {
      state = toggleTimer(state);
      win?.webContents.send("state-update", {
        running: isRunning(state),
        totalMs: totalMs(state),
      });
    });

    // Global hotkey: Ctrl+Alt+H → toggle window visibility (hide/show)
    globalShortcut.register("CommandOrControl+Alt+H", () => {
      if (!win) return;
      if (win.isVisible()) {
        win.hide();
      } else {
        if (win.isMinimized()) win.restore();
        win.show();
      }
    });

    // IPC: renderer asks for toggle (click on overlay)
    ipcMain.on("toggle", () => {
      state = toggleTimer(state);
      win?.webContents.send("state-update", {
        running: isRunning(state),
        totalMs: totalMs(state),
      });
    });

    // IPC: renderer asks for reset
    ipcMain.on("reset", () => {
      state = { date: todayStr(), sessions: [] };
      saveState(state);
      win?.webContents.send("state-update", {
        running: isRunning(state),
        totalMs: totalMs(state),
      });
    });

    // Global hotkey: Ctrl+Alt+R → reset timer
    globalShortcut.register("CommandOrControl+Alt+R", () => {
      state = { date: todayStr(), sessions: [] };
      saveState(state);
      win?.webContents.send("state-update", {
        running: isRunning(state),
        totalMs: totalMs(state),
      });
    });

    // IPC: renderer requests current state
    ipcMain.on("get-state", () => {
      win?.webContents.send("state-update", {
        running: isRunning(state),
        totalMs: totalMs(state),
      });
    });
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  app.on("window-all-closed", () => {
    // keep app process alive even if window is closed/hidden
  });
}
