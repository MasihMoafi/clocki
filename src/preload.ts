import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("clocki", {
  onStateUpdate: (
    callback: (data: { running: boolean; totalMs: number; theme: string }) => void
  ) => {
    ipcRenderer.on("state-update", (_event, data) => callback(data));
  },
  toggle: () => ipcRenderer.send("toggle"),
  reset: () => ipcRenderer.send("reset"),
  hide: () => ipcRenderer.send("hide"),
  setTheme: (theme: string) => ipcRenderer.send("set-theme", theme),
  setSize: (width: number, height: number) => ipcRenderer.send("set-size", { width, height }),
  openContextMenu: () => ipcRenderer.send("context-menu"),
  dragMove: (dx: number, dy: number) => ipcRenderer.send("drag-move", { dx, dy }),
  dragEnd: () => ipcRenderer.send("drag-end"),
  requestState: () => ipcRenderer.send("get-state"),
});

