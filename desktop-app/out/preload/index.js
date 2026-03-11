"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("osmium", {
  window: {
    minimize: () => electron.ipcRenderer.invoke("window:minimize"),
    maximize: () => electron.ipcRenderer.invoke("window:maximize"),
    close: () => electron.ipcRenderer.invoke("window:close")
  },
  shell: {
    openExternal: (url) => electron.ipcRenderer.invoke("shell:open-external", url)
  },
  store: {
    getChecks: () => electron.ipcRenderer.invoke("store:get-checks"),
    clearChecks: () => electron.ipcRenderer.invoke("store:clear-checks"),
    getPath: () => electron.ipcRenderer.invoke("store:get-path")
  },
  updates: {
    check: () => electron.ipcRenderer.invoke("updates:check")
  },
  check: {
    run: (trackInput) => electron.ipcRenderer.invoke("check:run", trackInput),
    onProgress: (callback) => {
      const handler = (_, event) => callback(event);
      electron.ipcRenderer.on("check:progress", handler);
      return () => electron.ipcRenderer.removeListener("check:progress", handler);
    }
  },
  spotify: {
    search: (query) => electron.ipcRenderer.invoke("spotify:search", query)
  }
});
