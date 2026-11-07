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

export type Theme = "deusex" | "cyan" | "red" | "purple" | "bw";

const DEFAULT_THEME: Theme = "bw";

interface WindowState {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export type Mode = "timer" | "clock";

interface State {
  date: string;
  sessions: Session[];
  window?: WindowState;
  theme?: Theme;
  mode?: Mode;
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
        return { date: todayStr(), sessions: [], window: raw.window, theme: raw.theme };
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

function toggleMode(state: State): State {
  state.mode = (state.mode || "timer") === "clock" ? "timer" : "clock";
  saveState(state);
  return state;
}

function resetTimer(state: State): State {
  const reset: State = {
    date: todayStr(),
    sessions: [],
    window: state.window,
    theme: state.theme,
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
      theme: state.theme || DEFAULT_THEME,
      mode: state.mode || "timer",
    });
  }
}

// 5x the default size: an always-on-top overlay must not be resizable to full screen
const MAX_SIZE = { width: 450, height: 160 };

function visiblePosition(position?: WindowState): WindowState {
  const defaultSize = { width: 90, height: 32 };
  const width = position?.width && position.width > 0 ? Math.min(position.width, MAX_SIZE.width) : defaultSize.width;
  const height = position?.height && position.height > 0 ? Math.min(position.height, MAX_SIZE.height) : defaultSize.height;

  const displays = screen.getAllDisplays();
  if (displays.length === 0) {
    return { x: 0, y: 0, width, height };
  }

  const primary = screen.getPrimaryDisplay();

  if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
    const { workArea } = primary || displays[0];
    return {
      x: workArea.x + Math.max(0, workArea.width - width - 20),
      y: workArea.y + 20,
      width,
      height,
    };
  }

  const targetRect = { x: position.x, y: position.y, width, height };
  const matchedDisplay = screen.getDisplayMatching(targetRect) || primary || displays[0];
  const { workArea } = matchedDisplay;

  const maxX = workArea.x + Math.max(0, workArea.width - width);
  const maxY = workArea.y + Math.max(0, workArea.height - height);

  const clampedX = Math.min(Math.max(position.x, workArea.x), maxX);
  const clampedY = Math.min(Math.max(position.y, workArea.y), maxY);

  return {
    x: clampedX,
    y: clampedY,
    width,
    height,
  };
}

function showContextMenu(): void {
  if (!win) return;

  const themes: { id: Theme; label: string }[] = [
    { id: "deusex", label: "Deus Ex (Gold/Amber)" },
    { id: "cyan", label: "Cyber Cyan" },
    { id: "red", label: "Dark Red" },
    { id: "purple", label: "Neon Purple" },
    { id: "bw", label: "Monochrome B&W" },
  ];

  const currentWidth = win.getSize()[0];

  const menuItems: Electron.MenuItemConstructorOptions[] = [
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
  ];

  if (currentWidth > 120) {
    menuItems.push({
      label: "Mode",
      submenu: [
        {
          label: "Focus Timer (0.00h)",
          type: "radio",
          checked: (state.mode || "timer") === "timer",
          click: () => {
            state.mode = "timer";
            saveState(state);
            broadcastState();
          },
        },
        {
          label: "Real-time Clock (HH:MM:SS)",
          type: "radio",
          checked: state.mode === "clock",
          click: () => {
            state.mode = "clock";
            saveState(state);
            broadcastState();
          },
        },
      ],
    });
  }

  menuItems.push(
    { type: "separator" },
    {
      label: "Color Theme",
      submenu: themes.map((t) => ({
        label: t.label,
        type: "radio",
        checked: (state.theme || DEFAULT_THEME) === t.id,
        click: () => {
          state.theme = t.id;
          saveState(state);
          broadcastState();
        },
      })),
    },
    { type: "separator" },
    { label: "Hide", click: () => win?.hide() },
    { label: "Quit", click: () => app.quit() }
  );

  const menu = Menu.buildFromTemplate(menuItems);
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
    const windowState = visiblePosition(state.window);

    win = new BrowserWindow({
      icon: path.join(__dirname, "../assets/icon.png"),
      width: windowState.width || 90,
      height: windowState.height || 32,
      minWidth: 60,
      minHeight: 22,
      maxWidth: MAX_SIZE.width,
      maxHeight: MAX_SIZE.height,
      maximizable: false,
      fullscreenable: false,
      x: windowState.x,
      y: windowState.y,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      alwaysOnTop: true,
      resizable: true,
      skipTaskbar: false,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    win.setAspectRatio(90 / 32);


    win.setAlwaysOnTop(true, "screen-saver");

    win.on("resize", () => {
      if (!win) return;
      const [width, height] = win.getSize();
      const [x, y] = win.getPosition();
      state.window = { x, y, width, height };
      saveState(state);
    });

    ipcMain.on("drag-move", (_, { dx, dy }: { dx: number; dy: number }) => {
      if (!win) return;
      const [x, y] = win.getPosition();
      win.setPosition(x + dx, y + dy);
      const [newX, newY] = win.getPosition();
      const [width, height] = win.getSize();
      state.window = { x: newX, y: newY, width, height };
    });

    ipcMain.on("drag-end", () => saveState(state));
    ipcMain.on("hide", () => win?.hide());
    ipcMain.on("set-theme", (_, theme: Theme) => {
      state.theme = theme;
      saveState(state);
      broadcastState();
    });
    ipcMain.on("context-menu", showContextMenu);

    win.on("closed", () => {
      win = null;
    });

    win.loadFile(path.join(__dirname, "../src/overlay.html"));

    win.webContents.on("did-finish-load", broadcastState);

    const shortcuts: [string, () => void][] = [
      [
        "CommandOrControl+Alt+T",
        () => {
          state = toggleTimer(state);
          broadcastState();
        },
      ],
      [
        "CommandOrControl+Alt+C",
        () => {
          state = toggleMode(state);
          broadcastState();
        },
      ],
      [
        "CommandOrControl+Alt+R",
        () => {
          state = resetTimer(state);
          broadcastState();
        },
      ],
      [
        "CommandOrControl+Alt+H",
        () => {
          if (!win || win.isDestroyed()) return;
          if (win.isVisible()) {
            win.hide();
          } else {
            if (win.isMinimized()) win.restore();
            win.show();
          }
        },
      ],
    ];

    for (const [accelerator, callback] of shortcuts) {
      const registered = globalShortcut.register(accelerator, callback);
      if (!registered) {
        console.warn(`Failed to register global shortcut: ${accelerator}`);
      }
    }

    ipcMain.on("toggle", () => {
      state = toggleTimer(state);
      broadcastState();
    });

    ipcMain.on("toggle-mode", () => {
      state = toggleMode(state);
      broadcastState();
    });

    ipcMain.on("set-mode", (_, mode: Mode) => {
      state.mode = mode;
      saveState(state);
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
    app.quit();
  });
}


