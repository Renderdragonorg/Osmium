import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('osmium', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url)
  },
  store: {
    getChecks: () => ipcRenderer.invoke('store:get-checks'),
    clearChecks: () => ipcRenderer.invoke('store:clear-checks'),
    getPath: () => ipcRenderer.invoke('store:get-path')
  },
  check: {
    run: (trackInput: string) => ipcRenderer.invoke('check:run', trackInput),
    onProgress: (callback: (event: unknown) => void) => {
      const handler = (_: unknown, event: unknown) => callback(event)
      ipcRenderer.on('check:progress', handler)
      return () => ipcRenderer.removeListener('check:progress', handler)
    }
  },
  spotify: {
    search: (query: string) => ipcRenderer.invoke('spotify:search', query)
  }
})
