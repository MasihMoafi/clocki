import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("clocki", {
  onStateUpdate: (
    callback: (data: { running: boolean; totalMs: number }) => void
  ) => {
    ipcRenderer.on("state-update", (_event, data) => callback(data));
  },
  toggle: () => ipcRenderer.send("toggle"),
  reset: () => ipcRenderer.send("reset"),
  hide: () => ipcRenderer.send("hide"),
  openContextMenu: () => ipcRenderer.send("context-menu"),
  dragMove: (dx: number, dy: number) => ipcRenderer.send("drag-move", { dx, dy }),
  dragEnd: () => ipcRenderer.send("drag-end"),
  requestState: () => ipcRenderer.send("get-state"),
});
